import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Technician, CreateTechnicianDto, UpdateTechnicianDto, Job, CreateJobDto, UpdateJobDto } from '../models/ark.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArkService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Technician methods
  getAllTechnicians(): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${this.apiUrl}/technicians`);
  }

  getTechnicianById(id: number): Observable<Technician> {
    return this.http.get<Technician>(`${this.apiUrl}/technicians/${id}`);
  }

  getAvailableTechnicians(): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${this.apiUrl}/technicians/available`);
  }

  getTechniciansByRegion(region: string): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${this.apiUrl}/technicians/region/${region}`);
  }

  createTechnician(dto: CreateTechnicianDto): Observable<Technician> {
    return this.http.post<Technician>(`${this.apiUrl}/technicians`, dto);
  }

  updateTechnician(id: number, dto: UpdateTechnicianDto): Observable<Technician> {
    return this.http.put<Technician>(`${this.apiUrl}/technicians/${id}`, dto);
  }

  deleteTechnician(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/technicians/${id}`);
  }

  // Job methods
  getAllJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs`);
  }

  getJobById(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/jobs/${id}`);
  }

  getJobsByStatus(status: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs/status/${status}`);
  }

  getJobsByPriority(priority: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs/priority/${priority}`);
  }

  getJobsByCustomer(customerName: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/jobs/customer/${customerName}`);
  }

  getJobsByDateRange(startDate: Date, endDate: Date): Observable<Job[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<Job[]>(`${this.apiUrl}/jobs/daterange`, { params });
  }

  createJob(dto: CreateJobDto): Observable<Job> {
    return this.http.post<Job>(`${this.apiUrl}/jobs`, dto);
  }

  updateJob(id: number, dto: UpdateJobDto): Observable<Job> {
    return this.http.put<Job>(`${this.apiUrl}/jobs/${id}`, dto);
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/jobs/${id}`);
  }
}
