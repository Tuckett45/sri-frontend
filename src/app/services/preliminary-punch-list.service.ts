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
  pageCount?: number;
}

export interface FacetsResponse {
  segmentIds: string[];
  vendors: string[];
  states: string[];
}

@Injectable({ providedIn: 'root' })
export class PreliminaryPunchListService {
  private entriesCache$!: Observable<PagedResponse<PreliminaryPunchList>> | null;
  private entriesCacheData: PagedResponse<PreliminaryPunchList> | null = null;

  private unresolvedCacheMap = new Map<string, Observable<PagedResponse<PreliminaryPunchList>>>();
  private resolvedCacheMap   = new Map<string, Observable<PagedResponse<PreliminaryPunchList>>>();
  private unresolvedDataMap  = new Map<string, PagedResponse<PreliminaryPunchList>>();
  private resolvedDataMap    = new Map<string, PagedResponse<PreliminaryPunchList>>();

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
    return `${user.role}|${user.market}|${user.company ?? ''}|${url}|${params?.toString() ?? ''}`;
  }

  private clearCaches() {
    this.entriesCache$ = null;
    this.entriesCacheData = null;

    this.unresolvedCacheMap.clear();
    this.resolvedCacheMap.clear();
    this.unresolvedDataMap.clear();
    this.resolvedDataMap.clear();
  }

  /** Normalize array OR envelope into a PagedResponse<T> */
  private normalizePaged<T>(resp: any, reqPage: number, reqSize: number): PagedResponse<T> {
    if (Array.isArray(resp)) {
      const total = resp.length;
      const size = reqSize || 25;
      const pageCount = total === 0 ? 0 : Math.ceil(total / size);
      return {
        total,
        page: reqPage,
        pageSize: size,
        pageCount,
        items: resp as T[],
      };
    }

    const total = Number(resp?.total ?? resp?.totalCount ?? resp?.count ?? resp?.Total ?? resp?.TotalCount ?? 0);
    const rawPage = Number(resp?.page ?? resp?.pageNumber ?? reqPage);
    const page  = isNaN(rawPage) ? reqPage : rawPage;
    const sizeRaw = Number(resp?.pageSize ?? reqSize);
    const size = isNaN(sizeRaw) || sizeRaw <= 0 ? 25 : sizeRaw;
    const items = (resp?.items ?? resp?.data ?? resp?.results ?? []) as T[];

    const pageCount = total === 0 ? 0 : Math.ceil(total / size);
    return {
      total,
      page,
      pageSize: size,
      pageCount,
      items
    };
  }

  // ---------------- Basic lists (cached) ----------------

  getEntries(pageNumber = 0, pageSize = 25): Observable<PagedResponse<PreliminaryPunchList>> {
    if (!this.entriesCache$) {
      const params = new HttpParams()
        .set('pageNumber', String(pageNumber))
        .set('pageSize', String(pageSize));

      this.entriesCache$ = this.http
        .get<any>(`${environment.apiUrl}/PunchList/all`, { params, headers: this.httpOptions.headers })
        .pipe(
          map(resp => this.normalizePaged<PreliminaryPunchList>(resp, pageNumber, pageSize)),
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
    pageNumber?: number,
    pageSize?: number,
    opts?: { refresh?: boolean }
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    let url: string;
    let params = new HttpParams();
    if (pageNumber != null) params = params.set('pageNumber', String(pageNumber));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));

    const isRegional = user.market === 'RG';

    if (user.role === 'PM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/pm-unresolved`;
      params = params.set('state', user.market).set('company', user.company ?? '');
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
      const request$ = this.http.get<any>(url, { params, headers: this.httpOptions.headers })
        .pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, Number(pageNumber ?? 0), Number(pageSize ?? 25))));
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
    pageNumber?: number,
    pageSize?: number,
    opts?: { refresh?: boolean }
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    let url: string;
    let params = new HttpParams();
    if (pageNumber != null) params = params.set('pageNumber', String(pageNumber));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));

    const isRegional = user.market === 'RG';

    if (user.role === 'PM' && !isRegional) {
      url = `${environment.apiUrl}/PunchList/pm-resolved`;
      params = params.set('state', user.market).set('company', user.company ?? '');
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
      const request$ = this.http.get<any>(url, { params, headers: this.httpOptions.headers })
        .pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, Number(pageNumber ?? 0), Number(pageSize ?? 25))));
      cached$ = request$.pipe(
        tap(resp => this.resolvedDataMap.set(key, resp)),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
      );
      this.resolvedCacheMap.set(key, cached$);
    }
    return cached$;
  }

  getAllUnresolved(pageNumber?: number, pageSize?: number) {
    let params = new HttpParams();
    if (pageNumber != null) params = params.set('pageNumber', String(pageNumber));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));
    return this.http.get<any>(
      `${environment.apiUrl}/PunchList/unresolved`,
      { ...this.httpOptions, params }
    ).pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, Number(pageNumber ?? 0), Number(pageSize ?? 25))));
  }

  getAllResolved(pageNumber?: number, pageSize?: number) {
    let params = new HttpParams();
    if (pageNumber != null) params = params.set('pageNumber', String(pageNumber));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));
    return this.http.get<any>(
      `${environment.apiUrl}/PunchList/resolved`,
      { ...this.httpOptions, params }
    ).pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, Number(pageNumber ?? 0), Number(pageSize ?? 25))));
  }

  // ---------------- SEARCH (unified type) ----------------

  searchResolvedPunchLists(
    user: User,
    term: string,
    pageNumber: number,
    pageSize: number
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    return this.searchPunchLists(term, pageNumber, pageSize, { resolved: 'resolved', user });
  }

  searchUnresolvedPunchLists(
    user: User,
    term: string,
    pageNumber: number,
    pageSize: number
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    return this.searchPunchLists(term, pageNumber, pageSize, { resolved: 'unresolved', user });
  }

  private searchPunchLists(
    term: string,
    pageNumber: number,
    pageSize: number,
    opts: { resolved: 'resolved' | 'unresolved'; user: User }
  ): Observable<PagedResponse<PreliminaryPunchList>> {
    let params = new HttpParams()
      .set('term', term ?? '')
      .set('resolved', opts.resolved)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (opts.user?.market && opts.user?.market !== 'RG')  params = params.set('state', opts.user.market);
    if (opts.user?.company && opts.user?.company !== 'SRI') params = params.set('company', opts.user.company);

    const url = `${environment.apiUrl}/PunchList/search`;

    return this.http.get<any>(url, { params, headers: this.httpOptions.headers })
      .pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, pageNumber, pageSize)));
  }

  getFacets(
    resolved: 'all' | 'resolved' | 'unresolved' = 'all',
    state?: string | null,
    company?: string | null
  ): Observable<FacetsResponse> {
    let params = new HttpParams().set('resolved', resolved);
    if (state)   params = params.set('state', state);
    if (company) params = params.set('company', company);
    return this.http.get<FacetsResponse>(`${environment.apiUrl}/PunchList/facets`, { params });
  }

  // ---------------- Misc ----------------

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
