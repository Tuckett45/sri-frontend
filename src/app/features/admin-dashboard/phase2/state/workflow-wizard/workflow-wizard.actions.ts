import { createAction, props } from '@ngrx/store';
import { WizardStep, WorkflowData, WorkflowResult, SaveStatus } from '../../models/workflow.models';
import { ValidationResult } from '../../models/validation.models';

/**
 * Workflow Wizard Actions
 * 
 * Actions for wizard initialization, navigation, validation, draft persistence,
 * and workflow submission.
 * 
 * Requirements: 5.1, 5.5, 5.6, 5.7
 */

// Initialization Actions
export const initializeWizard = createAction(
  '[Workflow Wizard] Initialize Wizard',
  props<{ 
    workflowType: string; 
    steps: WizardStep[]; 
    initialData?: Partial<WorkflowData> 
  }>()
);

export const initializeWizardSuccess = createAction(
  '[Workflow Wizard] Initialize Wizard Success',
  props<{ workflowData: WorkflowData }>()
);

export const initializeWizardFailure = createAction(
  '[Workflow Wizard] Initialize Wizard Failure',
  props<{ error: string }>()
);

// Navigation Actions
export const goToStep = createAction(
  '[Workflow Wizard] Go To Step',
  props<{ stepIndex: number }>()
);

export const nextStep = createAction(
  '[Workflow Wizard] Next Step'
);

export const previousStep = createAction(
  '[Workflow Wizard] Previous Step'
);

export const setCurrentStep = createAction(
  '[Workflow Wizard] Set Current Step',
  props<{ stepIndex: number }>()
);

// Step Data Actions
export const updateStepData = createAction(
  '[Workflow Wizard] Update Step Data',
  props<{ stepId: string; data: any }>()
);

export const updateStepDataSuccess = createAction(
  '[Workflow Wizard] Update Step Data Success',
  props<{ stepId: string; data: any }>()
);

// Validation Actions
export const validateCurrentStep = createAction(
  '[Workflow Wizard] Validate Current Step'
);

export const validateCurrentStepSuccess = createAction(
  '[Workflow Wizard] Validate Current Step Success',
  props<{ validationResult: ValidationResult }>()
);

export const validateCurrentStepFailure = createAction(
  '[Workflow Wizard] Validate Current Step Failure',
  props<{ validationResult: ValidationResult }>()
);

export const markStepComplete = createAction(
  '[Workflow Wizard] Mark Step Complete',
  props<{ stepIndex: number }>()
);

// Draft Persistence Actions
// Requirement 5.5: Draft saving with data persistence
export const saveDraft = createAction(
  '[Workflow Wizard] Save Draft'
);

export const saveDraftSuccess = createAction(
  '[Workflow Wizard] Save Draft Success',
  props<{ draftId: string; savedAt: Date }>()
);

export const saveDraftFailure = createAction(
  '[Workflow Wizard] Save Draft Failure',
  props<{ error: string }>()
);

// Requirement 5.6: Draft loading with exact data restoration
export const loadDraft = createAction(
  '[Workflow Wizard] Load Draft',
  props<{ draftId: string }>()
);

export const loadDraftSuccess = createAction(
  '[Workflow Wizard] Load Draft Success',
  props<{ 
    workflowData: WorkflowData; 
    currentStepIndex: number; 
    completedSteps: number[] 
  }>()
);

export const loadDraftFailure = createAction(
  '[Workflow Wizard] Load Draft Failure',
  props<{ error: string }>()
);

// Workflow Submission Actions
// Requirement 5.7: Workflow submission with aggregated step data
export const submitWorkflow = createAction(
  '[Workflow Wizard] Submit Workflow'
);

export const submitWorkflowSuccess = createAction(
  '[Workflow Wizard] Submit Workflow Success',
  props<{ result: WorkflowResult }>()
);

export const submitWorkflowFailure = createAction(
  '[Workflow Wizard] Submit Workflow Failure',
  props<{ error: string }>()
);

// Workflow Cancellation Actions
// Requirement 5.8: Workflow cancellation with unsaved changes discard
export const cancelWorkflow = createAction(
  '[Workflow Wizard] Cancel Workflow'
);

export const resetWizard = createAction(
  '[Workflow Wizard] Reset Wizard'
);

// Error Actions
export const clearErrors = createAction(
  '[Workflow Wizard] Clear Errors'
);
