import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import { QrScanRequest, ScanResult } from '../models/qr-timekeeping.model';

/**
 * QR Scan Service
 *
 * Handles submission of QR scan requests to the Atlas API.
 * Processes clock-in and clock-out operations by posting scan data
 * including station identifier, GPS coordinates, and time category.
 *
 * Handles both camelCase and PascalCase API responses from the .NET backend.
 *
 * Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 5.8
 */
@Injectable({
  providedIn: 'root'
})
export class QrScanService {
  private readonly apiUrl = `${environment.atlasApiUrl}/qr-scan`;

  constructor(private http: HttpClient) {}

  /**
   * Submit a QR scan request for clock-in or clock-out.
   *
   * Posts the scan data to the Atlas API and maps the response
   * to a normalized ScanResult. Handles specific HTTP error codes:
   * - 409: Conflict (already clocked in)
   * - 400: Validation error
   * - 404: Station not found / not active
   *
   * @param request The QR scan request containing station ID, GPS, and category
   * @returns Observable of ScanResult with scan outcome details
   */
  processScan(request: QrScanRequest): Observable<ScanResult> {
    return this.http.post<any>(this.apiUrl, request).pipe(
      map(response => this.mapScanResult(response)),
      catchError((error: HttpErrorResponse) => this.handleScanError(error))
    );
  }

  /**
   * Map API response to ScanResult, handling both camelCase and PascalCase.
   */
  private mapScanResult(response: any): ScanResult {
    return {
      success: response?.success ?? response?.Success ?? false,
      scanType: response?.scanType ?? response?.ScanType ?? 'ClockIn',
      timeEntry: response?.timeEntry ?? response?.TimeEntry ?? undefined,
      errorCode: response?.errorCode ?? response?.ErrorCode ?? undefined,
      errorMessage: response?.errorMessage ?? response?.ErrorMessage ?? undefined,
      proximityWarning: response?.proximityWarning ?? response?.ProximityWarning ?? false
    };
  }

  /**
   * Handle specific HTTP error codes for scan operations.
   *
   * - 409 Conflict: Technician already has an active clock-in
   * - 400 Bad Request: Validation error (invalid data submitted)
   * - 404 Not Found: Station identifier not registered or inactive
   */
  private handleScanError(error: HttpErrorResponse): Observable<never> {
    let message: string;
    let errorCode: string;

    switch (error.status) {
      case 409:
        errorCode = 'CONFLICT';
        message = error.error?.message ?? error.error?.Message
          ?? 'Already clocked in. Scan again to clock out.';
        break;
      case 400:
        errorCode = 'VALIDATION_ERROR';
        message = error.error?.message ?? error.error?.Message
          ?? 'Invalid scan request. Please try again.';
        break;
      case 404:
        errorCode = 'STATION_NOT_FOUND';
        message = error.error?.message ?? error.error?.Message
          ?? 'This station is not active. Please scan a different station or contact your supervisor.';
        break;
      default:
        errorCode = 'UNKNOWN_ERROR';
        message = error.error?.message ?? error.error?.Message
          ?? `Server error (${error.status}). Please try again.`;
    }

    return throwError(() => ({
      status: error.status,
      errorCode,
      message
    }));
  }
}
