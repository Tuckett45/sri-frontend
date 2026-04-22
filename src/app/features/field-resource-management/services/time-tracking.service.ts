import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TimeEntry, GeoLocation } from '../models/time-entry.model';
import { environment, local_environment } from '../../../../environments/environments';

/**
 * Time Tracking Service
 *
 * Matches the backend TimeEntriesController endpoints:
 *
 *   POST   /v1/time-entries/clock-in          — ClockInRequest  { jobId, technicianId, clockInTime, clockInLocation? }
 *   POST   /v1/time-entries/clock-out         — ClockOutRequest { timeEntryId, clockOutTime, clockOutLocation?, mileage? }
 *   GET    /v1/time-entries                   — filters: technicianId, jobId, startDate, endDate, page, pageSize
 *   GET    /v1/time-entries/active?technicianId=
 *   PUT    /v1/time-entries/{id}              — UpdateTimeEntryRequest (flat lat/lng fields)
 *   GET    /v1/time-entries/by-job/{jobId}
 *   GET    /v1/time-entries/by-technician/{technicianId}
 *   GET    /v1/time-entries/labor-summary/{jobId}
 *
 * The backend ClockInLocation / ClockOutLocation use a nested record:
 *   { Latitude: number, Longitude: number, Accuracy?: number }
 */
