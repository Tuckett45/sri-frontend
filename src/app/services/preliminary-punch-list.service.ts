import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { local_environment, environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {

  private refreshSubject = new BehaviorSubject<void>(undefined);

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };
  
  constructor(private http: HttpClient) {}

  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  getEntries(): Observable<PreliminaryPunchList[]> {
    return this.http.get<PreliminaryPunchList[]>(`${environment.apiUrl}/PunchList/all`, this.httpOptions).pipe(
      map(punchLists => {
        return punchLists.map(punchList => {
          punchList.issues.forEach(issueArea => {
            if (typeof issueArea.category === 'string') {
              issueArea.category = issueArea.category;
            }
          });
          return punchList;
        });
      }),
      catchError(this.handleError)
    );
  }

  getUnresolvedPunchLists(user: User): Observable<any> {
    const params = new HttpParams().set('state', user.market);
    if(user.role === 'PM' && user.market !== 'RG'){
      return this.http.get<any>(`${environment.apiUrl}/PunchList/pm-unresolved`, { params });
    }else if(user.role === 'CM' && user.market !== 'RG'){
      return this.http.get<any>(`${environment.apiUrl}/PunchList/cm-unresolved`, { params });
    }else{
      return this.http.get<any>(`${environment.apiUrl}/PunchList/unresolved`);
    }
  }

  getResolvedPunchLists(user: User): Observable<any> {
    const params = new HttpParams().set('state', user.market);
    if(user.role === 'PM' && user.market !== 'RG'){
      return this.http.get<any>(`${environment.apiUrl}/PunchList/pm-resolved`, { params });
    }else if(user.role === 'CM' && user.market !== 'RG'){
      return this.http.get<any>(`${environment.apiUrl}/PunchList/cm-resolved`, { params });
    }else{
      return this.http.get<any>(`${environment.apiUrl}/PunchList/resolved`);
    }
  }

  getErrorCodes(): Observable<any> {
      return this.http.get<any>(`${environment.apiUrl}/PunchList/error-codes`);
  }

  addEntry(punchList: PreliminaryPunchList): Observable<any> {  
    return this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  updateEntry(punchList: PreliminaryPunchList): Observable<any> {
    return this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  removeEntry(id: string | undefined): Observable<any> {
    return this.http.delete<void>(`${environment.apiUrl}/PunchList/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
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