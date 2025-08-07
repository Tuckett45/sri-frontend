import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { MarketControllerEntry } from '../models/market-controller-entry.model';

@Injectable({
  providedIn: 'root'
})
export class MarketControllerService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${environment.apiUrl}/MarketController`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieve all market controller entries from the API.
   */
  getEntries(): Observable<MarketControllerEntry[]> {
    return this.http.get<MarketControllerEntry[]>(this.baseUrl, this.httpOptions);
  }

  /**
   * Persist a new entry.
   */
  addEntry(entry: MarketControllerEntry): Observable<MarketControllerEntry> {
    const payload = {
      ...entry,
      date: entry.date instanceof Date ? entry.date.toISOString() : entry.date
    };
    return this.http.post<MarketControllerEntry>(this.baseUrl, payload, this.httpOptions);
  }

  /**
   * Update an existing entry.
   */
  updateEntry(entry: MarketControllerEntry): Observable<void> {
    const payload = {
      ...entry,
      date: entry.date instanceof Date ? entry.date.toISOString() : entry.date
    };
    return this.http.put<void>(`${this.baseUrl}/${entry.id}`, payload, this.httpOptions);
  }

  /**
   * Delete an entry by id.
   */
  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }
}

