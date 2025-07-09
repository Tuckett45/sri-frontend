import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environments';
import { local_environment } from 'src/environments/environments';
import { StreetSheet } from '../models/street-sheet.model';
import { MapMarker } from '../models/map-marker.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class StreetSheetService {

  private streetSheetsCache$!: Observable<StreetSheet[]> | null;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {
    this.streetSheetsCache$ = null;
  }

  getStreetSheets(user: User, startDate?: Date, endDate?: Date): Observable<StreetSheet[]> {
    const useDefaultRange = !startDate || !endDate;

    if (useDefaultRange) {
      if (this.streetSheetsCache$) {
        return this.streetSheetsCache$;
      }
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 10 * 24 * 60 * 60 * 1000);
    }

    const start = startDate!.toISOString();
    const end = endDate!.toISOString();

    let request$;
    if (user.market !== 'RG' && user.role === 'CM') {
      request$ = this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet/${user.market}?startDate=${start}&endDate=${end}`);
    } else {
      request$ = this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet?startDate=${start}&endDate=${end}`);
    }

    if (useDefaultRange) {
      this.streetSheetsCache$ = request$.pipe(shareReplay(1));
      return this.streetSheetsCache$;
    }

    return request$;
  }

  saveStreetSheet(formData: FormData): Observable<any> {
    const headers = new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    });

    this.streetSheetsCache$ = null;
    return this.http.post<any>(`${environment.apiUrl}/StreetSheet`, formData, { headers });
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    this.streetSheetsCache$ = null;
    return this.http.put<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, streetSheet, this.httpOptions);
  }

  deleteStreetSheet(streetSheet: StreetSheet): Observable<any> {
    this.streetSheetsCache$ = null;
    return this.http.delete<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.id}`, this.httpOptions);
  }

  isSegmentIdUnique(segmentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/StreetSheet/segment-id-unique/${segmentId}`);
  }
}
