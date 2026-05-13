import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environments';
import { AuthService } from './auth.service';
import {
  Technician,
  TechnicianListResponse,
  TechnicianQueryParams,
  Job,
  JobListResponse,
  JobQueryParams,
  DailyJobsResponse,
  JobStatusUpdateRequest
} from '../models/field-resource.model';

@Injectable({ providedIn: 'root' })
export class FieldResourceService {
  private readonly crmBase = `${environment.apiUrl}/crm`;
  private readonly jobsBase = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private withAuth<T>(callback: (options: { headers: HttpHeaders }) => Observable<T>): Observable<T> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap(token => {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
          const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          headers = headers.set('Authorization', value);
        }
        return callback({ headers });
      })
    );
  }

  // ── Technicians ──────────────────────────────────────────────────────────

  getTechnicians(params?: TechnicianQueryParams): Observable<TechnicianListResponse> {
    let httpParams = new HttpParams();
    if (params?.employmentStatus) httpParams = httpParams.set('employmentStatus', params.employmentStatus);
    if (params?.skillId) httpParams = httpParams.set('skillId', params.skillId);
    if (params?.page != null) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.withAuth(options =>
      this.http.get<TechnicianListResponse>(`${this.crmBase}/technicians`, { ...options, params: httpParams })
    );
  }

  getTechnician(id: string): Observable<Technician> {
    return this.withAuth(options =>
      this.http.get<Technician>(`${this.crmBase}/technicians/${id}`, options)
    );
  }

  getDailyJobs(technicianId: string, date?: Date): Observable<DailyJobsResponse> {
    let httpParams = new HttpParams();
    if (date) httpParams = httpParams.set('date', date.toISOString());

    return this.withAuth(options =>
      this.http.get<DailyJobsResponse>(
        `${this.crmBase}/technicians/${technicianId}/daily-jobs`,
        { ...options, params: httpParams }
      )
    );
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────

  getJobs(params?: JobQueryParams): Observable<JobListResponse> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.priority) httpParams = httpParams.set('priority', params.priority);
    if (params?.technicianId) httpParams = httpParams.set('technicianId', params.technicianId);
    if (params?.deploymentId) httpParams = httpParams.set('deploymentId', params.deploymentId);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.page != null) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.withAuth(options =>
      this.http.get<JobListResponse>(`${this.jobsBase}`, { ...options, params: httpParams })
    );
  }

  getJob(id: string): Observable<Job> {
    return this.withAuth(options =>
      this.http.get<Job>(`${this.jobsBase}/${id}`, options)
    );
  }

  updateJobStatus(id: string, request: JobStatusUpdateRequest): Observable<Job> {
    return this.withAuth(options =>
      this.http.put<Job>(`${this.jobsBase}/${id}/status`, request, options)
    );
  }
}
