import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { 
  WizardStep, 
  WorkflowData, 
  WorkflowResult, 
  SaveStatus 
} from '../../models/workflow.models';
import { ValidationResult } from '../../models/validation.models';
import * as WorkflowWizardActions from '../../state/workflow-wizard/workflow-wizard.actions';
import * as WorkflowWizardSelectors from '../../state/workflow-wizard/workflow-wizard.selectors';

/**
 * WorkflowWizardComponent
 * 
 * Multi-step wizard for guiding users through complete workflow processes
 * from creation to completion.
 * 
 * Features:
 * - Multi-step navigation with progress tracking
 * - Step validation before progression
 * - Draft save/load functionality
 * - Data preservation across steps
 * 
 * Requirements: 5.1, 5.4, 5.5, 5.6, 5.8
 */
@Component({
  selector: 'app-workflow-wizard',
  templateUrl: './workflow-wizard.component.html',
  styleUrls: ['./workflow-wizard.component.scss']
})
export class WorkflowWizardComponent implements OnInit, OnDestroy {
  @Input() workflowType: 'job' | 'deployment' | 'custom' = 'job';
  @Input() initialData?: Partial<WorkflowData>;
  @Output() workflowComplete = new EventEmitter<WorkflowResult>();
  @Output() workflowCancelled = new EventEmitter<void>();

  // Wizard state
  steps: WizardStep[] = [];
  currentStepIndex: number = 0;
  completedSteps: Set<number> = new Set();

  // Forms
  stepForms: Map<number, FormGroup> = new Map();

