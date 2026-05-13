import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { TimeEntry } from '../models/time-entry.model';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';
import { Holiday } from '../../../models/time-payroll.model';
import { ValidationResult } from '../validators/payroll-validators';
import { validateNoPtoConflict } from '../validators/payroll-validators';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';
import {
  AuditLoggingService,
  AuditAction,
  AuditResource
} from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Pay Classification Service
 *
 * Responsible for determining and applying PayType to time entries based on
 * the holiday calendar and PTO requests. Provides holiday CRUD, PTO entry
 * creation, and holiday-change impact analysis.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7
 */
@Injectable({
  providedIn: 'root'
})
export class PayClassificationService {

  constructor(
    private http: HttpClient,
    private auditLoggingService: AuditLoggingService,
    private authService: AuthService
  ) {}

  // ─── Pay Type Classification ───────────────────────────────────────

  /**
   * Determine the PayType for a time entry based on date and holiday list.
   *
   * Returns PayType.Holiday when the date matches a configured holiday;
   * otherwise returns PayType.Regular.
   *
   * Requirement 2.1
   */
  classifyPayType(date: Date, _technicianId: string, holidays: Holiday[]): PayType {
    return this.isHoliday(date, holidays) ? PayType.Holiday : PayType.Regular;
  }

  /**
   * Check whether a date falls on a company-recognized holiday.
   *
   * Comparison is performed on the calendar date (year-month-day) only,
   * ignoring time-of-day differences.
   *
   * Requirement 2.1
   */
  isHoliday(date: Date, holidays: Holiday[]): boolean {
    const target = this.toDateKey(date);
    return holidays.some(h => this.toDateKey(h.date) === target);
  }

  // ─── PTO Validation & Creation ─────────────────────────────────────

  /**
   * Validate that a PTO entry does not conflict with existing entries
   * for the same technician on the same date.
   *
   * Delegates to the pure `validateNoPtoConflict` validator so the
   * logic can be property-tested independently.
   *
   * Requirement 2.5
   */
  validatePtoEntry(
    date: Date,
    _technicianId: string,
    existingEntries: TimeEntry[]
  ): ValidationResult {
    return validateNoPtoConflict(date, existingEntries);
  }

