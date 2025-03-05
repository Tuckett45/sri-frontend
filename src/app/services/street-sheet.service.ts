import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { staging_environment } from 'src/environments/environments';
import { StreetSheet } from '../models/street-sheet.model';
import { MapMarker } from '../models/map-marker.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class StreetSheetService {

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': staging_environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getStreetSheets(user: User): Observable<StreetSheet[]> {
    if(user.market !== 'RG' && user.role === 'CM'){
      return this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet/${user.market}`);
    }else{
      return this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet`);
    }
  }

  saveStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.post<any>(`${staging_environment.apiUrl}/StreetSheet`, streetSheet, this.httpOptions);
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.put<any>(`${staging_environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, streetSheet, this.httpOptions);
  }

  deleteStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.delete<any>(`${staging_environment.apiUrl}/StreetSheet/${streetSheet.id}`, this.httpOptions);
  }

  isSegmentIdUnique(segmentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${staging_environment.apiUrl}/StreetSheet/segment-id-unique/${segmentId}`);
  }
}
