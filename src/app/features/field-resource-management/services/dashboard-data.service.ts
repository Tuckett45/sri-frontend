import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import {
  ApprovalCounts,
  PendingTimecard,
  PendingExpense,
  TravelBreakPtoSummary,
} from '../models/dashboard.models';

/**
 * Dashboard Data Service
 *
 * Provides real data for the HR/Payroll and admin dashboard widgets
 * by calling the ATLAS API endpoints for timecards, notifications,
 * and related resources.
 *
 * Falls back to empty/zero responses on error so dashboards degrade gracefully.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly atlasUrl = environment.atlasApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Gets approval counts by querying the pending timecards, PTO requests,
   * and travel requests from the real API.
   */
  getApprovalCounts(): Observable<ApprovalCounts> {
    return forkJoin({
      timecards: this.http.get<{ totalCount: number }>(
        `${this.atlasUrl}/timecards/pending`,
        { params: new HttpParams().set('page', '1').set('pageSize', '1') }
      ).pipe(catchError(() => of({ totalCount: 0 }))),
      pto: this.http.get<{ items: any[], totalCount: number }>(
        `${environment.apiUrl}/pto/requests`,
        { params: new HttpParams().set('status', 'Pending').set('page', '1').set('pageSize', '1') }
      ).pipe(catchError(() => of({ items: [], totalCount: 0 })))
    }).pipe(
      map(({ timecards, pto }) => ({
        pendingTimecards: timecards.totalCount,
        pendingExpenses: 0, // Expense approval endpoint TBD
        pendingTravelRequests: 0,
        pendingBreakRequests: pto.totalCount
      }))
    );
  }

  /**
   * Gets pending timecards from the real /v1/timecards/pending endpoint.
   * Maps the API response to the PendingTimecard interface used by widgets.
   */
  getPendingTimecards(): Observable<PendingTimecard[]> {
    return this.http.get<{ items: any[], totalCount: number }>(
      `${this.atlasUrl}/timecards/pending`,
      { params: new HttpParams().set('page', '1').set('pageSize', '20') }
    ).pipe(
      map(response => response.items.map(item => ({
        id: item.id,
        technicianName: item.technicianName || 'Unknown Technician',
        periodStart: new Date(item.periodStart),
        periodEnd: new Date(item.periodEnd),
        totalHours: (item.totalRegularHours || 0) + (item.totalOvertimeHours || 0),
        submittedAt: new Date(item.submittedAt),
        status: item.status || 'submitted'
      }))),
      catchError(error => {
        console.error('Failed to load pending timecards from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets pending expenses. Currently queries the SRI API expenses endpoint.
   * Falls back to empty array if endpoint is not available.
   */
  getPendingExpenses(): Observable<PendingExpense[]> {
    // The expense approval endpoint is on the SRI API, not atlas
    return this.http.get<any[]>(
      `${environment.apiUrl}/expenses`,
      { params: new HttpParams().set('status', 'pending').set('page', '1').set('pageSize', '20') }
    ).pipe(
      map(items => (items || []).map(item => ({
        id: item.id,
        submittedBy: item.submittedBy || item.userName || 'Unknown',
        amount: item.amount || 0,
        type: item.type || item.category || 'Other',
        submittedAt: new Date(item.submittedAt || item.createdAt),
        description: item.description || ''
      }))),
      catchError(error => {
        console.error('Failed to load pending expenses from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets travel/break/PTO summary counts.
   * Queries the PTO endpoint for pending counts.
   */
  getTravelBreakPtoSummary(): Observable<TravelBreakPtoSummary> {
    return this.http.get<{ items: any[], totalCount: number }>(
      `${environment.apiUrl}/pto/requests`,
      { params: new HttpParams().set('status', 'Pending').set('page', '1').set('pageSize', '1') }
    ).pipe(
      map(response => ({
        pendingTravelRequests: 0, // Travel module TBD
        pendingBreakRequests: 0,
        pendingPtoRequests: response.totalCount || 0
      })),
      catchError(() => of({
        pendingTravelRequests: 0,
        pendingBreakRequests: 0,
        pendingPtoRequests: 0
      }))
    );
  }
}