@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  private readonly apiUrl = `${local_environment.apiUrl}/time-entries`;

  constructor(private http: HttpClient) {}

  // ─── Clock In ──────────────────────────────────────────────────────
  /**
   * POST /time-entries/clock-in
   */
  clockIn(
    jobId: string,
    technicianId: string,
    location?: GeoLocation
  ): Observable<TimeEntry> {
    const payload: any = {
      jobId,
      technicianId,
      clockInTime: new Date().toISOString()
    };

    if (location) {
      payload.clockInLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null
      };
    }

    return this.http.post<any>(`${this.apiUrl}/clock-in`, payload).pipe(
      map(raw => this.mapResponse(raw)),
      catchError(this.handleError)
    );
  }

  // ─── Clock Out ─────────────────────────────────────────────────────
  /**
   * POST /time-entries/clock-out
   */
  clockOut(
    timeEntryId: string,
    location?: GeoLocation,
    mileage?: number,
    _reason?: string
  ): Observable<TimeEntry> {
    const payload: any = {
      timeEntryId,
      clockOutTime: new Date().toISOString()
    };

    if (location) {
      payload.clockOutLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null
      };
    }

    if (mileage != null) {
      payload.mileage = mileage;
    }

    return this.http.post<any>(`${this.apiUrl}/clock-out`, payload).pipe(
      map(raw => this.mapResponse(raw)),
      catchError(this.handleError)
    );
  }

  // ─── List / Filter ─────────────────────────────────────────────────
  /**
   * GET /time-entries?technicianId=&jobId=&startDate=&endDate=&page=&pageSize=
   */
  getTimeEntries(filters?: {
    technicianId?: string;
    jobId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Observable<TimeEntry[]> {
    let params = new HttpParams();

    if (filters?.technicianId) params = params.set('technicianId', filters.technicianId);
    if (filters?.jobId) params = params.set('jobId', filters.jobId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());
    // Request a large page to get all entries for the current view
    params = params.set('pageSize', '200');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        let items: any[];
        if (Array.isArray(response)) items = response;
        else if (response?.$values) items = response.$values;
        else if (response?.data) items = response.data;
        else if (response?.items) items = response.items;
        else items = [];
        return items.map(raw => this.mapResponse(raw));
      }),
      catchError(this.handleError)
    );
  }

  // ─── Active Entry ──────────────────────────────────────────────────
  /**
   * GET /time-entries/active?technicianId=
   */
  getActiveTimeEntry(technicianId: string): Observable<TimeEntry | null> {
    return this.http.get<any>(`${this.apiUrl}/active`, {
      params: new HttpParams().set('technicianId', technicianId)
    }).pipe(
      map(raw => raw ? this.mapResponse(raw) : null),
      catchError(() => of(null)) // 404 or empty = no active entry
    );
  }

  // ─── Update (manual adjustment) ────────────────────────────────────
  /**
   * PUT /time-entries/{id}
   * Backend expects flat fields: ClockInLatitude, ClockInLongitude, etc.
   */
  updateTimeEntry(id: string, changes: Partial<{
    clockInTime: Date;
    clockOutTime: Date;
    clockInLocation: GeoLocation;
    clockOutLocation: GeoLocation;
    mileage: number;
    isManuallyAdjusted: boolean;
    adjustmentReason: string;
    adjustedBy: string;
  }>): Observable<TimeEntry> {
    const payload: any = {};

    if (changes.clockInTime) payload.clockInTime = new Date(changes.clockInTime).toISOString();
    if (changes.clockOutTime) payload.clockOutTime = new Date(changes.clockOutTime).toISOString();
    if (changes.clockInLocation) {
      payload.clockInLatitude = changes.clockInLocation.latitude;
      payload.clockInLongitude = changes.clockInLocation.longitude;
    }
    if (changes.clockOutLocation) {
      payload.clockOutLatitude = changes.clockOutLocation.latitude;
      payload.clockOutLongitude = changes.clockOutLocation.longitude;
    }
    if (changes.mileage != null && changes.mileage > 0) payload.mileage = changes.mileage;
    if (changes.adjustmentReason) payload.adjustmentReason = changes.adjustmentReason;
    // isManuallyAdjusted is set by the backend controller automatically on PUT

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(raw => this.mapResponse(raw)),
      catchError(this.handleError)
    );
  }

  // ─── Response Mapper ───────────────────────────────────────────────
  /**
   * Maps the flat DB/API response to the frontend TimeEntry model.
   * Handles both PascalCase (.NET) and camelCase field names.
   */
  private mapResponse(raw: any): TimeEntry {
    if (!raw) return raw;

    const clockInLat = raw.clockInLatitude ?? raw.ClockInLatitude;
    const clockInLng = raw.clockInLongitude ?? raw.ClockInLongitude;
    const clockOutLat = raw.clockOutLatitude ?? raw.ClockOutLatitude;
    const clockOutLng = raw.clockOutLongitude ?? raw.ClockOutLongitude;

    return {
      id: raw.id || raw.Id || '',
      jobId: raw.jobId || raw.JobId || '',
      technicianId: raw.technicianId || raw.TechnicianId || '',
      clockInTime: raw.clockInTime || raw.ClockInTime,
      clockOutTime: raw.clockOutTime || raw.ClockOutTime || undefined,
      clockInLocation: (clockInLat != null && clockInLng != null)
        ? { latitude: clockInLat, longitude: clockInLng, accuracy: 0 }
        : undefined,
      clockOutLocation: (clockOutLat != null && clockOutLng != null)
        ? { latitude: clockOutLat, longitude: clockOutLng, accuracy: 0 }
        : undefined,
      mileage: raw.mileage ?? raw.Mileage ?? undefined,
      isManuallyAdjusted: raw.isManuallyAdjusted ?? raw.IsManuallyAdjusted ?? false,
      adjustedBy: raw.adjustedBy || raw.AdjustedBy || undefined,
      adjustmentReason: raw.adjustmentReason || raw.AdjustmentReason || undefined,
      isLocked: false,
      createdAt: raw.createdAt || raw.CreatedAt || new Date(),
      updatedAt: raw.updatedAt || raw.UpdatedAt || new Date()
    };
  }

  private handleError(error: any): Observable<never> {
    let message = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      message = error.error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400: message = 'Invalid time entry data'; break;
        case 404: message = 'Time entry not found'; break;
        case 405: message = 'Method not allowed — check API endpoint'; break;
        case 409:
          message = error.error?.message || 'Time entry conflict — you may already be clocked in';
          break;
        default: message = `Server error (${error.status})`;
      }
    }
    console.error('TimeTrackingService error:', message, error);
    return throwError(() => new Error(message));
  }
}
