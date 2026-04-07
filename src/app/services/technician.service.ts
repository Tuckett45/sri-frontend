import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { Technician, TechnicianListItem } from '../models/technician.model';
import { TechnicianStatus } from '../models/technician-status.enum';

@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private readonly baseUrl = `${environment.apiUrl}/technicians`;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getAllTechnicians(): Observable<TechnicianListItem[]> {
    return this.http.get<TechnicianListItem[]>(this.baseUrl, this.httpOptions);
  }

  getTechnicianById(id: string): Observable<Technician> {
    return this.http.get<Technician>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  getAvailableTechnicians(): Observable<TechnicianListItem[]> {
    return this.http.get<TechnicianListItem[]>(
      `${this.baseUrl}/available`,
      this.httpOptions
    );
  }

  updateTechnicianStatus(id: string, status: TechnicianStatus): Observable<Technician> {
    return this.http.put<Technician>(
      `${this.baseUrl}/${id}/status`,
      { status },
      this.httpOptions
    );
  }

  updateTechnicianLocation(
    id: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${id}/location`,
      {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
      },
      this.httpOptions
    );
  }

  createTechnician(technician: Partial<Technician>): Observable<Technician> {
    return this.http.post<Technician>(this.baseUrl, technician, this.httpOptions);
  }

  updateTechnician(id: string, technician: Partial<Technician>): Observable<Technician> {
    return this.http.put<Technician>(
      `${this.baseUrl}/${id}`,
      technician,
      this.httpOptions
    );
  }

  deleteTechnician(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }
}