  /**
   * Request PTO for a technician on a given date.
   *
   * Creates a TimeEntry with payType PTO and totalHours equal to the
   * technician's standard workday length. The entry is persisted via
   * the time-entries API and an audit log entry is recorded.
   *
   * Requirement 2.2
   */
  requestPto(
    technicianId: string,
    date: Date,
    standardWorkdayHours: number
  ): Observable<TimeEntry> {
    const user = this.authService.getUser();

    const payload = {
      technicianId,
      jobId: 'PTO',
      clockInTime: this.toStartOfDay(date).toISOString(),
      clockOutTime: this.toStartOfDay(date, standardWorkdayHours).toISOString(),
      payType: PayType.PTO,
      timeCategory: TimeCategory.OnSite,
      totalHours: standardWorkdayHours,
      isManuallyAdjusted: false
    };

    return this.http.post<any>(
      `${TIMECARD_ENDPOINTS.getHolidays().replace('/holidays', '/time-entries')}`,
      payload
    ).pipe(
      map(raw => this.mapPtoResponse(raw, technicianId, date, standardWorkdayHours)),
      tap(() => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? '',
          user?.name ?? '',
          `PTO:${technicianId}`,
          standardWorkdayHours,
          `PTO requested for ${date.toISOString().slice(0, 10)}`,
          0,
          standardWorkdayHours
        );
      }),
      catchError(this.handleError('requestPto'))
    );
  }

  // ─── Holiday Management ────────────────────────────────────────────

  /**
   * Retrieve the list of company-recognized holidays.
   *
   * Requirement 2.3
   */
  getHolidays(): Observable<Holiday[]> {
    return this.http.get<any>(TIMECARD_ENDPOINTS.getHolidays()).pipe(
      map(response => this.extractArray(response).map(raw => this.mapHoliday(raw))),
      catchError(this.handleError('getHolidays'))
    );
  }

  /**
   * Save (create or update) the list of company-recognized holidays.
   *
   * Requirement 2.3
   */
  saveHolidays(holidays: Holiday[]): Observable<Holiday[]> {
    const user = this.authService.getUser();

    return this.http.post<any>(TIMECARD_ENDPOINTS.saveHolidays(), holidays).pipe(
      map(response => this.extractArray(response).map(raw => this.mapHoliday(raw))),
      tap(() => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? '',
          user?.name ?? '',
          'holidays',
          holidays.length,
          'Holiday calendar updated',
          0,
          holidays.length
        );
      }),
      catchError(this.handleError('saveHolidays'))
    );
  }

  // ─── Holiday Change Impact ─────────────────────────────────────────

  /**
   * Flag time entries affected by a holiday date change.
   *
   * Returns entries whose clock-in date matches `oldDate` so that a
   * Manager can review and re-classify them.
   *
   * Requirement 2.7
   */
  flagAffectedEntries(oldDate: Date, _newDate: Date): Observable<TimeEntry[]> {
    const startDate = this.toStartOfDay(oldDate);
    const endDate = this.toEndOfDay(oldDate);

    return this.http.get<any>(
      `${TIMECARD_ENDPOINTS.getHolidays().replace('/holidays', '/time-entries')}`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize: '500'
        }
      }
    ).pipe(
      map(response => {
        const items = this.extractArray(response);
        return items
          .map((raw: any) => this.mapTimeEntryResponse(raw))
          .filter((entry: TimeEntry) => this.toDateKey(entry.clockInTime) === this.toDateKey(oldDate));
      }),
      catchError(this.handleError('flagAffectedEntries'))
    );
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Convert a Date to a comparable 'YYYY-MM-DD' string using local time.
   */
  private toDateKey(d: Date): string {
    const date = d instanceof Date ? d : new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Create a Date at the start of the given day, optionally offset by hours.
   */
  private toStartOfDay(d: Date, offsetHours: number = 0): Date {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    if (offsetHours > 0) {
      result.setHours(result.getHours() + offsetHours);
    }
    return result;
  }

  /**
   * Create a Date at the end of the given day (23:59:59.999).
   */
  private toEndOfDay(d: Date): Date {
    const result = new Date(d);
    result.setHours(23, 59, 59, 999);
    return result;
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
   * Map a raw API response to a Holiday model.
   */
  private mapHoliday(raw: any): Holiday {
    return {
      id: raw.id || raw.Id || '',
      name: raw.name || raw.Name || '',
      date: new Date(raw.date || raw.Date),
      isRecurring: raw.isRecurring ?? raw.IsRecurring ?? false,
      createdBy: raw.createdBy || raw.CreatedBy || '',
      createdAt: new Date(raw.createdAt || raw.CreatedAt || new Date()),
      updatedAt: new Date(raw.updatedAt || raw.UpdatedAt || new Date())
    };
  }

  /**
   * Map a raw API response to a TimeEntry for PTO.
   */
  private mapPtoResponse(
    raw: any,
    technicianId: string,
    date: Date,
    hours: number
  ): TimeEntry {
    return {
      id: raw?.id || raw?.Id || '',
      jobId: raw?.jobId || raw?.JobId || 'PTO',
      technicianId: raw?.technicianId || raw?.TechnicianId || technicianId,
      clockInTime: raw?.clockInTime ? new Date(raw.clockInTime) : this.toStartOfDay(date),
      clockOutTime: raw?.clockOutTime ? new Date(raw.clockOutTime) : this.toStartOfDay(date, hours),
      totalHours: raw?.totalHours ?? raw?.TotalHours ?? hours,
      regularHours: 0,
      overtimeHours: 0,
      isManuallyAdjusted: false,
      isLocked: false,
      createdAt: raw?.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : new Date(),
      timeCategory: TimeCategory.OnSite,
      payType: PayType.PTO,
      syncStatus: raw?.syncStatus || SyncStatus.Pending
    };
  }

  /**
   * Map a raw API response to a TimeEntry (general purpose).
   */
  private mapTimeEntryResponse(raw: any): TimeEntry {
    const clockInLat = raw.clockInLatitude ?? raw.ClockInLatitude;
    const clockInLng = raw.clockInLongitude ?? raw.ClockInLongitude;
    const clockOutLat = raw.clockOutLatitude ?? raw.ClockOutLatitude;
    const clockOutLng = raw.clockOutLongitude ?? raw.ClockOutLongitude;

    return {
      id: raw.id || raw.Id || '',
      jobId: raw.jobId || raw.JobId || '',
      technicianId: raw.technicianId || raw.TechnicianId || '',
      clockInTime: new Date(raw.clockInTime || raw.ClockInTime),
      clockOutTime: raw.clockOutTime || raw.ClockOutTime
        ? new Date(raw.clockOutTime || raw.ClockOutTime)
        : undefined,
      clockInLocation: (clockInLat != null && clockInLng != null)
        ? { latitude: clockInLat, longitude: clockInLng, accuracy: 0 }
        : undefined,
      clockOutLocation: (clockOutLat != null && clockOutLng != null)
        ? { latitude: clockOutLat, longitude: clockOutLng, accuracy: 0 }
        : undefined,
      mileage: raw.mileage ?? raw.Mileage ?? undefined,
      totalHours: raw.totalHours ?? raw.TotalHours ?? undefined,
      regularHours: raw.regularHours ?? raw.RegularHours ?? undefined,
      overtimeHours: raw.overtimeHours ?? raw.OvertimeHours ?? undefined,
      breakMinutes: raw.breakMinutes ?? raw.BreakMinutes ?? undefined,
      isManuallyAdjusted: raw.isManuallyAdjusted ?? raw.IsManuallyAdjusted ?? false,
      adjustedBy: raw.adjustedBy || raw.AdjustedBy || undefined,
      adjustmentReason: raw.adjustmentReason || raw.AdjustmentReason || undefined,
      isLocked: raw.isLocked ?? raw.IsLocked ?? false,
      lockedAt: raw.lockedAt ? new Date(raw.lockedAt) : undefined,
      createdAt: new Date(raw.createdAt || raw.CreatedAt || new Date()),
      updatedAt: new Date(raw.updatedAt || raw.UpdatedAt || new Date()),
      timeCategory: raw.timeCategory || raw.TimeCategory || TimeCategory.OnSite,
      payType: raw.payType || raw.PayType || PayType.Regular,
      syncStatus: raw.syncStatus || raw.SyncStatus || SyncStatus.Synced
    };
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
        console.error(`PayClassificationService [${operation}] — response body:`,
          JSON.stringify(error.error, null, 2));
        console.error(`PayClassificationService [${operation}] — status:`,
          error.status, 'url:', error.url);

        switch (error.status) {
          case 400: message = `Invalid request in ${operation}`; break;
          case 404: message = `Resource not found in ${operation}`; break;
          case 409: message = error.error?.message || `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`PayClassificationService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
