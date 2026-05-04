import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { AutoSubmitConfig, AutoSubmitResult } from '../../../models/time-payroll.model';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';
import {
  AuditLoggingService,
  AuditAction,
  AuditResource
} from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Auto Submit Service
 *
 * Manages the automated timecard submission process with configurable
 * deadlines per region. Provides CRUD operations for auto-submit
 * configuration, executes auto-submit for all draft timecards past
 * their deadline, and supports retry logic (up to 3 retries at
 * 5-minute intervals).
 *
 * All auto-submit operations are recorded in the audit log with a
 * `submissionType` of `"Auto-Submitted"` to distinguish them from
 * manual submissions.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6
 */
@Injectable({
  providedIn: 'root'
})
export class AutoSubmitService {

  /** Maximum number of retry attempts for a failed auto-submit */
  private readonly MAX_RETRIES = 3;

  /** Interval between retries in milliseconds (5 minutes) */
  private readonly RETRY_INTERVAL_MS = 5 * 60 * 1000;

  constructor(
    private http: HttpClient,
    private auditLoggingService: AuditLoggingService,
    private authService: AuthService
  ) {}

  // ─── Configuration CRUD ────────────────────────────────────────────

  /**
   * Get auto-submit configuration for a region.
   *
   * Requirement 3.1, 3.5
   */
  getConfig(region: string): Observable<AutoSubmitConfig> {
    return this.http.get<any>(TIMECARD_ENDPOINTS.getAutoSubmitConfig(region)).pipe(
      map(response => this.mapAutoSubmitConfig(response)),
      catchError(this.handleError('getConfig'))
    );
  }

