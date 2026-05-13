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
  JobSummaryData,
  LaborLineItem,
  LaborTotals,
  QuoteWorkflow
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import { QuoteWorkflowService } from '../../../services/quote-workflow.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * Job Summary Form Component
 *
 * Reactive form for capturing labor hour estimates based on the RFP.
 * Pre-populates project name, site name, and scope of work from the RFP_Record.
 * Supports repeatable labor line items via FormArray with running totals.
 *
 * Features:
 * - Pre-population from RFP data
 * - FormArray for labor line items (task description, labor category, hours, rate)
 * - Running totals computed via BomCalculationService.computeLaborTotal
 * - Draft auto-save (debounced 3s) with restore on init
 * - Read-only mode when canEdit is false
 * - Save and Mark Complete actions
 *
 * Requirements: 3.1–3.8, 13.1–13.5, 14.1–14.4
 */
@Component({
  selector: 'app-job-summary-form',
  templateUrl: './job-summary-form.component.html',
  styleUrls: ['./job-summary-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobSummaryFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() canEdit = true;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  jobSummaryForm!: FormGroup;
  isSaving = false;
  isCompleting = false;
  draftRestored = false;

  // Running totals
  laborTotals: LaborTotals = { totalHours: 0, totalCost: 0 };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private bomCalculationService: BomCalculationService,
    private quoteWorkflowService: QuoteWorkflowService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.prePopulateFromRfp();
    this.prePopulateFromJobSummary();
    this.restoreDraft();
    this.setupDraftAutoSave();
    this.setupRunningTotals();

    if (!this.canEdit) {
      this.jobSummaryForm.disable();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canEdit'] && this.jobSummaryForm) {
      if (this.canEdit) {
        this.jobSummaryForm.enable();
      } else {
        this.jobSummaryForm.disable();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Form Initialization
  // ---------------------------------------------------------------------------

  private initializeForm(): void {
    this.jobSummaryForm = this.fb.group({
      projectName: [{ value: '', disabled: true }],
      siteName: [{ value: '', disabled: true }],
      scopeOfWork: [{ value: '', disabled: true }],
      totalEstimatedHours: [null, [Validators.required, Validators.min(0.01)]],
      laborLineItems: this.fb.array([])
    });
  }

  // ---------------------------------------------------------------------------
  // Pre-population
  // ---------------------------------------------------------------------------

  private prePopulateFromRfp(): void {
    if (!this.quote?.rfpRecord) return;

    this.jobSummaryForm.patchValue({
      projectName: this.quote.rfpRecord.projectName,
      siteName: this.quote.rfpRecord.siteName,
      scopeOfWork: this.quote.rfpRecord.scopeOfWork
    });
  }

  private prePopulateFromJobSummary(): void {
    if (!this.quote?.jobSummary) return;

    const js = this.quote.jobSummary;
    this.jobSummaryForm.patchValue({
      totalEstimatedHours: js.totalEstimatedHours
    });

    // Clear existing line items and add from saved data
    this.laborLineItems.clear();
    js.laborLineItems.forEach(item => {
      this.laborLineItems.push(this.createLaborLineItem(item));
    });

    this.recalculateTotals();
  }

  // ---------------------------------------------------------------------------
  // Labor Line Items (FormArray)
  // ---------------------------------------------------------------------------

  get laborLineItems(): FormArray {
    return this.jobSummaryForm.get('laborLineItems') as FormArray;
  }

  addLaborLineItem(): void {
    this.laborLineItems.push(this.createLaborLineItem());
  }

  removeLaborLineItem(index: number): void {
    this.laborLineItems.removeAt(index);
    this.recalculateTotals();
  }

  private createLaborLineItem(item?: Partial<LaborLineItem>): FormGroup {
    return this.fb.group({
      id: [item?.id || this.generateId()],
      taskDescription: [item?.taskDescription || '', [Validators.required, Validators.maxLength(500)]],
      laborCategory: [item?.laborCategory || '', [Validators.required, Validators.maxLength(100)]],
      estimatedHours: [item?.estimatedHours || null, [Validators.required, Validators.min(0.01)]],
      hourlyRate: [item?.hourlyRate || null, [Validators.required, Validators.min(0.01)]]
    });
  }

  private generateId(): string {
    return 'labor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  // ---------------------------------------------------------------------------
  // Running Totals
  // ---------------------------------------------------------------------------

  private setupRunningTotals(): void {
    this.laborLineItems.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateTotals());
  }

  private recalculateTotals(): void {
    const lineItems: LaborLineItem[] = this.laborLineItems.getRawValue().map((item: any) => ({
      id: item.id,
      taskDescription: item.taskDescription,
      laborCategory: item.laborCategory,
      estimatedHours: Number(item.estimatedHours) || 0,
      hourlyRate: Number(item.hourlyRate) || 0
    }));

    this.laborTotals = this.bomCalculationService.computeLaborTotal(lineItems);
  }

  // ---------------------------------------------------------------------------
  // Draft Auto-Save & Restore
  // ---------------------------------------------------------------------------

  private setupDraftAutoSave(): void {
    this.jobSummaryForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(3000)
      )
      .subscribe(formValue => {
        if (this.canEdit) {
          this.quoteWorkflowService.saveDraft(this.quoteId, 'jobSummary', formValue);
        }
      });
  }

  private restoreDraft(): void {
    const draft = this.quoteWorkflowService.restoreDraft(this.quoteId, 'jobSummary');
    if (draft) {
      // Restore scalar fields
      if (draft.totalEstimatedHours != null) {
        this.jobSummaryForm.patchValue({
          totalEstimatedHours: draft.totalEstimatedHours
        });
      }

      // Restore labor line items
      if (draft.laborLineItems && Array.isArray(draft.laborLineItems)) {
        this.laborLineItems.clear();
        draft.laborLineItems.forEach((item: any) => {
          this.laborLineItems.push(this.createLaborLineItem(item));
        });
        this.recalculateTotals();
      }

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
    this.quoteWorkflowService.clearDraft(this.quoteId, 'jobSummary');
    this.draftRestored = false;

    // Reload last saved state from the store
    this.jobSummaryForm.patchValue({
      totalEstimatedHours: null
    });
    this.laborLineItems.clear();

    // Re-populate from the store's saved data
    this.prePopulateFromJobSummary();

    this.snackBar.open('Draft discarded', 'Close', { duration: 3000 });
  }

  // ---------------------------------------------------------------------------
  // Form Submission
  // ---------------------------------------------------------------------------

  onSave(): void {
    if (this.isSaving || !this.quoteId) return;

    // Mark all fields as touched to show validation errors
    this.markFormGroupTouched(this.jobSummaryForm);

    this.isSaving = true;

    const data = this.buildJobSummaryData(false);
    this.store.dispatch(QuoteActions.saveJobSummary({ quoteId: this.quoteId, data }));

    this.actions$
      .pipe(
        ofType(QuoteActions.saveJobSummarySuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isSaving = false;

        if (action.type === QuoteActions.saveJobSummarySuccess.type) {
          this.quoteWorkflowService.clearDraft(this.quoteId, 'jobSummary');
          this.snackBar.open('Job summary saved successfully', 'Close', { duration: 3000 });
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error saving job summary: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  onMarkComplete(): void {
    // Mark all fields as touched to show validation errors
    this.markFormGroupTouched(this.jobSummaryForm);

    // Validate at least one line item
    if (this.laborLineItems.length === 0) {
      this.snackBar.open('At least one labor line item is required', 'Close', { duration: 3000 });
      return;
    }

    // Validate total hours > 0
    const totalHours = this.jobSummaryForm.get('totalEstimatedHours')?.value;
    if (!totalHours || totalHours <= 0) {
      this.snackBar.open('Total estimated hours must be greater than zero', 'Close', { duration: 3000 });
      return;
    }

    // Validate form
    if (this.jobSummaryForm.invalid) {
      this.snackBar.open('Please fix form errors before completing', 'Close', { duration: 3000 });
      return;
    }

    if (this.isCompleting || !this.quoteId) return;
    this.isCompleting = true;

    this.store.dispatch(QuoteActions.completeJobSummary({ quoteId: this.quoteId }));

    this.actions$
      .pipe(
        ofType(QuoteActions.completeJobSummarySuccess, QuoteActions.quoteOperationFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isCompleting = false;

        if (action.type === QuoteActions.completeJobSummarySuccess.type) {
          this.quoteWorkflowService.clearDraft(this.quoteId, 'jobSummary');
          this.snackBar.open('Job summary marked as complete', 'Close', { duration: 3000 });
        } else {
          const error = (action as ReturnType<typeof QuoteActions.quoteOperationFailure>).error;
          this.snackBar.open(`Error completing job summary: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildJobSummaryData(isComplete: boolean): JobSummaryData {
    const formValue = this.jobSummaryForm.getRawValue();
    const lineItems: LaborLineItem[] = formValue.laborLineItems.map((item: any) => ({
      id: item.id,
      taskDescription: item.taskDescription,
      laborCategory: item.laborCategory,
      estimatedHours: Number(item.estimatedHours) || 0,
      hourlyRate: Number(item.hourlyRate) || 0
    }));

    return {
      projectName: formValue.projectName,
      siteName: formValue.siteName,
      scopeOfWork: formValue.scopeOfWork,
      totalEstimatedHours: Number(formValue.totalEstimatedHours) || 0,
      laborLineItems: lineItems,
      totalLaborCost: this.laborTotals.totalCost,
      isComplete
    };
  }

  hasError(path: string, errorType: string): boolean {
    const control = this.jobSummaryForm.get(path);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getErrorMessage(path: string): string {
    const control = this.jobSummaryForm.get(path);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid value';
  }

  hasLineItemError(index: number, field: string, errorType: string): boolean {
    const control = this.laborLineItems.at(index)?.get(field);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getLineItemErrorMessage(index: number, field: string): string {
    const control = this.laborLineItems.at(index)?.get(field);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid value';
  }

  getControl(path: string) {
    return this.jobSummaryForm.get(path);
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
