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
    debugger;
    return this.http.post<any>(`${environment.apiUrl}/StreetSheet`, streetSheet, this.httpOptions);
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.id}`, streetSheet, this.httpOptions);
  }
}