  // Observables
  validationResults$: Observable<ValidationResult[]>;
  saveDraftStatus$: Observable<SaveStatus>;
  currentStep$: Observable<WizardStep | null>;
  canProceed$: Observable<boolean>;
  workflowData$: Observable<WorkflowData | null>;

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private fb: FormBuilder
  ) {
    // Initialize observables from store
    this.validationResults$ = this.store.select(WorkflowWizardSelectors.selectValidationResults);
    this.saveDraftStatus$ = this.store.select(WorkflowWizardSelectors.selectSaveDraftStatus);
    this.currentStep$ = this.store.select(WorkflowWizardSelectors.selectCurrentStep);
    this.canProceed$ = this.store.select(WorkflowWizardSelectors.selectCanProceedToNextStep);
    this.workflowData$ = this.store.select(WorkflowWizardSelectors.selectWorkflowData);
  }

  ngOnInit(): void {
    this.initializeSteps();
    this.initializeWizard();
    this.subscribeToStoreUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize wizard steps based on workflow type
   * Requirement 5.1: Multi-step workflow initialization
   */
  initializeSteps(): void {
    // Define steps based on workflow type
    switch (this.workflowType) {
      case 'job':
        this.steps = [
          {
            id: 'basic-info',
            name: 'Basic Information',
            description: 'Enter job details',
            order: 0,
            required: true,
            component: 'JobBasicInfoComponent',
            validations: [
              { field: 'title', type: 'required', params: {}, message: 'Title is required' },
              { field: 'description', type: 'required', params: {}, message: 'Description is required' }
            ],
            dependencies: []
          },
          {
            id: 'location',
            name: 'Location',
            description: 'Specify job location',
            order: 1,
            required: true,
            component: 'JobLocationComponent',
            validations: [
              { field: 'address', type: 'required', params: {}, message: 'Address is required' }
            ],
            dependencies: ['basic-info']
          },
          {
            id: 'scheduling',
            name: 'Scheduling',
            description: 'Set schedule and priority',
            order: 2,
            required: true,
            component: 'JobSchedulingComponent',
            validations: [
              { field: 'scheduledDate', type: 'required', params: {}, message: 'Scheduled date is required' }
            ],
            dependencies: ['basic-info', 'location']
          },
          {
            id: 'review',
            name: 'Review',
            description: 'Review and submit',
            order: 3,
            required: true,
            component: 'JobReviewComponent',
            validations: [],
            dependencies: ['basic-info', 'location', 'scheduling']
          }
        ];
        break;

      case 'deployment':
        this.steps = [
          {
            id: 'deployment-info',
            name: 'Deployment Information',
            description: 'Enter deployment details',
            order: 0,
            required: true,
            component: 'DeploymentInfoComponent',
            validations: [
              { field: 'name', type: 'required', params: {}, message: 'Name is required' }
            ],
            dependencies: []
          },
          {
            id: 'configuration',
            name: 'Configuration',
            description: 'Configure deployment settings',
            order: 1,
            required: true,
            component: 'DeploymentConfigComponent',
            validations: [],
            dependencies: ['deployment-info']
          },
          {
            id: 'review',
            name: 'Review',
            description: 'Review and deploy',
            order: 2,
            required: true,
            component: 'DeploymentReviewComponent',
            validations: [],
            dependencies: ['deployment-info', 'configuration']
          }
        ];
        break;

      default:
        this.steps = [];
    }

    // Sort steps by order
    this.steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Initialize wizard with initial data or draft
   */
  private initializeWizard(): void {
    this.store.dispatch(WorkflowWizardActions.initializeWizard({
      workflowType: this.workflowType,
      steps: this.steps,
      initialData: this.initialData
    }));
  }

  /**
   * Subscribe to store updates
   */
  private subscribeToStoreUpdates(): void {
    // Subscribe to current step index changes
    this.store.select(WorkflowWizardSelectors.selectCurrentStepIndex)
      .pipe(takeUntil(this.destroy$))
      .subscribe(index => {
        this.currentStepIndex = index;
      });

    // Subscribe to completed steps changes
    this.store.select(WorkflowWizardSelectors.selectCompletedSteps)
      .pipe(takeUntil(this.destroy$))
      .subscribe(completed => {
        this.completedSteps = new Set(completed);
      });
  }

  /**
   * Navigate to specific step
   * Requirement 5.4: Previous step navigation with data preservation
   */
  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }

    // Can only go to completed steps or the next step
    if (this.completedSteps.has(index) || index === this.currentStepIndex + 1) {
      this.store.dispatch(WorkflowWizardActions.goToStep({ stepIndex: index }));
    }
  }

  /**
   * Navigate to next step
   * Validates current step before proceeding
   */
  nextStep(): void {
    if (!this.canProceedToNextStep()) {
      return;
    }

    // Validate current step
    this.store.dispatch(WorkflowWizardActions.validateCurrentStep());

    // The effect will handle navigation after successful validation
  }

  /**
   * Navigate to previous step
   * Requirement 5.4: Previous step navigation with data preservation
   */
  previousStep(): void {
    if (this.canGoToPreviousStep()) {
      this.store.dispatch(WorkflowWizardActions.previousStep());
    }
  }

  /**
   * Validate current step
   * Requirement 5.2: Step validation before progression
   */
  validateCurrentStep(): Observable<ValidationResult> {
    return this.store.select(WorkflowWizardSelectors.selectCurrentStepValidation);
  }

  /**
   * Save workflow as draft
   * Requirement 5.5: Draft saving with data persistence
   */
  saveDraft(): void {
    this.store.dispatch(WorkflowWizardActions.saveDraft());
  }

  /**
   * Load workflow draft
   * Requirement 5.6: Draft loading with exact data restoration
   */
  loadDraft(draftId: string): void {
    this.store.dispatch(WorkflowWizardActions.loadDraft({ draftId }));
  }

  /**
   * Submit complete workflow
   * Requirement 5.7: Workflow submission with aggregated step data
   */
  submitWorkflow(): void {
    this.store.dispatch(WorkflowWizardActions.submitWorkflow());
  }

  /**
   * Cancel workflow
   * Requirement 5.8: Workflow cancellation with unsaved changes discard
   */
  cancelWorkflow(): void {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      this.store.dispatch(WorkflowWizardActions.cancelWorkflow());
      this.workflowCancelled.emit();
    }
  }

  /**
   * Check if can proceed to next step
   * Requirement 5.2: Step validation before progression
   */
  canProceedToNextStep(): boolean {
    return this.currentStepIndex < this.steps.length - 1;
  }

  /**
   * Check if can go to previous step
   */
  canGoToPreviousStep(): boolean {
    return this.currentStepIndex > 0;
  }

  /**
   * Check if step is complete
   */
  isStepComplete(index: number): boolean {
    return this.completedSteps.has(index);
  }

  /**
   * Get step progress percentage
   */
  getStepProgress(): number {
    if (this.steps.length === 0) {
      return 0;
    }
    return (this.completedSteps.size / this.steps.length) * 100;
  }

  /**
   * Get current step
   */
  getCurrentStep(): WizardStep | null {
    return this.steps[this.currentStepIndex] || null;
  }

  /**
   * Update step data
   */
  updateStepData(stepId: string, data: any): void {
    this.store.dispatch(WorkflowWizardActions.updateStepData({ stepId, data }));
  }
}
