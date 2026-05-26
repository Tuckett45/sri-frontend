import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { JobSetupService } from '../../../services/job-setup.service';
import { JobDocumentImportService } from '../../../services/job-document-import.service';
import { JobSetupFormValue } from '../../../models/job-setup.models';
import {
  ImportDocumentDialogComponent,
  ImportDocumentDialogResult
} from './import-document-dialog/import-document-dialog.component';

export interface JobSetupStep {
  label: string;
  formGroupName: string;
  isValid: boolean;
}

/**
 * Job Setup Workflow — Parent Component
 *
 * Owns the master FormGroup with nested groups for each step,
 * manages step navigation, delegates to child step components,
 * handles draft persistence, and implements CanDeactivate for
 * unsaved-changes warnings.
 *
 * Requirements: 2.1–2.8, 10.1–10.4
 */
@Component({
  selector: 'app-job-setup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="job-setup-container">
      <div class="page-header">
        <h2 class="page-title">New Job Setup</h2>
        <button
          mat-stroked-button
          color="primary"
          class="import-btn"
          (click)="openImportDialog()"
          matTooltip="Import a job one-pager to auto-fill the form"
        >
          <mat-icon>upload_file</mat-icon>
          Import Documentation
        </button>
      </div>

      <!-- Step Indicator -->
      <div class="step-indicator">
        <div
          *ngFor="let step of steps; let i = index"
          class="step-item"
          [class.active]="i === currentStep"
          [class.completed]="i < currentStep"
        >
          <div class="step-number">{{ i + 1 }}</div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <div class="step-content" [formGroup]="form">
        <!-- Step 0: Customer Info -->
        <app-customer-info-step
          *ngIf="currentStep === 0"
          [formGroup]="customerInfoGroup"
        ></app-customer-info-step>

        <!-- Step 1: Pricing & Billing -->
        <app-pricing-billing-step
          *ngIf="currentStep === 1"
          [formGroup]="pricingBillingGroup"
        ></app-pricing-billing-step>

        <!-- Step 2: SRI Internal -->
        <app-sri-internal-step
          *ngIf="currentStep === 2"
          [formGroup]="sriInternalGroup"
        ></app-sri-internal-step>

        <!-- Step 3: Review -->
        <app-review-step
          *ngIf="currentStep === 3"
          [formValue]="formValue"
          [submitting]="submitting"
          [submitError]="submitError"
          (editSection)="goToStep($any($event))"
        ></app-review-step>
      </div>

      <!-- Navigation Buttons -->
      <div class="button-bar">
        <button mat-stroked-button type="button" (click)="cancel()">
          Cancel
        </button>

        <div class="spacer"></div>

        <button
          mat-stroked-button
          type="button"
          (click)="back()"
          [disabled]="currentStep === 0"
        >
          Back
        </button>

        <button
          *ngIf="currentStep < 3"
          mat-raised-button
          color="primary"
          type="button"
          (click)="next()"
        >
          Next
        </button>

        <button
          *ngIf="currentStep === 3"
          mat-raised-button
          color="primary"
          type="button"
          (click)="submit()"
          [disabled]="submitting"
        >
          Submit
        </button>
      </div>
    </div>
  `,
  styles: [`
    .job-setup-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .page-title {
      margin: 0 0 24px;
      font-size: 24px;
      font-weight: 500;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .page-header .page-title {
      margin: 0;
    }

    .import-btn mat-icon {
      margin-right: 4px;
    }

    /* Step Indicator */
    .step-indicator {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 0 8px;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .step-item.active,
    .step-item.completed {
      opacity: 1;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #e0e0e0;
      color: rgba(0, 0, 0, 0.54);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .step-item.active .step-number {
      background-color: #3f51b5;
      color: #fff;
    }

    .step-item.completed .step-number {
      background-color: #4caf50;
      color: #fff;
    }

    .step-label {
      font-size: 12px;
      text-align: center;
      color: rgba(0, 0, 0, 0.54);
    }

    .step-item.active .step-label {
      color: rgba(0, 0, 0, 0.87);
      font-weight: 500;
    }

    /* Content */
    .step-content {
      min-height: 300px;
    }

    /* Button Bar */
    .button-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      margin-top: 16px;
    }

    .spacer {
      flex: 1;
    }

    @media (max-width: 600px) {
      .step-label {
        display: none;
      }
    }

    ::ng-deep .mat-mdc-input-element {
      color: #000000 !important;
    }

    ::ng-deep .mat-mdc-select-value-text {
      color: #000000 !important;
    }

    ::ng-deep .mat-mdc-floating-label {
      color: rgba(0, 0, 0, 0.6) !important;
    }

    ::ng-deep .mat-mdc-slide-toggle .mdc-label,
    ::ng-deep .mat-mdc-slide-toggle label {
      color: #000000 !important;
    }
  `]
})
export class JobSetupComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  currentStep = 0;
  submitting = false;
  submitError: string | null = null;
  submitted = false;

  steps: JobSetupStep[] = [
    { label: 'Customer Info', formGroupName: 'customerInfo', isValid: false },
    { label: 'Pricing & Billing', formGroupName: 'pricingBilling', isValid: false },
    { label: 'SRI Internal', formGroupName: 'sriInternal', isValid: false },
    { label: 'Review', formGroupName: '', isValid: true }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private jobSetupService: JobSetupService,
    private importService: JobDocumentImportService,
    private cdr: ChangeDetectorRef
  ) {}

  // --- Convenience getters for nested FormGroups ---

  get customerInfoGroup(): FormGroup {
    return this.form.get('customerInfo') as FormGroup;
  }

  get pricingBillingGroup(): FormGroup {
    return this.form.get('pricingBilling') as FormGroup;
  }

  get sriInternalGroup(): FormGroup {
    return this.form.get('sriInternal') as FormGroup;
  }

  get formValue(): JobSetupFormValue {
    return this.form.getRawValue() as JobSetupFormValue;
  }

  // --- Lifecycle ---

  ngOnInit(): void {
    this.buildForm();
    this.restoreDraft();
    this.restoreImportedData();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- CanDeactivate ---

  canDeactivate(): boolean {
    if (this.form.dirty && !this.submitted) {
      return confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }

  // --- Navigation ---

  next(): void {
    if (this.currentStep >= 3) {
      return;
    }

    const stepGroup = this.getStepFormGroup(this.currentStep);
    if (stepGroup) {
      stepGroup.markAllAsTouched();
      if (stepGroup.invalid) {
        return;
      }
    }

    this.currentStep++;
    this.cdr.markForCheck();
  }

  back(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.cdr.markForCheck();
    }
  }

  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex <= 3) {
      this.currentStep = stepIndex;
      this.cdr.markForCheck();
    }
  }

  cancel(): void {
    this.jobSetupService.clearDraft();
    this.router.navigate(['/field-resource-management/jobs']);
  }

  /**
   * Opens the Import Document dialog. On successful parse, patches the form
   * with extracted data and shows a confirmation snackbar.
   */
  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportDocumentDialogComponent, {
      width: '520px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((result: ImportDocumentDialogResult | undefined) => {
      if (result?.parsed) {
        const formPatch = this.importService.mapToFormValue(result.parsed);
        this.form.patchValue(formPatch);
        this.form.markAsDirty();
        this.cdr.markForCheck();

        const fieldCount = this.countExtractedFields(formPatch);
        this.snackBar.open(
          `Imported ${fieldCount} field${fieldCount !== 1 ? 's' : ''} from document`,
          'OK',
          { duration: 4000 }
        );
      }
    });
  }

  submit(): void {
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.cdr.markForCheck();

    this.jobSetupService.submitJob(this.formValue).subscribe({
      next: (job) => {
        this.submitted = true;
        this.submitting = false;
        this.cdr.markForCheck();
        this.router.navigate(['/field-resource-management/jobs', job.id]);
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.message || 'Unable to reach server. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  // --- Private helpers ---

  private buildForm(): void {
    this.form = this.fb.group({
      customerInfo: this.fb.group({
        clientName: [''],
        siteName: [''],
        street: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        pocName: [''],
        pocPhone: [''],
        pocEmail: [''],
        targetStartDate: [''],
        authorizationStatus: [''],
        hasPurchaseOrders: [false],
        purchaseOrderNumber: ['']
      }),
      pricingBilling: this.fb.group({
        standardBillRate: [null],
        overtimeBillRate: [null],
        perDiem: [null],
        invoicingProcess: ['']
      }),
      sriInternal: this.fb.group({
        projectDirector: [''],
        targetResources: [null],
        bizDevContact: [''],
        requestedHours: [null],
        overtimeRequired: [false],
        estimatedOvertimeHours: [null]
      })
    });
  }

  private restoreDraft(): void {
    const draft = this.jobSetupService.restoreDraft();
    if (draft) {
      this.form.patchValue(draft.formValue);
      this.currentStep = draft.currentStep;
      this.cdr.markForCheck();
    }
  }

  private setupAutoSave(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.jobSetupService.saveDraft(this.formValue, this.currentStep);
      });
  }

  /**
   * Checks for imported document data in session storage (set by the job-list Import flow).
   * If found, patches the form and clears the stored data.
   */
  private restoreImportedData(): void {
    try {
      const raw = sessionStorage.getItem('frm_job_import_data');
      if (raw) {
        const importedPatch = JSON.parse(raw);
        this.form.patchValue(importedPatch);
        this.form.markAsDirty();
        sessionStorage.removeItem('frm_job_import_data');
        this.cdr.markForCheck();
      }
    } catch (e) {
      console.warn('JobSetupComponent: failed to restore imported data', e);
    }
  }

  private getStepFormGroup(stepIndex: number): FormGroup | null {
    const name = this.steps[stepIndex]?.formGroupName;
    if (!name) {
      return null;
    }
    return this.form.get(name) as FormGroup;
  }

  /**
   * Counts the number of non-empty fields in a partial form value.
   */
  private countExtractedFields(patch: Partial<JobSetupFormValue>): number {
    let count = 0;
    for (const section of Object.values(patch)) {
      if (section && typeof section === 'object') {
        for (const value of Object.values(section)) {
          if (value != null && value !== '') {
            count++;
          }
        }
      }
    }
    return count;
  }
}
