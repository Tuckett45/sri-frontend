import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import { WPViolation } from '../models/wp-violation.model';
import { CityScorecard } from '../models/city-scorecard.model';
import { BudgetTrackerRow, PaginatedResponse } from '../models/budget-tracker.model';

export interface BudgetTracker {
  segment?: string | null;
  city?: string | null;
  claimMonthFrom?: Date | null;
  claimMonthTo?: Date | null;
  page?: number;
  pageSize?: number;
}


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

  get(query: BudgetTracker): Observable<PaginatedResponse<BudgetTrackerRow>> {
    let params = new HttpParams();

    if (query.segment) params = params.set('segment', query.segment);
    if (query.city) params = params.set('city', query.city);
    if (query.claimMonthFrom) params = params.set('claimMonthFrom', query.claimMonthFrom.toISOString());
    if (query.claimMonthTo) params = params.set('claimMonthTo', query.claimMonthTo.toISOString());
    params = params.set('page', String(query.page ?? 1));
    params = params.set('pageSize', String(query.pageSize ?? 25));

    return this.http.get<PaginatedResponse<BudgetTrackerRow>>(`${this.baseUrl}/budget-tracker`, { params, ...this.httpOptions });
  }
}
