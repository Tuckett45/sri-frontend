import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environments';
import { WPViolation } from '../models/wp-violation.model';
import { CityScorecard } from '../models/city-scorecard.model';
import { BudgetTrackerRow, PaginatedResponse, BudgetTrackerApiRow, toBudgetTrackerRow } from '../models/budget-tracker.model';
import { MetroYearSummary, MetroByMonthOverview, MetroByMunicipalityOverview } from '../models/kpi.models';

export interface BudgetTracker {
  segment?: string | null;
  city?: string | null;
  market?: string | null;
  metro?: string | null;
  segmentPrefix?: string | null;
  claimMonthFrom?: Date | null;
  claimMonthTo?: Date | null;
  page?: number;
  pageSize?: number;
}

export type MarketCode = 'UT' | 'AZ' | 'NV';

export interface CityOption {
  name: string;
  displayName: string;
  market: MarketCode;
  segmentPrefix: string;  // e.g., "SLC", "PHX", "LAS"
}

export interface MarketOption {
  code: MarketCode;
  label: string;
  cities: CityOption[];
}

@Injectable({ providedIn: 'root' })
export class TpsService {
  // Available markets and their metro/city options
  readonly markets: MarketOption[] = [
    {
      code: 'UT',
      label: 'Utah (UT)',
      cities: [{ name: 'Salt Lake City, UT', displayName: 'Salt Lake City, UT', market: 'UT', segmentPrefix: 'SLC' }]
    },
    {
      code: 'AZ',
      label: 'Arizona (AZ)',
      cities: [{ name: 'Phoenix, AZ', displayName: 'Phoenix, AZ', market: 'AZ', segmentPrefix: 'PHX' }]
    },
    {
      code: 'NV',
      label: 'Nevada (NV)',
      cities: [{ name: 'Las Vegas, NV', displayName: 'Las Vegas, NV', market: 'NV', segmentPrefix: 'LAS' }]
    }
  ];

  // Flattened list for legacy uses
  readonly cities: CityOption[] = this.markets.flatMap(m => m.cities);

  // Observable for currently selected city
  private selectedMarketSubject = new BehaviorSubject<MarketOption>(this.markets[0]);
  selectedMarket$ = this.selectedMarketSubject.asObservable();

  private selectedCitySubject = new BehaviorSubject<CityOption>(this.markets[0].cities[0]);
  selectedCity$ = this.selectedCitySubject.asObservable();

  get selectedCity(): CityOption {
    return this.selectedCitySubject.value;
  }

  get selectedMarket(): MarketOption {
    return this.selectedMarketSubject.value;
  }

  setSelectedMarket(market: MarketOption): void {
    this.selectedMarketSubject.next(market);
    // Keep city in sync with market selection
    const currentCity = this.selectedCitySubject.value;
    const citiesForMarket = market.cities;
    if (!citiesForMarket.find(c => c.name === currentCity.name)) {
      this.selectedCitySubject.next(citiesForMarket[0]);
    }
  }

  setSelectedCity(city: CityOption): void {
    const targetMarket = this.markets.find(m => m.code === city.market);
    if (targetMarket) {
      this.selectedMarketSubject.next(targetMarket);
    }
    this.selectedCitySubject.next(city);
  }

  getCitiesForMarket(code: MarketCode): CityOption[] {
    const m = this.markets.find(x => x.code === code);
    return m ? [...m.cities] : [];
  }

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  // Use the active build environment's API base URL
  private baseUrl = `${environment.apiUrl}/tps`;

  constructor(private http: HttpClient) {}

  getViolations(filters?: { segmentPrefix?: string; market?: MarketCode; metro?: string }): Observable<WPViolation[]> {
    let params = new HttpParams();
    if (filters?.segmentPrefix) {
      params = params.set('segmentPrefix', filters.segmentPrefix);
    }
    if (filters?.market) {
      params = params.set('market', filters.market);
    }
    if (filters?.metro) {
      params = params.set('metro', filters.metro);
    }
    
    return this.http
      .get<any>(`${this.baseUrl}/violations`, { ...this.httpOptions, params })
      .pipe(map(res => this.asArray<WPViolation>(res)));
  }

  importViolations(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/violations/import`, {}, this.httpOptions);
  }

  getCityScorecard(filters?: { segmentPrefix?: string; market?: MarketCode; metro?: string }): Observable<CityScorecard[]> {
    let params = new HttpParams();
    if (filters?.segmentPrefix) {
      params = params.set('segmentPrefix', filters.segmentPrefix);
    }
    if (filters?.market) {
      params = params.set('market', filters.market);
    }
    if (filters?.metro) {
      params = params.set('metro', filters.metro);
    }
    
    return this.http
      .get<any>(`${this.baseUrl}/city-scorecard`, { ...this.httpOptions, params })
      .pipe(map(res => this.asArray<CityScorecard>(res)));
  }

  importCityScorecard(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/city-scorecard/import`, {}, this.httpOptions);
  }

  get(query: BudgetTracker): Observable<PaginatedResponse<BudgetTrackerRow>> {
    let params = new HttpParams();

    if (query.segment) params = params.set('segment', query.segment);
    if (query.city) params = params.set('city', query.city);
    if (query.market) params = params.set('market', query.market);
    if (query.metro) params = params.set('metro', query.metro);
    if (query.segmentPrefix) params = params.set('segmentPrefix', query.segmentPrefix);
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
