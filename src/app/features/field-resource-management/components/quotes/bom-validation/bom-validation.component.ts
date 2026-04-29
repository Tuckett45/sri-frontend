import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import {
  BomLineItem,
  BomTotals,
  QuoteWorkflow,
  ValidationStep,
  ValidationStepEntry,
  WorkflowStatus
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import { BomValidationService } from '../../../services/bom-validation.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import { BomRejectionDialogComponent } from './bom-rejection-dialog.component';

/**
 * BOM Validation Component
 *
 * Displays the complete BOM in read-only format for validation review.
 * Provides Approve/Reject actions for users with canValidateBOM permission.
 * Shows a validation timeline with all steps, timestamps, and actor identities.
 * When the BOM is rejected, allows navigation back to the BOM Builder for revision.
 *
 * Requirements: 5.1–5.14
 */
@Component({
  selector: 'app-bom-validation',
  templateUrl: './bom-validation.component.html',
  styleUrls: ['./bom-validation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BomValidationComponent implements OnInit, OnDestroy {
  @Input() canValidate = false;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  isApproving = false;
  isRejecting = false;

  // Computed BOM data
  bomTotals: BomTotals = { subtotal: 0, tax: 0, freight: 0, grandTotal: 0 };
  lineExtendedCosts: number[] = [];
  lineMarkedUpCosts: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private actions$: Actions,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private bomCalculationService: BomCalculationService,
    private bomValidationService: BomValidationService
  ) {}

  ngOnInit(): void {
    this.computeBomData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // BOM Data Computation
  // ---------------------------------------------------------------------------

  get bom() {
    return this.quote?.bom ?? null;
  }

  get lineItems(): BomLineItem[] {
    return this.bom?.lineItems ?? [];
  }

  get markupPercentage(): number {
    return this.bom?.markupPercentage ?? 0;
  }

  get taxFreightVisible(): boolean {
    return this.bom?.taxFreightVisible ?? true;
  }

  get validationSteps(): ValidationStepEntry[] {
    return this.quote?.validationRequest?.steps ?? [];
  }

  get isRejected(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Validation_Rejected;
  }

  get isApproved(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Validation_Approved;
  }

  get isPendingValidation(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Pending_Validation;
  }

  private computeBomData(): void {
    if (!this.bom) return;

    const markupPercentage = this.markupPercentage;

    // Compute per-line costs
    this.lineExtendedCosts = this.lineItems.map(item =>
      this.bomCalculationService.computeExtendedCost(item.quantity, item.unitCost)
    );

    this.lineMarkedUpCosts = this.lineExtendedCosts.map(extCost =>
      this.bomCalculationService.computeMarkedUpCost(extCost, markupPercentage)
    );

    // Compute totals
    this.bomTotals = this.bomCalculationService.computeBomTotals(
      this.lineItems,
      markupPercentage,
      this.bom.tax,
      this.bom.freight
    );
  }

  getExtendedCost(index: number): number {
    return this.lineExtendedCosts[index] || 0;
  }

  getMarkedUpCost(index: number): number {
    return this.lineMarkedUpCosts[index] || 0;
  }

  // ---------------------------------------------------------------------------
  // Validation Timeline Helpers
  // ---------------------------------------------------------------------------

  getStepIcon(step: ValidationStep): string {
    switch (step) {
      case ValidationStep.Request_Sent:
        return 'send';
      case ValidationStep.Under_Review:
        return 'rate_review';
      case ValidationStep.Approved:
        return 'check_circle';
      case ValidationStep.Rejected:
        return 'cancel';
      default:
        return 'fiber_manual_record';
    }
  }

  getStepClass(step: ValidationStep): string {
    switch (step) {
      case ValidationStep.Approved:
        return 'step-approved';
      case ValidationStep.Rejected:
        return 'step-rejected';
      default:
        return 'step-default';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  }

  // ---------------------------------------------------------------------------
  // Approve Action
  // ---------------------------------------------------------------------------

  onApprove(): void {
    if (this.isApproving || !this.quoteId) return;
    this.isApproving = true;

    this.store.dispatch(QuoteActions.approveBom({ quoteId: this.quoteId }));

    this.actions$
      .pipe(
        ofType(QuoteActions.approveBomSuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isApproving = false;

        if (action.type === QuoteActions.approveBomSuccess.type) {
          this.snackBar.open('BOM approved successfully', 'Close', { duration: 3000 });
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error approving BOM: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Reject Action
  // ---------------------------------------------------------------------------

  onReject(): void {
    const dialogRef = this.dialog.open(BomRejectionDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((comments: string | undefined) => {
        if (comments && this.quoteId) {
          this.isRejecting = true;

          this.store.dispatch(QuoteActions.rejectBom({
            quoteId: this.quoteId,
            comments
          }));

          this.actions$
            .pipe(
              ofType(QuoteActions.rejectBomSuccess, QuoteActions.quoteOperationFailure),
              take(1),
              takeUntil(this.destroy$)
            )
            .subscribe(action => {
              this.isRejecting = false;

              if (action.type === QuoteActions.rejectBomSuccess.type) {
                this.snackBar.open('BOM rejected. The quoter has been notified.', 'Close', { duration: 3000 });
              } else {
                const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
                this.snackBar.open(`Error rejecting BOM: ${error}`, 'Close', { duration: 5000 });
              }
            });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  navigateToBomBuilder(): void {
    // The quote-workflow container handles step rendering based on status.
    // When status is Validation_Rejected, the container already shows the BOM Builder.
    // This navigation is a fallback for direct access scenarios.
    if (this.quoteId) {
      this.router.navigate(['/field-resource-management/quotes', this.quoteId]);
    }
  }
}
