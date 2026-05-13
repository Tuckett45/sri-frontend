import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, AbstractControl, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Custom validator: ensures value is an integer (no decimal places).
 */
export function integerValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (control.value == null || control.value === '') {
      return null; // let required validator handle empty
    }
    const value = Number(control.value);
    return Number.isInteger(value) ? null : { integer: { actual: control.value } };
  };
}

/**
 * SRI Internal Step Component
 *
 * Third step of the Job Setup Workflow. Renders SRI-specific staffing
 * and operational fields using the FormGroup passed in from the parent
 * JobSetupComponent.
 *
 * Requirements: 5.1–5.6, 8.1–8.6
 */
@Component({
  selector: 'app-sri-internal-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step-container" [formGroup]="formGroup">
      <!-- Project Leadership -->
      <h3 class="section-heading">Project Leadership</h3>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>SRI Project Director</mat-label>
        <input matInput formControlName="projectDirector" maxlength="150" />
        <mat-hint align="end">{{ formGroup.get('projectDirector')?.value?.length || 0 }} / 150</mat-hint>
        <mat-error *ngIf="formGroup.get('projectDirector')?.hasError('required')">Project director is required</mat-error>
        <mat-error *ngIf="formGroup.get('projectDirector')?.hasError('maxlength')">Maximum 150 characters</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>SRI Customer / Biz Dev Contact</mat-label>
        <input matInput formControlName="bizDevContact" maxlength="150" />
        <mat-hint align="end">{{ formGroup.get('bizDevContact')?.value?.length || 0 }} / 150</mat-hint>
        <mat-error *ngIf="formGroup.get('bizDevContact')?.hasError('required')">Biz dev contact is required</mat-error>
        <mat-error *ngIf="formGroup.get('bizDevContact')?.hasError('maxlength')">Maximum 150 characters</mat-error>
      </mat-form-field>

      <!-- Resource Planning -->
      <h3 class="section-heading">Resource Planning</h3>

      <div class="form-row two-columns">
        <mat-form-field appearance="outline">
          <mat-label>Target Resources</mat-label>
          <input matInput type="number" formControlName="targetResources" min="1" max="500" step="1" />
          <mat-error *ngIf="formGroup.get('targetResources')?.hasError('required')">Target resources is required</mat-error>
          <mat-error *ngIf="formGroup.get('targetResources')?.hasError('min')">Must be at least 1</mat-error>
          <mat-error *ngIf="formGroup.get('targetResources')?.hasError('max')">Cannot exceed 500</mat-error>
          <mat-error *ngIf="formGroup.get('targetResources')?.hasError('integer')">Must be a whole number</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Requested Hours</mat-label>
          <input matInput type="number" formControlName="requestedHours" min="0.01" step="0.01" />
          <mat-error *ngIf="formGroup.get('requestedHours')?.hasError('required')">Requested hours is required</mat-error>
          <mat-error *ngIf="formGroup.get('requestedHours')?.hasError('min')">Must be at least 0.01</mat-error>
        </mat-form-field>
      </div>

      <!-- Overtime -->
      <h3 class="section-heading">Overtime</h3>

      <div class="toggle-row">
        <mat-slide-toggle formControlName="overtimeRequired" color="primary">
          Overtime is required for this job
        </mat-slide-toggle>
      </div>

      <mat-form-field appearance="outline" *ngIf="formGroup.get('overtimeRequired')?.value">
        <mat-label>Estimated Overtime Hours</mat-label>
        <input matInput type="number" formControlName="estimatedOvertimeHours" min="0.01" step="0.01" />
        <mat-error *ngIf="formGroup.get('estimatedOvertimeHours')?.hasError('required')">Estimated overtime hours is required</mat-error>
        <mat-error *ngIf="formGroup.get('estimatedOvertimeHours')?.hasError('min')">Must be at least 0.01</mat-error>
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
export class SriInternalStepComponent implements OnInit, OnDestroy {
  @Input() formGroup!: FormGroup;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.setupValidators();
    this.watchOvertimeToggle();
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

    controls['projectDirector']?.setValidators([Validators.required, Validators.maxLength(150)]);
    controls['targetResources']?.setValidators([Validators.required, Validators.min(1), Validators.max(500), integerValidator()]);
    controls['bizDevContact']?.setValidators([Validators.required, Validators.maxLength(150)]);
    controls['requestedHours']?.setValidators([Validators.required, Validators.min(0.01)]);
    controls['overtimeRequired']?.setValidators([Validators.required]);

    // Update validity after setting validators
    Object.keys(controls).forEach(key => controls[key].updateValueAndValidity());
  }

  /**
   * Toggle estimatedOvertimeHours required validator based on overtimeRequired value.
   */
  private watchOvertimeToggle(): void {
    const overtimeRequired = this.formGroup.get('overtimeRequired');
    const estimatedHours = this.formGroup.get('estimatedOvertimeHours');

    if (overtimeRequired && estimatedHours) {
      // Set initial state
      this.updateOvertimeValidation(overtimeRequired.value, estimatedHours);

      overtimeRequired.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => this.updateOvertimeValidation(value, estimatedHours));
    }
  }

  private updateOvertimeValidation(isRequired: boolean, otControl: AbstractControl): void {
    if (isRequired) {
      otControl.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      otControl.clearValidators();
      otControl.setValue(null);
    }
    otControl.updateValueAndValidity();
  }
}
