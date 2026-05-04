import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { 
  Job, 
  JobStatus, 
  JobNote, 
  Attachment,
  ContactInfo,
  JobReadiness,
  CustomerReady
} from '../models/job.model';
import { Skill } from '../models/technician.model';
import {
  CreateJobDto,
  UpdateJobDto,
  JobFilters
} from '../models/dtos';
import { environment, local_environment } from '../../../../environments/environments';

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
  private readonly apiUrl = `${local_environment.apiUrl}/jobs`;
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
      if (filters.market) {
        params = params.set('market', filters.market);
      }
      if (filters.company) {
        params = params.set('company', filters.company);
      }
      if (filters.jobReadiness) {
        params = params.set('jobReadiness', filters.jobReadiness);
      }
      if (filters.customerReady) {
        params = params.set('customerReady', filters.customerReady);
      }
      if (filters.dateRange) {
        params = params.set('startDate', filters.dateRange.startDate.toISOString());
        params = params.set('endDate', filters.dateRange.endDate.toISOString());
      }
      if (filters.startDate) {
        params = params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params = params.set('endDate', filters.endDate.toISOString());
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<any>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        map(response => {
          // Handle wrapped responses from .NET APIs
          let jobs: any[];
          if (Array.isArray(response)) jobs = response;
          else if (response?.$values) jobs = response.$values;
          else if (response?.data) jobs = response.data;
          else if (response?.items) jobs = response.items;
          else if (response?.results) jobs = response.results;
          else jobs = [];
          return jobs.map(job => this.mapJobResponse(job));
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves a single job by ID
   * @param id Job ID
   * @returns Observable of job
   */
  getJobById(id: string): Observable<Job> {
    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(this.retryCount),
        map(response => this.mapJobResponse(response?.data || response)),
        catchError(this.handleError)
      );
  }

  /**
   * Creates a new job
   * @param job Job data to create
   * @returns Observable of created job
   */
  createJob(job: CreateJobDto): Observable<Job> {
    const payload = this.prepareJobPayload(job);
    return this.http.post<Job>(this.apiUrl, payload)
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
    const payload = this.prepareJobPayload(job);
    return this.http.put<Job>(`${this.apiUrl}/${id}`, payload)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Transforms the DTO before sending to the API.
   * Converts requiredSkills from Skill[] to the shape the backend expects
   * (array of { skillName: string }).
   */
  private prepareJobPayload(dto: CreateJobDto | UpdateJobDto): any {
    const payload: any = { ...dto };
    if (dto.requiredSkills && Array.isArray(dto.requiredSkills)) {
      payload.requiredSkills = dto.requiredSkills.map(s => ({
        skillName: (s as any).name || (s as any).skillName || (s as any).SkillName || String(s)
      }));
    }
    return payload;
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
    return this.http.post<any>(`${this.apiUrl}/${id}/notes`, { text: note })
      .pipe(
        map(raw => this.mapJobNoteResponse(raw)),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves all notes for a job
   * @param id Job ID
   * @returns Observable of job note array
   */
  getJobNotes(id: string): Observable<JobNote[]> {
    return this.http.get<any>(`${this.apiUrl}/${id}/notes`)
      .pipe(
        retry(this.retryCount),
        map(response => {
          let items: any[];
          if (Array.isArray(response)) items = response;
          else if (response?.$values) items = response.$values;
          else if (response?.data) items = response.data;
          else items = [];
          return items.map(n => this.mapJobNoteResponse(n));
        }),
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
    return this.http.get<any>(`${this.apiUrl}/${id}/attachments`)
      .pipe(
        retry(this.retryCount),
        map(response => {
          let items: any[];
          if (Array.isArray(response)) items = response;
          else if (response?.$values) items = response.$values;
          else if (response?.data) items = response.data;
          else items = [];
          return items;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Downloads an attachment file as a Blob via the API (with auth headers).
   * @param jobId Job ID
   * @param attachmentId Attachment ID
   * @returns Observable of Blob
   */
  downloadAttachment(jobId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${jobId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    ).pipe(
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
   * Maps API response fields (PascalCase / flat) to frontend model (camelCase / nested)
   */
  private mapJobResponse(raw: any): Job {
    if (!raw) return raw;
    return {
      id: raw.id || raw.Id || '',
      jobId: raw.jobId || raw.JobId || raw.title || raw.Title || '',
      title: raw.title || raw.Title,
      client: raw.client || raw.Client || '',
      siteName: raw.siteName || raw.SiteName || '',
      siteAddress: this.mapSiteAddress(raw),
      jobType: raw.jobType || raw.JobType || 'Install',
      priority: raw.priority || raw.Priority || 'Normal',
      status: this.normalizeJobStatus(raw.status || raw.Status) || JobStatus.NotStarted,
      scopeDescription: raw.scopeDescription || raw.ScopeDescription || raw.description || raw.Description || '',
      requiredSkills: this.mapRequiredSkills(raw.requiredSkills || raw.RequiredSkills || raw.jobRequiredSkills || raw.JobRequiredSkills),
      requiredCrewSize: raw.requiredCrewSize ?? raw.RequiredCrewSize ?? 0,
      estimatedLaborHours: raw.estimatedLaborHours ?? raw.EstimatedLaborHours ?? 0,
      scheduledStartDate: raw.scheduledStartDate || raw.ScheduledStartDate || raw.scheduledStart || raw.ScheduledStart,
      scheduledEndDate: raw.scheduledEndDate || raw.ScheduledEndDate || raw.scheduledEnd || raw.ScheduledEnd,
      actualStartDate: raw.actualStartDate || raw.ActualStartDate || raw.actualStart || raw.ActualStart,
      actualEndDate: raw.actualEndDate || raw.ActualEndDate || raw.actualEnd || raw.ActualEnd,
      customerPOC: raw.customerPOC || raw.CustomerPOC || this.mapCustomerPOC(raw),
      attachments: raw.attachments || raw.Attachments || [],
      notes: raw.notes || raw.Notes || [],
      region: raw.region || raw.Region || raw.market || raw.Market || '',
      market: raw.market || raw.Market || raw.region || raw.Region || '',
      company: raw.company || raw.Company || '',
      technicianId: raw.technicianId || raw.TechnicianId,
      crewId: raw.crewId || raw.CrewId,
      templateId: raw.templateId || raw.TemplateId,
      // Pricing / Billing
      authorizationStatus: raw.authorizationStatus || raw.AuthorizationStatus,
      hasPurchaseOrders: raw.hasPurchaseOrders ?? raw.HasPurchaseOrders,
      purchaseOrderNumber: raw.purchaseOrderNumber || raw.PurchaseOrderNumber,
      standardBillRate: raw.standardBillRate ?? raw.StandardBillRate,
      overtimeBillRate: raw.overtimeBillRate ?? raw.OvertimeBillRate,
      perDiem: raw.perDiem ?? raw.PerDiem,
      invoicingProcess: raw.invoicingProcess || raw.InvoicingProcess,
      // SRI Internal
      projectDirector: raw.projectDirector || raw.ProjectDirector,
      targetResources: raw.targetResources ?? raw.TargetResources,
      bizDevContact: raw.bizDevContact || raw.BizDevContact,
      requestedHours: raw.requestedHours ?? raw.RequestedHours,
      overtimeRequired: raw.overtimeRequired ?? raw.OvertimeRequired,
      estimatedOvertimeHours: raw.estimatedOvertimeHours ?? raw.EstimatedOvertimeHours,
      // Job Readiness
      jobReadiness: this.normalizeJobReadiness(raw.jobReadiness || raw.JobReadiness),
      customerReady: this.normalizeCustomerReady(raw.customerReady || raw.CustomerReady),
      // Quote Workflow Reference
      quoteWorkflowId: raw.quoteWorkflowId || raw.QuoteWorkflowId,
      createdBy: raw.createdBy || raw.CreatedBy || '',
      createdAt: raw.createdAt || raw.CreatedAt,
      updatedAt: raw.updatedAt || raw.UpdatedAt
    };
  }

  /**
   * Maps raw required-skills data from the API to the frontend Skill interface.
   * Handles the JobRequiredSkills table shape (Id, SkillName) as well as
   * the full Skill shape (id, name, category, level).
   */
  private mapRequiredSkills(raw: any[] | undefined | null): Skill[] {
    if (!raw || !Array.isArray(raw)) return [];

    // Handle $values wrapper from .NET serialization
    const items = (raw as any).$values ?? raw;

    return items.map((s: any) => ({
      id: s.id || s.Id || '',
      name: s.name || s.Name || s.skillName || s.SkillName || '',
      category: s.category || s.Category || 'General',
      level: s.level || s.Level || 'BEGINNER'
    }));
  }

  /**
   * Normalizes a status string from the API to a valid JobStatus enum value.
   * Handles snake_case, lowercase, spaced, and PascalCase variants.
   */
  private normalizeJobStatus(value: string | undefined | null): JobStatus | null {
    if (!value) return null;

    // Build a lookup map keyed by lowercase enum value
    const statusMap: Record<string, JobStatus> = {};
    for (const s of Object.values(JobStatus)) {
      statusMap[s.toLowerCase()] = s;
    }

    // Try direct lowercase match first (handles PascalCase & lowercase)
    const lower = value.toLowerCase();
    if (statusMap[lower]) return statusMap[lower];

    // Try after stripping underscores, hyphens, and spaces
    const stripped = lower.replace(/[_\- ]/g, '');
    if (statusMap[stripped]) return statusMap[stripped];

    // No match — return null so the caller falls back to default
    console.warn(`JobService: unrecognised job status "${value}", defaulting to NotStarted`);
    return null;
  }

  /**
   * Normalizes a job readiness string from the API to a valid JobReadiness enum value.
   */
  private normalizeJobReadiness(value: string | undefined | null): JobReadiness | undefined {
    if (!value) return undefined;

    const readinessMap: Record<string, JobReadiness> = {};
    for (const r of Object.values(JobReadiness)) {
      readinessMap[r.toLowerCase()] = r;
    }

    const lower = value.toLowerCase();
    if (readinessMap[lower]) return readinessMap[lower];

    const stripped = lower.replace(/[_\- ]/g, '');
    for (const [key, val] of Object.entries(readinessMap)) {
      if (key.replace(/[_\- ]/g, '') === stripped) return val;
    }

    return undefined;
  }

  /**
   * Normalizes a customer ready string from the API to a valid CustomerReady enum value.
   */
  private normalizeCustomerReady(value: string | undefined | null): CustomerReady | undefined {
    if (!value) return undefined;

    const readyMap: Record<string, CustomerReady> = {};
    for (const r of Object.values(CustomerReady)) {
      readyMap[r.toLowerCase()] = r;
    }

    const lower = value.toLowerCase();
    if (readyMap[lower]) return readyMap[lower];

    const stripped = lower.replace(/[_\- ]/g, '');
    for (const [key, val] of Object.entries(readyMap)) {
      if (key.replace(/[_\- ]/g, '') === stripped) return val;
    }

    return undefined;
  }

  /**
   * Maps API response fields (PascalCase / flat) to frontend JobNote model (camelCase)
   */
  private mapJobNoteResponse(raw: any): JobNote {
    if (!raw) return raw;
    return {
      id: raw.id || raw.Id || '',
      jobId: raw.jobId || raw.JobId || '',
      text: raw.text || raw.Text || '',
      author: raw.author || raw.Author || '',
      createdAt: raw.createdAt || raw.CreatedAt || new Date(),
      updatedAt: raw.updatedAt || raw.UpdatedAt
    };
  }

  /**
   * Maps site address from API response, handling:
   * - Nested object (siteAddress / SiteAddress) with PascalCase or camelCase keys
   * - Flat fields (siteStreet, SiteStreet, siteLatitude, SiteLatitude, etc.)
   * Ensures latitude/longitude are preserved when the API provides them.
   */
  private mapSiteAddress(raw: any): any {
    const nested = raw.siteAddress || raw.SiteAddress;

    const street = nested?.street || nested?.Street || raw.siteStreet || raw.SiteStreet || '';
    const city = nested?.city || nested?.City || raw.siteCity || raw.SiteCity || '';
    const state = nested?.state || nested?.State || raw.siteState || raw.SiteState || '';
    const zipCode = nested?.zipCode || nested?.ZipCode || nested?.postalCode || nested?.PostalCode || raw.siteZipCode || raw.SiteZipCode || '';

    const lat = nested?.latitude ?? nested?.Latitude ?? raw.siteLatitude ?? raw.SiteLatitude ?? raw.latitude ?? raw.Latitude;
    const lng = nested?.longitude ?? nested?.Longitude ?? raw.siteLongitude ?? raw.SiteLongitude ?? raw.longitude ?? raw.Longitude;

    return {
      street,
      city,
      state,
      zipCode,
      ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {})
    };
  }

  /**
   * Maps flat CustomerPOC fields from DB response to nested ContactInfo
   */
  private mapCustomerPOC(raw: any): ContactInfo | undefined {
    const name = raw.customerPOCName || raw.CustomerPOCName;
    const phone = raw.customerPOCPhone || raw.CustomerPOCPhone;
    const email = raw.customerPOCEmail || raw.CustomerPOCEmail;
    if (!name && !phone && !email) return undefined;
    return { name: name || '', phone: phone || '', email: email || '' };
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
          errorMessage = 'Unsupported file type. Please upload JPEG, PNG, HEIC, PDF, DOC, or DOCX files.';
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
