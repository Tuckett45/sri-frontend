import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { LIFECYCLE_REPORTS_ENDPOINTS } from '../api/atlas-lifecycle-endpoints';
import {
  PerformanceMetrics,
  ProjectStatusReport,
  ProjectPhase
} from '../models/atlas-lifecycle.models';

/**
 * Performance Health Indicator
 * Computed from SPI/CPI to give quick visual status.
 */
export interface PerformanceHealth {
  overall: 'healthy' | 'at-risk' | 'critical';
  scheduleHealth: 'healthy' | 'at-risk' | 'critical';
  costHealth: 'healthy' | 'at-risk' | 'critical';
  summary: string;
}

/**
 * Performance Metrics Service
 *
 * Consumes the SRI Project Lifecycle API's ReportingService to provide
 * earned value metrics and project health indicators:
 * - Schedule Performance Index (SPI)
 * - Cost Performance Index (CPI)
 * - On-time delivery rate
 * - Budget accuracy and variance
 * - Bottleneck identification
 * - Project status reports with phase breakdown
 *
 * These metrics are computed server-side by the ReportingService and
 * were previously not consumed by the frontend.
 */
@Injectable({ providedIn: 'root' })
export class PerformanceMetricsService {
  private readonly retryCount = 1;

  constructor(private http: HttpClient) {}

  // ─── Project Performance ────────────────────────────────────────────────────

  /**
   * Get earned value performance metrics for a specific project.
   * Includes SPI, CPI, on-time delivery rate, and identified bottlenecks.
   *
   * Backend: GET /api/Reports/performance/:projectId
   *
   * SPI > 1.0 = ahead of schedule
   * SPI < 1.0 = behind schedule
   * CPI > 1.0 = under budget
   * CPI < 1.0 = over budget
   */
  getProjectPerformance(projectId: string): Observable<PerformanceMetrics> {
    return this.http.get<PerformanceMetrics>(
      LIFECYCLE_REPORTS_ENDPOINTS.getPerformanceMetrics(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getProjectPerformance'))
    );
  }

  /**
   * Get a computed performance health indicator based on SPI/CPI thresholds.
   * Provides a quick-glance traffic-light status for dashboards.
   */
  getProjectHealthIndicator(projectId: string): Observable<PerformanceHealth> {
    return this.getProjectPerformance(projectId).pipe(
      map(metrics => this.computeHealth(metrics))
    );
  }

  // ─── Portfolio Status ───────────────────────────────────────────────────────

  /**
   * Get project status report across the entire portfolio.
   * Shows breakdown by phase, on-schedule vs delayed, budget totals.
   *
   * Backend: GET /api/Reports/project-status
   */
  getPortfolioStatus(phase?: ProjectPhase, status?: string): Observable<ProjectStatusReport> {
    let params = new HttpParams();
    if (phase !== undefined) params = params.set('phase', phase.toString());
    if (status) params = params.set('status', status);

    return this.http.get<ProjectStatusReport>(
      LIFECYCLE_REPORTS_ENDPOINTS.getProjectStatusReport(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPortfolioStatus'))
    );
  }

  /**
   * Get performance metrics for multiple projects at once.
   * Useful for portfolio-level performance dashboards.
   */
  getMultiProjectPerformance(projectIds: string[]): Observable<PerformanceMetrics[]> {
    // The backend doesn't support batch requests, so we fan out
    // In production, this should be behind a BFF or aggregation endpoint
    const requests = projectIds.map(id =>
      this.http.get<PerformanceMetrics>(
        LIFECYCLE_REPORTS_ENDPOINTS.getPerformanceMetrics(id)
      ).pipe(
        catchError(() => throwError(() => new Error(`Failed for project ${id}`)))
      )
    );

    // Use forkJoin pattern - caller should handle with forkJoin()
    // Returning individual observables for flexibility
    return new Observable(subscriber => {
      const results: PerformanceMetrics[] = [];
      let completed = 0;

      if (projectIds.length === 0) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

      requests.forEach(req => {
        req.subscribe({
          next: metrics => {
            results.push(metrics);
            completed++;
            if (completed === projectIds.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          },
          error: () => {
            completed++;
            if (completed === projectIds.length) {
              subscriber.next(results);
              subscriber.complete();
            }
          }
        });
      });
    });
  }

  // ─── Health Computation ─────────────────────────────────────────────────────

  /**
   * Compute a health indicator from raw performance metrics.
   * Thresholds:
   * - Healthy: SPI >= 0.9 and CPI >= 0.9
   * - At-risk: SPI >= 0.75 or CPI >= 0.75
   * - Critical: SPI < 0.75 or CPI < 0.75
   */
  computeHealth(metrics: PerformanceMetrics): PerformanceHealth {
    const scheduleHealth = this.computeMetricHealth(metrics.schedulePerformanceIndex);
    const costHealth = this.computeMetricHealth(metrics.costPerformanceIndex);

    let overall: 'healthy' | 'at-risk' | 'critical';
    if (scheduleHealth === 'critical' || costHealth === 'critical') {
      overall = 'critical';
    } else if (scheduleHealth === 'at-risk' || costHealth === 'at-risk') {
      overall = 'at-risk';
    } else {
      overall = 'healthy';
    }

    const summaryParts: string[] = [];
    if (metrics.schedulePerformanceIndex < 1.0) {
      summaryParts.push(`${((1.0 - metrics.schedulePerformanceIndex) * 100).toFixed(0)}% behind schedule`);
    }
    if (metrics.costPerformanceIndex < 1.0) {
      summaryParts.push(`${((1.0 - metrics.costPerformanceIndex) * 100).toFixed(0)}% over budget`);
    }
    if (metrics.bottlenecks.length > 0) {
      summaryParts.push(`${metrics.bottlenecks.length} bottleneck(s) identified`);
    }

    return {
      overall,
      scheduleHealth,
      costHealth,
      summary: summaryParts.length > 0 ? summaryParts.join('; ') : 'Project is on track'
    };
  }

  private computeMetricHealth(index: number): 'healthy' | 'at-risk' | 'critical' {
    if (index >= 0.9) return 'healthy';
    if (index >= 0.75) return 'at-risk';
    return 'critical';
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid parameters for performance query'; break;
        case 404: message = 'No performance data found for project'; break;
        case 500: message = 'Server error computing performance metrics'; break;
        case 503: message = 'Performance metrics service unavailable'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`PerformanceMetricsService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
