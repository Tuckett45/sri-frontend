import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { local_environment, environment } from '../../environments/environments';
import { PagedResult } from '../models/paged-result.model';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {

  private entriesCache$!: Observable<PreliminaryPunchList[]> | null;
  private pagedCache$!: Observable<PagedResult<PreliminaryPunchList>> | null;
  private unresolvedCache$!: Observable<any> | null;
  private resolvedCache$!: Observable<any> | null;
  private allCache$!: Observable<PreliminaryPunchList[]> | null;
  private entriesCacheData: PreliminaryPunchList[] | null = null;
  private unresolvedCacheData: PreliminaryPunchList[] | null = null;
  private resolvedCacheData: PreliminaryPunchList[] | null = null;

  private refreshSubject = new BehaviorSubject<void>(undefined);

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };
  
  constructor(private http: HttpClient) {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.allCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
  }

  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  getEntries(page: number = 1, pageSize: number = 25): Observable<PreliminaryPunchList[]> {
    if (!this.entriesCache$) {
      this.entriesCache$ = this.getEntriesPaged(page, pageSize).pipe(
        map(res => res.items.map(punchList => {
          punchList.issues.forEach(issueArea => {
            if (typeof issueArea.category === 'string') {
              issueArea.category = issueArea.category;
            }
          });
          return punchList;
        })),
        tap(data => (this.entriesCacheData = JSON.parse(JSON.stringify(data)))),
        catchError(this.handleError),
      shareReplay(1)
      );
    }
    return this.entriesCache$;
  }

  getAllEntries(): Observable<PreliminaryPunchList[]> {
    return this.http
      .get<{ items: PreliminaryPunchList[]; totalCount: number }>(`${local_environment.apiUrl}/PunchList/all`, this.httpOptions)
      .pipe(
        map(response => response.items.map(punchList => {
          punchList.issues.forEach(issueArea => {
            if (typeof issueArea.category === 'string') {
              issueArea.category = issueArea.category;
            }
          });
          return punchList;
        })),
        shareReplay(1)
      );
  }
  

  getEntriesPaged(page: number = 1, pageSize: number = 25): Observable<PagedResult<PreliminaryPunchList>> {
    if (!this.pagedCache$) {
      const params = new HttpParams().set('page', page).set('pageSize', pageSize);
      this.pagedCache$ = this.http
        .get<PagedResult<PreliminaryPunchList>>(`${local_environment.apiUrl}/PunchList/all-paged`, { params, headers: this.httpOptions.headers })
        .pipe(catchError(this.handleError), shareReplay(1));
    }
    return this.pagedCache$;
  }

  getResolvedPunchLists(user: User, page: number = 1, pageSize: number = 25): Observable<PagedResult<PreliminaryPunchList>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
  
    if (user.market) {
      params = params.set('state', user.market);
    }
  
    let url = '';
  
    if (user.role === 'PM' && user.market !== 'RG') {
      url = `${local_environment.apiUrl}/PunchList/pm-resolved`;
    } else if (user.role === 'CM' && user.market !== 'RG') {
      url = `${local_environment.apiUrl}/PunchList/cm-resolved/${page}`;
      // NOTE: cm-resolved expects page in the route, not query
      params = params.set('pageSize', pageSize.toString()); // only pass pageSize
    } else {
      url = `${local_environment.apiUrl}/PunchList/resolved/${page}`;
      params = params.set('pageSize', pageSize.toString());
    }
  
    return this.http.get<PagedResult<PreliminaryPunchList>>(url, { params });
  }
  
  

  getUnresolvedPunchLists(user: User, page: number = 1, pageSize: number = 25): Observable<PagedResult<PreliminaryPunchList>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
  
    if (user.market) {
      params = params.set('state', user.market);
    }
  
    let url = '';
  
    if (user.role === 'PM' && user.market !== 'RG') {
      url = `${local_environment.apiUrl}/PunchList/pm-unresolved`;
    } else if (user.role === 'CM' && user.market !== 'RG') {
      url = `${local_environment.apiUrl}/PunchList/cm-unresolved/${page}`;
      params = params.set('pageSize', pageSize.toString());
    } else {
      url = `${local_environment.apiUrl}/PunchList/unresolved/${page}`;
      params = params.set('pageSize', pageSize.toString());
    }
  
    return this.http.get<PagedResult<PreliminaryPunchList>>(url, { params });
  }
  
  

  getErrorCodes(): Observable<any> {
      return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.allCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  updateEntry(punchList: PreliminaryPunchList): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.allCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  removeEntry(id: string | undefined): Observable<any> {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.allCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
    return this.http.delete<void>(`${environment.apiUrl}/PunchList/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
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

  clearCache(): void {
    this.entriesCache$ = null;
    this.pagedCache$ = null;
    this.unresolvedCache$ = null;
    this.resolvedCache$ = null;
    this.allCache$ = null;
    this.entriesCacheData = null;
    this.unresolvedCacheData = null;
    this.resolvedCacheData = null;
  }

}
