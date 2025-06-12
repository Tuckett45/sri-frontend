import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OspCoordinatorItem } from '../models/osp-coordinator-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environments';

@Injectable({
  providedIn: 'root'
})
export class OspCoordinatorService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getStats(): Observable<any[]> {
    // Placeholder for potential dashboard metrics
    return of([]);
  }

  getEntries(): Observable<OspCoordinatorItem[]> {
    return this.http.get<OspCoordinatorItem[]>(`${environment.apiUrl}/osp-coordinators`, this.httpOptions);
  }

  getEntry(id: string): Observable<OspCoordinatorItem> {
    return this.http.get<OspCoordinatorItem>(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }

  addEntry(entry: OspCoordinatorItem): Observable<any> {
    return this.http.post(`${environment.apiUrl}/osp-coordinators`, entry, this.httpOptions);
  }

  updateEntry(entry: OspCoordinatorItem): Observable<any> {
    return this.http.put(`${environment.apiUrl}/osp-coordinators/${entry.id}`, entry, this.httpOptions);
  }

  deleteEntry(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }
}
