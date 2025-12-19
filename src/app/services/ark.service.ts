import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Technician, CreateTechnicianDto, UpdateTechnicianDto } from '../models/ark.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArkService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

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
}
