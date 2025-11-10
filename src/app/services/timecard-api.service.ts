import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  TimeCard,
  TimeCardListResponse,
  TimeCardListItem,
  TimeCardStatus,
  TimeCardSearchParams,
  TimeCardRequest,
  TimeCardResponse,
  TimeCardHistorySummary,
  TimeCardDashboardStats
} from '../models/timecard.model';

@Injectable({ providedIn: 'root' })
export class TimeCardApiService {
  private jsonOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${environment.apiUrl}/timecards`;

  constructor(private http: HttpClient) {}

  // --- Helper methods ---------------------------------------------------------------
  
  private toDateParam(value: unknown): string | undefined {
    const pad = (n: number) => String(n).padStart(2, '0');
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }
    if (value instanceof Date) {
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }
    return undefined;
  }

  private buildHttpParams(params: TimeCardSearchParams): HttpParams {
    let httpParams = new HttpParams();
    
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.includeEntries !== undefined) {
      httpParams = httpParams.set('includeEntries', params.includeEntries.toString());
    }
    if (params.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }
    if (params.userName) {
      httpParams = httpParams.set('userName', params.userName);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.jobCode) {
      httpParams = httpParams.set('jobCode', params.jobCode);
    }
    if (params.projectId) {
      httpParams = httpParams.set('projectId', params.projectId);
    }
    
    const from = this.toDateParam(params.from);
    const to = this.toDateParam(params.to);
    if (from) {
      httpParams = httpParams.set('from', from);
    }
    if (to) {
      httpParams = httpParams.set('to', to);
    }
    
    return httpParams;
  }

  // --- Core CRUD operations ---------------------------------------------------------------

  /**
   * Get paginated list of timecards (HR/Admin view - all timecards)
   */
  getTimeCards(params: TimeCardSearchParams): Observable<TimeCardListResponse> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<TimeCardListResponse>(this.baseUrl, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  /**
   * Get timecards for the current user (Employee view)
   */
  getMyTimeCards(params: TimeCardSearchParams): Observable<TimeCardListResponse> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<TimeCardListResponse>(`${this.baseUrl}/my`, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  /**
   * Search timecards with filters (HR/Admin view)
   */
  searchTimeCards(params: TimeCardSearchParams): Observable<TimeCardListResponse> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<TimeCardListResponse>(`${this.baseUrl}/search`, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  /**
   * Get a specific timecard by ID
   */
  getTimeCardById(id: string, includeEntries: boolean = true): Observable<TimeCard> {
    let httpParams = new HttpParams();
    if (includeEntries) {
      httpParams = httpParams.set('includeEntries', 'true');
    }
    return this.http.get<TimeCard>(`${this.baseUrl}/${id}`, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  /**
   * Create a new timecard
   */
  createTimeCard(request: TimeCardRequest): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(this.baseUrl, request, this.jsonOptions);
  }

  /**
   * Update an existing timecard
   */
  updateTimeCard(id: string, request: TimeCardRequest): Observable<TimeCardResponse> {
    return this.http.put<TimeCardResponse>(`${this.baseUrl}/${id}`, request, this.jsonOptions);
  }

  /**
   * Delete a timecard (only allowed for Draft status)
   */
  deleteTimeCard(id: string): Observable<TimeCardResponse> {
    return this.http.delete<TimeCardResponse>(`${this.baseUrl}/${id}`, this.jsonOptions);
  }

  /**
   * Copy/duplicate a timecard (for reuse by salary employees)
   */
  copyTimeCard(id: string, newWeekEnding: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${id}/copy`,
      { weekEnding: newWeekEnding },
      this.jsonOptions
    );
  }

  // --- Status management ---------------------------------------------------------------

  /**
   * Submit a timecard for approval (Draft -> Submitted)
   */
  submitTimeCard(id: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${id}/submit`,
      {},
      this.jsonOptions
    );
  }

  /**
   * Approve a timecard (HR/Admin only)
   */
  approveTimeCard(id: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${id}/approve`,
      {},
      this.jsonOptions
    );
  }

  /**
   * Reject a timecard (HR/Admin only)
   */
  rejectTimeCard(id: string, reason?: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${id}/reject`,
      { reason },
      this.jsonOptions
    );
  }

  /**
   * Recall a submitted timecard back to draft (employee can edit again)
   */
  recallTimeCard(id: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${id}/recall`,
      {},
      this.jsonOptions
    );
  }

  // --- Smart suggestions ---------------------------------------------------------------

  /**
   * Get smart suggestions based on user's timecard history
   */
  getUserSuggestions(userId?: string): Observable<TimeCardHistorySummary> {
    const url = userId 
      ? `${this.baseUrl}/suggestions/${userId}`
      : `${this.baseUrl}/suggestions/my`;
    
    return this.http.get<TimeCardHistorySummary>(url, this.jsonOptions);
  }

  /**
   * Get suggested timecard entries for a specific week based on user history
   */
  getSuggestedEntries(weekEnding: string, userId?: string): Observable<TimeCard> {
    let httpParams = new HttpParams().set('weekEnding', weekEnding);
    if (userId) {
      httpParams = httpParams.set('userId', userId);
    }
    
    const url = userId
      ? `${this.baseUrl}/suggestions/${userId}/entries`
      : `${this.baseUrl}/suggestions/my/entries`;
    
    return this.http.get<TimeCard>(url, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  // --- Expense linking ---------------------------------------------------------------

  /**
   * Link an expense to a timecard entry
   */
  linkExpense(timecardId: string, entryId: string, expenseId: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/${timecardId}/entries/${entryId}/expenses/${expenseId}`,
      {},
      this.jsonOptions
    );
  }

  /**
   * Unlink an expense from a timecard entry
   */
  unlinkExpense(timecardId: string, entryId: string, expenseId: string): Observable<TimeCardResponse> {
    return this.http.delete<TimeCardResponse>(
      `${this.baseUrl}/${timecardId}/entries/${entryId}/expenses/${expenseId}`,
      this.jsonOptions
    );
  }

  /**
   * Get all expenses linked to a timecard
   */
  getLinkedExpenses(timecardId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${timecardId}/expenses`, this.jsonOptions);
  }

  // --- Dashboard and statistics ---------------------------------------------------------------

  /**
   * Get dashboard statistics for HR/Admin view
   */
  getDashboardStats(from?: string, to?: string): Observable<TimeCardDashboardStats> {
    let httpParams = new HttpParams();
    
    const fromDate = this.toDateParam(from);
    const toDate = this.toDateParam(to);
    
    if (fromDate) {
      httpParams = httpParams.set('from', fromDate);
    }
    if (toDate) {
      httpParams = httpParams.set('to', toDate);
    }
    
    return this.http.get<TimeCardDashboardStats>(`${this.baseUrl}/dashboard/stats`, {
      ...this.jsonOptions,
      params: httpParams
    });
  }

  /**
   * Get pending approvals count
   */
  getPendingApprovalsCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/pending/count`, this.jsonOptions)
      .pipe(map(response => response.count));
  }

  // --- Batch operations ---------------------------------------------------------------

  /**
   * Bulk approve multiple timecards
   */
  bulkApprove(timecardIds: string[]): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/bulk/approve`,
      { timecardIds },
      this.jsonOptions
    );
  }

  /**
   * Bulk reject multiple timecards
   */
  bulkReject(timecardIds: string[], reason?: string): Observable<TimeCardResponse> {
    return this.http.post<TimeCardResponse>(
      `${this.baseUrl}/bulk/reject`,
      { timecardIds, reason },
      this.jsonOptions
    );
  }
}

