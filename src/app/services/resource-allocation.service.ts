import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import { Technician, Skill } from '../features/field-resource-management/models/technician.model';
import { Job } from '../features/field-resource-management/models/job.model';
import { Assignment, Conflict, DateRange, ConflictSeverity } from '../features/field-resource-management/models/assignment.model';

/**
 * Equipment allocation model
 */
export interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  market: string;
  isAvailable: boolean;
  currentJobId?: string;
}

/**
 * Equipment allocation request
 */
export interface EquipmentAllocationRequest {
  equipmentId: string;
  jobId: string;
  startDate: Date;
  endDate: Date;
  requestedBy: string;
}

/**
 * Technician availability status
 */
export interface TechnicianAvailabilityStatus {
  technicianId: string;
  technician?: Technician;
  isAvailable: boolean;
  currentAssignments: Assignment[];
  upcomingAssignments: Assignment[];
  conflicts: Conflict[];
  utilizationPercentage: number;
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
  market?: string;
  totalTechnicians: number;
  availableTechnicians: number;
  utilizationPercentage: number;
  technicianUtilization: TechnicianUtilizationDetail[];
  equipmentUtilization?: EquipmentUtilizationDetail[];
}

export interface TechnicianUtilizationDetail {
  technicianId: string;
  technicianName: string;
  assignedHours: number;
  availableHours: number;
  utilizationPercentage: number;
}

export interface EquipmentUtilizationDetail {
  equipmentId: string;
  equipmentName: string;
  assignedDays: number;
  availableDays: number;
  utilizationPercentage: number;
}

/**
 * Assignment validation result
 */
export interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: Conflict[];
}

/**
 * Resource reallocation request (Admin only)
 */
export interface ResourceReallocationRequest {
  technicianId: string;
  fromMarket: string;
  toMarket: string;
  effectiveDate: Date;
  reason: string;
  requestedBy: string;
}

/**
 * Service for managing resource allocation including technicians and equipment
 * Implements role-based access control for CM and Admin users
 */
@Injectable({
  providedIn: 'root'
})
export class ResourceAllocationService {
  private readonly apiUrl = '/api/resource-allocation';
  private readonly techniciansApiUrl = '/api/technicians';
  private readonly jobsApiUrl = '/api/jobs';
  private readonly equipmentApiUrl = '/api/equipment';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  /**
   * Assign a technician to a project with availability and qualification validation
   * CM users: can only assign technicians from their market
   * Admin users: can assign any technician
   * @param technicianId Technician ID to assign
   * @param jobId Job ID to assign to
   * @param startDate Assignment start date
   * @param endDate Assignment end date
   * @returns Observable of created assignment
   */
  assignTechnicianToProject(
    technicianId: string,
    jobId: string,
    startDate: Date,
    endDate: Date
  ): Observable<Assignment> {
    // First validate the assignment
    return this.validateAssignment(technicianId, jobId, startDate, endDate).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return throwError(() => new Error(validation.errors.join('; ')));
        }

        // Check for conflicts
        if (validation.conflicts.length > 0) {
          const errorConflicts = validation.conflicts.filter(c => c.severity === ConflictSeverity.Error);
          if (errorConflicts.length > 0) {
            return throwError(() => new Error('Cannot assign technician due to scheduling conflicts'));
          }
        }

        // Create the assignment
        const assignment = {
          technicianId,
          jobId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          assignedBy: this.authService.getUser()?.id || 'unknown'
        };