  /**
   * Update auto-submit configuration for a region.
   *
   * Persists the updated configuration via the API and records an
   * audit log entry for the configuration change.
   *
   * Requirements: 3.1, 3.5
   */
  updateConfig(region: string, config: AutoSubmitConfig): Observable<AutoSubmitConfig> {
    const user = this.authService.getUser();

    const payload = {
      region,
      dayOfWeek: config.dayOfWeek,
      timeOfDay: config.timeOfDay,
      enabled: config.enabled,
      maxRetries: config.maxRetries,
      retryIntervalMinutes: config.retryIntervalMinutes
    };

    return this.http.put<any>(TIMECARD_ENDPOINTS.updateAutoSubmitConfig(region), payload).pipe(
      map(response => this.mapAutoSubmitConfig(response)),
      tap(savedConfig => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? '',
          user?.name ?? '',
          `AutoSubmitConfig:${region}`,
          0,
          `Auto-submit configuration updated for region ${region}. ` +
          `Deadline: ${savedConfig.dayOfWeek} ${savedConfig.timeOfDay}, ` +
          `Enabled: ${savedConfig.enabled}, ` +
          `Changed by: ${user?.name ?? 'Unknown'}`,
          0,
          0
        );
      }),
      catchError(this.handleError('updateConfig'))
    );
  }

  // ─── Auto-Submit Execution ─────────────────────────────────────────

  /**
   * Check and execute auto-submit for all draft timecards past deadline.
   *
   * Calls the backend API which identifies all `TimecardPeriod` records
   * with status `Draft` whose period end date plus the configured
   * deadline has passed, and changes their status to `Submitted`.
   *
   * Each successfully auto-submitted timecard is recorded in the audit
   * log with `submissionType: "Auto-Submitted"`.
   *
   * Requirements: 3.2, 3.3
   */
  executeAutoSubmit(): Observable<AutoSubmitResult[]> {
    const user = this.authService.getUser();

    return this.http.post<any>(TIMECARD_ENDPOINTS.executeAutoSubmit(), {}).pipe(
      map(response => this.extractArray(response).map(raw => this.mapAutoSubmitResult(raw))),
      tap(results => {
        for (const result of results) {
          this.auditLoggingService.logBudgetAdjustment(
            user?.id ?? 'system',
            user?.name ?? 'System',
            `Timecard:${result.periodId}`,
            result.attempt,
            `Timecard auto-submitted. ` +
            `Period: ${result.periodId}, ` +
            `Technician: ${result.technicianId}, ` +
            `Success: ${result.success}, ` +
            `submissionType: Auto-Submitted`,
            0,
            0
          );
        }
      }),
      catchError(this.handleError('executeAutoSubmit'))
    );
  }

  /**
   * Retry a failed auto-submit for a specific timecard period.
   *
   * Retries up to 3 times at 5-minute intervals. If the attempt number
   * exceeds the maximum, the observable errors with a descriptive
   * message. Otherwise, it waits for the retry interval and then
   * re-invokes the auto-submit endpoint for the given period.
   *
   * Requirements: 3.6
   */
  retryAutoSubmit(periodId: string, attempt: number): Observable<AutoSubmitResult> {
    if (attempt > this.MAX_RETRIES) {
      return throwError(() => new Error(
        `Auto-submit for period ${periodId} failed after ${this.MAX_RETRIES} retries`
      ));
    }

    const user = this.authService.getUser();

    return timer(this.RETRY_INTERVAL_MS).pipe(
      switchMap(() =>
        this.http.post<any>(TIMECARD_ENDPOINTS.executeAutoSubmit(), { periodId }).pipe(
          map(response => {
            // The retry endpoint may return a single result or an array;
            // normalise to a single AutoSubmitResult.
            const raw = Array.isArray(response) ? response[0] : response;
            return this.mapAutoSubmitResult(raw);
          }),
          tap(result => {
            this.auditLoggingService.logBudgetAdjustment(
              user?.id ?? 'system',
              user?.name ?? 'System',
              `Timecard:${result.periodId}`,
              result.attempt,
              `Timecard auto-submit retry attempt ${attempt}. ` +
              `Period: ${result.periodId}, ` +
              `Success: ${result.success}, ` +
              `submissionType: Auto-Submitted`,
              0,
              0
            );
          }),
          catchError(this.handleError('retryAutoSubmit'))
        )
      )
    );
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Map a raw API response to an AutoSubmitConfig model.
   */
  private mapAutoSubmitConfig(raw: any): AutoSubmitConfig {
    return {
      id: raw?.id || raw?.Id || '',
      region: raw?.region || raw?.Region || '',
      dayOfWeek: raw?.dayOfWeek || raw?.DayOfWeek || 'Friday',
      timeOfDay: raw?.timeOfDay || raw?.TimeOfDay || '17:00',
      enabled: raw?.enabled ?? raw?.Enabled ?? false,
      maxRetries: raw?.maxRetries ?? raw?.MaxRetries ?? 3,
      retryIntervalMinutes: raw?.retryIntervalMinutes ?? raw?.RetryIntervalMinutes ?? 5,
      updatedBy: raw?.updatedBy || raw?.UpdatedBy || '',
      updatedAt: new Date(raw?.updatedAt || raw?.UpdatedAt || new Date())
    };
  }

  /**
   * Map a raw API response to an AutoSubmitResult model.
   */
  private mapAutoSubmitResult(raw: any): AutoSubmitResult {
    return {
      periodId: raw?.periodId || raw?.PeriodId || '',
      technicianId: raw?.technicianId || raw?.TechnicianId || '',
      success: raw?.success ?? raw?.Success ?? false,
      attempt: raw?.attempt ?? raw?.Attempt ?? 1,
      error: raw?.error || raw?.Error || undefined,
      timestamp: new Date(raw?.timestamp || raw?.Timestamp || new Date())
    };
  }

  /**
   * Extract an array from various API response shapes.
   */
  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.$values) return response.$values;
    if (response?.data) return response.data;
    if (response?.items) return response.items;
    return [];
  }

  /**
   * Centralized error handler following the project pattern.
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let message = 'An error occurred';
      if (error.error instanceof ErrorEvent) {
        message = error.error.message;
      } else if (error.status) {
        console.error(`AutoSubmitService [${operation}] — response body:`,
          JSON.stringify(error.error, null, 2));
        console.error(`AutoSubmitService [${operation}] — status:`,
          error.status, 'url:', error.url);

        switch (error.status) {
          case 400: message = `Invalid request in ${operation}`; break;
          case 404: message = `Resource not found in ${operation}`; break;
          case 409: message = error.error?.message || `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`AutoSubmitService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
