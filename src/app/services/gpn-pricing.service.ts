import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import {
  GpnImportSummary,
  GpnPrice,
  GpnPriceUpsert,
  GpnWorkbookImport
} from '../models/gpn-pricing.model';

/**
 * Client for the GPN pricing catalog API (the "Active Price List", "All market GPN List",
 * and "Complete GPN List" worksheets, unified on the backend GpnPricing table).
 *
 * The workbook import intentionally sends RAW headers + positional cell values: the backend
 * owns all column-name normalization and type parsing, so the frontend never renames or
 * coerces columns.
 */
@Injectable({ providedIn: 'root' })
export class GpnPricingService {
  private readonly baseUrl = `${environment.apiUrl}/GpnPricing`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /** List catalog entries, optionally filtered by source worksheet, GPN, or a free-text search. */
  getPrices(filters?: { sourceList?: string; gpn?: string; search?: string }): Observable<GpnPrice[]> {
    let params = new HttpParams();
    if (filters?.sourceList) params = params.set('sourceList', filters.sourceList);
    if (filters?.gpn) params = params.set('gpn', filters.gpn);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<GpnPrice[]>(this.baseUrl, { params, headers: this.httpOptions.headers });
  }

  getPrice(id: string): Observable<GpnPrice> {
    return this.http.get<GpnPrice>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  upsertPrice(dto: GpnPriceUpsert): Observable<GpnPrice> {
    return this.http.post<GpnPrice>(this.baseUrl, dto, this.httpOptions);
  }

  deletePrice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  /**
   * Bulk-import one or more of the three GPN worksheets. Each worksheet is sent as its raw
   * header row plus positional cell values; the backend matches by (gpn, sourceList),
   * updating existing rows and inserting new ones. Returns a per-import summary.
   */
  importWorkbook(payload: GpnWorkbookImport): Observable<GpnImportSummary> {
    return this.http.post<GpnImportSummary>(`${this.baseUrl}/import`, payload, this.httpOptions);
  }
}
