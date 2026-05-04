import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';

import {
  BomLineItem,
  BomTotals,
  LaborTotals,
  PriceSummary,
  QuoteWorkflow,
  WorkflowStatus
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import { QuoteWorkflowService } from '../../../services/quote-workflow.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * Quote Assembly Component
 *
 * Assembles the final Quote Document from approved components:
 * Price Summary, Statement of Work (SOW), and BOM.
 * Enabled only when Workflow_Status is Validation_Approved.
 * Provides preview mode and a Finalize action that records
 * timestamp and user identity, updating status to Quote_Assembled.
 *
 * Requirements: 6.1–6.9
 */
@Component({
  selector: 'app-quote-assembly',
  templateUrl: './quote-assembly.component.html',
  styleUrls: ['./quote-assembly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteAssemblyComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  isFinalizing = false;
  isPreviewMode = false;
  draftRestored = false;

  // SOW form control
  sowControl = new FormControl('', [Validators.maxLength(10000)]);

  // Computed data
  bomTotals: BomTotals = { subtotal: 0, tax: 0, freight: 0, grandTotal: 0 };
  laborTotals: LaborTotals = { totalHours: 0, totalCost: 0 };
  priceSummary: PriceSummary = {
    totalLaborCost: 0,
    totalMaterialCost: 0,
    tax: 0,
    freight: 0,
    combinedProjectTotal: 0,
    taxFreightVisible: true
  };
  lineExtendedCosts: number[] = [];
  lineMarkedUpCosts: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private bomCalculationService: BomCalculationService,
    private quoteWorkflowService: QuoteWorkflowService
  ) {}

  ngOnInit(): void {
    this.computeData();
    this.initSowControl();
    this.restoreDraft();
    this.setupDraftAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get isEnabled(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Validation_Approved;
  }

  get isFinalized(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Quote_Assembled
      || this.quote?.workflowStatus === WorkflowStatus.Quote_Delivered
      || this.quote?.workflowStatus === WorkflowStatus.Quote_Converted;
  }

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

  get jobSummary() {
    return this.quote?.jobSummary ?? null;
  }

  get rfpRecord() {
    return this.quote?.rfpRecord ?? null;
  }

  get quoteDocument() {
    return this.quote?.quoteDocument ?? null;
  }

  get sowCharCount(): number {
    return (this.sowControl.value || '').length;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  private initSowControl(): void {
    // Pre-populate SOW from existing quote document or RFP_Record scope of work
    const existingSow = this.quoteDocument?.statementOfWork
      ?? this.rfpRecord?.scopeOfWork
      ?? '';
    this.sowControl.setValue(existingSow);

    // Disable SOW editing if not editable or already finalized
    if (!this.canEdit || this.isFinalized) {
      this.sowControl.disable();
    }
  }

  private computeData(): void {
    this.computeBomData();
    this.computeLaborData();
    this.computePriceSummary();
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

  private computeLaborData(): void {
    if (!this.jobSummary) return;

    this.laborTotals = this.bomCalculationService.computeLaborTotal(
      this.jobSummary.laborLineItems
    );
  }

  private computePriceSummary(): void {
    const totalLaborCost = this.laborTotals.totalCost;
    const totalMaterialCost = this.bomTotals.subtotal;
    const tax = this.bomTotals.tax;
    const freight = this.bomTotals.freight;
    const taxFreightVisible = this.taxFreightVisible;

    this.priceSummary = {
      totalLaborCost,
      totalMaterialCost,
      tax,
      freight,
      combinedProjectTotal: Math.round((totalLaborCost + totalMaterialCost + tax + freight) * 100) / 100,
      taxFreightVisible
    };
  }

  getExtendedCost(index: number): number {
    return this.lineExtendedCosts[index] || 0;
  }

  getMarkedUpCost(index: number): number {
    return this.lineMarkedUpCosts[index] || 0;
  }

  // ---------------------------------------------------------------------------
  // Draft Auto-Save & Restore
  // ---------------------------------------------------------------------------

  private setupDraftAutoSave(): void {
    this.sowControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(3000)
      )
      .subscribe(value => {
        if (this.canEdit && this.isEnabled) {
          this.quoteWorkflowService.saveDraft(this.quoteId, 'quoteAssembly', { statementOfWork: value });
        }
      });
  }

  private restoreDraft(): void {
    const draft = this.quoteWorkflowService.restoreDraft(this.quoteId, 'quoteAssembly');
    if (draft && draft.statementOfWork != null) {
      this.sowControl.setValue(draft.statementOfWork);
      this.draftRestored = true;
      this.snackBar.open('Unsaved changes have been restored', 'Dismiss', {
        duration: 5000
      });
    }
  }

  dismissDraftBanner(): void {
    this.draftRestored = false;
  }

  discardDraft(): void {
    this.quoteWorkflowService.clearDraft(this.quoteId, 'quoteAssembly');
    this.draftRestored = false;

    // Reload last saved state from the store
    const existingSow = this.quoteDocument?.statementOfWork
      ?? this.rfpRecord?.scopeOfWork
      ?? '';
    this.sowControl.setValue(existingSow);

    this.snackBar.open('Draft discarded', 'Close', { duration: 3000 });
  }

  // ---------------------------------------------------------------------------
  // Preview Mode
  // ---------------------------------------------------------------------------

  togglePreview(): void {
    this.isPreviewMode = !this.isPreviewMode;
  }

  // ---------------------------------------------------------------------------
  // Finalize Action
  // ---------------------------------------------------------------------------

  onFinalize(): void {
    if (this.isFinalizing || !this.quoteId || !this.isEnabled) return;

    // Mark SOW as touched to show validation errors
    this.sowControl.markAsTouched();

    // Validate SOW
    if (this.sowControl.invalid) {
      this.snackBar.open('Please correct the Statement of Work before finalizing.', 'Close', { duration: 3000 });
      return;
    }

    this.isFinalizing = true;

    this.store.dispatch(QuoteActions.finalizeQuote({ quoteId: this.quoteId }));

    this.actions$
      .pipe(
        ofType(QuoteActions.finalizeQuoteSuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isFinalizing = false;

        if (action.type === QuoteActions.finalizeQuoteSuccess.type) {
          this.quoteWorkflowService.clearDraft(this.quoteId, 'quoteAssembly');
          this.snackBar.open('Quote finalized successfully. Ready for delivery.', 'Close', { duration: 3000 });
          this.sowControl.disable();
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error finalizing quote: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }
}
