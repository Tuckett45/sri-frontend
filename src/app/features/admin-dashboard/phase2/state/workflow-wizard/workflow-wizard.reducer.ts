import { createReducer, on } from '@ngrx/store';
import { WizardStep, WorkflowData, SaveStatus } from '../../models/workflow.models';
import { ValidationResult } from '../../models/validation.models';
import * as WorkflowWizardActions from './workflow-wizard.actions';

/**
 * Workflow Wizard State
 * 
 * Manages the state of the workflow wizard including current step,
 * completed steps, workflow data, validation results, and save status.
 * 
 * Requirements: 5.1, 5.5, 5.6, 5.7
 */
export interface WorkflowWizardState {
  // Wizard configuration
  workflowType: string | null;
  steps: WizardStep[];
  
  // Navigation state
  currentStepIndex: number;
  completedSteps: number[];
  
  // Workflow data
  workflowData: WorkflowData | null;
  stepData: Map<string, any>;
  
  // Validation
  validationResults: ValidationResult[];
  currentStepValid: boolean;
  
  // Draft persistence
  draftId: string | null;
  saveDraftStatus: SaveStatus;
  
  // Submission
  submitting: boolean;
  submitted: boolean;
  
  // Error handling
  error: string | null;
  loading: boolean;
}

export const initialState: WorkflowWizardState = {
  workflowType: null,
  steps: [],
  currentStepIndex: 0,
  completedSteps: [],
  workflowData: null,
  stepData: new Map(),
  validationResults: [],
  currentStepValid: false,
  draftId: null,
  saveDraftStatus: {
    saving: false,
    saved: false
  },
  submitting: false,
  submitted: false,
  error: null,
  loading: false
};

export const workflowWizardReducer = createReducer(
  initialState,

  // Initialization
  on(WorkflowWizardActions.initializeWizard, (state, { workflowType, steps, initialData }) => ({
    ...state,
    workflowType,
    steps,
    currentStepIndex: 0,
    completedSteps: [],
    workflowData: initialData ? {
      type: workflowType,
      steps: new Map(),
      metadata: initialData.metadata || {},
      status: 'draft' as const,
      createdBy: initialData.createdBy || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...initialData
    } : null,
    loading: true,
    error: null
  })),

  on(WorkflowWizardActions.initializeWizardSuccess, (state, { workflowData }) => ({
    ...state,
    workflowData,
    loading: false
  })),

  on(WorkflowWizardActions.initializeWizardFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Navigation
  on(WorkflowWizardActions.setCurrentStep, (state, { stepIndex }) => ({
    ...state,
    currentStepIndex: stepIndex
  })),

  on(WorkflowWizardActions.nextStep, (state) => {
    const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
    return {
      ...state,
      currentStepIndex: nextIndex
    };
  }),

  on(WorkflowWizardActions.previousStep, (state) => {
    const prevIndex = Math.max(state.currentStepIndex - 1, 0);
    return {
      ...state,
      currentStepIndex: prevIndex
    };
  }),

  on(WorkflowWizardActions.goToStep, (state, { stepIndex }) => {
    // Only allow navigation to completed steps or next step
    const canNavigate = state.completedSteps.includes(stepIndex) || 
                       stepIndex === state.currentStepIndex + 1;
    
    return canNavigate ? {
      ...state,
      currentStepIndex: stepIndex
    } : state;
  }),

  // Step Data
  on(WorkflowWizardActions.updateStepData, (state, { stepId, data }) => {
    const newStepData = new Map(state.stepData);
    newStepData.set(stepId, data);
    
    return {
      ...state,
      stepData: newStepData
    };
  }),

  on(WorkflowWizardActions.updateStepDataSuccess, (state, { stepId, data }) => {
    const newStepData = new Map(state.stepData);
    newStepData.set(stepId, data);
    
    return {
      ...state,
      stepData: newStepData
    };
  }),

  // Validation
  on(WorkflowWizardActions.validateCurrentStep, (state) => ({
    ...state,
    loading: true
  })),

  on(WorkflowWizardActions.validateCurrentStepSuccess, (state, { validationResult }) => {
    const newValidationResults = [...state.validationResults];
    newValidationResults[state.currentStepIndex] = validationResult;
    
    // Mark step as complete if valid
    const newCompletedSteps = validationResult.valid && 
                             !state.completedSteps.includes(state.currentStepIndex)
      ? [...state.completedSteps, state.currentStepIndex]
      : state.completedSteps;
    
    return {
      ...state,
      validationResults: newValidationResults,
      currentStepValid: validationResult.valid,
      completedSteps: newCompletedSteps,
      loading: false
    };
  }),

  on(WorkflowWizardActions.validateCurrentStepFailure, (state, { validationResult }) => {
    const newValidationResults = [...state.validationResults];
    newValidationResults[state.currentStepIndex] = validationResult;
    
    return {
      ...state,
      validationResults: newValidationResults,
      currentStepValid: false,
      loading: false
    };
  }),

  on(WorkflowWizardActions.markStepComplete, (state, { stepIndex }) => {
    const newCompletedSteps = state.completedSteps.includes(stepIndex)
      ? state.completedSteps
      : [...state.completedSteps, stepIndex];
    
    return {
      ...state,
      completedSteps: newCompletedSteps
    };
  }),

  // Draft Persistence
  on(WorkflowWizardActions.saveDraft, (state) => ({
    ...state,
    saveDraftStatus: {
      saving: true,
      saved: false
    }
  })),

  on(WorkflowWizardActions.saveDraftSuccess, (state, { draftId, savedAt }) => ({
    ...state,
    draftId,
    saveDraftStatus: {
      saving: false,
      saved: true,
      lastSavedAt: savedAt
    }
  })),

  on(WorkflowWizardActions.saveDraftFailure, (state, { error }) => ({
    ...state,
    saveDraftStatus: {
      saving: false,
      saved: false,
      error
    }
  })),

  on(WorkflowWizardActions.loadDraft, (state) => ({
    ...state,
    loading: true
  })),

  on(WorkflowWizardActions.loadDraftSuccess, (state, { workflowData, currentStepIndex, completedSteps }) => ({
    ...state,
    workflowData,
    currentStepIndex,
    completedSteps,
    loading: false
  })),

  on(WorkflowWizardActions.loadDraftFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Workflow Submission
  on(WorkflowWizardActions.submitWorkflow, (state) => ({
    ...state,
    submitting: true,
    error: null
  })),

  on(WorkflowWizardActions.submitWorkflowSuccess, (state) => ({
    ...state,
    submitting: false,
    submitted: true
  })),

  on(WorkflowWizardActions.submitWorkflowFailure, (state, { error }) => ({
    ...state,
    submitting: false,
    error
  })),

  // Workflow Cancellation
  on(WorkflowWizardActions.cancelWorkflow, () => initialState),

  on(WorkflowWizardActions.resetWizard, () => initialState),

  // Error Handling
  on(WorkflowWizardActions.clearErrors, (state) => ({
    ...state,
    error: null
  }))
);
