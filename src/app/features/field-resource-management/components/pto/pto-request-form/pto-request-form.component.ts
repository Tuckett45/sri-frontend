import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { LeaveType, CreatePtoRequestDto } from '../../../models/pto.models';
import { SUPPORTED_MARKETS } from '../../../models/overtime.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectLeaveTypes } from '../../../state/pto/pto.selectors';
import { AuthService } from '../../../../../services/auth.service';

/**
 * PTO Request Form Component (Enhanced)
 *
 * Provides a reactive form for employees to submit new PTO/time off requests.
 * Matches the SRI Time-off Request Form (Google Form) with fields:
 * - Full name (first, last format: e.g. John Doe)
 * - Who is covering your business commitments while you are out?
 * - Have you emailed your time-off request to your SRI Lead?
 * - Is your time-off request approved?
 * - When will your approved time off start? (date)
 * - When will your approved time-off end? (date)
 * - Which Market do you support?
 * - Out of office notification checkboxes (Google Calendar, Google Chat, Google Auto Reply)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.3
 */
@Component({
  selector: 'app-pto-request-form',
  templateUrl: './pto-request-form.component.html',
  styleUrls: ['./pto-request-form.component.scss']
})
export class PtoRequestFormComponent implements OnInit {
  ptoForm!: FormGroup;
  leaveTypes$!: Observable<LeaveType[]>;
  submitted = false;
  submitting = false;

  /** Markets for dropdown */
  markets = SUPPORTED_MARKETS;

  /** Email confirmation options */
  emailedLeadOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];

  /** Approval status options */
  approvalOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'pending', label: 'Pending' }
  ];

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadLeaveTypes());
    this.leaveTypes$ = this.store.select(selectLeaveTypes);

    this.ptoForm = this.fb.group({
      employeeName: ['', [Validators.required, Validators.minLength(2)]],
      coveragePerson: ['', [Validators.required, Validators.minLength(2)]],
      emailedLead: ['', [Validators.required]],
      isApproved: ['', [Validators.required]],
      startDate: ['', [Validators.required, this.notInPastValidator]],
      endDate: ['', [Validators.required]],
      market: ['', [Validators.required]],
      outOfOfficeCalendar: [false],
      outOfOfficeChat: [false],
      outOfOfficeEmail: [false],
      notes: ['', [Validators.maxLength(1000)]]
    }, {
      validators: this.endDateAfterStartDateValidator
    });

    // Pre-fill employee name if available
    const user = this.authService.getUser();
    if (user?.displayName) {
      this.ptoForm.patchValue({ employeeName: user.displayName });
    }
  }

  /**
   * Custom validator: start date must not be in the past.
   */
  notInPastValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(control.value);
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return { notInPast: true };
    }
    return null;
  }

  /**
   * Cross-field validator: end date must be on or after start date.
   */
  endDateAfterStartDateValidator(group: AbstractControl): ValidationErrors | null {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;
    if (!startDate || !endDate) {
      return null;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < start) {
      return { endDateBeforeStart: true };
    }
    return null;
  }

  /**
   * Returns the current character count for the notes field.
   */
  get notesLength(): number {
    return this.ptoForm.get('notes')?.value?.length || 0;
  }

  /**
   * Handles form submission. Builds the DTO and dispatches the createRequest action.
   */
  onSubmit(): void {
    if (this.ptoForm.invalid) {
      this.ptoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.ptoForm.value;
    const user = this.authService.getUser();

    const dto: CreatePtoRequestDto = {
      employeeId: user?.id ?? '',
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      requestType: formValue.market // Using market as part of request context
    };

    if (formValue.notes && formValue.notes.trim().length > 0) {
      dto.reason = formValue.notes.trim();
    }

    this.store.dispatch(PtoActions.createRequest({ dto }));
    this.submitted = true;
    this.submitting = false;
  }

  /**
   * Navigate back to PTO list
   */
  onCancel(): void {
    this.router.navigate(['/field-resource-management/pto']);
  }

  /**
   * Helper to check if a field should show validation errors.
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.ptoForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
