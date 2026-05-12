import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import { PtoRequest, RequestStatus, ApprovalAction } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectSelectedRequest } from '../../../state/pto/pto.selectors';

/**
 * PTO Request Detail Component
 *
 * Displays full details of a PTO request including approval history timeline.
 * Allows the employee to cancel a request that is still in a cancellable status.
 *
 * Requirements: 2.3, 3.1, 3.2, 3.4
 */
@Component({
  selector: 'app-pto-request-detail',
  templateUrl: './pto-request-detail.component.html',
  styleUrls: ['./pto-request-detail.component.scss']
})
export class PtoRequestDetailComponent implements OnInit {
  /** The currently selected PTO request */
  request$!: Observable<PtoRequest | null>;

  constructor(
    private store: Store,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.store.dispatch(PtoActions.selectRequest({ requestId: id }));
      }
    });

    this.request$ = this.store.select(selectSelectedRequest);
  }

  /**
   * Determines if the request can be cancelled by the employee.
   * A request is cancellable when in Pending_Manager_Approval or Pending_Backoffice_Approval status.
   */
  canCancel(request: PtoRequest): boolean {
    return (
      request.status === RequestStatus.Pending_Manager_Approval ||
      request.status === RequestStatus.Pending_Backoffice_Approval
    );
  }

  /**
   * Handles the cancel button click.
   * Shows a confirmation dialog and dispatches the cancel action if confirmed.
   */
  onCancel(request: PtoRequest): void {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this PTO request? This action cannot be undone.'
    );
    if (confirmed) {
      this.store.dispatch(PtoActions.cancelRequest({ requestId: request.id }));
    }
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
        return 'Pending Manager Approval';
      case RequestStatus.Pending_Backoffice_Approval:
        return 'Pending Backoffice Approval';
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
   * Returns a human-readable label for an approval action.
   */
  getActionLabel(action: ApprovalAction): string {
    switch (action) {
      case 'submitted':
        return 'Submitted';
      case 'manager_approved':
        return 'Manager Approved';
      case 'manager_rejected':
        return 'Manager Rejected';
      case 'backoffice_approved':
        return 'Backoffice Approved';
      case 'backoffice_rejected':
        return 'Backoffice Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return action;
    }
  }
}
