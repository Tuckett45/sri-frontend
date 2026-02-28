import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  LifecycleState,
  LifecycleTransition,
  StateTransition,
  ApprovalRequest,
  ValidationResult
} from '../../models/lifecycle.models';
import * as LifecycleActions from '../../state/lifecycle-transitions/lifecycle-transitions.actions';
import * as LifecycleSelectors from '../../state/lifecycle-transitions/lifecycle-transitions.selectors';

/**
 * LifecycleManagementComponent
 * 
 * Provides UI for managing entity lifecycle transitions with validation and approval workflows.
 * 
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
@Component({
  selector: 'app-lifecycle-management',
  templateUrl: './lifecycle-management.component.html',
  styleUrls: ['./lifecycle-management.component.scss']
})
export class LifecycleManagementComponent implements OnInit {
  @Input() entityType: 'job' | 'deployment' | 'workflow' = 'job';
  @Input() entityId!: string;
  @Output() transitionComplete = new EventEmitter<StateTransition>();

  // Observables from store
  currentState$!: Observable<LifecycleState | null>;
  availableTransitions$!: Observable<LifecycleTransition[]>;
  transitionHistory$!: Observable<StateTransition[]>;
  pendingApprovals$!: Observable<ApprovalRequest[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  // Form
  transitionForm!: FormGroup;
  selectedTransition: LifecycleTransition | null = null;

  // UI state
  showApprovalSection = false;
  showHistorySection = true;

  constructor(
    private store: Store,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLifecycleData();
    this.setupSelectors();
  }

  private initializeForm(): void {
    this.transitionForm = this.fb.group({
      transitionId: ['', Validators.required],
      reason: [''],
      metadata: [{}]
    });
  }

  private setupSelectors(): void {
    this.currentState$ = this.store.select(
      LifecycleSelectors.selectCurrentState(this.entityType, this.entityId)
    );
    this.availableTransitions$ = this.store.select(
      LifecycleSelectors.selectAvailableTransitions(this.entityType, this.entityId)
    );
    this.transitionHistory$ = this.store.select(
      LifecycleSelectors.selectTransitionHistory(this.entityType, this.entityId)
    );
    this.pendingApprovals$ = this.store.select(
      LifecycleSelectors.selectPendingApprovals(this.entityType, this.entityId)
    );
    this.loading$ = this.store.select(LifecycleSelectors.selectLoading);
    this.error$ = this.store.select(LifecycleSelectors.selectError);
  }

  loadLifecycleData(): void {
    this.store.dispatch(
      LifecycleActions.loadLifecycleState({
        entityType: this.entityType,
        entityId: this.entityId
      })
    );
    this.store.dispatch(
      LifecycleActions.loadTransitionHistory({
        entityType: this.entityType,
        entityId: this.entityId
      })
    );
    this.store.dispatch(
      LifecycleActions.loadPendingApprovals({
        entityType: this.entityType,
        entityId: this.entityId
      })
    );
  }

  selectTransition(transition: LifecycleTransition): void {
    this.selectedTransition = transition;
    this.transitionForm.patchValue({
      transitionId: transition.id
    });

    // Show reason field if transition requires approval
    if (transition.requiresApproval) {
      this.transitionForm.get('reason')?.setValidators([Validators.required]);
    } else {
      this.transitionForm.get('reason')?.clearValidators();
    }
    this.transitionForm.get('reason')?.updateValueAndValidity();
  }

  validateTransition(): Observable<ValidationResult> {
    if (!this.selectedTransition) {
      throw new Error('No transition selected');
    }

    return new Observable(observer => {
      this.store.dispatch(
        LifecycleActions.validateTransition({
          entityType: this.entityType,
          entityId: this.entityId,
          transitionId: this.selectedTransition!.id,
          data: this.transitionForm.value
        })
      );

      // Subscribe to validation result
      const subscription = this.store
        .select(LifecycleSelectors.selectValidationResult)
        .subscribe(result => {
          if (result) {
            observer.next(result);
            observer.complete();
            subscription.unsubscribe();
          }
        });
    });
  }

  executeTransition(): void {
    if (!this.transitionForm.valid || !this.selectedTransition) {
      return;
    }

    const request = this.transitionForm.value;

    if (this.selectedTransition.requiresApproval) {
      this.requestApproval();
    } else {
      this.store.dispatch(
        LifecycleActions.executeTransition({
          entityType: this.entityType,
          entityId: this.entityId,
          request
        })
      );
    }
  }

  requestApproval(): void {
    if (!this.transitionForm.valid || !this.selectedTransition) {
      return;
    }

    this.store.dispatch(
      LifecycleActions.requestApproval({
        entityType: this.entityType,
        entityId: this.entityId,
        transitionId: this.selectedTransition.id,
        reason: this.transitionForm.value.reason,
        metadata: this.transitionForm.value.metadata
      })
    );

    this.showApprovalSection = true;
  }

  approveTransition(approvalId: string): void {
    this.store.dispatch(
      LifecycleActions.approveTransition({
        approvalId,
        reason: 'Approved by user'
      })
    );
  }

  rejectTransition(approvalId: string, reason: string): void {
    this.store.dispatch(
      LifecycleActions.rejectTransition({
        approvalId,
        reason
      })
    );
  }

  toggleHistorySection(): void {
    this.showHistorySection = !this.showHistorySection;
  }

  toggleApprovalSection(): void {
    this.showApprovalSection = !this.showApprovalSection;
  }

  resetForm(): void {
    this.transitionForm.reset();
    this.selectedTransition = null;
  }
}
