import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { StreetSheet } from '../models/street-sheet.model';
import { MapMarker } from '../models/map-marker.model';

@Injectable({
  providedIn: 'root'
})
export class StreetSheetService {

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getStreetSheets(): Observable<StreetSheet[]> {
    return this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet`);
  }

  saveStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/StreetSheet`, streetSheet, this.httpOptions);
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, streetSheet, this.httpOptions);
  }

  deleteStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, this.httpOptions);
  }

  isSegmentIdUnique(segmentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/StreetSheet/segment-id-unique/${segmentId}`);
  }
}
