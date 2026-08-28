import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import {
  QrCodeStation,
  RegisterStationRequest,
  StationMapData,
  ScanEvent
} from '../models/qr-timekeeping.model';

/**
 * Station Service
 *
 * Manages QR station CRUD operations against the Atlas API.
 * Supports station registration, deactivation, site map retrieval,
 * and scan history queries. Handles the $values array extraction
 * pattern from .NET API responses.
 *
 * Requirements: 6.2, 6.3, 7.2, 7.4, 8.1
 */
@Injectable({
  providedIn: 'root'
})
export class StationService {
  private readonly apiUrl = `${environment.atlasApiUrl}/qr-stations`;

  constructor(private http: HttpClient) {}

  /**
   * Get all stations for a specific job site.
   *
   * @param siteId The job site ID to filter stations by
   * @returns Observable of QrCodeStation array for the site
   */
  getStationsForSite(siteId: string): Observable<QrCodeStation[]> {
    const params = new HttpParams().set('siteId', siteId);
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => this.extractArray(response).map(raw => this.mapStation(raw))),
      catchError(this.handleError('getStationsForSite'))
    );
  }

  /**
   * Register a new QR station for a job site.
   *
   * @param request Registration request with job site ID and location description
   * @returns Observable of the newly created QrCodeStation
   */
  registerStation(request: RegisterStationRequest): Observable<QrCodeStation> {
    return this.http.post<any>(this.apiUrl, request).pipe(
      map(response => this.mapStation(response)),
      catchError(this.handleError('registerStation'))
    );
  }

  /**
   * Deactivate a station by ID.
   *
   * @param stationId The station ID to deactivate
   * @returns Observable of void on success
   */
  deactivateStation(stationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${stationId}/deactivate`, {}).pipe(
      catchError(this.handleError('deactivateStation'))
    );
  }

  /**
   * Get station map data for a job site, including activity metrics.
   *
   * @param jobId The job site ID for the map
   * @param period Optional number of days to include in activity metrics
   * @returns Observable of StationMapData with station entries
   */
  getStationMap(jobId: string, period?: number): Observable<StationMapData> {
    let params = new HttpParams();
    if (period != null) {
      params = params.set('period', period.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/site-map/${jobId}`, { params }).pipe(
      map(response => this.mapStationMapData(response)),
      catchError(this.handleError('getStationMap'))
    );
  }

  /**
   * Get scan history for a specific station.
   *
   * @param stationId The station ID to retrieve history for
   * @param limit Optional maximum number of scan events to return
   * @returns Observable of ScanEvent array
   */
  getScanHistory(stationId: string, limit?: number): Observable<ScanEvent[]> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/${stationId}/scan-history`, { params }).pipe(
      map(response => this.extractArray(response).map(raw => this.mapScanEvent(raw))),
      catchError(this.handleError('getScanHistory'))
    );
  }

  /**
   * Map raw API response to QrCodeStation, handling PascalCase and camelCase.
   */
  private mapStation(raw: any): QrCodeStation {
    return {
      id: raw?.id ?? raw?.Id ?? '',
      stationIdentifier: raw?.stationIdentifier ?? raw?.StationIdentifier ?? '',
      jobSiteId: raw?.jobSiteId ?? raw?.JobSiteId ?? '',
      locationDescription: raw?.locationDescription ?? raw?.LocationDescription ?? '',
      sequenceNumber: raw?.sequenceNumber ?? raw?.SequenceNumber ?? 0,
      isActive: raw?.isActive ?? raw?.IsActive ?? true,
      activityStatus: raw?.activityStatus ?? raw?.ActivityStatus ?? 'Active',
      createdAt: new Date(raw?.createdAt ?? raw?.CreatedAt ?? new Date()),
      updatedAt: new Date(raw?.updatedAt ?? raw?.UpdatedAt ?? new Date()),
      deactivatedAt: raw?.deactivatedAt ?? raw?.DeactivatedAt
        ? new Date(raw.deactivatedAt ?? raw.DeactivatedAt)
        : undefined
    };
  }

  /**
   * Map raw API response to StationMapData, handling PascalCase and camelCase.
   */
  private mapStationMapData(raw: any): StationMapData {
    const stationsRaw = raw?.stations ?? raw?.Stations ?? [];
    const stationsArray = this.extractArray(stationsRaw);

    return {
      jobId: raw?.jobId ?? raw?.JobId ?? '',
      jobName: raw?.jobName ?? raw?.JobName ?? '',
      stations: stationsArray.map(s => ({
        stationId: s?.stationId ?? s?.StationId ?? '',
        stationIdentifier: s?.stationIdentifier ?? s?.StationIdentifier ?? '',
        locationDescription: s?.locationDescription ?? s?.LocationDescription ?? '',
        isActive: s?.isActive ?? s?.IsActive ?? true,
        activityStatus: s?.activityStatus ?? s?.ActivityStatus ?? 'Active',
        totalScansInPeriod: s?.totalScansInPeriod ?? s?.TotalScansInPeriod ?? 0,
        lastScanTimestamp: s?.lastScanTimestamp ?? s?.LastScanTimestamp
          ? new Date(s.lastScanTimestamp ?? s.LastScanTimestamp)
          : undefined,
        uniqueTechniciansCount: s?.uniqueTechniciansCount ?? s?.UniqueTechniciansCount ?? 0
      }))
    };
  }

  /**
   * Map raw API response to ScanEvent, handling PascalCase and camelCase.
   */
  private mapScanEvent(raw: any): ScanEvent {
    return {
      id: raw?.id ?? raw?.Id ?? '',
      technicianId: raw?.technicianId ?? raw?.TechnicianId ?? '',
      stationId: raw?.stationId ?? raw?.StationId ?? undefined,
      scannedValue: raw?.scannedValue ?? raw?.ScannedValue ?? '',
      scanTimestamp: new Date(raw?.scanTimestamp ?? raw?.ScanTimestamp ?? new Date()),
      latitude: raw?.latitude ?? raw?.Latitude ?? undefined,
      longitude: raw?.longitude ?? raw?.Longitude ?? undefined,
      gpsAccuracy: raw?.gpsAccuracy ?? raw?.GpsAccuracy ?? undefined,
      scanType: raw?.scanType ?? raw?.ScanType ?? 'ClockIn',
      isSuccessful: raw?.isSuccessful ?? raw?.IsSuccessful ?? false,
      rejectionReason: raw?.rejectionReason ?? raw?.RejectionReason ?? undefined,
      resultingTimeEntryId: raw?.resultingTimeEntryId ?? raw?.ResultingTimeEntryId ?? undefined,
      createdAt: new Date(raw?.createdAt ?? raw?.CreatedAt ?? new Date())
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
          case 409: message = error.error?.message ?? `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`StationService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
