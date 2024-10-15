import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { PreliminaryPunchList, IssueArea } from '../models/preliminary-punch-list.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {
  private apiUrl = 'https://localhost:44376/api/PunchList';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };
  
  constructor(private http: HttpClient) {}

  getEntries(): Observable<PreliminaryPunchList[]> {
    return this.http.get<PreliminaryPunchList[]>(`${this.apiUrl}/all`, this.httpOptions).pipe(
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

  addEntry(formData: FormData): Observable<void> {
    return this.http.post<void>(this.apiUrl, formData);
  }

  updateEntry(formData: FormData): Observable<void> {
    const punchListId = JSON.parse(formData.get('punchList') as string).id;
    return this.http.put<void>(`${this.apiUrl}/${punchListId}`, formData).pipe(
      catchError(this.handleError)
    );
  }

  removeEntry(id: string | undefined): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
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
    console.error(errorMessage);
    return throwError(errorMessage);
  }
}