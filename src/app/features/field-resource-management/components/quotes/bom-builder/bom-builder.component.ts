import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  BomData,
  BomLineItem,
  BomTotals,
  ClientConfiguration,
  QuoteWorkflow
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import { ClientConfigurationService } from '../../../services/client-configuration.service';
import { QuoteWorkflowService } from '../../../services/quote-workflow.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * BOM Builder Component
 *
 * Reactive form for building a Bill of Materials with supplier pricing,
 * configurable markup, tax, freight, and customer-facing preview.
 *
 * Features:
 * - FormArray for BOM line items (material description, quantity, UoM, unit cost, supplier)
 * - Extended cost and marked-up cost computed per line item via BomCalculationService
 * - Configurable markup percentage (defaults to 10% or client config)
 * - Tax and freight fields with customer-facing visibility toggle
 * - Subtotal and grand total computed via BomCalculationService
 * - Customer-facing BOM preview panel respecting visibility toggle
 * - Draft auto-save (debounced 3s) with restore on init
 * - Read-only mode when canEdit is false
 * - Save and Mark Complete actions
 *
 * Requirements: 4.1–4.12, 11.2, 13.1–13.5, 14.1–14.4
 */
@Component({
  selector: 'app-bom-builder',
  templateUrl: './bom-builder.component.html',
  styleUrls: ['./bom-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BomBuilderComponent implements OnInit, OnDestroy, OnChanges {
  @Input() canEdit = true;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  bomForm!: FormGroup;
  isSaving = false;
  isCompleting = false;
  draftRestored = false;

  // Computed totals
  bomTotals: BomTotals = { subtotal: 0, tax: 0, freight: 0, grandTotal: 0 };

  // Per-line computed costs
  lineExtendedCosts: number[] = [];
  lineMarkedUpCosts: number[] = [];

  private clientConfig: ClientConfiguration | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private bomCalculationService: BomCalculationService,
    private clientConfigurationService: ClientConfigurationService,
    private quoteWorkflowService: QuoteWorkflowService
  ) {}

  ngOnInit(): void {
    this.loadClientConfiguration();
    this.initializeForm();
    this.prePopulateFromBom();
    this.restoreDraft();
    this.setupDraftAutoSave();
    this.setupTotalsRecalculation();

    if (!this.canEdit) {
      this.bomForm.disable();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canEdit'] && this.bomForm) {
      if (this.canEdit) {
        this.bomForm.enable();
      } else {
        this.bomForm.disable();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Client Configuration
  // ---------------------------------------------------------------------------

  private loadClientConfiguration(): void {
    // Try to load from the quote's stored BOM config first, then from client config service
    if (this.quote?.bom) {
      // Use the config already stored on the BOM
      this.clientConfig = null; // BOM already has its own settings
      return;
    }

    if (this.quote?.rfpRecord?.clientName) {
      this.clientConfigurationService
        .getClientConfiguration(this.quote.rfpRecord.clientName)
        .pipe(take(1), takeUntil(this.destroy$))
        .subscribe({
          next: (config) => {
            this.clientConfig = config;
            this.applyClientConfigDefaults();
          },
          error: () => {
            // Use defaults when no config exists for this client
            this.clientConfig = this.clientConfigurationService.getDefaultConfiguration();
            this.applyClientConfigDefaults();
          }
        });
    } else {
      this.clientConfig = this.clientConfigurationService.getDefaultConfiguration();
    }
  }

  private applyClientConfigDefaults(): void {
    if (!this.clientConfig || !this.bomForm) return;

    // Only apply defaults if the form hasn't been populated from existing BOM data
    if (!this.quote?.bom) {
      this.bomForm.patchValue({
        markupPercentage: this.clientConfig.defaultMarkupPercentage,
        taxFreightVisible: this.clientConfig.taxFreightVisible
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Form Initialization
  // ---------------------------------------------------------------------------

  private initializeForm(): void {
    const defaultMarkup = this.clientConfig?.defaultMarkupPercentage ?? 10;
    const defaultTaxFreightVisible = this.clientConfig?.taxFreightVisible ?? true;

    this.bomForm = this.fb.group({
      lineItems: this.fb.array([]),
      markupPercentage: [
        defaultMarkup,
        [Validators.required, Validators.min(0), Validators.max(100)]
      ],
      tax: [0, [Validators.required, Validators.min(0)]],
      freight: [0, [Validators.required, Validators.min(0)]],
      taxFreightVisible: [defaultTaxFreightVisible]
    });
  }

  // ---------------------------------------------------------------------------
  // Pre-population from existing BOM data
  // ---------------------------------------------------------------------------

  private prePopulateFromBom(): void {
    if (!this.quote?.bom) return;

    const bom = this.quote.bom;
    this.bomForm.patchValue({
      markupPercentage: bom.markupPercentage,
      tax: bom.tax,
      freight: bom.freight,
      taxFreightVisible: bom.taxFreightVisible
    });

    // Clear existing line items and add from saved data
    this.lineItems.clear();
    bom.lineItems.forEach(item => {
      this.lineItems.push(this.createLineItem(item));
    });

    this.recalculateTotals();
  }

  // ---------------------------------------------------------------------------
  // BOM Line Items (FormArray)
  // ---------------------------------------------------------------------------

  get lineItems(): FormArray {
    return this.bomForm.get('lineItems') as FormArray;
  }

  addLineItem(): void {
    this.lineItems.push(this.createLineItem());
    this.recalculateTotals();
  }

  removeLineItem(index: number): void {
    this.lineItems.removeAt(index);
    this.recalculateTotals();
  }

  private createLineItem(item?: Partial<BomLineItem>): FormGroup {
    return this.fb.group({
      id: [item?.id || this.generateId()],
      materialDescription: [
        item?.materialDescription || '',
        [Validators.required, Validators.maxLength(500)]
      ],
      quantity: [
        item?.quantity || null,
        [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]
      ],
      unitOfMeasure: [
        item?.unitOfMeasure || '',
        [Validators.required, Validators.maxLength(50)]
      ],
      unitCost: [
        item?.unitCost || null,
        [Validators.required, Validators.min(0.01)]
      ],
      supplierName: [
        item?.supplierName || '',
        [Validators.required, Validators.maxLength(200)]
      ]
    });
  }

  private generateId(): string {
    return 'bom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  // ---------------------------------------------------------------------------
  // Computed Costs per Line Item
  // ---------------------------------------------------------------------------

  getExtendedCost(index: number): number {
    return this.lineExtendedCosts[index] || 0;
  }

  getMarkedUpCost(index: number): number {
    return this.lineMarkedUpCosts[index] || 0;
  }

  // ---------------------------------------------------------------------------
  // Totals Recalculation
  // ---------------------------------------------------------------------------

  private setupTotalsRecalculation(): void {
    // Recalculate when line items change
    this.lineItems.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateTotals());

    // Recalculate when markup, tax, or freight change
    this.bomForm.get('markupPercentage')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateTotals());

    this.bomForm.get('tax')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateTotals());

    this.bomForm.get('freight')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateTotals());
  }

  private recalculateTotals(): void {
    const rawItems = this.lineItems.getRawValue();
    const markupPercentage = Number(this.bomForm.get('markupPercentage')?.value) || 0;
    const tax = Number(this.bomForm.get('tax')?.value) || 0;
    const freight = Number(this.bomForm.get('freight')?.value) || 0;

    // Compute per-line costs
    this.lineExtendedCosts = rawItems.map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.unitCost) || 0;
      return this.bomCalculationService.computeExtendedCost(qty, cost);
    });

    this.lineMarkedUpCosts = this.lineExtendedCosts.map(extCost =>
      this.bomCalculationService.computeMarkedUpCost(extCost, markupPercentage)
    );

    // Build BomLineItem array for subtotal computation
    const lineItemsForCalc: BomLineItem[] = rawItems.map((item: any) => ({
      id: item.id,
      materialDescription: item.materialDescription,
      quantity: Number(item.quantity) || 0,
      unitOfMeasure: item.unitOfMeasure,
      unitCost: Number(item.unitCost) || 0,
      supplierName: item.supplierName,
      extendedCost: 0,
      markedUpCost: 0
    }));

    this.bomTotals = this.bomCalculationService.computeBomTotals(
      lineItemsForCalc,
      markupPercentage,
      tax,
      freight
    );
  }

  // ---------------------------------------------------------------------------
  // Tax/Freight Visibility
  // ---------------------------------------------------------------------------

  get taxFreightVisible(): boolean {
    return this.bomForm.get('taxFreightVisible')?.value ?? true;
  }

  // ---------------------------------------------------------------------------
  // Draft Auto-Save & Restore
  // ---------------------------------------------------------------------------

  private setupDraftAutoSave(): void {
    this.bomForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(3000)
      )
      .subscribe(formValue => {
        if (this.canEdit) {
          this.quoteWorkflowService.saveDraft(this.quoteId, 'bom', formValue);
        }
      });
  }

  private restoreDraft(): void {
    const draft = this.quoteWorkflowService.restoreDraft(this.quoteId, 'bom');
    if (draft) {
      // Restore scalar fields
      this.bomForm.patchValue({
        markupPercentage: draft.markupPercentage ?? this.bomForm.get('markupPercentage')?.value,
        tax: draft.tax ?? this.bomForm.get('tax')?.value,
        freight: draft.freight ?? this.bomForm.get('freight')?.value,
        taxFreightVisible: draft.taxFreightVisible ?? this.bomForm.get('taxFreightVisible')?.value
      });

      // Restore line items
      if (draft.lineItems && Array.isArray(draft.lineItems)) {
        this.lineItems.clear();
        draft.lineItems.forEach((item: any) => {
          this.lineItems.push(this.createLineItem(item));
        });
      }

      this.recalculateTotals();
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
    this.quoteWorkflowService.clearDraft(this.quoteId, 'bom');
    this.draftRestored = false;

    // Reload last saved state from the store
    this.bomForm.patchValue({
      markupPercentage: this.clientConfig?.defaultMarkupPercentage ?? 10,
      tax: 0,
      freight: 0,
      taxFreightVisible: this.clientConfig?.taxFreightVisible ?? true
    });
    this.lineItems.clear();

    // Re-populate from the store's saved BOM data
    this.prePopulateFromBom();

    this.snackBar.open('Draft discarded', 'Close', { duration: 3000 });
  }

  // ---------------------------------------------------------------------------
  // Form Submission
  // ---------------------------------------------------------------------------

  onSave(): void {
    if (this.isSaving || !this.quoteId) return;

    // Mark all fields as touched to show validation errors
    this.markFormGroupTouched(this.bomForm);

    this.isSaving = true;

    const data = this.buildBomData(false);
    this.store.dispatch(QuoteActions.saveBom({ quoteId: this.quoteId, data }));

    this.actions$
      .pipe(
        ofType(QuoteActions.saveBomSuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isSaving = false;

        if (action.type === QuoteActions.saveBomSuccess.type) {
          this.quoteWorkflowService.clearDraft(this.quoteId, 'bom');
          this.snackBar.open('BOM saved successfully', 'Close', { duration: 3000 });
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error saving BOM: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  onMarkComplete(): void {
    // Mark all fields as touched to show validation errors
    this.markFormGroupTouched(this.bomForm);

    // Validate at least one line item
    if (this.lineItems.length === 0) {
      this.snackBar.open('At least one BOM line item is required', 'Close', { duration: 3000 });
      return;
    }

    // Validate form
    if (this.bomForm.invalid) {
      this.snackBar.open('Please fix form errors before completing', 'Close', { duration: 3000 });
      return;
    }

    if (this.isCompleting || !this.quoteId) return;
    this.isCompleting = true;

    this.store.dispatch(QuoteActions.completeBom({ quoteId: this.quoteId }));

    this.actions$
      .pipe(
        ofType(QuoteActions.completeBomSuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isCompleting = false;

        if (action.type === QuoteActions.completeBomSuccess.type) {
          this.quoteWorkflowService.clearDraft(this.quoteId, 'bom');
          this.snackBar.open('BOM marked as complete', 'Close', { duration: 3000 });
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error completing BOM: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildBomData(isComplete: boolean): BomData {
    const formValue = this.bomForm.getRawValue();
    const markupPercentage = Number(formValue.markupPercentage) || 0;

    const lineItems: BomLineItem[] = formValue.lineItems.map((item: any, index: number) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const extendedCost = this.bomCalculationService.computeExtendedCost(quantity, unitCost);
      const markedUpCost = this.bomCalculationService.computeMarkedUpCost(extendedCost, markupPercentage);

      return {
        id: item.id,
        materialDescription: item.materialDescription,
        quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitCost,
        supplierName: item.supplierName,
        extendedCost,
        markedUpCost
      };
    });

    return {
      lineItems,
      markupPercentage,
      tax: Number(formValue.tax) || 0,
      freight: Number(formValue.freight) || 0,
      taxFreightVisible: formValue.taxFreightVisible,
      totals: this.bomTotals,
      isComplete
    };
  }

  hasError(path: string, errorType: string): boolean {
    const control = this.bomForm.get(path);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getErrorMessage(path: string): string {
    const control = this.bomForm.get(path);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;
    if (control.hasError('max')) return `Maximum value is ${control.errors['max'].max}`;
    if (control.hasError('pattern')) return 'Must be a whole number';

    return 'Invalid value';
  }

  hasLineItemError(index: number, field: string, errorType: string): boolean {
    const control = this.lineItems.at(index)?.get(field);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getLineItemErrorMessage(index: number, field: string): string {
    const control = this.lineItems.at(index)?.get(field);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;
    if (control.hasError('pattern')) return 'Must be a whole number';

    return 'Invalid value';
  }

  getControl(path: string) {
    return this.bomForm.get(path);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = (formGroup as any).get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
