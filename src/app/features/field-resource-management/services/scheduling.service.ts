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
   * Assigns a technician to a job
   * @param jobId Job ID
   * @param technicianId Technician ID
   * @param overrideConflicts Whether to override scheduling conflicts
   * @param justification Justification for overriding conflicts (required if overrideConflicts is true)
   * @returns Observable of created assignment
   */
  assignTechnician(
    jobId: string, 
    technicianId: string, 
    overrideConflicts: boolean = false, 
    justification?: string
  ): Observable<Assignment> {
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
   * @returns Observable of new assignment
   */
  reassignJob(
    jobId: string, 
    fromTechnicianId: string, 
    toTechnicianId: string, 
    reason?: string
  ): Observable<Assignment> {
    const dto: ReassignmentDto = {
      jobId,
      fromTechnicianId,
      toTechnicianId,
      reason
    };

    return this.http.post<Assignment>(`${this.apiUrl}/reassign`, dto)
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
