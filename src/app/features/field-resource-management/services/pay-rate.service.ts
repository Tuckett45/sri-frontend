import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { TimeEntry } from '../models/time-entry.model';
import { TechnicianRole } from '../models/technician.model';
import {
  UserPayRate,
  RoleLevelPayRate,
  PayRateChange,
  LaborCostSummary
} from '../../../models/time-payroll.model';
import { PayType } from '../../../models/time-payroll.enum';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';
import { resolveApplicableRate } from '../utils/timecard-calculations';
import {
  AuditLoggingService,
  AuditAction,
  AuditResource
} from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Pay Rate Service
 *
 * Manages user pay rates by role level and calculates labor costs.
 * Provides CRUD operations for technician pay rates and default role-level
 * rates, delegates rate resolution to the pure `resolveApplicableRate`
 * utility, and records all pay rate changes in the audit log.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
@Injectable({
  providedIn: 'root'
})
export class PayRateService {

  constructor(
    private http: HttpClient,
    private auditLoggingService: AuditLoggingService,
    private authService: AuthService
  ) {}

  // ─── Pay Rate CRUD ─────────────────────────────────────────────────

  /**
   * Get the current pay rate for a technician.
   *
   * Requirement 6.1
   */
  getPayRate(technicianId: string): Observable<UserPayRate> {
    return this.http.get<any>(TIMECARD_ENDPOINTS.getPayRate(technicianId)).pipe(
      map(response => this.mapUserPayRate(response)),
      catchError(this.handleError('getPayRate'))
    );
  }

