import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, BehaviorSubject, finalize } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
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
  isAll?: boolean;
}

export interface MarketOption {
  code: MarketCode;
  label: string;
  cities: CityOption[];
}

@Injectable({ providedIn: 'root' })
export class TpsService {
  // Base markets and their metro/city options (unsorted/raw)
  private readonly baseMarkets: MarketOption[] = [
    {
      code: 'UT',
      label: 'Utah (UT)',
      cities: [
        { name: 'Salt Lake City, UT', displayName: 'Salt Lake City', market: 'UT', segmentPrefix: 'SLC' },
        { name: 'Bluffdale, UT', displayName: 'Bluffdale', market: 'UT', segmentPrefix: 'BLF' },
        { name: 'Chubbuck, ID', displayName: 'Chubbuck', market: 'UT', segmentPrefix: 'CBK' },
        { name: 'Draper, UT', displayName: 'Draper', market: 'UT', segmentPrefix: 'DRP' },
        { name: 'Holladay, UT', displayName: 'Holladay', market: 'UT', segmentPrefix: 'HLD' },
        { name: 'Hyde Park, UT', displayName: 'Hyde Park', market: 'UT', segmentPrefix: 'HPK' },
        { name: 'Kearns, UT', displayName: 'Kearns', market: 'UT', segmentPrefix: 'KNS' },
        { name: 'Logan, UT', displayName: 'Logan', market: 'UT', segmentPrefix: 'LGU' },
        { name: 'Magna, UT', displayName: 'Magna', market: 'UT', segmentPrefix: 'MAG' },
        { name: 'Millcreek, UT', displayName: 'Millcreek', market: 'UT', segmentPrefix: 'MLL' },
        { name: 'North Logan, UT', displayName: 'North Logan', market: 'UT', segmentPrefix: 'NLG' },
        { name: 'North Salt Lake, UT', displayName: 'North Salt Lake', market: 'UT', segmentPrefix: 'NSL' },
        { name: 'Pocatello, ID', displayName: 'Pocatello', market: 'UT', segmentPrefix: 'PIH' },
        { name: 'Provo, UT', displayName: 'Provo', market: 'UT', segmentPrefix: 'PVU' },
        { name: 'Riverton, UT', displayName: 'Riverton', market: 'UT', segmentPrefix: 'RVN' },
        { name: 'Sandy, UT', displayName: 'Sandy', market: 'UT', segmentPrefix: 'SDY' },
        { name: 'South Jordan, UT', displayName: 'South Jordan', market: 'UT', segmentPrefix: 'SJC' },
        { name: 'South Salt Lake, UT', displayName: 'South Salt Lake', market: 'UT', segmentPrefix: 'SSL' },
        { name: 'Springville, UT', displayName: 'Springville', market: 'UT', segmentPrefix: 'SPV' },
        { name: 'Taylorsville, UT', displayName: 'Taylorsville', market: 'UT', segmentPrefix: 'TLV' },
        { name: 'West Jordan, UT', displayName: 'West Jordan', market: 'UT', segmentPrefix: 'WJR' },
        { name: 'Woods Cross, UT', displayName: 'Woods Cross', market: 'UT', segmentPrefix: 'WXC' }
      ]
    },
    {
      code: 'AZ',
      label: 'Arizona (AZ)',
      cities: [
        { name: 'Phoenix, AZ', displayName: 'Phoenix', market: 'AZ', segmentPrefix: 'PHX' },
        { name: 'Mesa, AZ', displayName: 'Mesa', market: 'AZ', segmentPrefix: 'MES' }
      ]
    },
    {
      code: 'NV',
      label: 'Nevada (NV)',
      cities: [{ name: 'Las Vegas, NV', displayName: 'Las Vegas', market: 'NV', segmentPrefix: 'LAS' }]
    }
  ];

