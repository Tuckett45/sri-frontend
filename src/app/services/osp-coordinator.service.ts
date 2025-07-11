import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { OspCoordinatorItem } from '../models/osp-coordinator-item.model';
import { PagedResult } from '../models/paged-result.model';
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

  private entriesCache$!: Observable<OspCoordinatorItem[]> | null;
  private pagedCache$!: Observable<PagedResult<OspCoordinatorItem>> | null;
  private allCache$!: Observable<OspCoordinatorItem[]> | null;

  constructor(private http: HttpClient) {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.allCache$ = null;
  }

  getStats(): Observable<any[]> {
    // Placeholder for potential dashboard metrics
    return of([]);
  }

  getEntries(page: number = 1, pageSize: number = 25): Observable<OspCoordinatorItem[]> {
    if (!this.entriesCache$) {
      this.entriesCache$ = this.getEntriesPaged(page, pageSize).pipe(map(res => res.items));
    }
    return this.entriesCache$;
  }

  getAllEntries(): Observable<OspCoordinatorItem[]> {
    if (!this.allCache$) {
      this.allCache$ = this.http
        .get<OspCoordinatorItem[]>(`${environment.apiUrl}/osp-coordinators`, this.httpOptions)
        .pipe(shareReplay(1));
    }
    return this.allCache$;
  }

  getEntriesPaged(page: number = 1, pageSize: number = 25): Observable<PagedResult<OspCoordinatorItem>> {
    if (!this.pagedCache$) {
      const params = { page, pageSize };
      this.pagedCache$ = this.http
        .get<PagedResult<OspCoordinatorItem>>(`${environment.apiUrl}/osp-coordinators/paged`, { params, headers: this.httpOptions.headers })
        .pipe(shareReplay(1));
    }
    return this.pagedCache$;
  }

  getEntry(id: string): Observable<OspCoordinatorItem> {
    return this.http.get<OspCoordinatorItem>(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }

  addEntry(entry: OspCoordinatorItem): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.allCache$ = null;
    return this.http.post(`${environment.apiUrl}/osp-coordinators`, entry, this.httpOptions);
  }

  updateEntry(entry: OspCoordinatorItem): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.allCache$ = null;
    return this.http.put(`${environment.apiUrl}/osp-coordinators/${entry.id}`, entry, this.httpOptions);
  }

  deleteEntry(id: string): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.allCache$ = null;
    return this.http.delete(`${environment.apiUrl}/osp-coordinators/${id}`, this.httpOptions);
  }
}
