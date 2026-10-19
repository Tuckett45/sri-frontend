import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import {
  AttendanceRecord,
  AttendanceSummary,
  AttendanceFilter
} from '../models/qr-timekeeping.model';

/**
 * Attendance Service
 *
 * Handles retrieval of attendance records and summary statistics
 * from the Atlas API. Supports filtering by date, site, and date range.
 *
 * Requirements: 9.1, 9.2, 9.3
 */
@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly apiUrl = `${environment.atlasApiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  /**
   * Get attendance records with optional filters.
   *
   * Builds query parameters from the AttendanceFilter and retrieves
   * matching attendance records. Handles both single-date and date-range queries.
   *
   * @param filters Filter criteria including date, siteId, startDate, endDate
   * @returns Observable of AttendanceRecord array
   */
  getAttendance(filters: AttendanceFilter): Observable<AttendanceRecord[]> {
    let params = new HttpParams();

    if (filters.date) {
      params = params.set('date', filters.date);
    }
    if (filters.siteId) {
      params = params.set('siteId', filters.siteId);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => this.extractArray(response).map(raw => this.mapAttendanceRecord(raw))),
      catchError(this.handleError('getAttendance'))
    );
  }

  /**
   * Get attendance summary for a specific date.
   *
   * Returns aggregate counts (present, absent, incomplete, still-active)
   * for the specified date.
   *
   * @param date The date string (ISO format) to get the summary for
   * @returns Observable of AttendanceSummary
   */
  getSummary(date: string): Observable<AttendanceSummary> {
    const params = new HttpParams().set('date', date);
    return this.http.get<any>(`${this.apiUrl}/summary`, { params }).pipe(
      map(response => this.mapAttendanceSummary(response)),
      catchError(this.handleError('getSummary'))
    );
  }

  /**
   * Map raw API response to AttendanceRecord, handling PascalCase and camelCase.
   */
  private mapAttendanceRecord(raw: any): AttendanceRecord {
    return {
      technicianId: raw?.technicianId ?? raw?.TechnicianId ?? '',
      technicianName: raw?.technicianName ?? raw?.TechnicianName ?? '',
      date: new Date(raw?.date ?? raw?.Date ?? new Date()),
      checkInTime: raw?.checkInTime ?? raw?.CheckInTime
        ? new Date(raw.checkInTime ?? raw.CheckInTime)
        : undefined,
      checkOutTime: raw?.checkOutTime ?? raw?.CheckOutTime
        ? new Date(raw.checkOutTime ?? raw.CheckOutTime)
        : undefined,
      status: raw?.status ?? raw?.Status ?? 'Absent',
      totalHours: raw?.totalHours ?? raw?.TotalHours ?? 0,
      timeCategoryBreakdown: raw?.timeCategoryBreakdown ?? raw?.TimeCategoryBreakdown ?? {},
      payTypeBreakdown: raw?.payTypeBreakdown ?? raw?.PayTypeBreakdown ?? {},
      siteLocation: raw?.siteLocation ?? raw?.SiteLocation ?? undefined,
      entryCount: raw?.entryCount ?? raw?.EntryCount ?? 0
    };
  }

  /**
   * Map raw API response to AttendanceSummary, handling PascalCase and camelCase.
   */
  private mapAttendanceSummary(raw: any): AttendanceSummary {
    return {
      date: new Date(raw?.date ?? raw?.Date ?? new Date()),
      totalTechnicians: raw?.totalTechnicians ?? raw?.TotalTechnicians ?? 0,
      presentCount: raw?.presentCount ?? raw?.PresentCount ?? 0,
      absentCount: raw?.absentCount ?? raw?.AbsentCount ?? 0,
      incompleteCount: raw?.incompleteCount ?? raw?.IncompleteCount ?? 0,
      stillActiveCount: raw?.stillActiveCount ?? raw?.StillActiveCount ?? 0
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
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`AttendanceService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
