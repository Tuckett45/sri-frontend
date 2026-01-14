import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { OspCoordinatorItem } from '../models/osp-coordinator-item.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environments';

@Injectable({
  providedIn: 'root'
})
export class OspCoordinatorService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
      // API subscription key will be added automatically by ConfigurationInterceptor
    })
  };

  private entriesCache$!: Observable<OspCoordinatorItem[]> | null;

  constructor(private http: HttpClient) {
    this.entriesCache$ = null;
  }

  getStats(): Observable<any[]> {
    // Placeholder for potential dashboard metrics
    return of([]);
  }

  getEntries(): Observable<OspCoordinatorItem[]> {
    if (!this.entriesCache$) {
      this.entriesCache$ = this.http
        .get<OspCoordinatorItem[]>(`${environment.apiUrl}/osp-coordinators`, this.httpOptions)
        .pipe(shareReplay(1));
    }
    return this.entriesCache$;
  }

  getEntry(id: string): Observable<OspCoordinatorItem> {
    return this.http.get<OspCoordinatorItem>(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }

  addEntry(entry: OspCoordinatorItem): Observable<any> {
    this.entriesCache$ = null;
    return this.http.post(`${environment.apiUrl}/osp-coordinators`, entry, this.httpOptions);
  }

  updateEntry(entry: OspCoordinatorItem): Observable<any> {
    this.entriesCache$ = null;
    return this.http.put(`${environment.apiUrl}/osp-coordinators/${entry.id}`, entry, this.httpOptions);
  }

  deleteEntry(id: string): Observable<any> {
    this.entriesCache$ = null;
    return this.http.delete(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }
}
