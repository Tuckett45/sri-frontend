import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
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

  // Entries cache (all)
  private entriesCache$!: Observable<PreliminaryPunchList[]> | null;
  private entriesCacheData: PreliminaryPunchList[] | null = null;

  // Unresolved/Resolved caches keyed by role|market|endpoint|params
  private unresolvedCacheMap = new Map<string, Observable<any>>();
  private resolvedCacheMap = new Map<string, Observable<any>>();

  // Store the last fetched arrays per key (for counts)
  private unresolvedDataMap = new Map<string, any[]>();
  private resolvedDataMap = new Map<string, any[]>();

  // Page caches (kept from original; clear on writes)
  private unresolvedPageCache: Map<number, PreliminaryPunchList[]> = new Map();
  private resolvedPageCache: Map<number, PreliminaryPunchList[]> = new Map();

  private refreshSubject = new BehaviorSubject<void>(undefined);

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {
    this.entriesCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheMap.clear();
    this.resolvedCacheMap.clear();
    this.unresolvedDataMap.clear();
    this.resolvedDataMap.clear();
    this.unresolvedPageCache.clear();
    this.resolvedPageCache.clear();
  }

  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  private buildKey(user: User, url: string, params?: HttpParams): string {
    return `${user.role}|${user.market}|${url}|${params?.toString() ?? ''}`;
  }

  private clearCaches() {
    this.entriesCache$ = null;
    this.entriesCacheData = null;

    this.unresolvedCacheMap.clear();
    this.resolvedCacheMap.clear();
    this.unresolvedDataMap.clear();
    this.resolvedDataMap.clear();

    this.unresolvedPageCache.clear();
    this.resolvedPageCache.clear();
  }

  // -------------------------------
  // API methods
  // -------------------------------
  getEntries(): Observable<PreliminaryPunchList[]> {
    if (!this.entriesCache$) {
      this.entriesCache$ = this.http
        .get<PreliminaryPunchList[]>(`${environment.apiUrl}/PunchList/all`, this.httpOptions)
        .pipe(
          map(punchLists =>
            punchLists.map(punchList => {
              punchList.issues.forEach((issueArea: IssueArea) => {
                if (typeof issueArea.category === 'string') {
                  // normalize if needed
                  issueArea.category = issueArea.category;
                }
              });
              return punchList;
            })
          ),
          tap(data => (this.entriesCacheData = Array.isArray(data) ? data.slice() : data)),
          catchError(this.handleError),
          shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 }) // 5 min TTL
        );
    }
    return this.entriesCache$;
  }

  getUnresolvedPunchLists(user: User, opts?: { refresh?: boolean }): Observable<any> {
    // choose endpoint + params
    let url: string;
    let params = new HttpParams();
    const isRegional = user.market === 'RG';

    if (user.role === 'PM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/pm-unresolved`;
      params = params.set('state', user.market).set('company', user.company);
    } else if (user.role === 'CM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/cm-unresolved`;
      params = params.set('state', user.market);
    } else {
      url = `${environment.apiUrl}/PunchList/unresolved`;
    }

    const key = this.buildKey(user, url, params);
    if (opts?.refresh) {
      this.unresolvedCacheMap.delete(key);
      this.unresolvedDataMap.delete(key);
    }

    let cached$ = this.unresolvedCacheMap.get(key);
    if (!cached$) {
      const request$ = this.http.get<any>(url, { params, headers: this.httpOptions.headers });
      cached$ = request$.pipe(
        tap(data => this.unresolvedDataMap.set(key, Array.isArray(data) ? data.slice() : data)),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
      );
      this.unresolvedCacheMap.set(key, cached$);
    }
    return cached$;
  }

  getResolvedPunchLists(user: User, opts?: { refresh?: boolean }): Observable<any> {
    let url: string;
    let params = new HttpParams();
    const isRegional = user.market === 'RG';

    if (user.role === 'PM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/pm-resolved`;
      params = params.set('state', user.market).set('company', user.company);
    } else if (user.role === 'CM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/cm-resolved`;
      params = params.set('state', user.market);
    } else {
      url = `${environment.apiUrl}/PunchList/resolved`;
    }

    const key = this.buildKey(user, url, params);
    if (opts?.refresh) {
      this.resolvedCacheMap.delete(key);
      this.resolvedDataMap.delete(key);
    }

    let cached$ = this.resolvedCacheMap.get(key);
    if (!cached$) {
      const request$ = this.http.get<any>(url, { params, headers: this.httpOptions.headers });
      cached$ = request$.pipe(
        tap(data => this.resolvedDataMap.set(key, Array.isArray(data) ? data.slice() : data)),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
      );
      this.resolvedCacheMap.set(key, cached$);
    }
    return cached$;
  }

  getErrorCodes(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.clearCaches();
    return this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  updateEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.clearCaches();
    return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  removeEntry(id: string | undefined): Observable<any> {
    this.clearCaches();
    return this.http.delete<void>(`${environment.apiUrl}/PunchList/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  getCachedUnresolvedCount(user: User): number {
    const key = [...this.unresolvedDataMap.keys()].find(k => k.startsWith(`${user.role}|${user.market}|`));
    if (!key) return 0;
    return (this.unresolvedDataMap.get(key) ?? []).length;
  }

  getCachedResolvedCount(user: User): number {
    const key = [...this.resolvedDataMap.keys()].find(k => k.startsWith(`${user.role}|${user.market}|`));
    if (!key) return 0;
    return (this.resolvedDataMap.get(key) ?? []).length;
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
