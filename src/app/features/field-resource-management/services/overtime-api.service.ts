/**
 * Overtime API Service
 * Handles HTTP communication with backend overtime request endpoints
 */

import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  OvertimeRequest,
  CreateOvertimeRequestDto,
  OvertimeRequestStatus
} from '../models/overtime.models';
import { environment } from '../../../../environments/environments';
import { AuthService } from '../../../services/auth.service';

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
export class OvertimeApiService {
  private readonly apiUrl = `${environment.atlasApiUrl}/overtime-requests`;

  constructor(private http: HttpClient, @Inject(forwardRef(() => AuthService)) private authService: AuthService) {}

  /**
   * Normalizes a raw overtime request from the backend into the shape the
   * frontend expects.
   *
   * The Atlas API returns the backend enum values directly ('Pending',
   * 'Approved', 'Rejected', 'Cancelled') and only the flat estimatedHours/
   * estimatedMinutes fields. The frontend, however, keys off
   * OvertimeRequestStatus.Pending_Manager_Approval and a nested
   * estimatedDuration object. Map both here so the store, selectors,
   * badges, and duration display all work off a single consistent shape.
   */
  private normalizeRequest(raw: any): OvertimeRequest {
    if (!raw) {
      return raw;
    }

    const hours = raw.estimatedHours ?? raw.estimatedDuration?.hours ?? 0;
    const minutes = raw.estimatedMinutes ?? raw.estimatedDuration?.minutes ?? 0;

    return {
      ...raw,
      approvalStatus: this.mapApprovalStatus(raw.approvalStatus),
      estimatedHours: hours,
      estimatedMinutes: minutes,
      estimatedDuration: { hours, minutes }
    } as OvertimeRequest;
  }

  /**
   * Maps a backend approval status string to the frontend OvertimeRequestStatus enum.
   * The backend's 'Pending' corresponds to the frontend's Pending_Manager_Approval.
   */
  private mapApprovalStatus(status: string | null | undefined): OvertimeRequestStatus {
    switch (status) {
      case 'Pending':
      case 'Pending_Manager_Approval':
        return OvertimeRequestStatus.Pending_Manager_Approval;
      case 'Approved':
        return OvertimeRequestStatus.Approved;
      case 'Rejected':
        return OvertimeRequestStatus.Rejected;
      case 'Cancelled':
        return OvertimeRequestStatus.Cancelled;
      default:
        // Unknown/absent status defaults to pending so it still surfaces in queues.
        return OvertimeRequestStatus.Pending_Manager_Approval;
    }
  }

  /**
   * Get all overtime requests for the current employee
   */
  getMyRequests(): Observable<OvertimeRequest[]> {
    const user = this.authService.getUser();
    const employeeId = user?.id;

    if (!employeeId) {
      console.error('[Overtime API] No authenticated user found, cannot fetch overtime requests');
      return of([]);
    }

    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<PaginatedResponse<OvertimeRequest>>(this.apiUrl, { params }).pipe(
      map(response => (response.items ?? []).map(item => this.normalizeRequest(item))),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single overtime request by ID
   */
  getRequestById(id: string): Observable<OvertimeRequest> {
    return this.http.get<OvertimeRequest>(`${this.apiUrl}/${id}`).pipe(
      map(request => this.normalizeRequest(request)),
      catchError(this.handleError)
    );
  }

  /**
   * Create a new overtime request
   */
  createRequest(dto: CreateOvertimeRequestDto): Observable<OvertimeRequest> {
    console.log('[Overtime API] POST payload:', JSON.stringify(dto, null, 2));
    return this.http.post<OvertimeRequest>(this.apiUrl, dto).pipe(
      map(request => this.normalizeRequest(request)),
      catchError(this.handleError)
    );
  }

  /**
   * Cancel an existing overtime request
   */
  cancelRequest(id: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map(request => this.normalizeRequest(request)),
      catchError(this.handleError)
    );
  }

  /**
   * Delete an overtime request (own request only)
   */
  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get pending overtime requests for manager approval
   */
  getManagerQueue(): Observable<OvertimeRequest[]> {
    return this.http.get<PaginatedResponse<OvertimeRequest>>(`${this.apiUrl}/manager-queue`).pipe(
      map(response => (response.items ?? []).map(item => this.normalizeRequest(item))),
      catchError(this.handleError)
    );
  }

  /**
   * Approve an overtime request
   */
  approve(id: string, comments?: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/approve`, { comments: comments || null }).pipe(
      map(request => this.normalizeRequest(request)),
      catchError(this.handleError)
    );
  }

  /**
   * Reject an overtime request
   */
  reject(id: string, reason: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
      map(request => this.normalizeRequest(request)),
      catchError(this.handleError)
    );
  }

  /**
   * Fetch overtime requests for a set of employee IDs (team view).
   * @param employeeIds List of 1–200 employee IDs
   * @param department Optional department filter
   */
  getTeamRequests(employeeIds: string[], department?: string): Observable<OvertimeRequest[]> {
    if (employeeIds.length === 0) {
      return of([]);
    }

    let params = new HttpParams().set('employeeIds', employeeIds.join(','));
    if (department && department !== 'All Departments') {
      params = params.set('department', department);
    }

    return this.http.get<PaginatedResponse<OvertimeRequest>>(
      `${this.apiUrl}/team`, { params }
    ).pipe(
      map(response => (response.items ?? []).map(item => this.normalizeRequest(item))),
      catchError(this.handleError)
    );
  }

  /**
   * Get all approved time-off entries for the team availability timeline
   * Returns approved PTO and overtime for a date range
   */
  getTeamAvailability(startDate: string, endDate: string, market?: string): Observable<OvertimeRequest[]> {
    let url = `${this.apiUrl}/team-availability?startDate=${startDate}&endDate=${endDate}`;
    if (market) {
      url += `&market=${market}`;
    }
    return this.http.get<OvertimeRequest[]>(url).pipe(
      map(items => (items ?? []).map(item => this.normalizeRequest(item))),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
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

    console.error('[Overtime API Error]', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      body: error.error,
      message
    });
    return throwError(() => new Error(message));
  }
}
