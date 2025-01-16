import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { environment } from '../../environments/environments';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };
  
  constructor(private http: HttpClient) {}

  getEntries(): Observable<PreliminaryPunchList[]> {
    return this.http.get<PreliminaryPunchList[]>(`${environment.apiUrl}/PunchList/all`, this.httpOptions).pipe(
      map(punchLists => {
        return punchLists.map(punchList => {
          punchList.issues.forEach(issueArea => {
            if (typeof issueArea.qualityIssues === 'string') {
              issueArea.qualityIssues = issueArea.qualityIssues;
            }
          });
          return punchList;
        });
      }),
      catchError(this.handleError)
    );
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