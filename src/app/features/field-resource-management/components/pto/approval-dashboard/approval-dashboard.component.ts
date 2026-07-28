import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { PtoRequest, RequestStatus } from '../../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus } from '../../../models/overtime.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import * as OvertimeActions from '../../../state/overtime/overtime.actions';
import { selectManagerQueue, selectBackofficeQueue, selectAllPtoRequests } from '../../../state/pto/pto.selectors';
import { selectOvertimeManagerQueue, selectAllOvertimeRequests } from '../../../state/overtime/overtime.selectors';

/**
 * Approval Dashboard Component
 *
 * Unified manager/approver view for both PTO and Overtime requests.
 * Shows:
 * - Summary stats (pending count, approved today, total for period)
 * - Tabbed view: PTO Requests | Overtime Requests
 * - Each tab shows pending items with approve/reject actions
 * - Recently processed items for reference
 */
@Component({
  selector: 'app-approval-dashboard',
  templateUrl: './approval-dashboard.component.html',
  styleUrls: ['./approval-dashboard.component.scss']
})
export class ApprovalDashboardComponent implements OnInit {
  /** Active tab */
  activeTab: 'pto' | 'overtime' | 'all' = 'all';

  /** PTO queues */
  ptoManagerQueue$!: Observable<PtoRequest[]>;
  ptoBackofficeQueue$!: Observable<PtoRequest[]>;
  allPtoRequests$!: Observable<PtoRequest[]>;

  /** Overtime queue */
  overtimeManagerQueue$!: Observable<OvertimeRequest[]>;
  allOvertimeRequests$!: Observable<OvertimeRequest[]>;

  /** Combined stats */
  stats$!: Observable<{
    pendingPto: number;
    pendingOvertime: number;
    totalPending: number;
    approvedThisWeek: number;
    rejectedThisWeek: number;
  }>;

  /** Reject modal state */
  showRejectModal = false;
  rejectReason = '';
  private rejectingRequest: { id: string; type: 'pto' | 'overtime' } | null = null;

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Dispatch load actions
    this.store.dispatch(PtoActions.loadManagerQueue());
    this.store.dispatch(PtoActions.loadBackofficeQueue());
    this.store.dispatch(PtoActions.loadRequests());
    this.store.dispatch(OvertimeActions.loadOvertimeManagerQueue());
    this.store.dispatch(OvertimeActions.loadOvertimeRequests());

    // Select queues
    this.ptoManagerQueue$ = this.store.select(selectManagerQueue);
    this.ptoBackofficeQueue$ = this.store.select(selectBackofficeQueue);
    this.allPtoRequests$ = this.store.select(selectAllPtoRequests);
    this.overtimeManagerQueue$ = this.store.select(selectOvertimeManagerQueue);
    this.allOvertimeRequests$ = this.store.select(selectAllOvertimeRequests);

    // Compute stats
    this.stats$ = combineLatest([
      this.ptoManagerQueue$,
      this.ptoBackofficeQueue$,
      this.overtimeManagerQueue$,
      this.allPtoRequests$,
      this.allOvertimeRequests$
    ]).pipe(
      map(([ptoMgr, ptoBo, otMgr, allPto, allOt]) => {
        const pendingPto = ptoMgr.length + ptoBo.length;
        const pendingOvertime = otMgr.length;

        // Calculate approved/rejected this week
        const weekStart = this.getWeekStart();
        const approvedPto = allPto.filter(r =>
          r.status === RequestStatus.Approved &&
          new Date(r.updatedAt) >= weekStart
        ).length;
        const approvedOt = allOt.filter(r =>
          r.approvalStatus === OvertimeRequestStatus.Approved &&
          new Date(r.updatedAt) >= weekStart
        ).length;
        const rejectedPto = allPto.filter(r =>
          r.status === RequestStatus.Rejected &&
          new Date(r.updatedAt) >= weekStart
        ).length;
        const rejectedOt = allOt.filter(r =>
          r.approvalStatus === OvertimeRequestStatus.Rejected &&
          new Date(r.updatedAt) >= weekStart
        ).length;

        return {
          pendingPto,
          pendingOvertime,
          totalPending: pendingPto + pendingOvertime,
          approvedThisWeek: approvedPto + approvedOt,
          rejectedThisWeek: rejectedPto + rejectedOt
        };
      })
    );
  }

  /**
   * Switch active tab
   */
  setTab(tab: 'pto' | 'overtime' | 'all'): void {
    this.activeTab = tab;
  }

  // --- PTO Actions ---

  approvePto(request: PtoRequest): void {
    if (request.status === RequestStatus.Pending_Manager_Approval) {
      this.store.dispatch(PtoActions.managerApprove({ requestId: request.id }));
    } else if (request.status === RequestStatus.Pending_Backoffice_Approval) {
      this.store.dispatch(PtoActions.backofficeApprove({ requestId: request.id }));
    }
  }

  rejectPto(request: PtoRequest): void {
    this.rejectingRequest = { id: request.id, type: 'pto' };
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  // --- Overtime Actions ---

  approveOvertime(request: OvertimeRequest): void {
    this.store.dispatch(OvertimeActions.approveOvertimeRequest({ requestId: request.id }));
  }

  rejectOvertime(request: OvertimeRequest): void {
    this.rejectingRequest = { id: request.id, type: 'overtime' };
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  // --- Reject Modal ---

  confirmReject(): void {
    if (!this.rejectingRequest || !this.rejectReason.trim()) return;

    const reason = this.rejectReason.trim();
    if (this.rejectingRequest.type === 'pto') {
      this.store.dispatch(PtoActions.managerReject({
        requestId: this.rejectingRequest.id,
        reason
      }));
    } else {
      this.store.dispatch(OvertimeActions.rejectOvertimeRequest({
        requestId: this.rejectingRequest.id,
        reason
      }));
    }

    this.showRejectModal = false;
    this.rejectingRequest = null;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingRequest = null;
    this.rejectReason = '';
  }

  // --- Helpers ---

  getPtoStatusLabel(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.Pending_Manager_Approval:
        return 'Pending Manager';
      case RequestStatus.Pending_Backoffice_Approval:
        return 'Pending Backoffice';
      default:
        return status;
    }
  }

  formatOvertimeDuration(request: OvertimeRequest): string {
    const h = request.estimatedDuration?.hours || 0;
    const m = request.estimatedDuration?.minutes || 0;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  trackByPto(_index: number, request: PtoRequest): string {
    return request.id;
  }

  trackByOvertime(_index: number, request: OvertimeRequest): string {
    return request.id;
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}
