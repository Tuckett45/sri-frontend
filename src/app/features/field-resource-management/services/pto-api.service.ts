/**
 * PTO API Service
 * Handles HTTP communication with backend PTO endpoints
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PtoRequest, CreatePtoRequestDto, LeaveType } from '../models/pto.models';
import { environment } from '../../../../environments/environments';

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
    return this.http.get<PaginatedResponse<PtoRequest>>(this.apiUrl).pipe(
      map(response => response.items),
      catchError(this.handleError)
    );
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
   * Get pending PTO requests for manager approval
   * @returns Observable of PTO requests array
   */
  getManagerQueue(): Observable<PtoRequest[]> {
    return this.http.get<PaginatedResponse<PtoRequest>>(`${this.apiUrl}/manager-queue`).pipe(
      map(response => response.items),
      catchError(this.handleError)
    );
  }

  /**
   * Get pending PTO requests for backoffice approval
   * @returns Observable of PTO requests array
   */
  getBackofficeQueue(): Observable<PtoRequest[]> {
    return this.http.get<PaginatedResponse<PtoRequest>>(`${this.apiUrl}/backoffice-queue`).pipe(
      map(response => response.items),
      catchError(this.handleError)
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
   * Handle HTTP errors and map to user-friendly messages
   * @param error HTTP error response
   * @returns Observable that throws a user-friendly error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message: string;

    switch (error.status) {
      case 401:
        message = 'Unauthorized';
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
      case 500:
      default:
        message = 'An unexpected error occurred. Please try again.';
        break;
    }

    return throwError(() => new Error(message));
  }
}
