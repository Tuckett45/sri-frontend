import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PreliminaryPunchList } from '.././models/preliminary-punch-list.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {
  // Use a BehaviorSubject to keep the list of entries and allow components to subscribe to changes
  private punchListEntriesSubject: BehaviorSubject<PreliminaryPunchList[]> = new BehaviorSubject<PreliminaryPunchList[]>([]);
  private apiUrl = 'https://localhost:7265/api/PunchList';
  
  constructor(private http: HttpClient) {}

  getEntries(): Observable<PreliminaryPunchList[]> {
    return this.http.get<PreliminaryPunchList[]>(this.apiUrl);
  }

  addEntry(entry: PreliminaryPunchList): Observable<void> {
    return this.http.post<void>(this.apiUrl, entry);
  }

  updateEntry(entry: PreliminaryPunchList): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${entry.segmentId}`, entry);
  }

  removeEntry(segmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${segmentId}`);
  }
}