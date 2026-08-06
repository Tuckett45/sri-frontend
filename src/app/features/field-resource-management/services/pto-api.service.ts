/**
 * PTO API Service
 * Handles HTTP communication with backend PTO endpoints
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PtoRequest, CreatePtoRequestDto, LeaveType, TeamAvailabilityEntry, RequestStatus } from '../models/pto.models';
import { environment, local_environment } from '../../../../environments/environments';

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PtoApiService {
  private readonly apiUrl = `${environment.atlasApiUrl}/pto-requests`;

  constructor(private http: HttpClient) {}

  /**
   * Get all PTO requests for the current employee
   * @returns Observable of PTO requests array
   */
  getMyRequests(): Observable<PtoRequest[]> {
    return this.http.get<PaginatedResponse<PtoRequest> | PtoRequest[]>(this.apiUrl).pipe(
      map(response => {
        // Handle both paginated and flat array responses from backend
        if (Array.isArray(response)) {
          return response;
        }
        return response.items ?? [];
      }),
      catchError(() => {
        // Fallback: use the reports endpoint and filter by current user
        console.warn('[PTO API] /pto-requests failed, falling back to /reports/time-off');
        return this.getMyRequestsFromReports();
      })
    );
  }

  /**
   * Fallback: fetch own PTO requests from the reports endpoint.
   * Maps the report shape into PtoRequest format.
   */
  private getMyRequestsFromReports(): Observable<PtoRequest[]> {
    const reportsUrl = `${environment.atlasApiUrl}/reports/time-off`;
    return this.http.get<any>(reportsUrl, {
      params: { pageSize: '100', sortBy: 'submissionDate', sortDir: 'desc', type: 'pto' }
    }).pipe(
      map((response: any) => {
        const items: any[] = Array.isArray(response) ? response : (response.items ?? []);
        return items.map(item => this.mapReportEntryToPtoRequest(item));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Maps a report entry (from /reports/time-off) to a PtoRequest shape.
   */
  private mapReportEntryToPtoRequest(entry: any): PtoRequest {
    return {
      id: entry.id || '',
      employeeId: entry.employeeId || '',
      employeeName: entry.employeeName || '',
      managerId: entry.managerId || '',
      managerName: entry.managerName || '',
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      requestType: entry.requestType || entry.type || 'pto',
      reason: entry.justification || entry.reason || null,
      status: this.mapReportStatus(entry.status || entry.approved),
      createdAt: entry.submissionDate || entry.createdAt || '',
      updatedAt: entry.updatedAt || entry.submissionDate || '',
      market: entry.market || null,
      coveragePerson: entry.coveragePerson || null
    };
  }

  /**
   * Maps report status strings to the PtoRequest status enum values.
   */
  private mapReportStatus(status: string | null): RequestStatus {
    if (!status) return RequestStatus.Pending_Manager_Approval;
    const lower = status.toLowerCase();
    if (lower === 'approved' || lower === 'yes') return RequestStatus.Approved;
    if (lower === 'rejected' || lower === 'no') return RequestStatus.Rejected;
    if (lower === 'cancelled') return RequestStatus.Cancelled;
    if (lower.includes('backoffice')) return RequestStatus.Pending_Backoffice_Approval;
    return RequestStatus.Pending_Manager_Approval;
  }

  /**
   * Get a single PTO request by ID
   * @param id Request ID
   * @returns Observable of PTO request
   */
  getRequestById(id: string): Observable<PtoRequest> {
    return this.http.get<PtoRequest>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new PTO request
   * @param dto Create request payload
   * @returns Observable of created PTO request
   */
  createRequest(dto: CreatePtoRequestDto): Observable<PtoRequest> {
    console.log('[PTO API] POST payload:', JSON.stringify(dto, null, 2));
    return this.http.post<PtoRequest>(this.apiUrl, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cancel an existing PTO request
   * @param id Request ID
   * @returns Observable of updated PTO request
   */
  cancelRequest(id: string): Observable<PtoRequest> {
    return this.http.post<PtoRequest>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a PTO request (own request only)
   * @param id Request ID
   * @returns Observable of void
   */
  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get pending PTO requests for manager approval
   * @returns Observable of PTO requests array
   */
  getManagerQueue(): Observable<PtoRequest[]> {
    return this.http.get<PaginatedResponse<PtoRequest>>(`${this.apiUrl}/manager-queue`).pipe(
      map(response => response.items),
      catchError(() => {
        // Endpoint doesn't exist yet — fall back to reports filtered by pending status
        console.warn('[PTO API] /pto-requests/manager-queue not available, returning empty queue');
        return this.getQueueFromReports('Pending');
      })
    );
  }

  /**
   * Get pending PTO requests for backoffice approval
   * @returns Observable of PTO requests array
   */
  getBackofficeQueue(): Observable<PtoRequest[]> {
    return this.http.get<PaginatedResponse<PtoRequest>>(`${this.apiUrl}/backoffice-queue`).pipe(
      map(response => response.items),
      catchError(() => {
        // Endpoint doesn't exist yet — fall back to reports filtered by pending status
        console.warn('[PTO API] /pto-requests/backoffice-queue not available, returning empty queue');
        return this.getQueueFromReports('ManagerApproved');
      })
    );
  }

  /**
   * Fallback: fetch approval queues from the reports endpoint filtered by status.
   */
  private getQueueFromReports(status: string): Observable<PtoRequest[]> {
    const reportsUrl = `${environment.atlasApiUrl}/reports/time-off`;
    return this.http.get<any>(reportsUrl, {
      params: { pageSize: '50', sortBy: 'submissionDate', sortDir: 'desc', status, type: 'pto' }
    }).pipe(
      map((response: any) => {
        const items: any[] = Array.isArray(response) ? response : (response.items ?? []);
        return items.map(item => this.mapReportEntryToPtoRequest(item));
      }),
      catchError(() => {
        // If even the fallback fails, return empty array
        return of([] as PtoRequest[]);
      })
    );
  }

  /**
   * Approve a PTO request
   * @param id Request ID
   * @param comments Optional approval comments
   * @returns Observable of updated PTO request
   */
  approve(id: string, comments?: string): Observable<PtoRequest> {
    return this.http.post<PtoRequest>(`${this.apiUrl}/${id}/approve`, { comments: comments || null }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reject a PTO request
   * @param id Request ID
   * @param reason Rejection reason (required)
   * @returns Observable of updated PTO request
   */
  reject(id: string, reason: string): Observable<PtoRequest> {
    return this.http.post<PtoRequest>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * @deprecated Use approve() instead
   */
  approveAsManager(id: string): Observable<PtoRequest> {
    return this.approve(id);
  }

  /**
   * @deprecated Use reject() instead
   */
  rejectAsManager(id: string, reason: string): Observable<PtoRequest> {
    return this.reject(id, reason);
  }

  /**
   * @deprecated Use approve() instead
   */
  approveAsBackoffice(id: string): Observable<PtoRequest> {
    return this.approve(id);
  }

  /**
   * @deprecated Use reject() instead
   */
  rejectAsBackoffice(id: string, reason: string): Observable<PtoRequest> {
    return this.reject(id, reason);
  }

  /**
   * Get all available leave types
   * @returns Observable of leave types array
   */
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${this.apiUrl}/leave-types`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get team availability data for the timeline view.
   * Returns all approved PTO requests within a date range, optionally filtered by market.
   * @param startDate ISO date string
   * @param endDate ISO date string
   * @param market Optional market filter
   */
  getTeamAvailability(startDate: string, endDate: string, market?: string): Observable<TeamAvailabilityEntry[]> {
    let url = `${this.apiUrl}/team-availability?startDate=${startDate}&endDate=${endDate}`;
    if (market) {
      url += `&market=${encodeURIComponent(market)}`;
    }
    return this.http.get<TeamAvailabilityEntry[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors and map to user-friendly messages
   * @param error HTTP error response
   * @returns Observable that throws a user-friendly error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message: string;

    // Try to extract server-provided error message from various response formats
    const serverMessage = typeof error.error === 'string'
      ? error.error
      : (error.error?.message || error.error?.title || error.error?.detail || error.error?.errors
        ? JSON.stringify(error.error?.errors || error.error)
        : null);

    switch (error.status) {
      case 400:
        message = serverMessage || 'Invalid request. Please check your form data.';
        break;
      case 401:
        message = 'Unauthorized. Please log in again.';
        break;
      case 403:
        message = 'You do not have permission to perform this action';
        break;
      case 404:
        message = 'Request not found';
        break;
      case 409:
        message = 'Request was updated by another user';
        break;
      case 422:
        message = serverMessage || 'Validation failed. Please check your form data.';
        break;
      case 500:
        message = serverMessage || 'Server error. Please try again later.';
        break;
      default:
        message = serverMessage || 'An unexpected error occurred. Please try again.';
        break;
    }

    console.error('[PTO API Error]', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      body: error.error,
      message
    });
    return throwError(() => new Error(message));
  }
}