  /**
   * Set the pay rate for a technician with an effective date.
   *
   * Persists the new rate via the API, then records an audit log entry
   * with the previous and new rates, effective date, and the identity
   * of the manager who made the change.
   *
   * Requirements: 6.1, 6.3, 6.6
   */
  setPayRate(
    technicianId: string,
    rate: UserPayRate,
    effectiveDate: Date
  ): Observable<UserPayRate> {
    const user = this.authService.getUser();

    const payload = {
      technicianId,
      roleLevel: rate.roleLevel,
      standardHourlyRate: rate.standardHourlyRate,
      overtimeHourlyRate: rate.overtimeHourlyRate,
      effectiveDate: effectiveDate.toISOString()
    };

    return this.http.put<any>(TIMECARD_ENDPOINTS.setPayRate(technicianId), payload).pipe(
      map(response => this.mapUserPayRate(response)),
      tap(savedRate => {
        // Record pay rate change in audit log (Requirement 6.6)
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? '',
          user?.name ?? '',
          `PayRate:${technicianId}`,
          savedRate.standardHourlyRate,
          `Pay rate changed. Previous: $${rate.standardHourlyRate}/$${rate.overtimeHourlyRate}, ` +
          `New: $${savedRate.standardHourlyRate}/$${savedRate.overtimeHourlyRate}, ` +
          `Effective: ${effectiveDate.toISOString().slice(0, 10)}, ` +
          `Changed by: ${user?.name ?? 'Unknown'}`,
          rate.standardHourlyRate,
          savedRate.standardHourlyRate
        );
      }),
      catchError(this.handleError('setPayRate'))
    );
  }

  // ─── Default Rates ─────────────────────────────────────────────────

  /**
   * Get default pay rates for all role levels.
   *
   * Requirement 6.4
   */
  getDefaultRates(): Observable<RoleLevelPayRate[]> {
    return this.http.get<any>(TIMECARD_ENDPOINTS.getDefaultRates()).pipe(
      map(response => this.extractArray(response).map(raw => this.mapRoleLevelPayRate(raw))),
      catchError(this.handleError('getDefaultRates'))
    );
  }

  /**
   * Set the default pay rate for a specific role level.
   *
   * Requirement 6.4
   */
  setDefaultRate(roleLevel: TechnicianRole, rate: RoleLevelPayRate): Observable<RoleLevelPayRate> {
    const user = this.authService.getUser();

    const payload = {
      roleLevel,
      standardHourlyRate: rate.standardHourlyRate,
      overtimeHourlyRate: rate.overtimeHourlyRate
    };

    return this.http.put<any>(TIMECARD_ENDPOINTS.setDefaultRate(), payload).pipe(
      map(response => this.mapRoleLevelPayRate(response)),
      tap(savedRate => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? '',
          user?.name ?? '',
          `DefaultPayRate:${roleLevel}`,
          savedRate.standardHourlyRate,
          `Default pay rate updated for role ${roleLevel}`,
          rate.standardHourlyRate,
          savedRate.standardHourlyRate
        );
      }),
      catchError(this.handleError('setDefaultRate'))
    );
  }

  // ─── Labor Cost Calculation ────────────────────────────────────────

  /**
   * Calculate labor cost for a technician's time entries using a single pay rate.
   *
   * Multiplies regular hours by the standard hourly rate and overtime hours
   * by the overtime hourly rate for each entry, then sums the results.
   *
   * Requirement 6.7
   */
  calculateLaborCost(entries: TimeEntry[], payRate: UserPayRate): LaborCostSummary {
    let regularHours = 0;
    let overtimeHours = 0;
    let regularCost = 0;
    let overtimeCost = 0;

    for (const entry of entries) {
      const regHrs = entry.regularHours ?? entry.totalHours ?? 0;
      const otHrs = entry.overtimeHours ?? 0;

      regularHours += regHrs;
      overtimeHours += otHrs;
      regularCost += regHrs * payRate.standardHourlyRate;
      overtimeCost += otHrs * payRate.overtimeHourlyRate;
    }

    // Derive technicianId from the first entry, or from the payRate
    const technicianId = entries.length > 0
      ? entries[0].technicianId
      : payRate.technicianId;

    return {
      technicianId,
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalCost: regularCost + overtimeCost
    };
  }

  // ─── Pay Rate Resolution ──────────────────────────────────────────

  /**
   * Resolve the applicable pay rate for a time entry based on its creation
   * date and a history of pay rate changes.
   *
   * Delegates to the pure `resolveApplicableRate` utility so the logic
   * can be property-tested independently. Returns `undefined` when no
   * applicable rate exists in the history.
   *
   * Requirement 6.5
   */
  resolvePayRateForEntry(
    entry: TimeEntry,
    rateHistory: PayRateChange[]
  ): UserPayRate | undefined {
    return resolveApplicableRate(entry.createdAt, rateHistory);
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Map a raw API response to a UserPayRate model.
   */
  private mapUserPayRate(raw: any): UserPayRate {
    return {
      id: raw?.id || raw?.Id || '',
      technicianId: raw?.technicianId || raw?.TechnicianId || '',
      roleLevel: raw?.roleLevel || raw?.RoleLevel || TechnicianRole.Level1,
      standardHourlyRate: raw?.standardHourlyRate ?? raw?.StandardHourlyRate ?? 0,
      overtimeHourlyRate: raw?.overtimeHourlyRate ?? raw?.OvertimeHourlyRate ?? 0,
      effectiveDate: new Date(raw?.effectiveDate || raw?.EffectiveDate || new Date()),
      createdBy: raw?.createdBy || raw?.CreatedBy || '',
      createdAt: new Date(raw?.createdAt || raw?.CreatedAt || new Date())
    };
  }

  /**
   * Map a raw API response to a RoleLevelPayRate model.
   */
  private mapRoleLevelPayRate(raw: any): RoleLevelPayRate {
    return {
      roleLevel: raw?.roleLevel || raw?.RoleLevel || TechnicianRole.Level1,
      standardHourlyRate: raw?.standardHourlyRate ?? raw?.StandardHourlyRate ?? 0,
      overtimeHourlyRate: raw?.overtimeHourlyRate ?? raw?.OvertimeHourlyRate ?? 0,
      updatedBy: raw?.updatedBy || raw?.UpdatedBy || '',
      updatedAt: new Date(raw?.updatedAt || raw?.UpdatedAt || new Date())
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
        console.error(`PayRateService [${operation}] — response body:`,
          JSON.stringify(error.error, null, 2));
        console.error(`PayRateService [${operation}] — status:`,
          error.status, 'url:', error.url);

        switch (error.status) {
          case 400: message = `Invalid request in ${operation}`; break;
          case 404: message = `Resource not found in ${operation}`; break;
          case 409: message = error.error?.message || `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`PayRateService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
