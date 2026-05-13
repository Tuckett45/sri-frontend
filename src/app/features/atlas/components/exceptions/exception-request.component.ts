/**
 * Exception Request Component
 * 
 * Form component for creating exception and waiver requests.
 * Includes validation for required fields and submission handling.
 * 
 * Requirements: 7.1, 7.5, 7.6, 3.11
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

// Models
import { CreateExceptionRequest } from '../../models/exception.model';

// State
import * as ExceptionActions from '../../state/exceptions/exception.actions';
import * as ExceptionSelectors from '../../state/exceptions/exception.selectors';

@Component({
  selector: 'app-exception-request',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    Textarea,
    CalendarModule,
    DropdownModule,
    ProgressSpinnerModule,
    MessageModule
  ],
  templateUrl: './exception-request.component.html',
  styleUrls: ['./exception-request.component.scss']
})
export class ExceptionRequestComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() deploymentId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() exceptionRequested = new EventEmitter<void>();

  exceptionForm: FormGroup;
  creating$: Observable<boolean>;
  error$: Observable<string | null>;
  
  creating = false;
  error: string | null = null;

  // Exception type options
  exceptionTypeOptions = [
    { label: 'Compliance Waiver', value: 'COMPLIANCE_WAIVER' },
    { label: 'Approval Bypass', value: 'APPROVAL_BYPASS' },
    { label: 'Evidence Exception', value: 'EVIDENCE_EXCEPTION' },
    { label: 'Timeline Extension', value: 'TIMELINE_EXTENSION' },
    { label: 'Process Deviation', value: 'PROCESS_DEVIATION' },
    { label: 'Technical Exception', value: 'TECHNICAL_EXCEPTION' },
    { label: 'Other', value: 'OTHER' }
  ];

  // Minimum date for expiration (today)
  minDate = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    // Initialize observables
    this.creating$ = this.store.select(ExceptionSelectors.selectCreatingException);
    this.error$ = this.store.select(ExceptionSelectors.selectCreatingError);

    // Initialize form
    this.exceptionForm = this.fb.group({
      exceptionType: ['', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(20)]],
      expiresAt: [null],
      supportingEvidence: ['']
    });
  }

  ngOnInit(): void {
    // Subscribe to creating state
    this.creating$
      .pipe(takeUntil(this.destroy$))
      .subscribe(creating => {
        this.creating = creating;
        // Close dialog and emit event when creation succeeds
        if (!creating && !this.error && this.exceptionForm.dirty) {
          this.onSuccess();
        }
      });

    // Subscribe to error state
    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.exceptionForm.invalid || !this.deploymentId) {
      this.markFormGroupTouched(this.exceptionForm);
      return;
    }

    const formValue = this.exceptionForm.value;
    
    // Parse supporting evidence (comma-separated list)
    const supportingEvidence = formValue.supportingEvidence
      ? formValue.supportingEvidence.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : undefined;

    const request: CreateExceptionRequest = {
      exceptionType: formValue.exceptionType,
      justification: formValue.justification,
      requestedBy: 'current-user', // This should come from auth service
      expiresAt: formValue.expiresAt || undefined,
      supportingEvidence
    };

    this.store.dispatch(ExceptionActions.createException({
      deploymentId: this.deploymentId,
      request
    }));
  }

  /**
   * Handle successful exception creation
   */
  private onSuccess(): void {
    this.exceptionForm.reset();
    this.exceptionRequested.emit();
  }

  /**
   * Handle dialog close
   */
  onClose(): void {
    this.exceptionForm.reset();
    this.close.emit();
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Check if form field has error
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.exceptionForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.exceptionForm.get(fieldName);
    
    if (!field || !field.errors || !(field.dirty || field.touched)) {
      return '';
    }

    if (field.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }

    if (field.hasError('minlength')) {
      const minLength = field.errors['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }

    return 'Invalid value';
  }

  /**
   * Get field label for error messages
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      exceptionType: 'Exception type',
      justification: 'Justification',
      expiresAt: 'Expiration date',
      supportingEvidence: 'Supporting evidence'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if form can be submitted
   */
  canSubmit(): boolean {
    return this.exceptionForm.valid && !this.creating && !!this.deploymentId;
  }

  /**
   * Get character count for justification
   */
  getJustificationCharCount(): number {
    return this.exceptionForm.get('justification')?.value?.length || 0;
  }

  /**
   * Check if justification meets minimum length
   */
  isJustificationValid(): boolean {
    const justification = this.exceptionForm.get('justification');
    return !!(justification && justification.value && justification.value.length >= 20);
  }
}
