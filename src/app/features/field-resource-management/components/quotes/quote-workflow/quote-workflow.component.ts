import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import {
  QuoteWorkflow,
  WorkflowStatus,
  StatusTransition
} from '../../../models/quote-workflow.model';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import * as QuoteSelectors from '../../../state/quotes/quote.selectors';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { FrmSignalRService, ConnectionStatus } from '../../../services/frm-signalr.service';
import { AuthService } from '../../../../../services/auth.service';

/**
 * Quote Workflow Container Component
 *
 * Orchestrates the multi-step quote workflow view. Receives a quoteId
 * from route params, loads the quote via NgRx, subscribes to SignalR
 * for real-time updates, and conditionally renders the active step
 * component based on the current WorkflowStatus.
 *
 * Displays a visual progress indicator, status transition history,
 * navigation links, and loading/error states.
 *
 * Requirements: 8.1–8.3, 8.14, 10.7–10.9, 15.1–15.4
 */
@Component({
  selector: 'app-quote-workflow',
  templateUrl: './quote-workflow.component.html',
  styleUrls: ['./quote-workflow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteWorkflowComponent implements OnInit, OnDestroy {
  quoteId!: string;
  quote$!: Observable<QuoteWorkflow | null>;
  workflowStatus$!: Observable<WorkflowStatus | null>;
  loading$!: Observable<boolean>;
  saving$!: Observable<boolean>;
  error$!: Observable<string | null>;
  statusHistory$!: Observable<StatusTransition[]>;
  canEdit$!: Observable<boolean>;
  canValidate$!: Observable<boolean>;
  connectionStatus$!: Observable<ConnectionStatus>;

  /** Expose ConnectionStatus enum to the template */
  readonly ConnectionStatus = ConnectionStatus;

  /** All workflow statuses in display order for the progress indicator */
  readonly workflowSteps: { status: WorkflowStatus; label: string }[] = [
    { status: WorkflowStatus.Draft, label: 'RFP Intake' },
    { status: WorkflowStatus.Job_Summary_In_Progress, label: 'Job Summary' },
    { status: WorkflowStatus.BOM_In_Progress, label: 'BOM' },
    { status: WorkflowStatus.Pending_Validation, label: 'Validation' },
    { status: WorkflowStatus.Validation_Approved, label: 'Approved' },
    { status: WorkflowStatus.Validation_Rejected, label: 'Rejected' },
    { status: WorkflowStatus.Quote_Assembled, label: 'Assembly' },
    { status: WorkflowStatus.Quote_Delivered, label: 'Delivered' },
    { status: WorkflowStatus.Quote_Converted, label: 'Converted' }
  ];

  /** Ordered statuses for determining step completion */
  private readonly statusOrder: WorkflowStatus[] = [
    WorkflowStatus.Draft,
    WorkflowStatus.Job_Summary_In_Progress,
    WorkflowStatus.BOM_In_Progress,
    WorkflowStatus.Pending_Validation,
    WorkflowStatus.Validation_Approved,
    WorkflowStatus.Quote_Assembled,
    WorkflowStatus.Quote_Delivered,
    WorkflowStatus.Quote_Converted
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private signalRService: FrmSignalRService,
    private frmPermissionService: FrmPermissionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Wire up NgRx selectors
    this.quote$ = this.store.select(QuoteSelectors.selectSelectedQuote);
    this.workflowStatus$ = this.store.select(QuoteSelectors.selectWorkflowStatus);
    this.loading$ = this.store.select(QuoteSelectors.selectQuoteLoading);
    this.saving$ = this.store.select(QuoteSelectors.selectQuoteSaving);
    this.error$ = this.store.select(QuoteSelectors.selectQuoteError);
    this.statusHistory$ = this.store.select(QuoteSelectors.selectStatusHistory);

    // Permission observables
    const userRole = this.authService.getUserRole();
    this.canEdit$ = of(this.frmPermissionService.hasPermission(userRole, 'canEditQuote'));
    this.canValidate$ = of(this.frmPermissionService.hasPermission(userRole, 'canValidateBOM'));

    // Connection status for warning banner display
    this.connectionStatus$ = this.signalRService.connectionStatus$;

    // Load quote from route params
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params['id'];
        if (id) {
          this.quoteId = id;
          this.store.dispatch(QuoteActions.loadQuote({ quoteId: id }));

          // Register active quote for reconnection resynchronization
          this.signalRService.setActiveQuoteId(id);
        }
      });

    // Subscribe to SignalR updates for this quote
    this.signalRService.quoteUpdated$
      .pipe(
        takeUntil(this.destroy$),
        filter(update => !!update && update.quoteId === this.quoteId)
      )
      .subscribe(() => {
        // The SignalR handler already dispatches quoteUpdatedRemotely to the store,
        // so the selectors will automatically update. We just mark for check.
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    // Clear active quote so reconnection doesn't reload a quote we're no longer viewing
    this.signalRService.setActiveQuoteId(null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Progress Indicator Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the index of the given status in the ordered status list.
   * Validation_Rejected maps to the same position as Pending_Validation.
   */
  getStatusIndex(status: WorkflowStatus): number {
    if (status === WorkflowStatus.Validation_Rejected) {
      return this.statusOrder.indexOf(WorkflowStatus.Pending_Validation);
    }
    return this.statusOrder.indexOf(status);
  }

  /**
   * Determines if a workflow step is completed relative to the current status.
   */
  isStepCompleted(stepStatus: WorkflowStatus, currentStatus: WorkflowStatus): boolean {
    const stepIdx = this.getStatusIndex(stepStatus);
    const currentIdx = this.getStatusIndex(currentStatus);
    return stepIdx < currentIdx;
  }

  /**
   * Determines if a workflow step is the currently active step.
   */
  isStepActive(stepStatus: WorkflowStatus, currentStatus: WorkflowStatus): boolean {
    if (stepStatus === WorkflowStatus.Validation_Rejected) {
      return currentStatus === WorkflowStatus.Validation_Rejected;
    }
    return stepStatus === currentStatus;
  }

  /**
   * Returns a CSS class for the step indicator based on its state.
   */
  getStepClass(stepStatus: WorkflowStatus, currentStatus: WorkflowStatus): string {
    if (this.isStepActive(stepStatus, currentStatus)) {
      if (stepStatus === WorkflowStatus.Validation_Rejected) {
        return 'step-rejected';
      }
      return 'step-active';
    }
    if (this.isStepCompleted(stepStatus, currentStatus)) {
      return 'step-completed';
    }
    return 'step-pending';
  }

  // ---------------------------------------------------------------------------
  // Active Step Determination
  // ---------------------------------------------------------------------------

  /**
   * Returns the active step key for conditional rendering based on WorkflowStatus.
   */
  getActiveStep(status: WorkflowStatus): string {
    switch (status) {
      case WorkflowStatus.Draft:
        return 'rfp';
      case WorkflowStatus.Job_Summary_In_Progress:
        return 'jobSummary';
      case WorkflowStatus.BOM_In_Progress:
      case WorkflowStatus.Validation_Rejected:
        return 'bom';
      case WorkflowStatus.Pending_Validation:
        return 'validation';
      case WorkflowStatus.Validation_Approved:
        return 'assembly';
      case WorkflowStatus.Quote_Assembled:
      case WorkflowStatus.Quote_Delivered:
        return 'delivery';
      case WorkflowStatus.Quote_Converted:
        return 'converted';
      default:
        return 'rfp';
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  goToQuoteList(): void {
    this.router.navigate(['/field-resource-management/quotes']);
  }

  goToJob(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  retryLoad(): void {
    if (this.quoteId) {
      this.store.dispatch(QuoteActions.loadQuote({ quoteId: this.quoteId }));
    }
  }

  // ---------------------------------------------------------------------------
  // Template Helpers
  // ---------------------------------------------------------------------------

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  }
}
