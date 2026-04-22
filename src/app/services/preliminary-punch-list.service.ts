import { Injectable, effect } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { environment, local_environment } from '../../environments/environments';
import { User } from '../models/user.model';
import { OfflineCacheService } from './offline-cache.service';

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

export type SearchParams = {
  term?: string;
  resolved: 'resolved' | 'unresolved';
  page: number;         // 0-based page index expected by controller
  pageSize: number;

  // legacy/role scope
  state?: string | null;
  company?: string | null;

  // multi-selects (either CSVs or arrays – service will build CSVs if arrays provided)
  segmentIdsCsv?: string;
  vendorsCsv?: string;
  statesCsv?: string;
  segmentIds?: string[];
  vendors?: string[];
  states?: string[];

  // date windows (string ISO or Date)
  dateReportedStart?: string | Date | null;
  dateReportedEnd?: string | Date | null;
  resolvedStart?: string | Date | null;
  resolvedEnd?: string | Date | null;
};

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
      'Content-Type': 'application/json'
      // API subscription key will be added automatically by ConfigurationInterceptor
    })
  };

  private previousOnline = true;

  constructor(private http: HttpClient, private offlineCache: OfflineCacheService) {
    this.previousOnline = this.offlineCache.isOnline();

    effect(() => {
      const currentlyOnline = this.offlineCache.online();
      if (currentlyOnline && !this.previousOnline) {
        this.clearCaches();
        this.triggerRefresh();
      }
      this.previousOnline = currentlyOnline;
    });
  }

  readonly refresh$ = this.refreshSubject.asObservable();
  triggerRefresh(): void { this.refreshSubject.next(); }

  // -------- helpers --------
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

  // Basic string/date normalizers for search params
  private norm(s?: string | null): string {
    return (s ?? '').replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trim();
  }
  private normUpper(s?: string | null): string {
    return this.norm(s).toUpperCase();
  }
  private toIso(d?: string | Date | null): string {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toISOString();
  }

  // ---------------- Basic lists (cached) ----------------

  getEntries(pageNumber = 0, pageSize = 25): Observable<PagedResponse<PreliminaryPunchList>> {
    const offline$ = from(this.offlineCache.getPunchLists()).pipe(
      map(items => this.buildOfflineResponse(items)),
      tap(resp => (this.entriesCacheData = resp))
    );

    if (!this.entriesCache$) {
      if (!this.offlineCache.isOnline()) {
        this.entriesCache$ = offline$.pipe(
          catchError(error => this.handleError(error as HttpErrorResponse)),
          shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
        );
        return this.entriesCache$;
      }

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
          tap(resp => { void this.offlineCache.savePunchLists(resp.items); }),
          catchError(error =>
            offline$.pipe(
              catchError(() => this.handleError(error as HttpErrorResponse))
            )
          ),
          shareReplay({ bufferSize: 1, refCount: true, windowTime: 5 * 60 * 1000 })
        );
    }
    return this.entriesCache$;
  }

  private buildOfflineResponse(items: PreliminaryPunchList[]): PagedResponse<PreliminaryPunchList> {
    const normalized = items ?? [];
    const total = normalized.length;
    const size = total === 0 ? 0 : total;
    return {
      total,
      page: 0,
      pageSize: size,
      pageCount: total === 0 ? 0 : 1,
      items: normalized
    };
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

  // ---------------- UNIFIED SEARCH (combined filters) ----------------

  public searchPunchLists(params: SearchParams): Observable<PagedResponse<PreliminaryPunchList>> {
  const url = `${environment.apiUrl}/PunchList/search`;

  // Build CSVs from arrays if arrays were provided
  const segCsv =
    params.segmentIdsCsv ??
    (params.segmentIds ? params.segmentIds.map(v => this.norm(v)).filter(Boolean).join(',') : '');
  const vendCsv =
    params.vendorsCsv ??
    (params.vendors ? params.vendors.map(v => this.norm(v)).filter(Boolean).join(',') : '');
  const statesCsv =
    params.statesCsv ??
    (params.states ? params.states.map(v => this.normUpper(v)).filter(Boolean).join(',') : '');

  let hp = new HttpParams()
    .set('term', this.norm(params.term ?? ''))
    .set('resolved', params.resolved)
    .set('pageNumber', String(params.page)) // 0-based expected by controller
    .set('pageSize', String(params.pageSize));

  // Optional role/legacy scope
  if (params.state)   hp = hp.set('state', this.normUpper(params.state));
  if (params.company) hp = hp.set('company', this.norm(params.company));

  // Multi-select CSVs (only set when non-empty)
  if (segCsv)    hp = hp.set('segmentIdsCsv', segCsv);
  if (vendCsv)   hp = hp.set('vendorsCsv', vendCsv);
  if (statesCsv) hp = hp.set('statesCsv', statesCsv);

  // Dates (only set when valid)
  const drStart = this.toIso(params.dateReportedStart);
  const drEnd   = this.toIso(params.dateReportedEnd);
  const rzStart = this.toIso(params.resolvedStart);
  const rzEnd   = this.toIso(params.resolvedEnd);
  if (drStart) hp = hp.set('dateReportedStart', drStart);
  if (drEnd)   hp = hp.set('dateReportedEnd',   drEnd);
  if (rzStart) hp = hp.set('resolvedStart',     rzStart);
  if (rzEnd)   hp = hp.set('resolvedEnd',       rzEnd);

  return this.http.get<any>(url, { params: hp, headers: this.httpOptions.headers })
    .pipe(map(resp => this.normalizePaged<PreliminaryPunchList>(resp, params.page, params.pageSize)));
}


  /** Backward-compatible helpers (now call the unified search) */
  // searchResolvedPunchLists(
  //   user: User,
  //   term: string,
  //   pageNumber: number,
  //   pageSize: number
  // ): Observable<PagedResponse<PreliminaryPunchList>> {
  //   // Preserve your prior role scoping
  //   const isRegional = user?.market === 'RG';
  //   return this.searchPunchLists({
  //     term,
  //     resolved: 'resolved',
  //     page: pageNumber,
  //     pageSize,
  //     state: (!isRegional && user?.market) ? user.market : undefined,
  //     company: (user?.company && user?.company !== 'SRI') ? user.company : undefined
  //   });
  // }

  // searchUnresolvedPunchLists(
  //   user: User,
  //   term: string,
  //   pageNumber: number,
  //   pageSize: number
  // ): Observable<PagedResponse<PreliminaryPunchList>> {
  //   const isRegional = user?.market === 'RG';
  //   return this.searchPunchLists({
  //     term,
  //     resolved: 'unresolved',
  //     page: pageNumber,
  //     pageSize,
  //     state: (!isRegional && user?.market) ? user.market : undefined,
  //     company: (user?.company && user?.company !== 'SRI') ? user.company : undefined
  //   });
  // }

  // ---------------- Facets & Misc ----------------

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

  getErrorCodes(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.clearCaches();

    const issueImages = punchList.issueImages;
    const resolutionImages = punchList.resolutionImages;
    const hasNewImages = (issueImages && issueImages.length > 0) ||
                         (resolutionImages && resolutionImages.length > 0);

    if (hasNewImages) {
      // Two-step: create the punch list without images first so the parent row
      // exists, then update with images to satisfy the FK constraint on PunchListImages.
      const withoutImages = { ...punchList, issueImages: [], resolutionImages: [] };
      return this.http.post(`${environment.apiUrl}/PunchList`, withoutImages, this.httpOptions)
        .pipe(
          switchMap(() => {
            const withImages = { ...punchList, issueImages, resolutionImages };
            return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, withImages, this.httpOptions);
          }),
          catchError(this.handleError)
        );
    }

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
