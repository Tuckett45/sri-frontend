import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

import {
  CreateOvertimeRequestDto,
  SUPPORTED_MARKETS,
  DEPARTMENTS,
  SupportedMarket
} from '../../../models/overtime.models';
import * as OvertimeActions from '../../../state/overtime/overtime.actions';
import { AuthService } from '../../../../../services/auth.service';

/**
 * Overtime Request Form Component
 *
 * Provides a reactive form for employees to submit overtime requests.
 * Based on the SRI Employee Overtime Request Form (Google Form).
 * All overtime must be pre-approved before using this form.
 *
 * Fields:
 * - Employee Full Name
 * - Department
 * - Which Market do you support? (radio buttons)
 * - Have you emailed your Overtime request to your SRI Lead? (Yes/No)
 * - Who is your SRI lead?
 * - Has your Overtime Request been approved? (dropdown)
 * - Date of Request Submission
 * - Date Overtime is Requested For (Start Date)
 * - Estimated Overtime Duration (Hrs, Min)
 * - Detailed Justification for Overtime
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
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.overtimeForm = this.fb.group({
      employeeFullName: ['', [Validators.required, Validators.minLength(2)]],
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

    // Pre-fill employee name if available
    const user = this.authService.getUser();
    if (user?.displayName) {
      this.overtimeForm.patchValue({ employeeFullName: user.displayName });
    }
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
   * Handles form submission
   */
  onSubmit(): void {
    if (this.overtimeForm.invalid) {
      this.overtimeForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.overtimeForm.value;

    const dto: CreateOvertimeRequestDto = {
      employeeFullName: formValue.employeeFullName.trim(),
      department: formValue.department,
      market: formValue.market as SupportedMarket,
      emailedSriLead: formValue.emailedSriLead === 'yes',
      sriLeadName: formValue.sriLeadName.trim(),
      isPreApproved: formValue.isPreApproved === 'yes',
      submissionDate: formValue.submissionDate,
      overtimeStartDate: formValue.overtimeStartDate,
      estimatedDuration: {
        hours: parseInt(formValue.estimatedHours, 10) || 0,
        minutes: parseInt(formValue.estimatedMinutes, 10) || 0
      },
      justification: formValue.justification.trim()
    };

    this.store.dispatch(OvertimeActions.createOvertimeRequest({ dto }));
    this.submitted = true;
    this.submitting = false;
  }

  /**
   * Navigate back to overtime list
   */
  onCancel(): void {
    this.router.navigate(['/field-resource-management/pto/overtime']);
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
