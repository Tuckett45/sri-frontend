import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';
import {
  BomTracking,
  BulkImportRecord,
  BulkImportResponse,
  DashboardFilters,
  DashboardQuote,
  DashboardResponse,
  DashboardUser
} from '../models/quote-workflow.model';

/**
 * Service for RFP Dashboard operations.
 * Fetches dashboard data, handles inline field edits,
 * manages BOM tracking entries, and provides user list for assignee dropdown.
 */
@Injectable({ providedIn: 'root' })
export class RfpDashboardService {
  private readonly dashboardUrl = `${environment.atlasApiUrl}/quotes/dashboard`;
  private readonly quotesUrl = `${environment.atlasApiUrl}/quotes`;
  private readonly usersUrl = `${environment.apiUrl}/user-management/users`;

  constructor(private http: HttpClient) {}

  // ===========================================================================
  // Dashboard Data
  // ===========================================================================

  /**
   * Fetches dashboard records categorized into 3 phases.
   */
  getDashboard(filters?: DashboardFilters): Observable<DashboardResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.customer) {
        params = params.set('customer', filters.customer);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo);
      }
      if (filters.assignedTo) {
        params = params.set('assignedTo', filters.assignedTo);
      }
      if (filters.phase) {
        params = params.set('phase', filters.phase);
      }
    }
    return this.http.get<DashboardResponse>(this.dashboardUrl, { params });
  }

  // ===========================================================================
  // Inline Edit
  // ===========================================================================

  /**
   * Updates dashboard-specific fields on a quote (inline edit).
   */
  updateDashboardFields(quoteId: string, fields: Partial<DashboardQuote>): Observable<DashboardQuote> {
    return this.http.put<DashboardQuote>(
      `${this.quotesUrl}/${quoteId}/dashboard-fields`,
      fields
    );
  }

  // ===========================================================================
  // BOM Tracking
  // ===========================================================================

  /**
   * Gets all BOM tracking entries for a quote.
   */
  getBomTrackings(quoteId: string): Observable<BomTracking[]> {
    return this.http.get<BomTracking[]>(
      `${this.quotesUrl}/${quoteId}/bom-trackings`
    );
  }

  /**
   * Creates a new BOM tracking entry for a quote.
   */
  createBomTracking(quoteId: string, entry: Partial<BomTracking>): Observable<BomTracking> {
    return this.http.post<BomTracking>(
      `${this.quotesUrl}/${quoteId}/bom-trackings`,
      entry
    );
  }

  /**
   * Updates an existing BOM tracking entry.
   */
  updateBomTracking(quoteId: string, trackingId: string, entry: Partial<BomTracking>): Observable<BomTracking> {
    return this.http.put<BomTracking>(
      `${this.quotesUrl}/${quoteId}/bom-trackings/${trackingId}`,
      entry
    );
  }

  // ===========================================================================
  // Bulk Import
  // ===========================================================================

  /**
   * Bulk import RFP records from a parsed spreadsheet.
   * Sends an array of RFP records to be created in batch.
   */
  bulkImportRfps(records: BulkImportRecord[]): Observable<BulkImportResponse> {
    return this.http.post<BulkImportResponse>(
      `${this.quotesUrl}/bulk-import`,
      { records }
    );
  }

  // ===========================================================================
  // Delete
  // ===========================================================================

  /**
   * Deletes an RFP/quote record.
   */
  deleteRfp(quoteId: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(
      `${this.quotesUrl}/${quoteId}`
    );
  }

  // ===========================================================================
  // Users (for Assigned To dropdown)
  // ===========================================================================

  /**
   * Fetches user list from the legacy API for the assignee dropdown.
   * Uses environment.apiUrl (not atlasApiUrl).
   */
  getUsers(): Observable<DashboardUser[]> {
    return this.http.get<DashboardUser[]>(this.usersUrl);
  }
}
