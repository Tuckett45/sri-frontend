/**
 * Approval List Component
 * 
 * Displays pending approvals for the current user with approve/deny actions.
 * Supports filtering and pagination of approval requests.
 * 
 * Requirements: 7.1, 7.2, 3.11
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/inputtextarea';

// Models
import { ApprovalDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';
import { PaginationMetadata } from '../../models/common.model';

// State
import * as ApprovalActions from '../../state/approvals/approval.actions';
import * as ApprovalSelectors from '../../state/approvals/approval.selectors';
import { ApprovalFilters } from '../../state/approvals/approval.state';

@Component({
  selector: 'app-approval-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    DialogModule,
    InputTextarea
  ],
  templateUrl: './approval-list.component.html',
  styleUrls: ['./approval-list.component.scss']
})
export class ApprovalListComponent implements OnInit, OnDestroy {
  // Observables from store
  pendingApprovals$: Observable<ApprovalDto[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  recordingDecision$: Observable<boolean>;

  // Local state
  pendingApprovals: ApprovalDto[] = [];
  loading = false;
  error: string | null = null;
  recordingDecision = false;

  // Decision dialog state
  showDecisionDialog = false;
  selectedApproval: ApprovalDto | null = null;
  decisionType: 'APPROVED' | 'DENIED' | null = null;
  decisionComments = '';

  // Enums for template
  ApprovalStatus = ApprovalStatus;
  LifecycleState = LifecycleState;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router
  ) {
    // Initialize observables
    this.pendingApprovals$ = this.store.select(ApprovalSelectors.selectPendingApprovals);
    this.loading$ = this.store.select(ApprovalSelectors.selectPendingApprovalsLoading);
    this.error$ = this.store.select(ApprovalSelectors.selectPendingApprovalsError);
    this.recordingDecision$ = this.store.select(ApprovalSelectors.selectRecordingDecision);
  }

  ngOnInit(): void {
    // Subscribe to store observables
    this.pendingApprovals$
      .pipe(takeUntil(this.destroy$))
      .subscribe(approvals => this.pendingApprovals = approvals);

    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    this.recordingDecision$
      .pipe(takeUntil(this.destroy$))
      .subscribe(recording => {
        this.recordingDecision = recording;
        // Close dialog when decision is recorded successfully
        if (!recording && this.showDecisionDialog) {
          this.closeDecisionDialog();
        }
      });

    // Load pending approvals
    this.loadPendingApprovals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load pending approvals for current user
   */
  loadPendingApprovals(): void {
    // Load user approvals which includes pending approvals
    this.store.dispatch(ApprovalActions.loadUserApprovals({ page: 1, pageSize: 50 }));
  }

  /**
   * Open decision dialog for approval
   */
  onApprove(approval: ApprovalDto): void {
    this.selectedApproval = approval;
    this.decisionType = 'APPROVED';
    this.decisionComments = '';
    this.showDecisionDialog = true;
  }

  /**
   * Open decision dialog for denial
   */
  onDeny(approval: ApprovalDto): void {
    this.selectedApproval = approval;
    this.decisionType = 'DENIED';
    this.decisionComments = '';
    this.showDecisionDialog = true;
  }

  /**
   * Submit approval decision
   */
  onSubmitDecision(): void {
    if (!this.selectedApproval || !this.decisionType) {
      return;
    }

    this.store.dispatch(ApprovalActions.recordDecision({
      approvalId: this.selectedApproval.id,
      decision: {
        decision: this.decisionType,
        comments: this.decisionComments || undefined
      }
    }));
  }

  /**
   * Close decision dialog
   */
  closeDecisionDialog(): void {
    this.showDecisionDialog = false;
    this.selectedApproval = null;
    this.decisionType = null;
    this.decisionComments = '';
  }

  /**
   * Navigate to deployment detail
   */
  onViewDeployment(approval: ApprovalDto): void {
    // Extract deployment ID from approval context if available
    // For now, we'll need to enhance the model to include deploymentId
    // This is a placeholder for navigation
    console.log('Navigate to deployment for approval:', approval.id);
  }

  /**
   * Retry loading approvals after error
   */
  onRetry(): void {
    this.loadPendingApprovals();
  }

  /**
   * Get severity class for status tag
   */
  getStatusSeverity(status: ApprovalStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case ApprovalStatus.PENDING:
        return 'warn';
      case ApprovalStatus.APPROVED:
        return 'success';
      case ApprovalStatus.DENIED:
        return 'danger';
      case ApprovalStatus.EXPIRED:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Get severity class for state tag
   */
  getStateSeverity(state: LifecycleState): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case LifecycleState.DRAFT:
        return 'secondary';
      case LifecycleState.SUBMITTED:
      case LifecycleState.INTAKE_REVIEW:
      case LifecycleState.PLANNING:
        return 'info';
      case LifecycleState.READY:
        return 'success';
      case LifecycleState.IN_PROGRESS:
      case LifecycleState.EXECUTION_COMPLETE:
      case LifecycleState.QA_REVIEW:
        return 'warn';
      case LifecycleState.APPROVED_FOR_CLOSEOUT:
      case LifecycleState.CLOSED:
        return 'success';
      case LifecycleState.ON_HOLD:
        return 'warn';
      case LifecycleState.CANCELLED:
      case LifecycleState.REWORK_REQUIRED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Format state label for display
   */
  formatStateLabel(state: LifecycleState): string {
    return state.replace(/_/g, ' ');
  }

  /**
   * Format status label for display
   */
  formatStatusLabel(status: ApprovalStatus): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Get dialog title based on decision type
   */
  getDialogTitle(): string {
    if (this.decisionType === 'APPROVED') {
      return 'Approve Request';
    } else if (this.decisionType === 'DENIED') {
      return 'Deny Request';
    }
    return 'Record Decision';
  }

  /**
   * Check if decision can be submitted
   */
  canSubmitDecision(): boolean {
    return !!this.selectedApproval && !!this.decisionType && !this.recordingDecision;
  }
}
