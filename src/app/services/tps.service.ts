import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import { WPViolation } from '../models/wp-violation.model';
import { CityScorecard } from '../models/city-scorecard.model';

@Injectable({ providedIn: 'root' })
export class TpsService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${local_environment.apiUrl}/tps`;

  constructor(private http: HttpClient) {}

  getViolations(): Observable<WPViolation[]> {
    return this.http.get<WPViolation[]>(`${this.baseUrl}/violations`, this.httpOptions);
  }

  importViolations(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/violations/import`, {}, this.httpOptions);
  }

  getCityScorecard(): Observable<CityScorecard[]> {
    return this.http.get<CityScorecard[]>(`${this.baseUrl}/city-scorecard`, this.httpOptions);
  }

  importCityScorecard(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/city-scorecard/import`, {}, this.httpOptions);
  }
}
