import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { PtoRequest, RequestStatus } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectAllPtoRequests } from '../../../state/pto/pto.selectors';
import { AuthService } from '../../../../../services/auth.service';

/**
 * PTO Request List Component
 *
 * Displays a list of the employee's own PTO requests with status filtering.
 * Supports filter chips for All, Pending, Approved, Rejected, and Cancelled statuses.
 * Navigates to the detail view when a row is clicked.
 *
 * Requirements: 2.1, 2.2, 2.4
 */
@Component({
  selector: 'app-pto-request-list',
  templateUrl: './pto-request-list.component.html',
  styleUrls: ['./pto-request-list.component.scss']
})
export class PtoRequestListComponent implements OnInit {
  /** All filter options available */
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
  requests$!: Observable<PtoRequest[]>;

  /** Filtered requests based on active filter */
  filteredRequests$!: Observable<PtoRequest[]>;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadRequests());
    this.requests$ = this.store.select(selectAllPtoRequests);

    this.filteredRequests$ = combineLatest([
      this.requests$,
      this.filterSubject$
    ]).pipe(
      map(([requests, filter]) => this.applyFilter(requests, filter))
    );
  }

  /**
   * Sets the active filter and emits the new value.
   */
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterSubject$.next(filter);
  }

  /**
   * Navigates to the detail view for the selected request.
   */
  onRowClick(request: PtoRequest): void {
    this.router.navigate(['/field-resource-management/pto', request.id]);
  }

  /**
   * Returns a CSS class for the status badge based on the request status.
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case RequestStatus.Pending_Manager_Approval:
      case RequestStatus.Pending_Backoffice_Approval:
      case 'Pending':
        return 'badge-pending';
      case RequestStatus.Approved:
      case 'Approved':
        return 'badge-approved';
      case RequestStatus.Rejected:
      case 'Rejected':
        return 'badge-rejected';
      case RequestStatus.Cancelled:
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return '';
    }
  }

  /**
   * Returns a human-readable label for the request status.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case RequestStatus.Pending_Manager_Approval:
        return 'Pending Manager';
      case RequestStatus.Pending_Backoffice_Approval:
        return 'Pending Backoffice';
      case RequestStatus.Approved:
      case 'Approved':
        return 'Approved';
      case RequestStatus.Rejected:
      case 'Rejected':
        return 'Rejected';
      case RequestStatus.Cancelled:
      case 'Cancelled':
        return 'Cancelled';
      case 'Pending':
        return 'Pending';
      default:
        return status;
    }
  }

  /**
   * TrackBy function for request list rendering.
   */
  trackByRequest(_index: number, request: PtoRequest): string {
    return request.id;
  }

  // --- Action Buttons ---

  /**
   * Whether the current user can cancel this request (employee can cancel pending requests).
   */
  canCancel(request: PtoRequest): boolean {
    const isPending = request.status === 'Pending' ||
      request.status === RequestStatus.Pending_Manager_Approval ||
      request.status === RequestStatus.Pending_Backoffice_Approval;
    return isPending;
  }

  /**
   * Whether the current user can approve this request (manager/admin on pending requests).
   */
  canApprove(request: PtoRequest): boolean {
    const user = this.authService.getUser();
    const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'CM';
    const isPending = request.status === 'Pending' ||
      request.status === RequestStatus.Pending_Manager_Approval ||
      request.status === RequestStatus.Pending_Backoffice_Approval;
    return isManagerOrAdmin && isPending;
  }

  /**
   * Whether the current user can reject this request (manager/admin on pending requests).
   */
  canReject(request: PtoRequest): boolean {
    return this.canApprove(request);
  }

  /**
   * Cancel a PTO request.
   */
  onCancel(request: PtoRequest): void {
    if (confirm('Are you sure you want to cancel this PTO request?')) {
      this.store.dispatch(PtoActions.cancelRequest({ requestId: request.id }));
    }
  }

  /**
   * Approve a PTO request.
   */
  onApprove(request: PtoRequest): void {
    this.store.dispatch(PtoActions.managerApprove({ requestId: request.id }));
  }

  /**
   * Open the reject modal for a PTO request.
   */
  onReject(request: PtoRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  /**
   * Confirm rejection with reason.
   */
  confirmReject(): void {
    if (this.rejectingRequestId && this.rejectReason.trim()) {
      this.store.dispatch(PtoActions.managerReject({
        requestId: this.rejectingRequestId,
        reason: this.rejectReason.trim()
      }));
      this.showRejectModal = false;
      this.rejectingRequestId = null;
      this.rejectReason = '';
    }
  }

  /**
   * Cancel the reject modal.
   */
  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingRequestId = null;
    this.rejectReason = '';
  }

  /**
   * Applies the status filter to the requests list.
   * Matches against both the enum values and the backend's simpler status strings.
   */
  private applyFilter(requests: PtoRequest[], filter: string): PtoRequest[] {
    switch (filter) {
      case 'All':
        return requests;
      case 'Pending':
        return requests.filter(
          r => r.status === 'Pending' ||
               r.status === RequestStatus.Pending_Manager_Approval ||
               r.status === RequestStatus.Pending_Backoffice_Approval
        );
      case 'Approved':
        return requests.filter(
          r => r.status === 'Approved' || r.status === RequestStatus.Approved
        );
      case 'Rejected':
        return requests.filter(
          r => r.status === 'Rejected' || r.status === RequestStatus.Rejected
        );
      case 'Cancelled':
        return requests.filter(
          r => r.status === 'Cancelled' || r.status === RequestStatus.Cancelled
        );
      default:
        return requests;
    }
  }
}
