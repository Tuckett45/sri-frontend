import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';

export interface WorkItem {
  type: string;
  id: string;
  title: string;
  status: string;
  referenceId: string;
  referenceType: string;
  // Job assignments
  scheduledStart?: string;
  scheduledEnd?: string;
  site?: string;
  priority?: string;
  // Quotes
  client?: string;
  updatedAt?: string;
  // PTO
  startDate?: string;
  endDate?: string;
  // Time entries
  clockIn?: string;
  clockOut?: string;
  technicianId?: string;
}

export interface MyWorkResponse {
  userId: string;
  role: string;
  itemCount: number;
  items: WorkItem[];
}

@Injectable({ providedIn: 'root' })
export class MyWorkService {
  private readonly apiUrl = `${environment.atlasApiUrl}/notifications/my-work`;

  constructor(private http: HttpClient) {}

  getMyWork(): Observable<MyWorkResponse> {
    return this.http.get<MyWorkResponse>(this.apiUrl);
  }
}
