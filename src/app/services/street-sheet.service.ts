import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';

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

  getStreetSheets(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/StreetSheet`);
  }

  addStreetSheet(streetSheet: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/StreetSheet`, streetSheet);
  }
}
