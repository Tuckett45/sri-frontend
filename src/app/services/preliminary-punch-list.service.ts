import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { local_environment, environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {

  private entriesCache$!: Observable<PreliminaryPunchList[]> | null;
  private unresolvedCache$!: Observable<any> | null;
  private resolvedCache$!: Observable<any> | null;
  private entriesCacheData: PreliminaryPunchList[] | null = null;
  private unresolvedCacheData: PreliminaryPunchList[] | null = null;
  private resolvedCacheData: PreliminaryPunchList[] | null = null;
  private unresolvedPageCache = new Map<string, PreliminaryPunchList[]>();
  private resolvedPageCache = new Map<string, PreliminaryPunchList[]>();

  private refreshSubject = new BehaviorSubject<void>(undefined);

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };
  
  constructor(private http: HttpClient) {
    this.entriesCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    this.unresolvedPageCache.clear();
    this.resolvedPageCache.clear();
  }

  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  getEntries(): Observable<PreliminaryPunchList[]> {
    if (!this.entriesCache$) {
      this.entriesCache$ = this.http
        .get<PreliminaryPunchList[]>(`${environment.apiUrl}/PunchList/all`, this.httpOptions)
        .pipe(
          map(punchLists =>
            punchLists.map(punchList => {
              punchList.issues.forEach(issueArea => {
                if (typeof issueArea.category === 'string') {
                  issueArea.category = issueArea.category;
                }
              });
              return punchList;
            })
          ),
          tap(data => (this.entriesCacheData = JSON.parse(JSON.stringify(data)))),
          catchError(this.handleError),
          shareReplay(1)
        );
    }
    return this.entriesCache$;
  }

  getUnresolvedPunchLists(user: User, page: number, pageSize: number): Observable<any> {
    const key = `${page}-${pageSize}-${user.role}-${user.market}`;
    const cached = this.unresolvedPageCache.get(key);
    if (cached) {
      return of(cached);
    }

    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (user.market) {
      params = params.set('state', user.market);
    }

    let request$;
    if (user.role === 'PM' && user.market !== 'RG') {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/pm-unresolved`, { params });
    } else if (user.role === 'CM' && user.market !== 'RG') {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/cm-unresolved`, { params });
    } else {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/unresolved`, { params });
    }

    return request$.pipe(
      tap(data => this.unresolvedPageCache.set(key, data)),
      catchError(this.handleError)
    );
  }

  getResolvedPunchLists(user: User, page: number, pageSize: number): Observable<any> {
    const key = `${page}-${pageSize}-${user.role}-${user.market}`;
    const cached = this.resolvedPageCache.get(key);
    if (cached) {
      return of(cached);
    }

    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (user.market) {
      params = params.set('state', user.market);
    }

    let request$;
    if (user.role === 'PM' && user.market !== 'RG') {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/pm-resolved`, { params });
    } else if (user.role === 'CM' && user.market !== 'RG') {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/cm-resolved`, { params });
    } else {
      request$ = this.http.get<any>(`${environment.apiUrl}/PunchList/resolved`, { params });
    }

    return request$.pipe(
      tap(data => this.resolvedPageCache.set(key, data)),
      catchError(this.handleError)
    );
  }

  getErrorCodes(): Observable<any> {
      return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.entriesCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  updateEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.entriesCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  removeEntry(id: string | undefined): Observable<any> {
    this.entriesCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.delete<void>(`${environment.apiUrl}/PunchList/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  reset(): void {
    this.entriesCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    this.unresolvedPageCache.clear();
    this.resolvedPageCache.clear();
  }

  getCachedUnresolvedCount(): number {
    return this.unresolvedCacheData ? this.unresolvedCacheData.length : 0;
  }

  getCachedResolvedCount(): number {
    return this.resolvedCacheData ? this.resolvedCacheData.length : 0;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Unknown error!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server-side error: ${error.status} ${error.message}`;
    }
    return throwError(errorMessage);
  }
}