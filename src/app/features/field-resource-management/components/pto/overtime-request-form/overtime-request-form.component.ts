import { Component, OnInit, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  CreateOvertimeRequestDto,
  SUPPORTED_MARKETS,
  DEPARTMENTS,
  SupportedMarket
} from '../../../models/overtime.models';
import * as OvertimeActions from '../../../state/overtime/overtime.actions';
import { AuthService } from '../../../../../services/auth.service';

export interface OvertimeFormDialogData {
  requestId?: string;
}

/**
 * Overtime Request Form Component (Dialog-based)
 *
 * Provides a reactive form for employees to submit overtime requests.
 * Opened as a Material Dialog matching the FRM form pattern.
 * All overtime must be pre-approved before using this form.
 */
@Component({
  selector: 'app-overtime-request-form',
  templateUrl: './overtime-request-form.component.html',
  styleUrls: ['./overtime-request-form.component.scss']
})
export class OvertimeRequestFormComponent implements OnInit {
  overtimeForm!: FormGroup;
  submitted = false;
  submitting = false;

  /** Available markets for radio selection */
  markets = SUPPORTED_MARKETS;

  /** Available departments */
  departments = DEPARTMENTS;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    @Optional() private router: Router,
    private authService: AuthService,
    @Optional() public dialogRef: MatDialogRef<OvertimeRequestFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: OvertimeFormDialogData
  ) {}

  ngOnInit(): void {
    this.overtimeForm = this.fb.group({
      department: ['', [Validators.required]],
      market: ['', [Validators.required]],
      emailedSriLead: ['', [Validators.required]],
      sriLeadName: ['', [Validators.required, Validators.minLength(2)]],
      isPreApproved: ['', [Validators.required]],
      submissionDate: [this.getTodayDate(), [Validators.required]],
      overtimeStartDate: ['', [Validators.required, this.notInPastValidator]],
      estimatedHours: [0, [Validators.required, Validators.min(0), Validators.max(24)]],
      estimatedMinutes: [0, [Validators.required, Validators.min(0), Validators.max(59)]],
      justification: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
    }, {
      validators: this.durationValidator
    });
  }

  /**
   * Custom validator: date must not be in the past.
   */
  notInPastValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(control.value);
    date.setHours(0, 0, 0, 0);
    if (date < today) {
      return { notInPast: true };
    }
    return null;
  }

  /**
   * Cross-field validator: duration must be at least 1 minute total.
   */
  durationValidator(group: AbstractControl): ValidationErrors | null {
    const hours = group.get('estimatedHours')?.value || 0;
    const minutes = group.get('estimatedMinutes')?.value || 0;
    if (hours === 0 && minutes === 0) {
      return { durationRequired: true };
    }
    return null;
  }

  /**
   * Handles form submission.
   */
  onSubmit(): void {
    if (this.overtimeForm.invalid) {
      this.overtimeForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.overtimeForm.value;
    const user = this.authService.getUser();

    const dto: CreateOvertimeRequestDto = {
      employeeFullName: user?.displayName?.trim() ?? '',
      department: formValue.department,
      market: formValue.market as SupportedMarket,
      emailedSriLead: formValue.emailedSriLead === 'yes',
      sriLeadName: formValue.sriLeadName.trim(),
      isPreApproved: formValue.isPreApproved === 'yes',
      submissionDate: formValue.submissionDate,
      overtimeStartDate: formValue.overtimeStartDate,
      estimatedHours: parseInt(formValue.estimatedHours, 10) || 0,
      estimatedMinutes: parseInt(formValue.estimatedMinutes, 10) || 0,
      justification: formValue.justification.trim()
    };

    this.store.dispatch(OvertimeActions.createOvertimeRequest({ dto }));
    this.submitting = false;

    // Close dialog on success
    if (this.dialogRef) {
      this.dialogRef.close({ success: true });
    } else {
      this.submitted = true;
    }
  }

  /**
   * Cancel and close dialog or navigate back.
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else if (this.router) {
      this.router.navigate(['/field-resource-management/pto/overtime']);
    }
  }

  /**
   * Helper to check if a field should show validation errors.
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.overtimeForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Returns today's date in YYYY-MM-DD format for the submission date default.
   */
  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Returns the current character count for the justification field.
   */
  get justificationLength(): number {
    return this.overtimeForm.get('justification')?.value?.length || 0;
  }
}
