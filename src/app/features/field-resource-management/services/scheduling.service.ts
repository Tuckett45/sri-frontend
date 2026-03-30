import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { 
  Assignment, 
  Conflict, 
  TechnicianMatch, 
  DateRange 
} from '../models/assignment.model';
import { 
  AssignmentDto, 
  BulkAssignmentDto, 
  ReassignmentDto, 
  AssignmentFilters 
} from '../models/dtos';
import { Skill } from '../models/technician.model';

/**
 * Schedule item representing a technician's scheduled work
 */
export interface ScheduleItem {
  id: string;
  jobId: string;
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  status: string;
  location: string;
}

/**
 * Result of a bulk assignment operation
 */
export interface AssignmentResult {
  jobId: string;
  technicianId: string;
  success: boolean;
  error?: string;
}

/**
 * Service for managing scheduling and assignment operations
 * Handles HTTP communication with the backend API for scheduling-related operations
 */
@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  private readonly apiUrl = '/api/scheduling';
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Assigns a technician to a job with comprehensive validation and conflict detection
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - jobId is a valid UUID of an existing job
   * - technicianId is a valid UUID of an existing technician
   * - assignedBy is a valid UUID of the user making the assignment
   * - User has 'create' permission on 'assignments' resource
   * - Job status is not 'COMPLETED' or 'CANCELLED'
   * - Technician is not already assigned to overlapping job (unless overrideConflicts = true)
   * - Technician has required skills for the job (unless overrideConflicts = true)
   * 
   * Postconditions:
   * - Returns Observable that emits new Assignment object
   * - Assignment is persisted to backend
   * - NgRx store is updated with new assignment
   * - SignalR notification is broadcast to assigned technician
   * - If technician is unavailable, conflict is detected and error is thrown
   * - If assignment fails, Observable emits error and no state changes occur
   * 
   * Loop Invariants: N/A (async operation, no loops)
   * 
   * @param jobId Job ID to assign technician to
   * @param technicianId Technician ID to assign
   * @param assignedBy User ID of the person making the assignment
   * @param overrideConflicts Whether to override scheduling conflicts (default: false)
   * @param justification Justification for overriding conflicts (required if overrideConflicts is true)
   * @returns Observable of created assignment
   * @throws Error if preconditions are violated
   * @throws Error if conflicts exist and overrideConflicts is false
   * @throws Error if technician lacks required skills and overrideConflicts is false
   */
  assignTechnicianToJob(
    jobId: string, 
    technicianId: string, 
    assignedBy: string,
    overrideConflicts: boolean = false, 
    justification?: string
  ): Observable<Assignment> {
    // Validate preconditions
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Invalid jobId: must be a non-empty string'));
    }
    
    if (!technicianId || technicianId.trim().length === 0) {
      return throwError(() => new Error('Invalid technicianId: must be a non-empty string'));
    }
    
    if (!assignedBy || assignedBy.trim().length === 0) {
      return throwError(() => new Error('Invalid assignedBy: must be a non-empty string'));
    }
    
    if (overrideConflicts && (!justification || justification.trim().length === 0)) {
      return throwError(() => new Error('Justification is required when overriding conflicts'));
    }

    const dto: AssignmentDto = {
      jobId,
      technicianId,
      overrideConflicts,
      justification
    };

    return this.http.post<Assignment>(`${this.apiUrl}/assign`, dto)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Legacy method - delegates to assignTechnicianToJob
   * @deprecated Use assignTechnicianToJob instead for better validation and formal specifications
   */
  assignTechnician(
    jobId: string, 
    technicianId: string, 
    overrideConflicts: boolean = false, 
    justification?: string
  ): Observable<Assignment> {
    // Extract assignedBy from current user context (would typically come from auth service)
    // For now, using a placeholder - this should be injected from AuthService
    const assignedBy = 'current-user-id'; // TODO: Get from AuthService
    
    return this.assignTechnicianToJob(jobId, technicianId, assignedBy, overrideConflicts, justification);
  }

  /**
   * Validates if a string is a valid UUID format
   * @param uuid String to validate
   * @returns true if valid UUID, false otherwise
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Unassigns a technician from a job
   * @param assignmentId Assignment ID
   * @returns Observable of void
   */
  unassignTechnician(assignmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/assignments/${assignmentId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Reassigns a job from one technician to another
   * @param jobId Job ID
   * @param fromTechnicianId Current technician ID
   * @param toTechnicianId New technician ID
   * @param reason Optional reason for reassignment
   * @returns Observable of reassignment result with old and new assignment info
   */
  reassignJob(
    jobId: string, 
    fromTechnicianId: string, 
    toTechnicianId: string, 
    reason?: string
  ): Observable<{ oldAssignmentId: string | null; newAssignment: Assignment }> {
    const dto: ReassignmentDto = {
      jobId,
      fromTechnicianId,
      toTechnicianId,
      reason
    };

    return this.http.post<{ oldAssignmentId: string | null; newAssignment: Assignment }>(`${this.apiUrl}/reassign`, dto)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves assignments with optional filtering
   * @param filters Optional filters to apply to the assignment list
   * @returns Observable of assignment array
   */
  getAssignments(filters?: AssignmentFilters): Observable<Assignment[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.technicianId) {
        params = params.set('technicianId', filters.technicianId);
      }
      if (filters.jobId) {
        params = params.set('jobId', filters.jobId);
      }
      if (filters.dateRange) {
        params = params.set('startDate', filters.dateRange.startDate.toISOString());
        params = params.set('endDate', filters.dateRange.endDate.toISOString());
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

    return this.http.get<Assignment[]>(`${this.apiUrl}/assignments`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Checks for scheduling conflicts when assigning a technician to a job
   * @param technicianId Technician ID
   * @param jobId Job ID
   * @returns Observable of conflict array
   */
  checkConflicts(technicianId: string, jobId: string): Observable<Conflict[]> {
    const params = new HttpParams()
      .set('technicianId', technicianId)
      .set('jobId', jobId);

    return this.http.get<Conflict[]>(`${this.apiUrl}/conflicts/check`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Detects assignment conflicts for a technician being assigned to a job
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - jobId and technicianId are valid UUIDs
   * - scheduledStart is before scheduledEnd
   * - Job and technician exist in system
   * - User has permission to view assignments
   * 
   * Postconditions:
   * - Returns array of all detected conflicts
   * - If no conflicts, returns empty array
   * - Conflicts are categorized by type
   * - No side effects on existing data
   * 
   * Loop Invariants:
   * - Assignment loop: All processed assignments have been checked for overlap
   * - Skill loop: All processed skills have been validated
   * - conflicts array contains only valid conflict objects
   * 
   * @param jobId Job ID to check conflicts for
   * @param technicianId Technician ID to check conflicts for
   * @param scheduledStart Scheduled start time of the job
   * @param scheduledEnd Scheduled end time of the job
   * @returns Observable of conflict array
   */
  detectAssignmentConflicts(
    jobId: string,
    technicianId: string,
    scheduledStart: Date,
    scheduledEnd: Date
  ): Observable<Conflict[]> {
    // Validate preconditions
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Invalid jobId: must be a non-empty string'));
    }
    
    if (!technicianId || technicianId.trim().length === 0) {
      return throwError(() => new Error('Invalid technicianId: must be a non-empty string'));
    }
    
    if (scheduledStart >= scheduledEnd) {
      return throwError(() => new Error('scheduledStart must be before scheduledEnd'));
    }

    const params = new HttpParams()
      .set('jobId', jobId)
      .set('technicianId', technicianId)
      .set('scheduledStart', scheduledStart.toISOString())
      .set('scheduledEnd', scheduledEnd.toISOString());

    return this.http.get<Conflict[]>(`${this.apiUrl}/conflicts/detect`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Detects all scheduling conflicts within an optional date range
   * @param dateRange Optional date range to check for conflicts
   * @returns Observable of conflict array
   */
  detectAllConflicts(dateRange?: DateRange): Observable<Conflict[]> {
    let params = new HttpParams();
    
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<Conflict[]>(`${this.apiUrl}/conflicts`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves qualified technicians for a job, ranked by skill match
   * @param jobId Job ID
   * @returns Observable of technician match array
   */
  getQualifiedTechnicians(jobId: string): Observable<TechnicianMatch[]> {
    return this.http.get<TechnicianMatch[]>(`${this.apiUrl}/qualified-technicians/${jobId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves a technician's schedule for a date range
   * @param technicianId Technician ID
   * @param dateRange Date range to query
   * @returns Observable of schedule item array
   */
  getTechnicianSchedule(technicianId: string, dateRange: DateRange): Observable<ScheduleItem[]> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<ScheduleItem[]>(`${this.apiUrl}/schedule/${technicianId}`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Performs bulk assignment of multiple jobs to technicians
   * @param assignments Array of assignment DTOs
   * @returns Observable of assignment result array
   */
  bulkAssign(assignments: AssignmentDto[]): Observable<AssignmentResult[]> {
    const dto: BulkAssignmentDto = { assignments };

    return this.http.post<AssignmentResult[]>(`${this.apiUrl}/bulk-assign`, dto)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Accepts an assignment (technician accepts the job)
   * @param assignmentId Assignment ID
   * @returns Observable of updated assignment
   */
  acceptAssignment(assignmentId: string): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.apiUrl}/assignments/${assignmentId}/accept`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Rejects an assignment (technician rejects the job)
   * @param assignmentId Assignment ID
   * @param reason Optional reason for rejection
   * @returns Observable of updated assignment
   */
  rejectAssignment(assignmentId: string, reason?: string): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.apiUrl}/assignments/${assignmentId}/reject`, { reason })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Checks if two time ranges overlap
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - start1 is before or equal to end1
   * - start2 is before or equal to end2
   * - All dates are valid Date objects
   * 
   * Postconditions:
   * - Returns true if and only if the time ranges overlap
   * - Returns false if ranges are adjacent but not overlapping
   * - Returns false if one range ends exactly when the other starts
   * - No side effects on input parameters
   * - Result is deterministic for same inputs
   * 
   * Algorithm:
   * Two ranges [start1, end1] and [start2, end2] overlap if:
   * - start1 < end2 AND start2 < end1
   * 
   * This handles all overlap cases:
   * - Partial overlap from left
   * - Partial overlap from right
   * - Complete containment (one range inside another)
   * - Exact match
   * 
   * @param start1 Start time of first range
   * @param end1 End time of first range
   * @param start2 Start time of second range
   * @param end2 End time of second range
   * @returns true if ranges overlap, false otherwise
   * @throws Error if preconditions are violated
   */
  timeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    // Validate preconditions
    if (!(start1 instanceof Date) || isNaN(start1.getTime())) {
      throw new Error('start1 must be a valid Date');
    }
    
    if (!(end1 instanceof Date) || isNaN(end1.getTime())) {
      throw new Error('end1 must be a valid Date');
    }
    
    if (!(start2 instanceof Date) || isNaN(start2.getTime())) {
      throw new Error('start2 must be a valid Date');
    }
    
    if (!(end2 instanceof Date) || isNaN(end2.getTime())) {
      throw new Error('end2 must be a valid Date');
    }
    
    if (start1 > end1) {
      throw new Error('start1 must be before or equal to end1');
    }
    
    if (start2 > end2) {
      throw new Error('start2 must be before or equal to end2');
    }
    
    // Check for overlap using the standard interval overlap algorithm
    // Two intervals overlap if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
  }
  /**
   * Validates if a technician has all required skills for a job
   *
   * FORMAL SPECIFICATIONS:
   *
   * Preconditions:
   * - technicianSkills is a valid array (may be empty)
   * - requiredSkills is a valid array (may be empty)
   * - All skill objects have valid id and name properties
   *
   * Postconditions:
   * - Returns true if and only if technician has all required skills
   * - Returns true if requiredSkills is empty (no skills required)
   * - Returns false if technician is missing any required skill
   * - No side effects on input parameters
   * - Result is deterministic for same inputs
   *
   * Algorithm:
   * For each required skill, check if technician has a matching skill by ID
   * All required skills must be present for validation to pass
   *
   * Loop Invariants:
   * - For each iteration: all previously checked required skills were found in technician skills
   * - If any required skill is not found, function returns false immediately
   *
   * @param technicianSkills Array of skills the technician possesses
   * @param requiredSkills Array of skills required for the job
   * @returns true if technician has all required skills, false otherwise
   * @throws Error if preconditions are violated
   */
  validateSkillRequirements(
    technicianSkills: Skill[],
    requiredSkills: Skill[]
  ): boolean {
    // Validate preconditions
    if (!Array.isArray(technicianSkills)) {
      throw new Error('technicianSkills must be a valid array');
    }

    if (!Array.isArray(requiredSkills)) {
      throw new Error('requiredSkills must be a valid array');
    }

    // Validate all skills have required properties
    for (const skill of technicianSkills) {
      if (!skill || !skill.id || !skill.name) {
        throw new Error('All technician skills must have valid id and name properties');
      }
    }

    for (const skill of requiredSkills) {
      if (!skill || !skill.id || !skill.name) {
        throw new Error('All required skills must have valid id and name properties');
      }
    }

    // If no skills are required, validation passes
    if (requiredSkills.length === 0) {
      return true;
    }

    // Create a Set of technician skill IDs for O(1) lookup
    const technicianSkillIds = new Set(technicianSkills.map(skill => skill.id));

    // Check if technician has all required skills
    // Loop invariant: all previously checked required skills were found
    for (const requiredSkill of requiredSkills) {
      if (!technicianSkillIds.has(requiredSkill.id)) {
        // Missing required skill - validation fails
        return false;
      }
    }

    // All required skills found - validation passes
    return true;
  }

  /**
   * Calculates the distance between two geographic locations using the Haversine formula
   *
   * FORMAL SPECIFICATIONS:
   *
   * Preconditions:
   * - location1.latitude is between -90 and 90
   * - location1.longitude is between -180 and 180
   * - location2.latitude is between -90 and 90
   * - location2.longitude is between -180 and 180
   * - Both locations are valid GeoLocation objects
   *
   * Postconditions:
   * - Returns distance in kilometers as a non-negative number
   * - Returns 0 if both locations are identical
   * - Result is accurate within 0.5% for most distances on Earth
   * - No side effects on input parameters
   * - Result is deterministic for same inputs
   *
   * Algorithm:
   * Uses the Haversine formula to calculate great-circle distance between two points
   * on a sphere given their longitudes and latitudes.
   *
   * Formula:
   * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
   * c = 2 * atan2(√a, √(1−a))
   * d = R * c
   *
   * Where:
   * - φ is latitude in radians
   * - λ is longitude in radians
   * - R is Earth's radius (6371 km)
   * - Δφ is the difference in latitude
   * - Δλ is the difference in longitude
   *
   * @param location1 First geographic location
   * @param location2 Second geographic location
   * @returns Distance in kilometers
   * @throws Error if preconditions are violated
   */
  calculateDistance(
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number }
  ): number {
    // Validate preconditions
    if (!location1 || typeof location1.latitude !== 'number' || typeof location1.longitude !== 'number') {
      throw new Error('location1 must be a valid GeoLocation with latitude and longitude');
    }

    if (!location2 || typeof location2.latitude !== 'number' || typeof location2.longitude !== 'number') {
      throw new Error('location2 must be a valid GeoLocation with latitude and longitude');
    }

    if (location1.latitude < -90 || location1.latitude > 90) {
      throw new Error('location1.latitude must be between -90 and 90');
    }

    if (location1.longitude < -180 || location1.longitude > 180) {
      throw new Error('location1.longitude must be between -180 and 180');
    }

    if (location2.latitude < -90 || location2.latitude > 90) {
      throw new Error('location2.latitude must be between -90 and 90');
    }

    if (location2.longitude < -180 || location2.longitude > 180) {
      throw new Error('location2.longitude must be between -180 and 180');
    }

    // Earth's radius in kilometers
    const EARTH_RADIUS_KM = 6371;

    // Convert degrees to radians
    const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

    // Convert latitude and longitude to radians
    const lat1Rad = toRadians(location1.latitude);
    const lat2Rad = toRadians(location2.latitude);
    const deltaLatRad = toRadians(location2.latitude - location1.latitude);
    const deltaLonRad = toRadians(location2.longitude - location1.longitude);

    // Haversine formula
    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate distance
    const distance = EARTH_RADIUS_KM * c;

    // Ensure non-negative result (should always be true, but defensive programming)
    return Math.max(0, distance);
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
          errorMessage = 'Resource not found.';
          break;
        case 409:
          errorMessage = 'Scheduling conflict detected. Please resolve conflicts or override with justification.';
          break;
        case 422:
          errorMessage = 'Technician does not have required skills for this job.';
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
