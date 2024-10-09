import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { PreliminaryPunchList } from '../models/preliminary-punch-list.model';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {
  private apiUrl = 'http://localhost:5024/api/PunchList';

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
            // Convert comma-separated string to string[]
            if (typeof issueArea.qualityIssues === 'string') {
              issueArea.qualityIssues = (issueArea.qualityIssues as string).split(', ');
            }
          });
          return punchList;
        });
      }),
      catchError(this.handleError)
    );
  }

  addEntry(entry: PreliminaryPunchList): Observable<PreliminaryPunchList> {
    entry.issues.forEach(issueArea => {
      // Convert string[] to comma-separated string
      issueArea.qualityIssues = issueArea.qualityIssues.join(', ') as any;
    });

    return this.http.post<PreliminaryPunchList>(this.apiUrl, entry, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // Update an existing punch list entry
  updateEntry(entry: PreliminaryPunchList): Observable<PreliminaryPunchList> {
    // Convert QualityIssues array into a comma-separated string
    entry.issues.forEach(issueArea => {
      issueArea.qualityIssues = issueArea.qualityIssues.join(', ') as any;
    });

    return this.http.put<PreliminaryPunchList>(`${this.apiUrl}/${entry.segmentId}`, entry, this.httpOptions).pipe(
      catchError(this.handleError) // Handle errors for the PUT request
    );
  }

  // Remove an entry by its ID
  removeEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      catchError(this.handleError) // Handle errors for the DELETE request
    );
  }

  // Error handling function
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Unknown error!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server-side error: ${error.status} ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(errorMessage);
  }
}