  // Sorted markets with "All Cities" option and alphabetized cities
  readonly markets: MarketOption[] = this.baseMarkets
    .map(m => ({
      ...m,
      cities: this.decorateMarketCities(m)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Flattened list for legacy uses (real cities only, no "all" option)
  readonly cities: CityOption[] = this.markets.flatMap(m => m.cities.filter(c => !c.isAll));

  // Observable for currently selected city
  private selectedMarketSubject = new BehaviorSubject<MarketOption>(this.markets[0]);
  readonly selectedMarket$ = this.selectedMarketSubject.asObservable();

  private selectedCitySubject = new BehaviorSubject<CityOption>(this.getDefaultCityForMarket(this.markets[0].code)!);
  selectedCity$ = this.selectedCitySubject.asObservable();

  private loadingCount = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  get selectedCity(): CityOption {
    return this.selectedCitySubject.value;
  }

  get selectedMarket(): MarketOption {
    return this.selectedMarketSubject.value;
  }

  setSelectedMarket(market: MarketOption): void {
    this.selectedMarketSubject.next(market);
    const currentCity = this.selectedCitySubject.value;
    const citiesForMarket = this.getCitiesForMarket(market.code);
    const cityStillValid = citiesForMarket.some(c => c.name === currentCity.name && c.market === market.code);
    if (!cityStillValid) {
      const fallback = this.getDefaultCityForMarket(market.code);
      if (fallback) this.selectedCitySubject.next(fallback);
    }
  }

  setSelectedCity(city: CityOption): void {
    const targetMarket = this.markets.find(m => m.code === city.market);
    if (targetMarket) {
      this.selectedMarketSubject.next(targetMarket);
    }
    this.selectedCitySubject.next(city);
  }

  getCitiesForMarket(code: MarketCode, opts?: { includeAll?: boolean }): CityOption[] {
    const m = this.markets.find(x => x.code === code);
    if (!m) return [];
    const includeAll = opts?.includeAll !== false;
    const cities = includeAll ? m.cities : m.cities.filter(c => !c.isAll);
    return [...cities];
  }

  getDefaultCityForMarket(code: MarketCode): CityOption | null {
    const m = this.markets.find(x => x.code === code);
    if (!m) return null;
    return m.cities.find(c => c.isAll) ?? m.cities[0] ?? null;
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
    
    return this.withLoading(
      this.http
        .get<any>(`${this.baseUrl}/violations`, { ...this.httpOptions, params })
        .pipe(map(res => this.asArray<WPViolation>(res)))
    );
  }

  importViolations(): Observable<void> {
    return this.withLoading(
      this.http.post<void>(`${this.baseUrl}/violations/import`, {}, this.httpOptions)
    );
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
    
    return this.withLoading(
      this.http
        .get<any>(`${this.baseUrl}/city-scorecard`, { ...this.httpOptions, params })
        .pipe(map(res => this.asArray<CityScorecard>(res)))
    );
  }

  importCityScorecard(): Observable<void> {
    return this.withLoading(
      this.http.post<void>(`${this.baseUrl}/city-scorecard/import`, {}, this.httpOptions)
    );
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

    return this.withLoading(
      this.http
        .get<PaginatedResponse<BudgetTrackerApiRow>>(`${this.baseUrl}/budget-tracker`, { params })
        .pipe(
          map(res => ({
            ...res,
            items: res.items?.map(toBudgetTrackerRow) ?? []
          }))
        )
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

    return this.withLoading(
      this.http
        .get<MetroYearSummary[]>(`${this.baseUrl}/kpis/metro-year-summary`, { params: p })
        .pipe(shareReplay({ bufferSize: 1, refCount: true }))
    );
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

    return this.withLoading(
      this.http
        .get<MetroByMonthOverview[]>(`${this.baseUrl}/kpis/metro-by-month`, { params: p })
        .pipe(shareReplay({ bufferSize: 1, refCount: true }))
    );
  }

  getMetroByMunicipality(params: {
    year?: number;
    includeTotals?: boolean;
  }): Observable<MetroByMunicipalityOverview[]> {
    let p = new HttpParams();
    if (params.year != null) p = p.set('year', String(params.year));
    if (params.includeTotals != null) p = p.set('includeTotals', String(params.includeTotals));

    return this.withLoading(
      this.http
        .get<MetroByMunicipalityOverview[]>(`${this.baseUrl}/kpis/metro-by-municipality`, { params: p })
        .pipe(shareReplay({ bufferSize: 1, refCount: true }))
    );
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

  // Insert a market-level "All Cities" option and sort by display name
  private decorateMarketCities(market: MarketOption): CityOption[] {
    const sortedCities = [...market.cities].sort((a, b) => a.displayName.localeCompare(b.displayName));
    const allCity: CityOption = {
      name: `${market.label} - All Cities`,
      displayName: 'All Cities',
      market: market.code,
      segmentPrefix: '',
      isAll: true
    };
    return [allCity, ...sortedCities];
  }

  private beginLoading(): void {
    this.loadingCount += 1;
    if (this.loadingCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  private endLoading(): void {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  private withLoading<T>(obs: Observable<T>): Observable<T> {
    this.beginLoading();
    return obs.pipe(finalize(() => this.endLoading()));
  }
}
