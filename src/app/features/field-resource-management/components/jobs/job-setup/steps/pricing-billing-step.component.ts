import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, AbstractControl, ValidatorFn, ValidationErrors, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Cross-field validator: ensures overtimeBillRate >= standardBillRate.
 * Applied at the FormGroup level so it can read both controls.
 */
export function overtimeRateValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const standard = group.get('standardBillRate');
    const overtime = group.get('overtimeBillRate');

    if (!standard || !overtime) {
      return null;
    }

    const stdVal = Number(standard.value);
    const otVal = Number(overtime.value);

    if (isNaN(stdVal) || isNaN(otVal) || stdVal <= 0 || otVal <= 0) {
      return null; // let individual field validators handle these
    }

    return otVal < stdVal
      ? { overtimeRateTooLow: { standardRate: stdVal, overtimeRate: otVal } }
      : null;
  };
}

/** Pattern: up to 2 decimal places, positive number */
const TWO_DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Pricing & Billing Step Component
 *
 * Second step of the Job Setup Workflow. Renders billing rate fields
 * and invoicing process selection using the FormGroup passed in from
 * the parent JobSetupComponent.
 *
 * Requirements: 4.1–4.6, 8.1–8.6
 */
@Component({
  selector: 'app-pricing-billing-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step-container" [formGroup]="formGroup">
      <!-- Bill Rates -->
      <h3 class="section-heading">Bill Rates</h3>

      <div class="form-row two-columns">
        <mat-form-field appearance="outline">
          <mat-label>Standard Bill Rate ($)</mat-label>
          <input matInput type="number" formControlName="standardBillRate" min="0.01" step="0.01" />
          <mat-error *ngIf="formGroup.get('standardBillRate')?.hasError('required')">Standard bill rate is required</mat-error>
          <mat-error *ngIf="formGroup.get('standardBillRate')?.hasError('min')">Must be at least $0.01</mat-error>
          <mat-error *ngIf="formGroup.get('standardBillRate')?.hasError('pattern')">Enter a valid amount (up to 2 decimal places)</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Overtime Bill Rate ($)</mat-label>
          <input matInput type="number" formControlName="overtimeBillRate" min="0.01" step="0.01" />
          <mat-error *ngIf="formGroup.get('overtimeBillRate')?.hasError('required')">Overtime bill rate is required</mat-error>
          <mat-error *ngIf="formGroup.get('overtimeBillRate')?.hasError('min')">Must be at least $0.01</mat-error>
          <mat-error *ngIf="formGroup.get('overtimeBillRate')?.hasError('pattern')">Enter a valid amount (up to 2 decimal places)</mat-error>
        </mat-form-field>
      </div>

      <mat-error *ngIf="formGroup.hasError('overtimeRateTooLow')" class="cross-field-error">
        Overtime bill rate must be greater than or equal to the standard bill rate
      </mat-error>

      <!-- Per Diem -->
      <h3 class="section-heading">Per Diem</h3>

      <mat-form-field appearance="outline">
        <mat-label>Per Diem Amount ($)</mat-label>
        <input matInput type="number" formControlName="perDiem" min="0" step="0.01" />
        <mat-error *ngIf="formGroup.get('perDiem')?.hasError('required')">Per diem amount is required</mat-error>
        <mat-error *ngIf="formGroup.get('perDiem')?.hasError('min')">Must be $0.00 or greater</mat-error>
        <mat-error *ngIf="formGroup.get('perDiem')?.hasError('pattern')">Enter a valid amount (up to 2 decimal places)</mat-error>
      </mat-form-field>

      <!-- Invoicing Process -->
      <h3 class="section-heading">Invoicing</h3>

      <mat-form-field appearance="outline">
        <mat-label>Invoicing Process</mat-label>
        <mat-select formControlName="invoicingProcess">
          <mat-option *ngFor="let opt of invoicingOptions" [value]="opt.value">{{ opt.label }}</mat-option>
        </mat-select>
        <mat-error *ngIf="formGroup.get('invoicingProcess')?.hasError('required')">Invoicing process is required</mat-error>
      </mat-form-field>

      <!-- Billing Summary -->
      <div class="billing-summary" *ngIf="hasBillingData">
        <h3 class="section-heading">Billing Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Standard Rate</span>
            <span class="summary-value">{{ formGroup.get('standardBillRate')?.value | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Overtime Rate</span>
            <span class="summary-value">{{ formGroup.get('overtimeBillRate')?.value | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Per Diem</span>
            <span class="summary-value">{{ formGroup.get('perDiem')?.value | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Invoicing</span>
            <span class="summary-value">{{ getInvoicingLabel() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .step-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px 0;
    }

    .section-heading {
      margin: 16px 0 8px;
      font-size: 16px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.7);
    }

    .section-heading:first-child {
      margin-top: 0;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .two-columns > * {
      flex: 1;
    }

    .cross-field-error {
      display: block;
      color: #f44336;
      font-size: 12px;
      margin: -8px 0 8px 0;
    }

    .billing-summary {
      margin-top: 16px;
      padding: 16px;
      background-color: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .billing-summary .section-heading {
      margin-top: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-label {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 500;
    }

    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PricingBillingStepComponent implements OnInit, OnDestroy {
  @Input() formGroup!: FormGroup;

  private destroy$ = new Subject<void>();

  /** Invoicing process dropdown options */
  invoicingOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'per-milestone', label: 'Per Milestone' },
    { value: 'upon-completion', label: 'Upon Completion' }
  ];

  ngOnInit(): void {
    this.setupValidators();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Whether enough billing data exists to show the summary section */
  get hasBillingData(): boolean {
    const std = this.formGroup.get('standardBillRate')?.value;
    const ot = this.formGroup.get('overtimeBillRate')?.value;
    const pd = this.formGroup.get('perDiem')?.value;
    return std != null && ot != null && pd != null && (std > 0 || ot > 0 || pd >= 0);
  }

  /** Get the display label for the selected invoicing process */
  getInvoicingLabel(): string {
    const value = this.formGroup.get('invoicingProcess')?.value;
    const match = this.invoicingOptions.find(o => o.value === value);
    return match ? match.label : '—';
  }

  /**
   * Attach validators to each control and the cross-field validator
   * to the FormGroup itself.
   */
  private setupValidators(): void {
    const controls = this.formGroup.controls;

    controls['standardBillRate']?.setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.pattern(TWO_DECIMAL_PATTERN)
    ]);

    controls['overtimeBillRate']?.setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.pattern(TWO_DECIMAL_PATTERN)
    ]);

    controls['perDiem']?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.pattern(TWO_DECIMAL_PATTERN)
    ]);

    controls['invoicingProcess']?.setValidators([Validators.required]);

    // Cross-field validator at the group level
    this.formGroup.setValidators(overtimeRateValidator());

    // Update validity after setting validators
    Object.keys(controls).forEach(key => controls[key].updateValueAndValidity());
    this.formGroup.updateValueAndValidity();
  }
}
