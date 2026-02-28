import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  withLatestFrom, 
  tap,
  mergeMap
} from 'rxjs/operators';

import * as WorkflowWizardActions from './workflow-wizard.actions';
import * as WorkflowWizardSelectors from './workflow-wizard.selectors';
import { WorkflowData } from '../../models/workflow.models';
import { ValidationEngineService } from '../../services/validation-engine.service';
import { AdminWorkflowService } from '../../services/workflow.service';

/**
 * Workflow Wizard Effects
 * 
 * Handles side effects for wizard operations including validation,
 * draft persistence, and workflow submission.
 * 
 * Requirements: 5.1, 5.5, 5.6, 5.7
 */
@Injectable()
export class WorkflowWizardEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private validationEngine: ValidationEngineService,
    private workflowService: AdminWorkflowService
  ) {}

  /**
   * Validate current step before proceeding
   * Requirement 5.2: Step validation before progression
   */
  validateCurrentStep$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.validateCurrentStep),
      withLatestFrom(
        this.store.select(WorkflowWizardSelectors.selectCurrentStep),
        this.store.select(WorkflowWizardSelectors.selectCurrentStepData)
      ),
      switchMap(([action, currentStep, stepData]) => {
        if (!currentStep) {
          return of(WorkflowWizardActions.validateCurrentStepFailure({
            validationResult: {
              isValid: false,
              errors: [{ 
                field: 'step', 
                message: 'No current step', 
                code: 'NO_STEP',
                severity: 'error'
              }],
              warnings: [],
              metadata: {}
            }
          }));
        }

        return this.validationEngine.validateStep(currentStep, stepData).pipe(
          map(validationResult => {
            if (validationResult.isValid) {
              return WorkflowWizardActions.validateCurrentStepSuccess({ validationResult });
            } else {
              return WorkflowWizardActions.validateCurrentStepFailure({ validationResult });
            }
          }),
          catchError(error => of(WorkflowWizardActions.validateCurrentStepFailure({
            validationResult: {
              isValid: false,
              errors: [{ 
                field: 'validation', 
                message: error.message || 'Validation failed', 
                code: 'VALIDATION_ERROR',
                severity: 'error'
              }],
              warnings: [],
              metadata: {}
            }
          })))
        );
      })
    )
  );

  /**
   * Navigate to next step after successful validation
   */
  navigateAfterValidation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.validateCurrentStepSuccess),
      map(() => WorkflowWizardActions.nextStep())
    )
  );

  /**
   * Save workflow draft
   * Requirement 5.5: Draft saving with data persistence
   */
  saveDraft$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.saveDraft),
      withLatestFrom(
        this.store.select(WorkflowWizardSelectors.selectWorkflowData),
        this.store.select(WorkflowWizardSelectors.selectCurrentStepIndex),
        this.store.select(WorkflowWizardSelectors.selectCompletedSteps),
        this.store.select(WorkflowWizardSelectors.selectAllStepData)
      ),
      switchMap(([action, workflowData, currentStepIndex, completedSteps, stepData]) => {
        if (!workflowData) {
          return of(WorkflowWizardActions.saveDraftFailure({ 
            error: 'No workflow data to save' 
          }));
        }

        const draft = {
          ...workflowData,
          currentStepIndex,
          completedSteps,
          stepData: Object.fromEntries(stepData),
          updatedAt: new Date()
        };

        return this.workflowService.saveDraft(draft).pipe(
          map(draftId => WorkflowWizardActions.saveDraftSuccess({ 
            draftId, 
            savedAt: new Date() 
          })),
          catchError(error => of(WorkflowWizardActions.saveDraftFailure({ 
            error: error.message || 'Failed to save draft' 
          })))
        );
      })
    )
  );

  /**
   * Load workflow draft
   * Requirement 5.6: Draft loading with exact data restoration
   */
  loadDraft$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.loadDraft),
      switchMap(({ draftId }) => {
        return this.workflowService.loadDraft(draftId).pipe(
          map(draft => {
            // Convert WorkflowDraft to WorkflowData format
            const workflowData: WorkflowData = {
              type: draft.workflowType,
              steps: draft.stepData,
              metadata: {},
              status: 'draft',
              createdBy: '',
              createdAt: draft.createdAt,
              updatedAt: draft.updatedAt
            };
            
            return WorkflowWizardActions.loadDraftSuccess({
              workflowData,
              currentStepIndex: draft.currentStepIndex,
              completedSteps: draft.completedSteps
            });
          }),
          catchError(error => of(WorkflowWizardActions.loadDraftFailure({ 
            error: error.message || 'Failed to load draft' 
          })))
        );
      })
    )
  );

  /**
   * Submit workflow
   * Requirement 5.7: Workflow submission with aggregated step data
   */
  submitWorkflow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.submitWorkflow),
      withLatestFrom(
        this.store.select(WorkflowWizardSelectors.selectWorkflowData),
        this.store.select(WorkflowWizardSelectors.selectAllStepData)
      ),
      switchMap(([action, workflowData, stepData]) => {
        if (!workflowData) {
          return of(WorkflowWizardActions.submitWorkflowFailure({ 
            error: 'No workflow data to submit' 
          }));
        }

        // Aggregate all step data
        const aggregatedData = {
          ...workflowData,
          steps: stepData,
          status: 'completed' as const,
          updatedAt: new Date()
        };

        return this.workflowService.submitWorkflow(aggregatedData).pipe(
          map(result => WorkflowWizardActions.submitWorkflowSuccess({ result })),
          catchError(error => of(WorkflowWizardActions.submitWorkflowFailure({ 
            error: error.message || 'Failed to submit workflow' 
          })))
        );
      })
    )
  );

  /**
   * Update step data
   */
  updateStepData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkflowWizardActions.updateStepData),
      map(({ stepId, data }) => WorkflowWizardActions.updateStepDataSuccess({ stepId, data }))
    )
  );
}
