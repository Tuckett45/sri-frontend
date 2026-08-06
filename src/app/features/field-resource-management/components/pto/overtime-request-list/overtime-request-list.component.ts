import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { OvertimeRequest, OvertimeRequestStatus } from '../../../models/overtime.models';
import * as OvertimeActions from '../../../state/overtime/overtime.actions';
import { selectAllOvertimeRequests, selectOvertimeLoading } from '../../../state/overtime/overtime.selectors';
import { AuthService } from '../../../../../services/auth.service';
import { OvertimeRequestFormComponent } from '../overtime-request-form/overtime-request-form.component';

/**
 * Overtime Request List Component
 *
 * Displays a list of the employee's overtime requests with status filtering.
 * Supports filter chips for All, Pending, Approved, Rejected, and Cancelled statuses.
 * Provides action buttons for cancel/approve/reject based on user role.
 */
@Component({
  selector: 'app-overtime-request-list',
  templateUrl: './overtime-request-list.component.html',
  styleUrls: ['./overtime-request-list.component.scss']
})
export class OvertimeRequestListComponent implements OnInit {
  /** Filter options */
  filterOptions: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

  /** Currently active filter */
  activeFilter = 'All';

  /** Reject modal state */
  showRejectModal = false;
  rejectReason = '';
  private rejectingRequestId: string | null = null;

  /** Subject to drive filter changes */
  private filterSubject$ = new BehaviorSubject<string>('All');

  /** All requests from the store */
  requests$!: Observable<OvertimeRequest[]>;

  /** Filtered requests */
  filteredRequests$!: Observable<OvertimeRequest[]>;

  /** Loading state */
  loading$!: Observable<boolean>;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.store.dispatch(OvertimeActions.loadOvertimeRequests());
    this.requests$ = this.store.select(selectAllOvertimeRequests);
    this.loading$ = this.store.select(selectOvertimeLoading);

    this.filteredRequests$ = combineLatest([
      this.requests$,
      this.filterSubject$
    ]).pipe(
      map(([requests, filter]) => this.applyFilter(requests, filter))
    );
  }

  /**
   * Sets the active filter.
   */
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterSubject$.next(filter);
  }

  /**
   * Open new overtime request form as dialog.
   */
  onNewRequest(): void {
    const dialogRef = this.dialog.open(OvertimeRequestFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'overtime-form-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.store.dispatch(OvertimeActions.loadOvertimeRequests());
      }
    });
  }

  /**
   * Returns a CSS class for the status badge.
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case OvertimeRequestStatus.Pending_Manager_Approval:
        return 'badge-pending';
      case OvertimeRequestStatus.Approved:
        return 'badge-approved';
      case OvertimeRequestStatus.Rejected:
        return 'badge-rejected';
      case OvertimeRequestStatus.Cancelled:
        return 'badge-cancelled';
      default:
        return '';
    }
  }

  /**
   * Returns a human-readable label for the status.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case OvertimeRequestStatus.Pending_Manager_Approval:
        return 'Pending Approval';
      case OvertimeRequestStatus.Approved:
        return 'Approved';
      case OvertimeRequestStatus.Rejected:
        return 'Rejected';
      case OvertimeRequestStatus.Cancelled:
        return 'Cancelled';
      default:
        return status;
    }
  }

  /**
   * Formats duration to display string.
   */
  formatDuration(request: OvertimeRequest): string {
    const h = request.estimatedHours || request.estimatedDuration?.hours || 0;
    const m = request.estimatedMinutes || request.estimatedDuration?.minutes || 0;
    if (h > 0 && m > 0) {
      return `${h}h ${m}m`;
    } else if (h > 0) {
      return `${h}h`;
    } else {
      return `${m}m`;
    }
  }

  /**
   * TrackBy function for list rendering.
   */
  trackByRequest(_index: number, request: OvertimeRequest): string {
    return request.id;
  }

  // --- Action Buttons ---

  canCancel(request: OvertimeRequest): boolean {
    return request.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval;
  }

  canDelete(request: OvertimeRequest): boolean {
    return true; // All own requests can be deleted
  }

  canApprove(request: OvertimeRequest): boolean {
    const user = this.authService.getUser();
    const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'CM';
    return isManagerOrAdmin && request.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval;
  }

  canReject(request: OvertimeRequest): boolean {
    return this.canApprove(request);
  }

  onCancel(request: OvertimeRequest): void {
    if (confirm('Are you sure you want to cancel this overtime request?')) {
      this.store.dispatch(OvertimeActions.cancelOvertimeRequest({ requestId: request.id }));
    }
  }

  onDelete(request: OvertimeRequest): void {
    if (confirm('Are you sure you want to permanently delete this overtime request? This cannot be undone.')) {
      this.store.dispatch(OvertimeActions.deleteOvertimeRequest({ requestId: request.id }));
    }
  }

  onApprove(request: OvertimeRequest): void {
    this.store.dispatch(OvertimeActions.approveOvertimeRequest({ requestId: request.id }));
  }

  onReject(request: OvertimeRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (this.rejectingRequestId && this.rejectReason.trim()) {
      this.store.dispatch(OvertimeActions.rejectOvertimeRequest({
        requestId: this.rejectingRequestId,
        reason: this.rejectReason.trim()
      }));
      this.showRejectModal = false;
      this.rejectingRequestId = null;
      this.rejectReason = '';
    }
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingRequestId = null;
    this.rejectReason = '';
  }

  /**
   * Applies filter to the requests list.
   */
  private applyFilter(requests: OvertimeRequest[], filter: string): OvertimeRequest[] {
    switch (filter) {
      case 'All':
        return requests;
      case 'Pending':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval);
      case 'Approved':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Approved);
      case 'Rejected':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Rejected);
      case 'Cancelled':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Cancelled);
      default:
        return requests;
    }
  }
}
