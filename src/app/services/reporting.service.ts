import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import {
  ProjectStatusReport,
  TechnicianPerformanceMetrics,
  TimeBillingReport,
  TrendAnalysis,
  ComparativeAnalytics,
  RecurringReportConfig,
  DataExportRequest,
  DataExportResponse,
  CustomReportConfig,
  ReportType,
  ReportFilters
} from '../models/reporting.model';
import { DateRange } from '../features/field-resource-management/models/assignment.model';

/**
 * Service for managing reporting and analytics with role-based data access.
 * 
 * This service provides comprehensive reporting capabilities with automatic
 * market-based filtering for CM users and system-wide access for Admin users.
 * 
 * Role-based behavior:
 * - CM users: All reports are automatically filtered to their assigned market
 * - Admin users: Access to all markets and additional features like comparative analytics
 * 
 * Features:
 * - Project status reports
 * - Technician performance metrics
 * - Time and billing reports
 * - Trend analysis
 * - Recurring report scheduling
 * - Data export with role-based filtering
 * - Comparative analytics (Admin only)
 * - Custom report builder (Admin only)
 */
@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private readonly apiUrl = `${environment.apiUrl}/reporting`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  /**
   * Generate project status report with market filtering.
   * 
   * CM users: Report includes only projects from their assigned market
   * Admin users: Report includes projects from all markets or specified market
   * 
   * @param dateRange Date range for the report
   * @param filters Optional additional filters
   * @returns Observable of project status report
   */
  generateProjectStatusReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Observable<ProjectStatusReport> {
    const params = this.buildReportParams(dateRange, filters);

    return this.http.get<ProjectStatusReport>(
      `${this.apiUrl}/project-status`,
      { params }
    ).pipe(
      map(report => this.mapReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Get technician performance metrics with market filtering.
   * 
   * CM users: Metrics include only technicians from their assigned market
   * Admin users: Metrics include technicians from all markets or specified market
   * 
   * @param dateRange Date range for the metrics
   * @param filters Optional additional filters (technicianId, role, etc.)
   * @returns Observable of technician performance metrics
   */
  getTechnicianPerformanceMetrics(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Observable<TechnicianPerformanceMetrics> {
    const params = this.buildReportParams(dateRange, filters);

    return this.http.get<TechnicianPerformanceMetrics>(
      `${this.apiUrl}/technician-performance`,
      { params }
    ).pipe(
      map(report => this.mapReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Export data with role-based data inclusion.
   * 
   * CM users: Export includes only data from their assigned market
   * Admin users: Export includes data from all markets or specified markets
   * 
   * @param request Data export request with filters and format
   * @returns Observable of data export response with download URL
   */
  exportData(request: DataExportRequest): Observable<DataExportResponse> {
    // Apply role-based filtering to the request
    const filteredRequest = {
      ...request,
      filters: this.applyRoleBasedFilters(request.filters)
    };

    return this.http.post<DataExportResponse>(
      `${this.apiUrl}/export`,
      filteredRequest
    ).pipe(
      map(response => ({
        ...response,
        expiresAt: new Date(response.expiresAt)
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Get time and billing report with market filtering.
   * 
   * CM users: Report includes only billing entries from their assigned market
   * Admin users: Report includes billing entries from all markets or specified market
   * 
   * @param dateRange Date range for the report
   * @param filters Optional additional filters
   * @returns Observable of time and billing report
   */
  getTimeBillingReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Observable<TimeBillingReport> {
    const params = this.buildReportParams(dateRange, filters);

    return this.http.get<TimeBillingReport>(
      `${this.apiUrl}/time-billing`,
      { params }
    ).pipe(
      map(report => this.mapReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Get trend analysis for performance over time.
   * 
   * Analyzes trends in specified metrics over the given date range.
   * CM users see trends for their market only.
   * Admin users see system-wide trends or market-specific trends.
   * 
   * @param metric Metric to analyze (e.g., 'utilization', 'revenue', 'completion_rate')
   * @param dateRange Date range for the analysis
   * @param filters Optional additional filters
   * @returns Observable of trend analysis
   */
  getTrendAnalysis(
    metric: string,
    dateRange: DateRange,
    filters?: ReportFilters
  ): Observable<TrendAnalysis> {
    const params = this.buildReportParams(dateRange, {
      ...filters,
      metric
    });

    return this.http.get<TrendAnalysis>(
      `${this.apiUrl}/trend-analysis`,
      { params }
    ).pipe(
      map(report => this.mapTrendAnalysisDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Schedule a recurring report for automated generation.
   * 
   * Creates a scheduled report that will be automatically generated and
   * delivered to specified recipients based on the schedule.
   * 
   * CM users: Reports are automatically filtered to their market
   * Admin users: Can schedule reports for any market or all markets
   * 
   * @param config Recurring report configuration
   * @returns Observable of created recurring report configuration
   */
  scheduleRecurringReport(
    config: RecurringReportConfig
  ): Observable<RecurringReportConfig> {
    // Apply role-based filtering to report filters
    const filteredConfig = {
      ...config,
      filters: this.applyRoleBasedFilters(config.filters),
      createdBy: this.authService.getUser()?.id
    };

    return this.http.post<RecurringReportConfig>(
      `${this.apiUrl}/recurring`,
      filteredConfig
    ).pipe(
      map(report => this.mapRecurringReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Get list of scheduled recurring reports.
   * 
   * CM users: See only their own scheduled reports
   * Admin users: See all scheduled reports or filter by user
   * 
   * @param userId Optional user ID to filter by (Admin only)
   * @returns Observable of recurring report configurations
   */
  getRecurringReports(userId?: string): Observable<RecurringReportConfig[]> {
    let params = new HttpParams();

    if (userId && this.authService.isAdmin()) {
      params = params.set('userId', userId);
    } else if (!this.authService.isAdmin()) {
      // Non-admin users can only see their own reports
      const currentUser = this.authService.getUser();
      if (currentUser) {
        params = params.set('userId', currentUser.id);
      }
    }

    return this.http.get<RecurringReportConfig[]>(
      `${this.apiUrl}/recurring`,
      { params }
    ).pipe(
      map(reports => reports.map(r => this.mapRecurringReportDates(r))),
      catchError(this.handleError)
    );
  }

  /**
   * Update a recurring report configuration.
   * 
   * @param id Report configuration ID
   * @param config Updated configuration
   * @returns Observable of updated configuration
   */
  updateRecurringReport(
    id: string,
    config: Partial<RecurringReportConfig>
  ): Observable<RecurringReportConfig> {
    return this.http.put<RecurringReportConfig>(
      `${this.apiUrl}/recurring/${id}`,
      config
    ).pipe(
      map(report => this.mapRecurringReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a recurring report configuration.
   * 
   * @param id Report configuration ID
   * @returns Observable of void
   */
  deleteRecurringReport(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/recurring/${id}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get comparative analytics for Admin market-by-market comparison.
   * 
   * This method is only available to Admin users and provides
   * side-by-side comparison of metrics across all markets.
   * 
   * @param dateRange Date range for the comparison
   * @param metrics Optional array of specific metrics to compare
   * @returns Observable of comparative analytics
   * @throws Error if user is not an Admin
   */
  getComparativeAnalytics(
    dateRange: DateRange,
    metrics?: string[]
  ): Observable<ComparativeAnalytics> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can access comparative analytics'));
    }

    let params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    if (metrics && metrics.length > 0) {
      params = params.set('metrics', metrics.join(','));
    }

    return this.http.get<ComparativeAnalytics>(
      `${this.apiUrl}/comparative-analytics`,
      { params }
    ).pipe(
      map(report => ({
        ...report,
        generatedAt: new Date(report.generatedAt)
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Create a custom report configuration (Admin only).
   * 
   * Allows Admin users to build custom reports with specific
   * data sources, columns, filters, and aggregations.
   * 
   * @param config Custom report configuration
   * @returns Observable of created custom report configuration
   * @throws Error if user is not an Admin
   */
  createCustomReport(config: CustomReportConfig): Observable<CustomReportConfig> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can create custom reports'));
    }

    const reportConfig = {
      ...config,
      createdBy: this.authService.getUser()?.id,
      createdAt: new Date()
    };

    return this.http.post<CustomReportConfig>(
      `${this.apiUrl}/custom`,
      reportConfig
    ).pipe(
      map(report => this.mapCustomReportDates(report)),
      catchError(this.handleError)
    );
  }

  /**
   * Get list of custom report configurations (Admin only).
   * 
   * @param includePublic Whether to include public reports
   * @returns Observable of custom report configurations
   * @throws Error if user is not an Admin
   */
  getCustomReports(includePublic: boolean = true): Observable<CustomReportConfig[]> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can access custom reports'));
    }

    const params = new HttpParams().set('includePublic', includePublic.toString());

    return this.http.get<CustomReportConfig[]>(
      `${this.apiUrl}/custom`,
      { params }
    ).pipe(
      map(reports => reports.map(r => this.mapCustomReportDates(r))),
      catchError(this.handleError)
    );
  }

  /**
   * Execute a custom report.
   * 
   * @param reportId Custom report configuration ID
   * @param filters Optional runtime filters to apply
   * @returns Observable of report data
   */
  executeCustomReport(reportId: string, filters?: ReportFilters): Observable<any> {
    const params = filters ? this.buildFilterParams(filters) : new HttpParams();

    return this.http.get(
      `${this.apiUrl}/custom/${reportId}/execute`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a custom report configuration (Admin only).
   * 
   * @param reportId Custom report configuration ID
   * @returns Observable of void
   * @throws Error if user is not an Admin
   */
  deleteCustomReport(reportId: string): Observable<void> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can delete custom reports'));
    }

    return this.http.delete<void>(
      `${this.apiUrl}/custom/${reportId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Build HTTP parameters for report requests with role-based filtering.
   * 
   * @param dateRange Date range for the report
   * @param filters Optional additional filters
   * @returns HttpParams with all filters applied
   */
  private buildReportParams(dateRange: DateRange, filters?: ReportFilters): HttpParams {
    let params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    // Apply role-based market filtering
    const roleBasedFilters = this.applyRoleBasedFilters(filters || {});

    // Add all filters to params
    Object.keys(roleBasedFilters).forEach(key => {
      const value = roleBasedFilters[key];
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  /**
   * Build HTTP parameters from filters object.
   * 
   * @param filters Report filters
   * @returns HttpParams with filters applied
   */
  private buildFilterParams(filters: ReportFilters): HttpParams {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else if (typeof value === 'object' && 'startDate' in value) {
          // Handle DateRange
          params = params.set('startDate', value.startDate.toISOString());
          params = params.set('endDate', value.endDate.toISOString());
        } else {
          params = params.set(key, String(value));
        }
      }
    });

    return params;
  }

  /**
   * Apply role-based filtering to report filters.
   * 
   * CM users: Automatically adds their market to filters
   * Admin users: No automatic filtering unless market is specified
   * 
   * @param filters Original filters
   * @returns Filters with role-based market filtering applied
   */
  private applyRoleBasedFilters(filters: ReportFilters): ReportFilters {
    const user = this.authService.getUser();

    // Admin users don't need automatic market filtering
    if (this.authService.isAdmin()) {
      return filters;
    }

    // CM users need market filtering
    if (this.authService.isCM() && user?.market) {
      return {
        ...filters,
        market: user.market
      };
    }

    return filters;
  }

  /**
   * Map date strings to Date objects in report.
   * 
   * @param report Report with date strings
   * @returns Report with Date objects
   */
  private mapReportDates(report: any): any {
    return {
      ...report,
      generatedAt: new Date(report.generatedAt),
      dateRange: {
        startDate: new Date(report.dateRange.startDate),
        endDate: new Date(report.dateRange.endDate)
      }
    };
  }

  /**
   * Map date strings to Date objects in trend analysis.
   * 
   * @param report Trend analysis with date strings
   * @returns Trend analysis with Date objects
   */
  private mapTrendAnalysisDates(report: TrendAnalysis): TrendAnalysis {
    return {
      ...report,
      generatedAt: new Date(report.generatedAt),
      dateRange: {
        startDate: new Date(report.dateRange.startDate),
        endDate: new Date(report.dateRange.endDate)
      },
      dataPoints: report.dataPoints.map(dp => ({
        ...dp,
        date: new Date(dp.date)
      }))
    };
  }

  /**
   * Map date strings to Date objects in recurring report config.
   * 
   * @param config Recurring report config with date strings
   * @returns Recurring report config with Date objects
   */
  private mapRecurringReportDates(config: RecurringReportConfig): RecurringReportConfig {
    return {
      ...config,
      createdAt: new Date(config.createdAt),
      lastRun: config.lastRun ? new Date(config.lastRun) : undefined,
      nextRun: config.nextRun ? new Date(config.nextRun) : undefined
    };
  }

  /**
   * Map date strings to Date objects in custom report config.
   * 
   * @param config Custom report config with date strings
   * @returns Custom report config with Date objects
   */
  private mapCustomReportDates(config: CustomReportConfig): CustomReportConfig {
    return {
      ...config,
      createdAt: config.createdAt ? new Date(config.createdAt) : undefined
    };
  }

  /**
   * Handle HTTP errors.
   * 
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred while generating the report';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || error.message || `Error Code: ${error.status}`;

      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid report parameters. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to generate this report.';
          break;
        case 404:
          errorMessage = 'Report configuration not found.';
          break;
        case 500:
          errorMessage = 'Server error while generating report. Please try again later.';
          break;
        case 503:
          errorMessage = 'Report generation service unavailable. Please try again later.';
          break;
      }
    }

    console.error('ReportingService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
