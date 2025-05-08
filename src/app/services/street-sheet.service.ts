import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { local_environment } from 'src/environments/environments';
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
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getStreetSheets(user: User, startDate?: Date, endDate?: Date): Observable<StreetSheet[]> {
    if (!startDate || !endDate) {
      endDate = new Date(); 
      startDate = new Date(endDate.getTime() - 10 * 24 * 60 * 60 * 1000);
    }
  
    const start = startDate.toISOString();
    const end = endDate.toISOString();
  
    if (user.market !== 'RG' && user.role === 'CM') {
      return this.http.get<StreetSheet[]>(`${local_environment.apiUrl}/StreetSheet/${user.market}?startDate=${start}&endDate=${end}`);
    } else {
      return this.http.get<StreetSheet[]>(`${local_environment.apiUrl}/StreetSheet?startDate=${start}&endDate=${end}`);
    }
  }

  saveStreetSheet(formData: FormData): Observable<any> {
    const headers = new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    });

    return this.http.post<any>(`${local_environment.apiUrl}/StreetSheet`, formData, { headers });
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.put<any>(`${local_environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, streetSheet, this.httpOptions);
  }

  deleteStreetSheet(streetSheet: StreetSheet): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.id}`, this.httpOptions);
  }

  isSegmentIdUnique(segmentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/StreetSheet/segment-id-unique/${segmentId}`);
  }
}
