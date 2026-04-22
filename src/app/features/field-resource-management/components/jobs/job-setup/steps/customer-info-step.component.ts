import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, AbstractControl, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Custom validator: ensures date is today or in the future.
 */
function minDateTodayValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      return null; // let required validator handle empty
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(control.value);
    selected.setHours(0, 0, 0, 0);
    return selected < today ? { minDate: { min: today, actual: selected } } : null;
  };
}

/**
 * Customer Info Step Component
 *
 * First step of the Job Setup Workflow. Renders customer and jobsite
 * detail fields using the FormGroup passed in from the parent
 * JobSetupComponent.
 *
 * Requirements: 3.1–3.10, 8.1–8.6
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
        <input matInput [matDatepicker]="startDatePicker" formControlName="targetStartDate" [min]="minDate" />
        <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
        <mat-datepicker #startDatePicker></mat-datepicker>
        <mat-error *ngIf="formGroup.get('targetStartDate')?.hasError('required')">Start date is required</mat-error>
        <mat-error *ngIf="formGroup.get('targetStartDate')?.hasError('minDate')">Start date cannot be in the past</mat-error>
      </mat-form-field>

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

  /** Minimum selectable date (today) */
  minDate = new Date();

  /** US state abbreviations for the state dropdown */
  states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  ngOnInit(): void {
    this.setupValidators();
    this.watchPurchaseOrderToggle();
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
    controls['targetStartDate']?.setValidators([Validators.required, minDateTodayValidator()]);
    controls['authorizationStatus']?.setValidators([Validators.required]);
    controls['hasPurchaseOrders']?.setValidators([Validators.required]);

    // Update validity after setting validators
    Object.keys(controls).forEach(key => controls[key].updateValueAndValidity());
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
