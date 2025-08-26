import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { environment, local_environment } from '../../environments/environments';
import { User } from '../models/user.model';

export interface PagedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class PreliminaryPunchListService {
  private entriesCache$!: Observable<PagedResponse<PreliminaryPunchList>> | null;
  private entriesCacheData: PagedResponse<PreliminaryPunchList> | null = null;
  private unresolvedCacheMap = new Map<string, Observable<PagedResponse<PreliminaryPunchList>>>();
  private resolvedCacheMap = new Map<string, Observable<PagedResponse<PreliminaryPunchList>>>();
  private unresolvedDataMap = new Map<string, PagedResponse<PreliminaryPunchList>>();
  private resolvedDataMap = new Map<string, PagedResponse<PreliminaryPunchList>>();

  private refreshSubject = new BehaviorSubject<void>(undefined);

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  readonly refresh$ = this.refreshSubject.asObservable();
  triggerRefresh(): void { this.refreshSubject.next(); }

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
  }

  getEntries(pageNumber = 1, pageSize = 25): Observable<PagedResponse<PreliminaryPunchList>> {
    if (!this.entriesCache$) {
      const params = new HttpParams()
        .set('pageNumber', String(pageNumber))
        .set('pageSize', String(pageSize));

      this.entriesCache$ = this.http
        .get<PreliminaryPunchList[]>(`${environment.apiUrl}/PunchList/all`, this.httpOptions)
        .pipe(
          map(resp => ({
            ...resp,
            items: resp.items.map(p => {
              p.issues.forEach((ia: IssueArea) => {
                if (typeof ia.category === 'string') ia.category = ia.category;
              });
              return p;
            })
          })),
          tap(resp => (this.entriesCacheData = resp)),
          catchError(this.handleError),
          shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
        );
    }
    return this.entriesCache$;
  }

  getUnresolvedPunchLists(
    user: User,
    pageNumber = 1,
    pageSize = 25,
    opts?: { refresh?: boolean }
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    let url: string;
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

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
      const request$ = this.http.get<PagedResponse<PreliminaryPunchList>>(url, {
        params,
        headers: this.httpOptions.headers
      });
      cached$ = request$.pipe(
        tap(resp => this.unresolvedDataMap.set(key, resp)),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
      );
      this.unresolvedCacheMap.set(key, cached$);
    }
    return cached$;
  }

  getResolvedPunchLists(
    user: User,
    pageNumber = 1,
    pageSize = 25,
    opts?: { refresh?: boolean }
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    let url: string;
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

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
      const request$ = this.http.get<PagedResponse<PreliminaryPunchList>>(url, {
        params,
        headers: this.httpOptions.headers
      });
      cached$ = request$.pipe(
        tap(resp => this.resolvedDataMap.set(key, resp)),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
      );
      this.resolvedCacheMap.set(key, cached$);
    }
    return cached$;
  }

  getAllUnresolved(pageNumber = 1, pageSize = 10) {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http.get<PagedResponse<PreliminaryPunchList>>(
      `${local_environment.apiUrl}/PunchList/unresolved`,
      { ...this.httpOptions, params }
    );
  }

  getAllResolved(pageNumber = 1, pageSize = 10) {
    const params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));
    return this.http.get<PagedResponse<PreliminaryPunchList>>(
      `${local_environment.apiUrl}/PunchList/resolved`,
      { ...this.httpOptions, params }
    );
  }

  getErrorCodes(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.clearCaches();
    return this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.clearCaches();
    return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  removeEntry(id: string | undefined): Observable<any> {
    this.clearCaches();
    return this.http.delete<void>(`${environment.apiUrl}/PunchList/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getCachedUnresolvedCount(user: User): number {
    const prefix = `${user.role}|${user.market}|`;
    const latestKey = [...this.unresolvedDataMap.keys()].find(k => k.startsWith(prefix));
    if (!latestKey) return 0;
    return this.unresolvedDataMap.get(latestKey)?.total ?? 0;
  }

  getCachedResolvedCount(user: User): number {
    const prefix = `${user.role}|${user.market}|`;
    const latestKey = [...this.resolvedDataMap.keys()].find(k => k.startsWith(prefix));
    if (!latestKey) return 0;
    return this.resolvedDataMap.get(latestKey)?.total ?? 0;
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
