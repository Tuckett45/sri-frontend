import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { 
  Technician, 
  Skill, 
  Certification, 
  Availability 
} from '../models/technician.model';
import { 
  CreateTechnicianDto, 
  UpdateTechnicianDto, 
  TechnicianFilters 
} from '../models/dtos';
import { DateRange } from '../models/assignment.model';
import { RoleBasedDataService } from '../../../services/role-based-data.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Service for managing technician data and operations
 * Handles HTTP communication with the backend API for technician-related operations
 */
@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private readonly apiUrl = '/api/technicians';
  private readonly retryCount = 2;

  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService,
    private authService: AuthService
  ) {}

  /**
   * Retrieves a list of technicians with optional filtering
   * CM users: filtered by their market
   * Admin users: all technicians
   * @param filters Optional filters to apply to the technician list
   * @returns Observable of technician array
   */
  getTechnicians(filters?: TechnicianFilters): Observable<Technician[]> {
    let params = new HttpParams();
    
    // Add market filtering for CM users
    const currentUser = this.authService.getUser();
    if (this.authService.isCM() && !this.authService.isAdmin() && currentUser?.market) {
      params = params.set('market', currentUser.market);
    }
    
    if (filters) {
      if (filters.searchTerm) {
        params = params.set('searchTerm', filters.searchTerm);
      }
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.skills && filters.skills.length > 0) {
        params = params.set('skills', filters.skills.join(','));
      }
      if (filters.region) {
        params = params.set('region', filters.region);
      }
      if (filters.isAvailable !== undefined) {
        params = params.set('isAvailable', filters.isAvailable.toString());
      }
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<Technician[]>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        map(technicians => this.applyRoleBasedFiltering(technicians)),
        catchError(this.handleError)
      );
  }

  /**
   * Apply role-based filtering to technicians
   * CM users: filter by their market
   * Admin users: include all technicians
   */
  private applyRoleBasedFiltering(technicians: Technician[]): Technician[] {
    // Admin users get all technicians
    if (this.authService.isAdmin()) {
      return technicians;
    }

    // CM users: filter by their market (map region to market)
    if (this.authService.isCM()) {
      // Map region to market for filtering
      const techniciansWithMarket = technicians.map(t => ({ ...t, market: t.region }));
      const filtered = this.roleBasedDataService.applyMarketFilter(techniciansWithMarket);
      // Map back to original Technician objects
      return filtered.map(t => {
        const { market, ...rest } = t as any;
        return rest as Technician;
      });
    }

    // Other roles: return as-is
    return technicians;
  }

  /**
   * Retrieves a single technician by ID
   * @param id Technician ID
   * @returns Observable of technician
   */
  getTechnicianById(id: string): Observable<Technician> {
    return this.http.get<Technician>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new technician
   * @param technician Technician data to create
   * @returns Observable of created technician
   */
  createTechnician(technician: CreateTechnicianDto): Observable<Technician> {
    return this.http.post<Technician>(this.apiUrl, technician)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing technician
   * Validates market ownership for CM users
   * @param id Technician ID
   * @param technician Updated technician data
   * @returns Observable of updated technician
   */
  updateTechnician(id: string, technician: UpdateTechnicianDto): Observable<Technician> {
    // Validate market ownership for CMs
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      const currentUser = this.authService.getUser();
      const userMarket = currentUser?.market || '';
      
      // First get the technician to check region (which maps to market)
      return this.getTechnicianById(id).pipe(
        switchMap(existingTech => {
          if (existingTech.region !== userMarket) {
            return throwError(() => new Error('You do not have permission to update technicians from other markets'));
          }
          return this.http.put<Technician>(`${this.apiUrl}/${id}`, technician);
        }),
        catchError(this.handleError)
      );
    }

    return this.http.put<Technician>(`${this.apiUrl}/${id}`, technician)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Validates that a technician can be assigned to a project
   * Prevents CM from assigning technicians from other markets
   * @param technicianId Technician ID to validate
   * @param projectMarket Market of the project
   * @returns Observable of boolean indicating if assignment is valid
   */
  validateTechnicianAssignment(technicianId: string, projectMarket: string): Observable<boolean> {
    // Admin users can assign any technician
    if (this.authService.isAdmin()) {
      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    }

    // CM users: validate market ownership
    if (this.authService.isCM()) {
      return this.getTechnicianById(technicianId).pipe(
        map(technician => {
          const techRegion = technician.region || '';
          const currentUser = this.authService.getUser();
          const userMarket = currentUser?.market || '';
          
          // Check if technician is from CM's market (region maps to market)
          if (techRegion !== userMarket) {
            throw new Error('You cannot assign technicians from other markets');
          }
          
          // Check if project is in CM's market
          if (projectMarket && projectMarket !== userMarket) {
            throw new Error('You cannot assign technicians to projects in other markets');
          }
          
          return true;
        }),
        catchError(err => throwError(() => err))
      );
    }

    // Other roles: allow assignment
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Deletes a technician
   * @param id Technician ID
   * @returns Observable of void
   */
  deleteTechnician(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves skills for a specific technician
   * @param id Technician ID
   * @returns Observable of skill array
   */
  getTechnicianSkills(id: string): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.apiUrl}/${id}/skills`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Adds a skill to a technician
   * @param id Technician ID
   * @param skill Skill to add
   * @returns Observable of void
   */
  addTechnicianSkill(id: string, skill: Skill): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/skills`, skill)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Removes a skill from a technician
   * @param id Technician ID
   * @param skillId Skill ID to remove
   * @returns Observable of void
   */
  removeTechnicianSkill(id: string, skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/skills/${skillId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves certifications for a specific technician
   * @param id Technician ID
   * @returns Observable of certification array
   */
  getTechnicianCertifications(id: string): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.apiUrl}/${id}/certifications`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves certifications expiring within a specified number of days
   * @param daysThreshold Number of days threshold for expiration
   * @returns Observable of certification array
   */
  getExpiringCertifications(daysThreshold: number = 30): Observable<Certification[]> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());
    return this.http.get<Certification[]>(`${this.apiUrl}/certifications/expiring`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves availability for a specific technician within a date range
   * @param id Technician ID
   * @param dateRange Date range to query
   * @returns Observable of availability array
   */
  getTechnicianAvailability(id: string, dateRange: DateRange): Observable<Availability[]> {
    let params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<Availability[]>(`${this.apiUrl}/${id}/availability`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Updates availability for a specific technician
   * @param id Technician ID
   * @param availability Array of availability records
   * @returns Observable of void
   */
  updateTechnicianAvailability(id: string, availability: Availability[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/availability`, availability)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Provide more specific error messages based on status code
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
          errorMessage = 'Technician not found.';
          break;
        case 409:
          errorMessage = 'Conflict. A technician with this ID already exists.';
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
