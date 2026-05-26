import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import {
  ApprovalCounts,
  PendingTimecard,
  PendingExpense,
  TravelBreakPtoSummary,
} from '../models/dashboard.models';
import { environment } from '../../../../environments/environments';
import {
  LIFECYCLE_REPORTS_ENDPOINTS,
  ATLAS_LABOR_ENDPOINTS
} from '../api/atlas-lifecycle-endpoints';
import {
  ProjectStatusReport,
  RealTimeProjectStatus,
  PerformanceMetrics,
  ResourceUtilizationReport,
  HistoricalAnalysisReport
} from '../models/atlas-lifecycle.models';

/**
 * Dashboard Data Service
 *
 * Provides real-time data for the HR/Payroll and Project dashboard widgets
 * by consuming the Atlas Platform APIs:
 * - SRI Project Lifecycle API for project status, performance, and cost data
 * - Atlas Core API for time entry approvals and labor summaries
 *
 * Previously used mock/hardcoded data; now integrated with live backend services.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly atlasApiUrl = environment.atlasApiUrl;
  private readonly retryCount = 1;

  constructor(private http: HttpClient) {}

  // ─── HR/Payroll Dashboard (Atlas Core API) ──────────────────────────────────

  /**
   * Fetch real approval counts from the Atlas Core API.
   * Calls the approvals endpoint to get pending items by category.
   */
  getApprovalCounts(): Observable<ApprovalCounts> {
    return this.http.get<any>(`${this.atlasApiUrl}/approvals/counts`).pipe(
      retry(this.retryCount),
      map(response => ({
        pendingTimecards: response?.pendingTimecards ?? response?.PendingTimecards ?? 0,
        pendingExpenses: response?.pendingExpenses ?? response?.PendingExpenses ?? 0,
        pendingTravelRequests: response?.pendingTravelRequests ?? response?.PendingTravelRequests ?? 0,
        pendingBreakRequests: response?.pendingBreakRequests ?? response?.PendingBreakRequests ?? 0
      })),
      catchError(error => this.handleError(error, 'getApprovalCounts'))
    );
  }

  /**
   * Fetch pending timecards awaiting review from the Atlas Core API.
   */
  getPendingTimecards(): Observable<PendingTimecard[]> {
    const params = new HttpParams().set('status', 'Submitted');
    return this.http.get<any>(`${this.atlasApiUrl}/time-entries`, { params }).pipe(
      retry(this.retryCount),
      map(response => this.extractArray(response).map(entry => ({
        id: entry.id || entry.Id,
        technicianName: entry.technicianName || entry.TechnicianName || 'Unknown',
        periodStart: new Date(entry.periodStart || entry.PeriodStart || entry.clockInTime || entry.ClockInTime),
        periodEnd: new Date(entry.periodEnd || entry.PeriodEnd || entry.clockOutTime || entry.ClockOutTime),
        totalHours: entry.totalHours || entry.TotalHours || 0,
        submittedAt: new Date(entry.submittedAt || entry.SubmittedAt || entry.updatedAt || entry.UpdatedAt),
        status: entry.status || entry.Status || 'Submitted'
      }))),
      catchError(error => this.handleError(error, 'getPendingTimecards'))
    );
  }

  /**
   * Fetch pending expenses awaiting approval from the Atlas Core API.
   */
  getPendingExpenses(): Observable<PendingExpense[]> {
    const params = new HttpParams().set('status', 'Pending');
    return this.http.get<any>(`${this.atlasApiUrl}/expenses`, { params }).pipe(
      retry(this.retryCount),
      map(response => this.extractArray(response).map(expense => ({
        id: expense.id || expense.Id,
        submittedBy: expense.submittedBy || expense.SubmittedBy || expense.employeeName || 'Unknown',
        amount: expense.amount || expense.Amount || 0,
        type: expense.type || expense.Type || expense.category || 'General',
        submittedAt: new Date(expense.submittedAt || expense.SubmittedAt || expense.createdAt),
        description: expense.description || expense.Description || ''
      }))),
      catchError(error => this.handleError(error, 'getPendingExpenses'))
    );
  }

  /**
   * Fetch travel/break/PTO request summary from Atlas Core API.
   */
  getTravelBreakPtoSummary(): Observable<TravelBreakPtoSummary> {
    return this.http.get<any>(`${this.atlasApiUrl}/pto-requests/summary`).pipe(
      retry(this.retryCount),
      map(response => ({
        pendingTravelRequests: response?.pendingTravelRequests ?? response?.PendingTravelRequests ?? 0,
        pendingBreakRequests: response?.pendingBreakRequests ?? response?.PendingBreakRequests ?? 0,
        pendingPtoRequests: response?.pendingPtoRequests ?? response?.PendingPtoRequests ?? 0
      })),
      catchError(error => this.handleError(error, 'getTravelBreakPtoSummary'))
    );
  }

  // ─── Project Dashboard (SRI Lifecycle API) ──────────────────────────────────

  /**
   * Get comprehensive project status report from the Lifecycle API.
   * Includes projects by phase, budget totals, schedule status.
   */
  getProjectStatusReport(phase?: string, status?: string): Observable<ProjectStatusReport> {
    let params = new HttpParams();
    if (phase) params = params.set('phase', phase);
    if (status) params = params.set('status', status);

    return this.http.get<ProjectStatusReport>(
      LIFECYCLE_REPORTS_ENDPOINTS.getProjectStatusReport(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getProjectStatusReport'))
    );
  }

  /**
   * Get performance metrics (SPI, CPI, on-time delivery, bottlenecks) for a project.
   */
  getPerformanceMetrics(projectId: string): Observable<PerformanceMetrics> {
    return this.http.get<PerformanceMetrics>(
      LIFECYCLE_REPORTS_ENDPOINTS.getPerformanceMetrics(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPerformanceMetrics'))
    );
  }

  /**
   * Get resource utilization report for a date range.
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

  /**
   * Get cost analysis report for a specific project.
   */
  getCostAnalysis(projectId: string): Observable<any> {
    return this.http.get<any>(
      LIFECYCLE_REPORTS_ENDPOINTS.getCostAnalysis(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getCostAnalysis'))
    );
  }

  /**
   * Get historical analysis and benchmarking data.
   */
  getHistoricalAnalysis(projectType?: string, timeframe: number = 12): Observable<HistoricalAnalysisReport> {
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

  /**
   * Get labor summary for a specific job from Atlas Core API.
   */
  getLaborSummary(jobId: string): Observable<any> {
    return this.http.get<any>(
      ATLAS_LABOR_ENDPOINTS.getLaborSummary(jobId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getLaborSummary'))
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.$values) return response.$values;
    if (response?.data) return response.data;
    if (response?.items) return response.items;
    return [];
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 401: message = 'Authentication required'; break;
        case 403: message = 'Access denied'; break;
        case 404: message = 'Data not found'; break;
        case 500: message = 'Server error'; break;
        case 503: message = 'Service unavailable'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`DashboardDataService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
