import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkflowWizardState } from './workflow-wizard.reducer';

/**
 * Workflow Wizard Selectors
 * 
 * Selectors for accessing workflow wizard state.
 */

export const selectWorkflowWizardState = createFeatureSelector<WorkflowWizardState>('workflowWizard');

// Basic selectors
export const selectWorkflowType = createSelector(
  selectWorkflowWizardState,
  (state) => state.workflowType
);

export const selectSteps = createSelector(
  selectWorkflowWizardState,
  (state) => state.steps
);

export const selectCurrentStepIndex = createSelector(
  selectWorkflowWizardState,
  (state) => state.currentStepIndex
);

export const selectCompletedSteps = createSelector(
  selectWorkflowWizardState,
  (state) => state.completedSteps
);

export const selectWorkflowData = createSelector(
  selectWorkflowWizardState,
  (state) => state.workflowData
);

export const selectAllStepData = createSelector(
  selectWorkflowWizardState,
  (state) => state.stepData
);

export const selectValidationResults = createSelector(
  selectWorkflowWizardState,
  (state) => state.validationResults
);

export const selectCurrentStepValid = createSelector(
  selectWorkflowWizardState,
  (state) => state.currentStepValid
);

export const selectSaveDraftStatus = createSelector(
  selectWorkflowWizardState,
  (state) => state.saveDraftStatus
);

export const selectSubmitting = createSelector(
  selectWorkflowWizardState,
  (state) => state.submitting
);

export const selectSubmitted = createSelector(
  selectWorkflowWizardState,
  (state) => state.submitted
);

export const selectError = createSelector(
  selectWorkflowWizardState,
  (state) => state.error
);

export const selectLoading = createSelector(
  selectWorkflowWizardState,
  (state) => state.loading
);

// Computed selectors
export const selectCurrentStep = createSelector(
  selectSteps,
  selectCurrentStepIndex,
  (steps, currentIndex) => steps[currentIndex] || null
);

export const selectCurrentStepData = createSelector(
  selectCurrentStep,
  selectAllStepData,
  (currentStep, allStepData) => {
    if (!currentStep) {
      return null;
    }
    return allStepData.get(currentStep.id) || null;
  }
);

export const selectCurrentStepValidation = createSelector(
  selectValidationResults,
  selectCurrentStepIndex,
  (validationResults, currentIndex) => validationResults[currentIndex] || {
    isValid: false,
    errors: [],
    warnings: [],
    metadata: {}
  }
);

export const selectCanProceedToNextStep = createSelector(
  selectCurrentStepValid,
  selectCurrentStepIndex,
  selectSteps,
  (isValid, currentIndex, steps) => {
    return isValid && currentIndex < steps.length - 1;
  }
);

export const selectCanGoToPreviousStep = createSelector(
  selectCurrentStepIndex,
  (currentIndex) => currentIndex > 0
);

export const selectIsLastStep = createSelector(
  selectCurrentStepIndex,
  selectSteps,
  (currentIndex, steps) => currentIndex === steps.length - 1
);

export const selectStepProgress = createSelector(
  selectCompletedSteps,
  selectSteps,
  (completedSteps, steps) => {
    if (steps.length === 0) {
      return 0;
    }
    return (completedSteps.length / steps.length) * 100;
  }
);

export const selectIsStepComplete = (stepIndex: number) => createSelector(
  selectCompletedSteps,
  (completedSteps) => completedSteps.includes(stepIndex)
);

export const selectStepDataById = (stepId: string) => createSelector(
  selectAllStepData,
  (allStepData) => allStepData.get(stepId) || null
);