        return this.http.post<Assignment>(`${this.apiUrl}/assignments`, assignment).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  /**
   * Validate assignment before creating it
   * Checks availability, qualifications, and market access
   */
  private validateAssignment(
    technicianId: string,
    jobId: string,
    startDate: Date,
    endDate: Date
  ): Observable<AssignmentValidationResult> {
    return forkJoin({
      technician: this.http.get<Technician>(`${this.techniciansApiUrl}/${technicianId}`),
      job: this.http.get<Job>(`${this.jobsApiUrl}/${jobId}`),
      availability: this.getTechnicianAvailability(technicianId, { startDate, endDate }),
      conflicts: this.detectSchedulingConflicts(technicianId, jobId, { startDate, endDate })
    }).pipe(
      map(({ technician, job, availability, conflicts }) => {
        const result: AssignmentValidationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          conflicts: conflicts
        };

        // Check market access for CM users
        if (this.authService.isCM() && !this.authService.isAdmin()) {
          const userMarket = this.authService.getUser()?.market;
          if (technician.region !== userMarket) {
            result.isValid = false;
            result.errors.push('You cannot assign technicians from other markets');
          }
        }

        // Check if technician is active
        if (!technician.isActive) {
          result.isValid = false;
          result.errors.push('Technician is not active');
        }

        // Check availability
        if (!availability.isAvailable) {
          result.isValid = false;
          result.errors.push('Technician is not available during the requested time period');
        }

        // Check qualifications (required skills)
        const technicianSkillIds = technician.skills.map(s => s.id);
        const missingSkills = job.requiredSkills.filter(
          reqSkill => !technicianSkillIds.includes(reqSkill.id)
        );
        
        if (missingSkills.length > 0) {
          result.warnings.push(
            `Technician is missing required skills: ${missingSkills.map(s => s.name).join(', ')}`
          );
        }

        // Check for conflicts
        const errorConflicts = conflicts.filter(c => c.severity === ConflictSeverity.Error);
        if (errorConflicts.length > 0) {
          result.isValid = false;
          result.errors.push('Technician has scheduling conflicts');
        }

        return result;
      }),
      catchError(err => {
        return of({
          isValid: false,
          errors: [err.message || 'Validation failed'],
          warnings: [],
          conflicts: []
        });
      })
    );
  }

  /**
   * Get technician availability with real-time status
   * @param technicianId Technician ID
   * @param dateRange Date range to check
   * @returns Observable of availability status
   */
  getTechnicianAvailability(
    technicianId: string,
    dateRange: DateRange
  ): Observable<TechnicianAvailabilityStatus> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<TechnicianAvailabilityStatus>(
      `${this.apiUrl}/technicians/${technicianId}/availability`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Detect scheduling conflicts for a technician
   * Checks for overlapping assignments and double-booking
   * @param technicianId Technician ID
   * @param jobId Job ID (to exclude from conflict check)
   * @param dateRange Date range to check
   * @returns Observable of conflicts array
   */
  detectSchedulingConflicts(
    technicianId: string,
    jobId: string,
    dateRange: DateRange
  ): Observable<Conflict[]> {
    const params = new HttpParams()
      .set('technicianId', technicianId)
      .set('jobId', jobId)
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<Conflict[]>(`${this.apiUrl}/conflicts`, { params }).pipe(
      catchError(err => {
        console.error('Error detecting conflicts:', err);
        return of([]);
      })
    );
  }

  /**
   * Allocate equipment to a project with availability and location validation
   * @param request Equipment allocation request
   * @returns Observable of allocation result
   */
  allocateEquipment(request: EquipmentAllocationRequest): Observable<any> {
    // Validate equipment availability
    return this.http.get<Equipment>(`${this.equipmentApiUrl}/${request.equipmentId}`).pipe(
      switchMap(equipment => {
        // Check market access for CM users
        if (this.authService.isCM() && !this.authService.isAdmin()) {
          const userMarket = this.authService.getUser()?.market;
          if (equipment.market !== userMarket) {
            return throwError(() => new Error('You cannot allocate equipment from other markets'));
          }
        }

        // Check availability
        if (!equipment.isAvailable) {
          return throwError(() => new Error('Equipment is not available'));
        }

        // Create allocation
        return this.http.post(`${this.apiUrl}/equipment-allocations`, request).pipe(
          catchError(this.handleError)
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get resource utilization metrics with market-based filtering
   * CM users: see only their market
   * Admin users: see all markets or specific market
   * @param market Optional market filter (Admin only)
   * @param dateRange Optional date range for utilization calculation
   * @returns Observable of resource utilization metrics
   */
  getResourceUtilization(
    market?: string,
    dateRange?: DateRange
  ): Observable<ResourceUtilization> {
    let params = new HttpParams();

    // Apply market filtering based on role
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      const userMarket = this.authService.getUser()?.market;
      if (userMarket) {
        params = params.set('market', userMarket);
      }
    } else if (this.authService.isAdmin() && market) {
      params = params.set('market', market);
    }

    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<ResourceUtilization>(`${this.apiUrl}/utilization`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reallocate resources between markets (Admin only)
   * @param request Reallocation request
   * @returns Observable of reallocation result
   */
  reallocateResourceBetweenMarkets(
    request: ResourceReallocationRequest
  ): Observable<any> {
    // Admin-only operation
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only administrators can reallocate resources between markets'));
    }

    return this.http.post(`${this.apiUrl}/reallocate`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get all assignments for a technician
   * @param technicianId Technician ID
   * @param dateRange Optional date range filter
   * @returns Observable of assignments array
   */
  getTechnicianAssignments(
    technicianId: string,
    dateRange?: DateRange
  ): Observable<Assignment[]> {
    let params = new HttpParams();

    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<Assignment[]>(
      `${this.apiUrl}/technicians/${technicianId}/assignments`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Remove a technician assignment
   * @param assignmentId Assignment ID to remove
   * @returns Observable of void
   */
  removeAssignment(assignmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/assignments/${assignmentId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 409:
          errorMessage = 'Conflict. The resource is already allocated or unavailable.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
