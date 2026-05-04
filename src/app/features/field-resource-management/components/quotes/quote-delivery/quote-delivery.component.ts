import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import {
  BomLineItem,
  BomTotals,
  DeliveryRecord,
  LaborTotals,
  PriceSummary,
  QuoteWorkflow,
  WorkflowStatus
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import { QuoteAssemblyService } from '../../../services/quote-assembly.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * Quote Delivery Component
 *
 * Provides actions for delivering the finalized Quote Document to the customer:
 * - Export PDF: generates a downloadable PDF with company logo, project name,
 *   client name, date, Price Summary, SOW, and BOM.
 * - Send to Customer: opens an inline email composition form pre-populated with
 *   customer contact email from RFP_Record, default subject line containing
 *   project name, and Quote_Document PDF as attachment.
 * - Print: generates a print-friendly layout using window.print().
 * - After sending, dispatches deliverQuote action to record delivery timestamp
 *   and recipient email, updating status to Quote_Delivered.
 * - Displays delivery history (timestamp and recipient) when status is Quote_Delivered.
 *
 * Requirements: 7.1–7.6
 */
@Component({
  selector: 'app-quote-delivery',
  templateUrl: './quote-delivery.component.html',
  styleUrls: ['./quote-delivery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteDeliveryComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  isExporting = false;
  isSending = false;
  showEmailForm = false;

  emailForm!: FormGroup;

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
    private fb: FormBuilder,
    private bomCalculationService: BomCalculationService,
    private quoteAssemblyService: QuoteAssemblyService
  ) {}

  ngOnInit(): void {
    this.computeData();
    this.initEmailForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get isAssembled(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Quote_Assembled;
  }

  get isDelivered(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Quote_Delivered
      || this.quote?.workflowStatus === WorkflowStatus.Quote_Converted;
  }

  get deliveryRecord(): DeliveryRecord | null {
    return this.quote?.deliveryRecord ?? null;
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

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  private initEmailForm(): void {
    const customerEmail = this.rfpRecord?.customerContact?.email ?? '';
    const customerName = this.rfpRecord?.customerContact?.name ?? '';
    const projectName = this.rfpRecord?.projectName ?? '';

    this.emailForm = this.fb.group({
      recipientEmail: [customerEmail, [Validators.required, Validators.email]],
      recipientName: [customerName, [Validators.required]],
      subject: [`Quote for ${projectName}`, [Validators.required]],
      body: [
        `Dear ${customerName},\n\nPlease find attached the quote for ${projectName}.\n\nPlease review and let us know if you have any questions.\n\nBest regards`,
        [Validators.required]
      ],
      attachPdf: [true]
    });
  }

  private computeData(): void {
    this.computeBomData();
    this.computeLaborData();
    this.computePriceSummary();
  }

  private computeBomData(): void {
    if (!this.bom) return;

    const markupPercentage = this.markupPercentage;

    this.lineExtendedCosts = this.lineItems.map(item =>
      this.bomCalculationService.computeExtendedCost(item.quantity, item.unitCost)
    );

    this.lineMarkedUpCosts = this.lineExtendedCosts.map(extCost =>
      this.bomCalculationService.computeMarkedUpCost(extCost, markupPercentage)
    );

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
  // Export PDF Action (Requirement 7.1, 7.2)
  // ---------------------------------------------------------------------------

  onExportPdf(): void {
    if (this.isExporting || !this.quoteId) return;

    this.isExporting = true;

    this.quoteAssemblyService.exportPdf(this.quoteId)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isExporting = false;
          const projectName = this.rfpRecord?.projectName ?? 'Quote';
          const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Quote.pdf`;
          this.downloadBlob(blob, fileName);
          this.snackBar.open('PDF exported successfully.', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.isExporting = false;
          this.snackBar.open('Error exporting PDF. Please try again.', 'Close', { duration: 5000 });
        }
      });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------------
  // Send to Customer Action (Requirement 7.3, 7.4)
  // ---------------------------------------------------------------------------

  toggleEmailForm(): void {
    this.showEmailForm = !this.showEmailForm;
  }

  onSendToCustomer(): void {
    if (this.isSending || !this.quoteId || this.emailForm.invalid) return;

    this.isSending = true;

    const emailData = this.emailForm.value;

    this.store.dispatch(QuoteActions.deliverQuote({
      quoteId: this.quoteId,
      emailData
    }));

    this.actions$
      .pipe(
        ofType(QuoteActions.deliverQuoteSuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isSending = false;

        if (action.type === QuoteActions.deliverQuoteSuccess.type) {
          this.snackBar.open('Quote sent to customer successfully.', 'Close', { duration: 3000 });
          this.showEmailForm = false;
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error sending quote: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Print Action (Requirement 7.5)
  // ---------------------------------------------------------------------------

  onPrint(): void {
    window.print();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
