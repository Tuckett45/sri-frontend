import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import {
  ReconciliationReport,
  ReconciliationSummary,
  ReconciliationDiscrepancy,
  GenerateReportRequest,
  ResolveDiscrepancyRequest,
  EscalateDiscrepancyRequest
} from '../models/qr-timekeeping.model';

/**
 * Reconciliation Service
 *
 * Manages reconciliation report generation and discrepancy resolution
 * against the Atlas API. Supports generating Atlas vs Celerity comparison
 * reports, retrieving report summaries, and resolving or escalating
 * individual discrepancies.
 *
 * Requirements: 10.1, 10.5, 11.3, 11.5
 */
@Injectable({
  providedIn: 'root'
})
export class ReconciliationService {
  private readonly apiUrl = `${environment.atlasApiUrl}/reconciliation`;

  constructor(private http: HttpClient) {}

  /**
   * Generate a new reconciliation report for the specified date range.
   *
   * @param request Request containing start and end dates (ISO 8601)
   * @returns Observable of the generated ReconciliationReport
   */
  generateReport(request: GenerateReportRequest): Observable<ReconciliationReport> {
    return this.http.post<any>(`${this.apiUrl}/generate`, request).pipe(
      map(response => this.mapReport(response)),
      catchError(this.handleError('generateReport'))
    );
  }

  /**
   * Get a reconciliation report by ID.
   *
   * @param reportId The report ID to retrieve
   * @returns Observable of the ReconciliationReport with discrepancies
   */
  getReport(reportId: string): Observable<ReconciliationReport> {
    return this.http.get<any>(`${this.apiUrl}/${reportId}`).pipe(
      map(response => this.mapReport(response)),
      catchError(this.handleError('getReport'))
    );
  }

  /**
   * Get the summary statistics for a specific report.
   *
   * @param reportId The report ID to get the summary for
   * @returns Observable of ReconciliationSummary with aggregate stats
   */
  getReportSummary(reportId: string): Observable<ReconciliationSummary> {
    return this.http.get<any>(`${this.apiUrl}/summary/${reportId}`).pipe(
      map(response => this.mapSummary(response)),
      catchError(this.handleError('getReportSummary'))
    );
  }

