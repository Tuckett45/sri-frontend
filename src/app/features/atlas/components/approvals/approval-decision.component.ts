/**
 * Approval Decision Component
 * 
 * Provides a form for recording detailed approval decisions with comments and conditions.
 * Can be used standalone or embedded in other components.
 * 
 * Requirements: 7.1, 7.5, 7.6
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

// Models
import { ApprovalDto, ApprovalDecisionDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';

// State
import * as ApprovalActions from '../../state/approvals/approval.actions';
import * as ApprovalSelectors from '../../state/approvals/approval.selectors';

@Component({
  selector: 'app-approval-decision',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextarea,
    DropdownModule,
    RadioButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    DividerModule,
    TagModule
  ],
  templateUrl: './approval-decision.component.html',
  styleUrls: ['./approval-decision.component.scss']
})
export class ApprovalDecisionComponent implements OnInit, OnDestroy {
  @Input() approval: ApprovalDto | null = null;
  @Input() showApprovalInfo = true;
  @Output() decisionSubmitted = new EventEmitter<ApprovalDecisionDto>();
  @Output() cancelled = new EventEmitter<void>();

  // Form
  decisionForm!: FormGroup;

  // Observables from store
  recordingDecision$: Observable<boolean>;
  error$: Observable<string | null>;

  // Local state
  recordingDecision = false;
  error: string | null = null;

  // Decision options
  decisionOptions = [
    { label: 'Approve', value: 'APPROVED', icon: 'pi pi-check', severity: 'success' },
    { label: 'Deny', value: 'DENIED', icon: 'pi pi-times', severity: 'danger' }
  ];

  // Role options (example - should be loaded from config/API)
  roleOptions = [
    { label: 'Technical Lead', value: 'TECHNICAL_LEAD' },
    { label: 'Project Manager', value: 'PROJECT_MANAGER' },
    { label: 'Quality Assurance', value: 'QA' },
    { label: 'Security Officer', value: 'SECURITY' },
    { label: 'Operations Manager', value: 'OPERATIONS' }
  ];

  // Authority level options (example - should be loaded from config/API)
  authorityOptions = [
    { label: 'Level 1 - Standard', value: 'LEVEL_1' },
    { label: 'Level 2 - Senior', value: 'LEVEL_2' },
    { label: 'Level 3 - Executive', value: 'LEVEL_3' }
  ];

  // Enums for template
  ApprovalStatus = ApprovalStatus;
  LifecycleState = LifecycleState;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    // Initialize observables
    this.recordingDecision$ = this.store.select(ApprovalSelectors.selectRecordingDecision);
    this.error$ = this.store.select(ApprovalSelectors.selectApprovalRecordingDecisionError);
  }

  ngOnInit(): void {
    this.initializeForm();

    // Subscribe to store observables
    this.recordingDecision$
      .pipe(takeUntil(this.destroy$))
      .subscribe(recording => this.recordingDecision = recording);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the decision form
   */
  private initializeForm(): void {
    this.decisionForm = this.fb.group({
      decision: ['APPROVED', Validators.required],
      comments: [''],
      approverRole: [''],
      approverAuthority: [''],
      conditions: this.fb.group({
        requiresFollowUp: [false],
        followUpDate: [''],
        additionalReview: [false],
        customCondition: ['']
      })
    });

    // Add conditional validation for comments when denying
    this.decisionForm.get('decision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(decision => {
        const commentsControl = this.decisionForm.get('comments');
        if (decision === 'DENIED') {
          commentsControl?.setValidators([Validators.required]);
        } else {
          commentsControl?.setValidators([]);
        }
        commentsControl?.updateValueAndValidity();
      });
  }

  /**
   * Submit the approval decision
   */
  onSubmit(): void {
    if (this.decisionForm.invalid || !this.approval) {
      this.markFormGroupTouched(this.decisionForm);
      return;
    }

    const formValue = this.decisionForm.value;
    
    // Build conditions object from form
    const conditions: Record<string, any> = {};
    if (formValue.conditions.requiresFollowUp) {
      conditions['requiresFollowUp'] = true;
      if (formValue.conditions.followUpDate) {
        conditions['followUpDate'] = formValue.conditions.followUpDate;
      }
    }
    if (formValue.conditions.additionalReview) {
      conditions['additionalReview'] = true;
    }
    if (formValue.conditions.customCondition) {
      conditions['customCondition'] = formValue.conditions.customCondition;
    }

    const decision: ApprovalDecisionDto = {
      decision: formValue.decision,
      comments: formValue.comments || undefined,
      approverRole: formValue.approverRole || undefined,
      approverAuthority: formValue.approverAuthority || undefined,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined
    };

    // Dispatch action to store
    this.store.dispatch(ApprovalActions.recordDecision({
      approvalId: this.approval.id,
      decision
    }));

    // Emit event for parent component
    this.decisionSubmitted.emit(decision);
  }

  /**
   * Cancel the decision
   */
  onCancel(): void {
    this.decisionForm.reset({ decision: 'APPROVED' });
    this.cancelled.emit();
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
   * Check if a form field has an error
   */
  hasError(fieldName: string, errorType: string = 'required'): boolean {
    const field = this.decisionForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }

  /**
   * Get the selected decision option
   */
  getSelectedDecisionOption() {
    const decision = this.decisionForm.get('decision')?.value;
    return this.decisionOptions.find(opt => opt.value === decision);
  }

  /**
   * Format state label for display
   */
  formatStateLabel(state: LifecycleState): string {
    return state.replace(/_/g, ' ');
  }

  /**
   * Get severity class for state tag
   */
  getStateSeverity(state: LifecycleState): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case LifecycleState.DRAFT:
        return 'secondary';
      case LifecycleState.SUBMITTED:
      case LifecycleState.INTAKE_REVIEW:
      case LifecycleState.PLANNING:
        return 'info';
      case LifecycleState.READY:
        return 'success';
      case LifecycleState.IN_PROGRESS:
      case LifecycleState.EXECUTION_COMPLETE:
      case LifecycleState.QA_REVIEW:
        return 'warn';
      case LifecycleState.APPROVED_FOR_CLOSEOUT:
      case LifecycleState.CLOSED:
        return 'success';
      case LifecycleState.ON_HOLD:
        return 'warn';
      case LifecycleState.CANCELLED:
      case LifecycleState.REWORK_REQUIRED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Check if form is valid and can be submitted
   */
  canSubmit(): boolean {
    return this.decisionForm.valid && !this.recordingDecision && !!this.approval;
  }
}
