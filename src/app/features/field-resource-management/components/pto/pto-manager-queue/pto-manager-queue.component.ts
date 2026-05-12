import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { PtoRequest } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectManagerQueue } from '../../../state/pto/pto.selectors';

/**
 * PTO Manager Queue Component
 *
 * Displays pending PTO requests for the manager's direct reports.
 * Provides approve and reject actions with inline rejection reason input.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */
@Component({
  selector: 'app-pto-manager-queue',
  templateUrl: './pto-manager-queue.component.html',
  styleUrls: ['./pto-manager-queue.component.scss']
})
export class PtoManagerQueueComponent implements OnInit {
  /** Pending requests for manager approval */
  queue$!: Observable<PtoRequest[]>;

  /** Tracks which request is currently showing the rejection dialog */
  rejectingRequestId: string | null = null;

  /** The rejection reason input value */
  rejectionReason: string = '';

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadManagerQueue());
    this.queue$ = this.store.select(selectManagerQueue);
  }

  /**
   * Dispatches the manager approve action for the given request.
   */
  onApprove(request: PtoRequest): void {
    this.store.dispatch(PtoActions.managerApprove({ requestId: request.id }));
  }

  /**
   * Shows the inline rejection reason input for the given request.
   */
  onRejectStart(request: PtoRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectionReason = '';
  }

  /**
   * Validates the rejection reason and dispatches the manager reject action.
   */
  onRejectConfirm(request: PtoRequest): void {
    const reason = this.rejectionReason.trim();
    if (!reason) {
      return;
    }
    this.store.dispatch(PtoActions.managerReject({ requestId: request.id, reason }));
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
   * TrackBy function for queue list rendering.
   */
  trackByRequest(_index: number, request: PtoRequest): string {
    return request.id;
  }
}
