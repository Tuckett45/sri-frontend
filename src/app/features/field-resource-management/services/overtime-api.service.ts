/**
 * Overtime API Service
 * Handles HTTP communication with backend overtime request endpoints
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  OvertimeRequest,
  CreateOvertimeRequestDto
} from '../models/overtime.models';
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
export class OvertimeApiService {
  private readonly apiUrl = `${environment.atlasApiUrl}/overtime-requests`;

  constructor(private http: HttpClient) {}

  /**
   * Get all overtime requests for the current employee
   */
  getMyRequests(): Observable<OvertimeRequest[]> {
    return this.http.get<PaginatedResponse<OvertimeRequest>>(this.apiUrl).pipe(
      map(response => response.items),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single overtime request by ID
   */
  getRequestById(id: string): Observable<OvertimeRequest> {
    return this.http.get<OvertimeRequest>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new overtime request
   */
  createRequest(dto: CreateOvertimeRequestDto): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(this.apiUrl, dto).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cancel an existing overtime request
   */
  cancelRequest(id: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get pending overtime requests for manager approval
   */
  getManagerQueue(): Observable<OvertimeRequest[]> {
    return this.http.get<PaginatedResponse<OvertimeRequest>>(`${this.apiUrl}/manager-queue`).pipe(
      map(response => response.items),
      catchError(this.handleError)
    );
  }

  /**
   * Approve an overtime request
   */
  approve(id: string, comments?: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/approve`, { comments: comments || null }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reject an overtime request
   */
  reject(id: string, reason: string): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl}/${id}/reject`, { reason }).pipe(
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
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
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
