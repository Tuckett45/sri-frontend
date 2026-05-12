import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { LeaveType, CreatePtoRequestDto } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectLeaveTypes } from '../../../state/pto/pto.selectors';
import { AuthService } from '../../../../../services/auth.service';

/**
 * PTO Request Form Component
 *
 * Provides a reactive form for employees to submit new PTO/time off requests.
 * Validates date ranges, requires leave type selection, and dispatches
 * the createRequest action on valid submission.
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

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadLeaveTypes());
    this.leaveTypes$ = this.store.select(selectLeaveTypes);

    this.ptoForm = this.fb.group({
      startDate: ['', [Validators.required, this.notInPastValidator]],
      endDate: ['', [Validators.required]],
      requestType: ['', [Validators.required]],
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
   * Handles form submission. Builds the DTO and dispatches the createRequest action.
   */
  onSubmit(): void {
    if (this.ptoForm.invalid) {
      this.ptoForm.markAllAsTouched();
      return;
    }

    const formValue = this.ptoForm.value;
    const user = this.authService.getUser();
    const dto: CreatePtoRequestDto = {
      employeeId: user?.id ?? '',
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      requestType: formValue.requestType
    };

    if (formValue.notes && formValue.notes.trim().length > 0) {
      dto.reason = formValue.notes.trim();
    }

    this.store.dispatch(PtoActions.createRequest({ dto }));
    this.submitted = true;
    this.ptoForm.reset();
  }

  /**
   * Helper to check if a field should show validation errors.
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.ptoForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
