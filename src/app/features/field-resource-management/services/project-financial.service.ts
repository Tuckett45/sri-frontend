import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { LIFECYCLE_REPORTS_ENDPOINTS } from '../api/atlas-lifecycle-endpoints';
import {
  CostAnalysisReport,
  BudgetBaseline,
  CostOverrunAlert,
  ResourceUtilizationReport,
  HistoricalAnalysisReport
} from '../models/atlas-lifecycle.models';

/**
 * Project Financial Service
 *
 * Consumes the SRI Project Lifecycle API's CostManagementService and ReportingService
 * to provide project-level financial visibility including:
 * - Budget baselines with category breakdowns
 * - Expense tracking and cost analysis
 * - Cost overrun detection with severity alerts
 * - Estimate at Completion (EAC) and profit margin calculations
 * - Resource utilization and allocation tracking
 *
 * This bridges the gap between the atlas-platform's rich financial backend
 * and the frontend's previously job-only budget views.
 */
@Injectable({ providedIn: 'root' })
export class ProjectFinancialService {
  private readonly retryCount = 1;

  constructor(private http: HttpClient) {}

  // ─── Cost Analysis ──────────────────────────────────────────────────────────

  /**
   * Get comprehensive cost analysis for a project.
   * Includes budget vs actual, category breakdown, EAC, profit margins.
   *
   * Backend: GET /api/Reports/cost-analysis/:projectId
   */
  getCostAnalysis(projectId: string): Observable<CostAnalysisReport> {
    return this.http.get<CostAnalysisReport>(
      LIFECYCLE_REPORTS_ENDPOINTS.getCostAnalysis(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getCostAnalysis'))
    );
  }

  // ─── Resource Utilization ───────────────────────────────────────────────────

  /**
   * Get resource utilization report for a date range.
   * Shows allocation vs utilization by project and resource type.
   *
   * Backend: GET /api/Reports/resource-utilization
   */
  getResourceUtilization(startDate?: Date, endDate?: Date): Observable<ResourceUtilizationReport> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());

    return this.http.get<ResourceUtilizationReport>(
      LIFECYCLE_REPORTS_ENDPOINTS.getResourceUtilization(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getResourceUtilization'))
    );
  }

  // ─── Historical Analysis ────────────────────────────────────────────────────

  /**
   * Get historical analysis and benchmarking data.
   * Includes trend analysis, recommendations, and cost efficiency metrics.
   *
   * Backend: GET /api/Reports/historical-analysis
   */
  getHistoricalAnalysis(
    projectType?: string,
    timeframe: number = 12
  ): Observable<HistoricalAnalysisReport> {
    let params = new HttpParams().set('timeframe', timeframe.toString());
    if (projectType) params = params.set('projectType', projectType);

    return this.http.get<HistoricalAnalysisReport>(
      LIFECYCLE_REPORTS_ENDPOINTS.getHistoricalAnalysis(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getHistoricalAnalysis'))
    );
  }

  // ─── Data Export ────────────────────────────────────────────────────────────

  /**
   * Export project financial data in specified format (json, csv, excel).
   *
   * Backend: GET /api/Reports/export/:projectId
   */
  exportProjectData(projectId: string, format: string = 'json'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(
      LIFECYCLE_REPORTS_ENDPOINTS.exportProjectData(projectId),
      { params, responseType: 'blob' }
    ).pipe(
      catchError(error => this.handleError(error, 'exportProjectData'))
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid financial query parameters'; break;
        case 403: message = 'Access denied for financial data'; break;
        case 404: message = 'Financial data not found for project'; break;
        case 500: message = 'Server error processing financial request'; break;
        case 503: message = 'Financial service unavailable'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`ProjectFinancialService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
