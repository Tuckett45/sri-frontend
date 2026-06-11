import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';

export interface TimecardDto {
  id: string;
  technicianId: string;
  technicianName?: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'requires_correction';
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalMileage: number;
  entryCount: number;
  submittedAt?: string;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  market?: string;
  region?: string;
  isLocked: boolean;
}

export interface TimecardApprovalActionDto {
  id: string;
  timecardId: string;
  action: string;
  performedBy: string;
  performedByRole?: string;
  notes?: string;
  performedAt: string;
}

export interface PendingTimecardsResponse {
  items: TimecardDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Service for the new timecard approval workflow endpoints (/v1/timecards).
 * Enables technicians to submit, and payroll to approve/reject/request corrections.
 */
@Injectable({
  providedIn: 'root'
})
export class TimecardApiService {
  private readonly baseUrl = `${environment.atlasApiUrl}/timecards`;

  constructor(private http: HttpClient) {}

  /**
   * Submit a timecard for a specific period.
   */
  submitTimecard(technicianId: string, periodStart: string, periodEnd: string, notes?: string): Observable<TimecardDto> {
    return this.http.post<TimecardDto>(`${this.baseUrl}/submit`, {
      technicianId,
      periodStart,
      periodEnd,
      notes
    });
  }

  /**
   * Get pending timecards for payroll review queue.
   */
  getPendingTimecards(market?: string, page = 1, pageSize = 20): Observable<PendingTimecardsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (market) params = params.set('market', market);
    return this.http.get<PendingTimecardsResponse>(`${this.baseUrl}/pending`, { params });
  }

  /**
   * Approve a submitted timecard.
   */
  approveTimecard(timecardId: string, reviewedBy: string, reviewerRole?: string, notes?: string): Observable<TimecardDto> {
    return this.http.post<TimecardDto>(`${this.baseUrl}/${timecardId}/approve`, {
      reviewedBy,
      reviewerRole,
      notes
    });
  }

  /**
   * Reject a submitted timecard (requires reason).
   */
  rejectTimecard(timecardId: string, reviewedBy: string, notes: string, reviewerRole?: string): Observable<TimecardDto> {
    return this.http.post<TimecardDto>(`${this.baseUrl}/${timecardId}/reject`, {
      reviewedBy,
      reviewerRole,
      notes
    });
  }

  /**
   * Request corrections on a timecard.
   */
  requestCorrection(timecardId: string, reviewedBy: string, notes: string, reviewerRole?: string): Observable<TimecardDto> {
    return this.http.post<TimecardDto>(`${this.baseUrl}/${timecardId}/request-correction`, {
      reviewedBy,
      reviewerRole,
      notes
    });
  }

  /**
   * Get all timecards for a specific technician.
   */
  getTimecardsByTechnician(technicianId: string, status?: string, page = 1, pageSize = 10): Observable<{ items: TimecardDto[], totalCount: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (status) params = params.set('status', status);
    return this.http.get<{ items: TimecardDto[], totalCount: number }>(
      `${this.baseUrl}/by-technician/${technicianId}`, { params }
    );
  }

  /**
   * Get a single timecard with its approval history.
   */
  getTimecard(timecardId: string): Observable<{ timecard: TimecardDto, approvalHistory: TimecardApprovalActionDto[] }> {
    return this.http.get<{ timecard: TimecardDto, approvalHistory: TimecardApprovalActionDto[] }>(
      `${this.baseUrl}/${timecardId}`
    );
  }

  /**
   * Get current active/draft timecard for a technician.
   */
  getCurrentTimecard(technicianId: string): Observable<TimecardDto | null> {
    return this.http.get<TimecardDto | null>(`${this.baseUrl}/current/${technicianId}`);
  }
}
