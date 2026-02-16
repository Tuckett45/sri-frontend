import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { 
  DashboardMetrics, 
  UtilizationReport, 
  PerformanceReport, 
  KPI 
} from '../models/reporting.model';
import { DateRange } from '../models/assignment.model';
import { TechnicianRole } from '../models/technician.model';
import { JobType, Priority } from '../models/job.model';
import { CacheService } from './cache.service';

/**
 * Export format options
 */
export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf'
}

/**
 * Report type options
 */
export enum ReportType {
  Utilization = 'utilization',
  Performance = 'performance',
  Dashboard = 'dashboard',
  ScheduleAdherence = 'schedule-adherence'
}

/**
 * Filters for utilization reports
 */
export interface UtilizationFilters {
  dateRange: DateRange;
  technicianId?: string;
  role?: TechnicianRole;
  region?: string;
}

/**
 * Filters for performance reports
 */
export interface PerformanceFilters {
  dateRange: DateRange;
  jobType?: JobType;
  priority?: Priority;
  client?: string;
  region?: string;
}

/**
 * Schedule adherence metrics
 */
export interface AdherenceMetrics {
  dateRange: DateRange;
  totalJobs: number;
  onTimeJobs: number;
  lateJobs: number;
  adherencePercentage: number;
  averageDelay: number;
}

/**
 * Service for managing reporting and analytics operations
 * Handles HTTP communication with the backend API for reporting-related operations
 * 
 * Caching Strategy:
 * - Dashboard metrics: 5 minute TTL
 * - Reports: 1 minute TTL
 * - KPIs: 5 minute TTL
 * 
 * Cache is automatically invalidated when data changes.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private readonly apiUrl = '/api/reports';
  private readonly retryCount = 2;

  // Cache TTL constants (in milliseconds)
  private readonly DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REPORT_CACHE_TTL = 1 * 60 * 1000;    // 1 minute
  private readonly KPI_CACHE_TTL = 5 * 60 * 1000;       // 5 minutes

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Retrieves dashboard metrics including KPIs and summary data
   * Cached for 5 minutes
   * @returns Observable of dashboard metrics
   */
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.cacheService.get(
      'dashboard-metrics',
      () => this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.DASHBOARD_CACHE_TTL
    );
  }

  /**
   * Retrieves technician utilization report with filters
   * Cached for 1 minute per unique filter combination
   * @param filters Utilization report filters
   * @returns Observable of utilization report
   */
  getTechnicianUtilization(filters: UtilizationFilters): Observable<UtilizationReport> {
    const cacheKey = `utilization-${JSON.stringify(filters)}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams()
          .set('startDate', filters.dateRange.startDate.toISOString())
          .set('endDate', filters.dateRange.endDate.toISOString());

        if (filters.technicianId) {
          params = params.set('technicianId', filters.technicianId);
        }
        if (filters.role) {
          params = params.set('role', filters.role);
        }
        if (filters.region) {
          params = params.set('region', filters.region);
        }

        return this.http.get<UtilizationReport>(`${this.apiUrl}/utilization`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves job performance report with filters
   * Cached for 1 minute per unique filter combination
   * @param filters Performance report filters
   * @returns Observable of performance report
   */
  getJobPerformance(filters: PerformanceFilters): Observable<PerformanceReport> {
    const cacheKey = `performance-${JSON.stringify(filters)}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams()
          .set('startDate', filters.dateRange.startDate.toISOString())
          .set('endDate', filters.dateRange.endDate.toISOString());

        if (filters.jobType) {
          params = params.set('jobType', filters.jobType);
        }
        if (filters.priority) {
          params = params.set('priority', filters.priority);
        }
        if (filters.client) {
          params = params.set('client', filters.client);
        }
        if (filters.region) {
          params = params.set('region', filters.region);
        }

        return this.http.get<PerformanceReport>(`${this.apiUrl}/performance`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves key performance indicators
   * Cached for 5 minutes
   * @returns Observable of KPI array
   */
  getKPIs(): Observable<KPI[]> {
    return this.cacheService.get(
      'kpis',
      () => this.http.get<KPI[]>(`${this.apiUrl}/kpis`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.KPI_CACHE_TTL
    );
  }

  /**
   * Exports a report in the specified format
   * @param reportType Type of report to export
   * @param filters Report-specific filters
   * @param format Export format (CSV or PDF)
   * @returns Observable of Blob containing the exported file
   */
  exportReport(reportType: ReportType, filters: any, format: ExportFormat): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    // Add filters to params based on report type
    if (filters.dateRange) {
      params = params.set('startDate', filters.dateRange.startDate.toISOString());
      params = params.set('endDate', filters.dateRange.endDate.toISOString());
    }

    // Add additional filters
    Object.keys(filters).forEach(key => {
      if (key !== 'dateRange' && filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export/${reportType}`, {
      params,
      responseType: 'blob'
    })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves schedule adherence metrics for a date range
   * @param dateRange Date range to analyze
   * @returns Observable of adherence metrics
   */
  getScheduleAdherence(dateRange: DateRange): Observable<AdherenceMetrics> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<AdherenceMetrics>(`${this.apiUrl}/schedule-adherence`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to view reports.';
          break;
        case 404:
          errorMessage = 'Report not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'Report generation service unavailable. Please try again later.';
          break;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Invalidate all reporting caches
   * Call this when data changes that affects reports
   */
  invalidateCache(): void {
    this.cacheService.invalidatePattern(/^(dashboard|utilization|performance|kpis|adherence)/);
    console.log('[ReportingService] All caches invalidated');
  }

  /**
   * Invalidate specific report cache
   */
  invalidateReportCache(reportType: 'dashboard' | 'utilization' | 'performance' | 'kpis' | 'adherence'): void {
    this.cacheService.invalidatePattern(new RegExp(`^${reportType}`));
    console.log(`[ReportingService] ${reportType} cache invalidated`);
  }
}
