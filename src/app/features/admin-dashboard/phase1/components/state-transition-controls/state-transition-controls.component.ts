import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { LifecycleTransition, LifecycleState, TransitionRequest } from '../../models/lifecycle.models';

/**
 * StateTransitionControlsComponent
 * 
 * Reusable control panel for initiating and managing state transitions.
 * 
 * Requirements: 4.2, 4.3
 */
@Component({
  selector: 'app-state-transition-controls',
  templateUrl: './state-transition-controls.component.html',
  styleUrls: ['./state-transition-controls.component.scss']
})
export class StateTransitionControlsComponent implements OnInit, OnChanges {
  @Input() availableTransitions: LifecycleTransition[] = [];
  @Input() currentState!: LifecycleState;
  @Input() entityId!: string;
  @Input() requireReason = false;
  @Input() requireApproval = false;
  @Output() transitionInitiated = new EventEmitter<TransitionRequest>();

  // Form
  transitionForm!: FormGroup;

  // UI state
  showReasonField = false;
  showApprovalWarning = false;
  selectedTransition: LifecycleTransition | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requireReason'] || changes['requireApproval']) {
      this.updateFormValidation();
    }
  }

  buildForm(): void {
    this.transitionForm = this.fb.group({
      transitionId: ['', Validators.required],
      reason: [''],
      metadata: [{}]
    });
  }

  onTransitionSelect(transition: LifecycleTransition): void {
    this.selectedTransition = transition;
    this.transitionForm.patchValue({
      transitionId: transition.id
    });

    // Update UI state based on transition requirements
    this.showReasonField = transition.requiresApproval || this.requireReason;
    this.showApprovalWarning = transition.requiresApproval || this.requireApproval;

    // Update form validation
    if (this.showReasonField) {
      this.transitionForm.get('reason')?.setValidators([Validators.required]);
    } else {
      this.transitionForm.get('reason')?.clearValidators();
    }
    this.transitionForm.get('reason')?.updateValueAndValidity();
  }

  submitTransition(): void {
    if (!this.validateForm()) {
      return;
    }

    const request: TransitionRequest = {
      entityId: this.entityId,
      transitionId: this.transitionForm.value.transitionId,
      reason: this.transitionForm.value.reason || undefined,
      metadata: this.transitionForm.value.metadata || {}
    };

    this.transitionInitiated.emit(request);
    this.resetForm();
  }

  validateForm(): boolean {
    if (!this.transitionForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.transitionForm.controls).forEach(key => {
        this.transitionForm.get(key)?.markAsTouched();
      });
      return false;
    }
    return true;
  }

  resetForm(): void {
    this.transitionForm.reset();
    this.selectedTransition = null;
    this.showReasonField = false;
    this.showApprovalWarning = false;
  }

  private updateFormValidation(): void {
    if (this.requireReason || (this.selectedTransition?.requiresApproval)) {
      this.transitionForm.get('reason')?.setValidators([Validators.required]);
      this.showReasonField = true;
    } else {
      this.transitionForm.get('reason')?.clearValidators();
      this.showReasonField = false;
    }
    this.transitionForm.get('reason')?.updateValueAndValidity();

    this.showApprovalWarning = this.requireApproval || (this.selectedTransition?.requiresApproval || false);
  }

  getTransitionButtonClass(transition: LifecycleTransition): string {
    const classes = ['transition-btn'];
    
    if (this.selectedTransition?.id === transition.id) {
      classes.push('selected');
    }
    
    if (transition.requiresApproval) {
      classes.push('requires-approval');
    }
    
    return classes.join(' ');
  }

  isTransitionDisabled(transition: LifecycleTransition): boolean {
    // Check if transition is allowed from current state
    if (!this.currentState?.allowedTransitions.includes(transition.toState)) {
      return true;
    }
    
    return false;
  }
}
