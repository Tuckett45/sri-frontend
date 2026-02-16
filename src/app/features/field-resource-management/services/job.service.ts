import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { 
  Job, 
  JobStatus, 
  JobNote, 
  Attachment 
} from '../models/job.model';
import { 
  CreateJobDto, 
  UpdateJobDto, 
  JobFilters 
} from '../models/dtos';

/**
 * Status history entry for tracking job status changes
 */
export interface StatusHistory {
  id: string;
  jobId: string;
  status: JobStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Service for managing job data and operations
 * Handles HTTP communication with the backend API for job-related operations
 */
@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly apiUrl = '/api/jobs';
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves a list of jobs with optional filtering
   * @param filters Optional filters to apply to the job list
   * @returns Observable of job array
   */
  getJobs(filters?: JobFilters): Observable<Job[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.searchTerm) {
        params = params.set('searchTerm', filters.searchTerm);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.priority) {
        params = params.set('priority', filters.priority);
      }
      if (filters.jobType) {
        params = params.set('jobType', filters.jobType);
      }
      if (filters.client) {
        params = params.set('client', filters.client);
      }
      if (filters.technicianId) {
        params = params.set('technicianId', filters.technicianId);
      }
      if (filters.region) {
        params = params.set('region', filters.region);
      }
      if (filters.dateRange) {
        params = params.set('startDate', filters.dateRange.startDate.toISOString());
        params = params.set('endDate', filters.dateRange.endDate.toISOString());
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<Job[]>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves a single job by ID
   * @param id Job ID
   * @returns Observable of job
   */
  getJobById(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new job
   * @param job Job data to create
   * @returns Observable of created job
   */
  createJob(job: CreateJobDto): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, job)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing job
   * @param id Job ID
   * @param job Updated job data
   * @returns Observable of updated job
   */
  updateJob(id: string, job: UpdateJobDto): Observable<Job> {
    return this.http.put<Job>(`${this.apiUrl}/${id}`, job)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Deletes a single job
   * @param id Job ID
   * @returns Observable of void
   */
  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Deletes multiple jobs
   * @param ids Array of job IDs to delete
   * @returns Observable of void
   */
  deleteJobs(ids: string[]): Observable<void> {
    return this.http.request<void>('delete', this.apiUrl, {
      body: { ids }
    })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves jobs assigned to a specific technician
   * @param technicianId Technician ID
   * @param dateRange Optional date range filter
   * @returns Observable of job array
   */
  getJobsByTechnician(technicianId: string, dateRange?: { startDate: Date; endDate: Date }): Observable<Job[]> {
    let params = new HttpParams().set('technicianId', technicianId);
    
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<Job[]>(`${this.apiUrl}/by-technician`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Updates the status of a job
   * @param id Job ID
   * @param status New job status
   * @param reason Optional reason for status change (required for Issue status)
   * @returns Observable of updated job
   */
  updateJobStatus(id: string, status: JobStatus, reason?: string): Observable<Job> {
    const body = { status, reason };
    return this.http.patch<Job>(`${this.apiUrl}/${id}/status`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves the status history for a job
   * @param id Job ID
   * @returns Observable of status history array
   */
  getJobStatusHistory(id: string): Observable<StatusHistory[]> {
    return this.http.get<StatusHistory[]>(`${this.apiUrl}/${id}/status-history`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Adds a note to a job
   * @param id Job ID
   * @param note Note text
   * @returns Observable of created job note
   */
  addJobNote(id: string, note: string): Observable<JobNote> {
    return this.http.post<JobNote>(`${this.apiUrl}/${id}/notes`, { text: note })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves all notes for a job
   * @param id Job ID
   * @returns Observable of job note array
   */
  getJobNotes(id: string): Observable<JobNote[]> {
    return this.http.get<JobNote[]>(`${this.apiUrl}/${id}/notes`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Uploads an attachment to a job with progress tracking
   * @param id Job ID
   * @param file File to upload
   * @returns Observable of HTTP events for progress tracking
   */
  uploadJobAttachment(id: string, file: File): Observable<HttpEvent<Attachment>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest('POST', `${this.apiUrl}/${id}/attachments`, formData, {
      reportProgress: true
    });

    return this.http.request<Attachment>(req)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves all attachments for a job
   * @param id Job ID
   * @returns Observable of attachment array
   */
  getJobAttachments(id: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.apiUrl}/${id}/attachments`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new job from a template
   * @param templateId Template ID
   * @returns Observable of created job
   */
  createJobFromTemplate(templateId: string): Observable<Job> {
    return this.http.post<Job>(`${this.apiUrl}/from-template/${templateId}`, {})
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
          errorMessage = 'Job not found.';
          break;
        case 409:
          errorMessage = 'Conflict. A job with this ID already exists.';
          break;
        case 413:
          errorMessage = 'File too large. Maximum file size is 10 MB.';
          break;
        case 415:
          errorMessage = 'Unsupported file type. Please upload JPEG, PNG, or HEIC files.';
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
