import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import { WPViolation } from '../models/wp-violation.model';
import { CityScorecard } from '../models/city-scorecard.model';
import { BudgetTrackerRow, PaginatedResponse, BudgetTrackerApiRow, toBudgetTrackerRow } from '../models/budget-tracker.model';
import { MetroYearSummary, MetroByMonthOverview, MetroByMunicipalityOverview } from '../models/kpi.models';

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

  // Use the active build environment's API base URL
  private baseUrl = `${environment.apiUrl}/tps`;

  constructor(private http: HttpClient) {}

  getViolations(): Observable<WPViolation[]> {
    return this.http
      .get<any>(`${this.baseUrl}/violations`, this.httpOptions)
      .pipe(map(res => this.asArray<WPViolation>(res)));
  }

  importViolations(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/violations/import`, {}, this.httpOptions);
  }

  getCityScorecard(): Observable<CityScorecard[]> {
    return this.http
      .get<any>(`${this.baseUrl}/city-scorecard`, this.httpOptions)
      .pipe(map(res => this.asArray<CityScorecard>(res)));
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

    return this.http
      .get<PaginatedResponse<BudgetTrackerApiRow>>(`${this.baseUrl}/budget-tracker`, { params })
      .pipe(
        map(res => ({
          ...res,
          items: res.items?.map(toBudgetTrackerRow) ?? []
        }))
      );
  }

  getMetroYearSummary(params: {
    year?: number;
    metro?: string;            // e.g., "Salt Lake City" or "UT-SLC"
    includeAverages?: boolean; // include rows where IsAverageRow = 1
  }): Observable<MetroYearSummary[]> {
    let p = new HttpParams();
    if (params.year != null) p = p.set('year', String(params.year));
    if (params.metro) p = p.set('metro', params.metro);
    if (params.includeAverages != null) p = p.set('includeAverages', String(params.includeAverages));

    return this.http
      .get<MetroYearSummary[]>(`${this.baseUrl}/kpis/metro-year-summary`, { params: p })
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  getMetroByMonth(params: {
    year?: number;
    metro?: string;
    includeTotals?: boolean; // include rows where IsTotalsRow = 1 (Month = 0)
  }): Observable<MetroByMonthOverview[]> {
    let p = new HttpParams();
    if (params.year != null) p = p.set('year', String(params.year));
    if (params.metro) p = p.set('metro', params.metro);
    if (params.includeTotals != null) p = p.set('includeTotals', String(params.includeTotals));

    return this.http
      .get<MetroByMonthOverview[]>(`${this.baseUrl}/kpis/metro-by-month`, { params: p })
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  getMetroByMunicipality(params: {
    year?: number;
    includeTotals?: boolean;
  }): Observable<MetroByMunicipalityOverview[]> {
    let p = new HttpParams();
    if (params.year != null) p = p.set('year', String(params.year));
    if (params.includeTotals != null) p = p.set('includeTotals', String(params.includeTotals));

    return this.http
      .get<MetroByMunicipalityOverview[]>(`${this.baseUrl}/kpis/metro-by-municipality`, { params: p })
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  // Normalize common API envelope shapes into arrays
  private asArray<T>(res: any): T[] {
    if (Array.isArray(res)) return res as T[];
    if (Array.isArray(res?.items)) return res.items as T[];
    if (Array.isArray(res?.data)) return res.data as T[];
    if (Array.isArray(res?.results)) return res.results as T[];
    if (Array.isArray(res?.value)) return res.value as T[];
    return [] as T[];
  }
}
