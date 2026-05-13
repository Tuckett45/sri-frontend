/**
 * Reporting API Service
 * 
 * Provides a validated API integration layer for reporting operations.
 * Wraps HTTP calls with request validation and consistent error handling.
 * 
 * Endpoints:
 * - GET /api/reports/job-cost/:jobId        - Get job cost report
 * - GET /api/reports/budget-variance         - Get budget variance report
 * - GET /api/reports/travel-costs            - Get travel cost report
 * - GET /api/reports/material-usage          - Get material usage report
 * 
 * Requirements: 12.1-12.10
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {
  JobCostBreakdown,
  BudgetComparison,
  BudgetVarianceReport,
  TravelCostReport,
  MaterialUsageReport
} from '../models/reporting.model';
import { DateRange } from '../models/assignment.model';
import { REPORTING_ENDPOINTS } from './api-endpoints';
import { validateId } from './api-validators';

@Injectable({
  providedIn: 'root'
})
export class ReportingApiService {
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/reports/job-cost/:jobId
   * Retrieve comprehensive job cost report
   * Requirements: 12.8, 11.1-11.7
   */
  getJobCostReport(jobId: string): Observable<JobCostBreakdown> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<JobCostBreakdown>(
      REPORTING_ENDPOINTS.getJobCostReport(jobId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getJobCostReport'))
    );
  }

  /**
   * GET /api/reports/job-cost/:jobId/export
   * Export job cost report as PDF or Excel
   * Requirements: 12.8
   */
  exportJobCostReport(jobId: string, format: 'pdf' | 'excel'): Observable<Blob> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const params = new HttpParams().set('format', format);
    return this.http.get(
      REPORTING_ENDPOINTS.exportJobCostReport(jobId),
      { params, responseType: 'blob' }
    ).pipe(
      catchError(error => this.handleError(error, 'exportJobCostReport'))
    );
  }

  /**
   * GET /api/reports/budget-comparison/:jobId
   * Retrieve budget comparison data for a job
   * Requirements: 12.1, 12.2
   */
  getBudgetComparison(jobId: string): Observable<BudgetComparison> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<BudgetComparison>(
      REPORTING_ENDPOINTS.getBudgetComparison(jobId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getBudgetComparison'))
    );
  }

  /**
   * GET /api/reports/budget-variance
   * Retrieve budget variance report across all jobs
   * Requirements: 12.1, 12.2, 12.9
   */
  getBudgetVarianceReport(dateRange?: DateRange): Observable<BudgetVarianceReport> {
    let params = new HttpParams();
    if (dateRange) {
      params = params
        .set('startDate', dateRange.startDate.toISOString())
        .set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<BudgetVarianceReport>(
      REPORTING_ENDPOINTS.getBudgetVariance(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getBudgetVarianceReport'))
    );
  }

  /**
   * GET /api/reports/travel-costs
   * Retrieve travel cost report
   * Requirements: 12.4
   */
  getTravelCostReport(dateRange?: DateRange): Observable<TravelCostReport> {
    let params = new HttpParams();
    if (dateRange) {
      params = params
        .set('startDate', dateRange.startDate.toISOString())
        .set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<TravelCostReport>(
      REPORTING_ENDPOINTS.getTravelCosts(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getTravelCostReport'))
    );
  }

  /**
   * GET /api/reports/material-usage
   * Retrieve material usage report
   * Requirements: 12.6, 12.7
   */
  getMaterialUsageReport(dateRange?: DateRange): Observable<MaterialUsageReport> {
    let params = new HttpParams();
    if (dateRange) {
      params = params
        .set('startDate', dateRange.startDate.toISOString())
        .set('endDate', dateRange.endDate.toISOString());
    }

    return this.http.get<MaterialUsageReport>(
      REPORTING_ENDPOINTS.getMaterialUsage(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getMaterialUsageReport'))
    );
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid report parameters'; break;
        case 403: message = 'Access denied for reports'; break;
        case 404: message = 'Report data not found'; break;
        case 500: message = 'Server error generating report'; break;
        case 503: message = 'Report service unavailable'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`ReportingApiService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
