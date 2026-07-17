import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, AbstractControl, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Customer Info Step Component
 *
 * First step of the Job Setup Workflow. Renders customer and jobsite
 * detail fields using the FormGroup passed in from the parent
 * JobSetupComponent.
 *
 * Requirements: 3.1-3.10, 8.1-8.6
 */
@Component({
  selector: 'app-customer-info-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step-container" [formGroup]="formGroup">
      <!-- Client & Site -->
      <h3 class="section-heading">Client Details</h3>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Client Name</mat-label>
        <input matInput formControlName="clientName" maxlength="200" />
        <mat-hint align="end">{{ formGroup.get('clientName')?.value?.length || 0 }} / 200</mat-hint>
        <mat-error *ngIf="formGroup.get('clientName')?.hasError('required')">Client name is required</mat-error>
        <mat-error *ngIf="formGroup.get('clientName')?.hasError('maxlength')">Maximum 200 characters</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Site Name</mat-label>
        <input matInput formControlName="siteName" maxlength="200" />
        <mat-hint align="end">{{ formGroup.get('siteName')?.value?.length || 0 }} / 200</mat-hint>
        <mat-error *ngIf="formGroup.get('siteName')?.hasError('required')">Site name is required</mat-error>
        <mat-error *ngIf="formGroup.get('siteName')?.hasError('maxlength')">Maximum 200 characters</mat-error>
      </mat-form-field>

      <!-- Site Address -->
      <h3 class="section-heading">Site Address</h3>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Street Address</mat-label>
        <input matInput formControlName="street" />
        <mat-error *ngIf="formGroup.get('street')?.hasError('required')">Street address is required</mat-error>
      </mat-form-field>

      <div class="form-row three-columns">
        <mat-form-field appearance="outline">
          <mat-label>City</mat-label>
          <input matInput formControlName="city" />
          <mat-error *ngIf="formGroup.get('city')?.hasError('required')">City is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>State</mat-label>
          <mat-select formControlName="state">
            <mat-option *ngFor="let s of states" [value]="s">{{ s }}</mat-option>
          </mat-select>
          <mat-error *ngIf="formGroup.get('state')?.hasError('required')">State is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Zip Code</mat-label>
          <input matInput formControlName="zipCode" />
          <mat-error *ngIf="formGroup.get('zipCode')?.hasError('required')">Zip code is required</mat-error>
        </mat-form-field>
      </div>

      <!-- Point of Contact -->
      <h3 class="section-heading">Primary Point of Contact</h3>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Contact Name</mat-label>
        <input matInput formControlName="pocName" />
        <mat-error *ngIf="formGroup.get('pocName')?.hasError('required')">Contact name is required</mat-error>
      </mat-form-field>

      <div class="form-row two-columns">
        <mat-form-field appearance="outline">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="pocPhone" placeholder="1234567890" />
          <mat-error *ngIf="formGroup.get('pocPhone')?.hasError('required')">Phone number is required</mat-error>
          <mat-error *ngIf="formGroup.get('pocPhone')?.hasError('pattern')">Must be a 10-digit US phone number</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email Address</mat-label>
          <input matInput formControlName="pocEmail" type="email" />
          <mat-error *ngIf="formGroup.get('pocEmail')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="formGroup.get('pocEmail')?.hasError('email')">Enter a valid email address</mat-error>
        </mat-form-field>
      </div>

      <!-- Target Start Date -->
      <h3 class="section-heading">Schedule</h3>

      <mat-form-field appearance="outline">
        <mat-label>Target Start Date</mat-label>
        <input matInput [matDatepicker]="startDatePicker" formControlName="targetStartDate" />
        <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
        <mat-datepicker #startDatePicker></mat-datepicker>
        <mat-error *ngIf="formGroup.get('targetStartDate')?.hasError('required')">Start date is required</mat-error>
      </mat-form-field>

      <!-- Past date warning banner (shown after user confirms) -->
      <div class="past-date-warning" *ngIf="showPastDateWarning">
        <mat-icon>warning</mat-icon>
        <span>This start date is in the past.</span>
      </div>

      <!-- Authorization & Purchase Orders -->
      <h3 class="section-heading">Authorization</h3>

      <mat-form-field appearance="outline">
        <mat-label>Authorization Status</mat-label>
        <mat-select formControlName="authorizationStatus">
          <mat-option value="authorized">Authorized</mat-option>
          <mat-option value="pending">Pending Authorization</mat-option>
        </mat-select>
        <mat-error *ngIf="formGroup.get('authorizationStatus')?.hasError('required')">Authorization status is required</mat-error>
      </mat-form-field>

      <div class="toggle-row">
        <mat-slide-toggle formControlName="hasPurchaseOrders" color="primary">
          Client will work off purchase orders
        </mat-slide-toggle>
      </div>

      <mat-form-field appearance="outline" class="full-width" *ngIf="formGroup.get('hasPurchaseOrders')?.value">
        <mat-label>Purchase Order Number</mat-label>
        <input matInput formControlName="purchaseOrderNumber" />
        <mat-error *ngIf="formGroup.get('purchaseOrderNumber')?.hasError('required')">Purchase order number is required</mat-error>
      </mat-form-field>
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

    .full-width {
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .two-columns > * {
      flex: 1;
    }

    .three-columns > * {
      flex: 1;
    }

    .toggle-row {
      margin: 8px 0 16px;
    }

    .past-date-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #fff3e0;
      border: 1px solid #ffb74d;
      border-radius: 4px;
      color: #e65100;
      font-size: 13px;
      margin-top: -4px;
    }

    .past-date-warning mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #f57c00;
    }

    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }
    }
  `]
})
export class CustomerInfoStepComponent implements OnInit, OnDestroy {
  @Input() formGroup!: FormGroup;

  private destroy$ = new Subject<void>();

  /** Whether to show the past-date warning banner below the date field */
  showPastDateWarning = false;

  /**
   * Tracks the previous date value so we only prompt once per change
   * (avoids re-prompting on programmatic patches like draft restore).
   */
  private previousDateValue: string | null = null;

  /**
   * When true, skip the confirmation prompt (used during initial load
   * so pre-populated past dates don't trigger an alert).
   */
  private suppressPrompt = true;

  /** US state abbreviations for the state dropdown */
  states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  constructor(
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupValidators();
    this.watchPurchaseOrderToggle();
    this.watchTargetStartDate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Attach validators to each control in the FormGroup.
   * The parent creates the FormGroup structure; this component
   * owns the validation rules for its step.
   */
  private setupValidators(): void {
    const controls = this.formGroup.controls;

    controls['clientName']?.setValidators([Validators.required, Validators.maxLength(200)]);
    controls['siteName']?.setValidators([Validators.required, Validators.maxLength(200)]);
    controls['street']?.setValidators([Validators.required]);
    controls['city']?.setValidators([Validators.required]);
    controls['state']?.setValidators([Validators.required]);
    controls['zipCode']?.setValidators([Validators.required]);
    controls['pocName']?.setValidators([Validators.required]);
    controls['pocPhone']?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
    controls['pocEmail']?.setValidators([Validators.required, Validators.email]);
    controls['targetStartDate']?.setValidators([Validators.required]);
    controls['authorizationStatus']?.setValidators([Validators.required]);
    controls['hasPurchaseOrders']?.setValidators([Validators.required]);

    // Update validity after setting validators
    Object.keys(controls).forEach(key => controls[key].updateValueAndValidity());
  }

  /**
   * Watch the targetStartDate control for changes. When the user picks
   * a date in the past, show a confirmation prompt. If they decline,
   * clear the date. If they confirm, show a warning banner.
   */
  private watchTargetStartDate(): void {
    const dateControl = this.formGroup.get('targetStartDate');
    if (!dateControl) return;

    // Capture the initial value so we don't prompt on load
    this.previousDateValue = dateControl.value;

    // Evaluate whether to show the warning for the initial value (no prompt)
    this.showPastDateWarning = this.isDateInPast(dateControl.value);

    // Allow prompt after a short delay so that any programmatic patches
    // (draft restore, import) that happen during init don't trigger it.
    setTimeout(() => {
      this.suppressPrompt = false;
    }, 500);

    dateControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        // If value hasn't actually changed (e.g. re-patch), skip
        if (this.normalizeDateStr(value) === this.normalizeDateStr(this.previousDateValue)) {
          return;
        }

        this.previousDateValue = value;

        if (this.isDateInPast(value)) {
          if (this.suppressPrompt) {
            // Still in initialization — just show the warning, no prompt
            this.showPastDateWarning = true;
            this.cdr.markForCheck();
            return;
          }

          // Ask user to confirm the past date
          const confirmed = confirm(
            'The selected start date is in the past. Are you sure you want to use this date?'
          );

          if (confirmed) {
            this.showPastDateWarning = true;
            this.cdr.markForCheck();
          } else {
            // User declined — clear the date
            dateControl.setValue('', { emitEvent: false });
            this.previousDateValue = '';
            this.showPastDateWarning = false;
            this.cdr.markForCheck();
          }
        } else {
          // Date is today or in the future — no warning needed
          this.showPastDateWarning = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Check if a date value is in the past (before today).
   */
  private isDateInPast(value: any): boolean {
    if (!value) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(value);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }

  /**
   * Normalize a date value to a comparable string (YYYY-MM-DD).
   */
  private normalizeDateStr(value: any): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  /**
   * Toggle purchaseOrderNumber required validator based on hasPurchaseOrders value.
   */
  private watchPurchaseOrderToggle(): void {
    const hasPO = this.formGroup.get('hasPurchaseOrders');
    const poNumber = this.formGroup.get('purchaseOrderNumber');

    if (hasPO && poNumber) {
      // Set initial state
      this.updatePurchaseOrderValidation(hasPO.value, poNumber);

      hasPO.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => this.updatePurchaseOrderValidation(value, poNumber));
    }
  }

  private updatePurchaseOrderValidation(hasPO: boolean, poControl: AbstractControl): void {
    if (hasPO) {
      poControl.setValidators([Validators.required]);
    } else {
      poControl.clearValidators();
      poControl.setValue('');
    }
    poControl.updateValueAndValidity();
  }
}
