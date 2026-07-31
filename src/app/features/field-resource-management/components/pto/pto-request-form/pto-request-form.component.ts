import { Component, OnInit, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { LeaveType, CreatePtoRequestDto } from '../../../models/pto.models';
import { SUPPORTED_MARKETS } from '../../../models/overtime.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectLeaveTypes } from '../../../state/pto/pto.selectors';
import { AuthService } from '../../../../../services/auth.service';

export interface PtoFormDialogData {
  requestId?: string;
}

/**
 * PTO Request Form Component (Dialog-based)
 *
 * Provides a reactive form for employees to submit new PTO/time off requests.
 * Opened as a Material Dialog matching the FRM form pattern.
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
    @Optional() private router: Router,
    private authService: AuthService,
    @Optional() public dialogRef: MatDialogRef<PtoRequestFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: PtoFormDialogData
  ) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadLeaveTypes());
    this.leaveTypes$ = this.store.select(selectLeaveTypes);

    this.ptoForm = this.fb.group({
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
   * Check if end date range error is present.
   */
  get hasDateRangeError(): boolean {
    return !!this.ptoForm.errors?.['endDateBeforeStart'] && !!this.ptoForm.get('endDate')?.touched;
  }

  /**
   * Handles form submission.
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
      requestType: formValue.market,
      employeeName: user?.displayName?.trim() ?? '',
      coveragePerson: formValue.coveragePerson?.trim(),
      emailedSriLead: formValue.emailedLead === 'yes',
      isApprovedByLead: formValue.isApproved,
      market: formValue.market,
      outOfOfficeCalendar: formValue.outOfOfficeCalendar || false,
      outOfOfficeChat: formValue.outOfOfficeChat || false,
      outOfOfficeEmail: formValue.outOfOfficeEmail || false
    };

    if (formValue.notes && formValue.notes.trim().length > 0) {
      dto.reason = formValue.notes.trim();
    }

    this.store.dispatch(PtoActions.createRequest({ dto }));
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
      this.router.navigate(['/field-resource-management/pto']);
    }
  }

  /**
   * Helper to check if a field should show validation errors.
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.ptoForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Helper to get a form control.
   */
  getControl(fieldName: string) {
    return this.ptoForm.get(fieldName);
  }
}