  /**
   * Resolve a discrepancy with a resolution note.
   *
   * @param id The discrepancy ID to resolve
   * @param request Request containing the resolution note
   * @returns Observable of void on success
   */
  resolveDiscrepancy(id: string, request: ResolveDiscrepancyRequest): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/discrepancies/${id}/resolve`,
      request
    ).pipe(
      catchError(this.handleError('resolveDiscrepancy'))
    );
  }

  /**
   * Escalate a discrepancy to a supervisor.
   *
   * @param id The discrepancy ID to escalate
   * @param request Request containing the supervisor ID
   * @returns Observable of void on success
   */
  escalateDiscrepancy(id: string, request: EscalateDiscrepancyRequest): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/discrepancies/${id}/escalate`,
      request
    ).pipe(
      catchError(this.handleError('escalateDiscrepancy'))
    );
  }

  /**
   * Map raw API response to ReconciliationReport, handling PascalCase and camelCase.
   */
  private mapReport(raw: any): ReconciliationReport {
    const discrepanciesRaw = raw?.discrepancies ?? raw?.Discrepancies ?? [];
    const discrepanciesArray = this.extractArray(discrepanciesRaw);

    return {
      id: raw?.id ?? raw?.Id ?? '',
      startDate: new Date(raw?.startDate ?? raw?.StartDate ?? new Date()),
      endDate: new Date(raw?.endDate ?? raw?.EndDate ?? new Date()),
      generatedBy: raw?.generatedBy ?? raw?.GeneratedBy ?? '',
      generatedAt: new Date(raw?.generatedAt ?? raw?.GeneratedAt ?? new Date()),
      totalRecordsCompared: raw?.totalRecordsCompared ?? raw?.TotalRecordsCompared ?? 0,
      matchCount: raw?.matchCount ?? raw?.MatchCount ?? 0,
      discrepancyCount: raw?.discrepancyCount ?? raw?.DiscrepancyCount ?? 0,
      discrepancyPercentage: raw?.discrepancyPercentage ?? raw?.DiscrepancyPercentage ?? 0,
      status: raw?.status ?? raw?.Status ?? 'Generated',
      discrepancies: discrepanciesArray.map(d => this.mapDiscrepancy(d))
    };
  }

  /**
   * Map raw API response to ReconciliationDiscrepancy, handling PascalCase and camelCase.
   */
  private mapDiscrepancy(raw: any): ReconciliationDiscrepancy {
    return {
      id: raw?.id ?? raw?.Id ?? '',
      reportId: raw?.reportId ?? raw?.ReportId ?? '',
      technicianId: raw?.technicianId ?? raw?.TechnicianId ?? '',
      technicianName: raw?.technicianName ?? raw?.TechnicianName ?? undefined,
      workDate: new Date(raw?.workDate ?? raw?.WorkDate ?? new Date()),
      atlasHours: raw?.atlasHours ?? raw?.AtlasHours ?? 0,
      atlasTimeCategory: raw?.atlasTimeCategory ?? raw?.AtlasTimeCategory ?? '',
      celerityHours: raw?.celerityHours ?? raw?.CelerityHours ?? 0,
      celerityPayType: raw?.celerityPayType ?? raw?.CelerityPayType ?? '',
      hoursVariance: raw?.hoursVariance ?? raw?.HoursVariance ?? 0,
      discrepancyType: raw?.discrepancyType ?? raw?.DiscrepancyType ?? 'Hours',
      status: raw?.status ?? raw?.Status ?? 'Pending',
      resolutionNote: raw?.resolutionNote ?? raw?.ResolutionNote ?? undefined,
      resolvedBy: raw?.resolvedBy ?? raw?.ResolvedBy ?? undefined,
      resolvedAt: raw?.resolvedAt ?? raw?.ResolvedAt
        ? new Date(raw.resolvedAt ?? raw.ResolvedAt)
        : undefined,
      escalatedTo: raw?.escalatedTo ?? raw?.EscalatedTo ?? undefined,
      escalatedAt: raw?.escalatedAt ?? raw?.EscalatedAt
        ? new Date(raw.escalatedAt ?? raw.EscalatedAt)
        : undefined
    };
  }

  /**
   * Map raw API response to ReconciliationSummary, handling PascalCase and camelCase.
   */
  private mapSummary(raw: any): ReconciliationSummary {
    return {
      reportId: raw?.reportId ?? raw?.ReportId ?? '',
      totalRecords: raw?.totalRecords ?? raw?.TotalRecords ?? 0,
      matchCount: raw?.matchCount ?? raw?.MatchCount ?? 0,
      discrepancyCount: raw?.discrepancyCount ?? raw?.DiscrepancyCount ?? 0,
      discrepancyPercentage: raw?.discrepancyPercentage ?? raw?.DiscrepancyPercentage ?? 0,
      resolvedCount: raw?.resolvedCount ?? raw?.ResolvedCount ?? 0,
      pendingCount: raw?.pendingCount ?? raw?.PendingCount ?? 0,
      escalatedCount: raw?.escalatedCount ?? raw?.EscalatedCount ?? 0,
      totalHoursVariance: raw?.totalHoursVariance ?? raw?.TotalHoursVariance ?? 0
    };
  }

  /**
   * Extract an array from various API response shapes.
   * Handles .NET $values pattern, direct arrays, and wrapped responses.
   */
  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.$values) return response.$values;
    if (response?.data) return response.data;
    if (response?.items) return response.items;
    return [];
  }

  /**
   * Centralized error handler.
   */
  private handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      let message = 'An error occurred';
      if (error.error instanceof ErrorEvent) {
        message = error.error.message;
      } else if (error.status) {
        switch (error.status) {
          case 400: message = error.error?.message ?? `Invalid request in ${operation}`; break;
          case 404: message = error.error?.message ?? `Resource not found in ${operation}`; break;
          case 409: message = error.error?.message ?? `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`ReconciliationService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
