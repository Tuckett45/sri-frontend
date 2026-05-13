import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { PtoRequest } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectBackofficeQueue } from '../../../state/pto/pto.selectors';

/**
 * PTO Backoffice Queue Component
 *
 * Displays pending PTO requests for backoffice/payroll approval.
 * Shows requests that have already been approved by the manager.
 * Provides approve and reject actions with inline rejection reason input.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6
 */
@Component({
  selector: 'app-pto-backoffice-queue',
  templateUrl: './pto-backoffice-queue.component.html',
  styleUrls: ['./pto-backoffice-queue.component.scss']
})
export class PtoBackofficeQueueComponent implements OnInit {
  /** Pending requests for backoffice approval */
  queue$!: Observable<PtoRequest[]>;

  /** Tracks which request is currently showing the rejection dialog */
  rejectingRequestId: string | null = null;

  /** The rejection reason input value */
  rejectionReason: string = '';

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadBackofficeQueue());
    this.queue$ = this.store.select(selectBackofficeQueue);
  }

  /**
   * Dispatches the backoffice approve action for the given request.
   */
  onApprove(request: PtoRequest): void {
    this.store.dispatch(PtoActions.backofficeApprove({ requestId: request.id }));
  }

  /**
   * Shows the inline rejection reason input for the given request.
   */
  onRejectStart(request: PtoRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectionReason = '';
  }

  /**
   * Validates the rejection reason and dispatches the backoffice reject action.
   */
  onRejectConfirm(request: PtoRequest): void {
    const reason = this.rejectionReason.trim();
    if (!reason) {
      return;
    }
    this.store.dispatch(PtoActions.backofficeReject({ requestId: request.id, reason }));
    this.rejectingRequestId = null;
    this.rejectionReason = '';
  }

  /**
   * Cancels the rejection dialog and clears the rejection state.
   */
  onRejectCancel(): void {
    this.rejectingRequestId = null;
    this.rejectionReason = '';
  }

  /**
   * Returns the manager approval date from the request's approval history.
   */
  getManagerApprovalDate(request: PtoRequest): string | null {
    const managerApproval = (request.approvalHistory || []).find(
      entry => entry.action === 'manager_approved'
    );
    return managerApproval ? managerApproval.performedAt : null;
  }

  /**
   * TrackBy function for queue list rendering.
   */
  trackByRequest(_index: number, request: PtoRequest): string {
    return request.id;
  }
}
