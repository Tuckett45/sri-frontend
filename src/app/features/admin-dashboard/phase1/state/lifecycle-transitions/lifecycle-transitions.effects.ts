import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import { LifecycleService } from '../../services/lifecycle.service';
import * as LifecycleActions from './lifecycle-transitions.actions';
import * as LifecycleSelectors from './lifecycle-transitions.selectors';

/**
 * Lifecycle Transitions Effects
 * 
 * Handles side effects for lifecycle state management.
 * Requirements: 4.1, 4.7
 */
@Injectable()
export class LifecycleTransitionsEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private lifecycleService: LifecycleService
  ) {}

  /**
   * Load lifecycle state effect
   */
  loadLifecycleState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.loadLifecycleState),
      switchMap(({ entityType, entityId }) =>
        this.lifecycleService.getLifecycleState(entityType, entityId).pipe(
          map(state =>
            LifecycleActions.loadLifecycleStateSuccess({
              entityType,
              entityId,
              state
            })
          ),
          catchError(error =>
            of(
              LifecycleActions.loadLifecycleStateFailure({
                error: error.message || 'Failed to load lifecycle state'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load lifecycle state success - trigger loading of transitions
   */
  loadLifecycleStateSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.loadLifecycleStateSuccess),
      map(({ entityType, entityId }) =>
        LifecycleActions.loadAvailableTransitions({ entityType, entityId })
      )
    )
  );

  /**
   * Load available transitions effect
   */
  loadAvailableTransitions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.loadAvailableTransitions),
      switchMap(({ entityType, entityId }) =>
        this.lifecycleService.getAvailableTransitions(entityType, entityId).pipe(
          map(transitions =>
            LifecycleActions.loadAvailableTransitionsSuccess({
              entityType,
              entityId,
              transitions
            })
          ),
          catchError(error =>
            of(
              LifecycleActions.loadAvailableTransitionsFailure({
                error: error.message || 'Failed to load available transitions'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load transition history effect
   */
  loadTransitionHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.loadTransitionHistory),
      switchMap(({ entityType, entityId }) =>
        this.lifecycleService.getTransitionHistory(entityType, entityId).pipe(
          map(history =>
            LifecycleActions.loadTransitionHistorySuccess({
              entityType,
              entityId,
              history
            })
          ),
          catchError(error =>
            of(
              LifecycleActions.loadTransitionHistoryFailure({
                error: error.message || 'Failed to load transition history'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load pending approvals effect
   */
  loadPendingApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.loadPendingApprovals),
      switchMap(({ entityType, entityId }) =>
        this.lifecycleService.getPendingApprovals(entityType, entityId).pipe(
          map(approvals =>
            LifecycleActions.loadPendingApprovalsSuccess({
              entityType,
              entityId,
              approvals
            })
          ),
          catchError(error =>
            of(
              LifecycleActions.loadPendingApprovalsFailure({
                error: error.message || 'Failed to load pending approvals'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Validate transition effect
   */
  validateTransition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.validateTransition),
      withLatestFrom(
        this.store.select(LifecycleSelectors.selectLifecycleTransitionsState)
      ),
      switchMap(([action, state]) => {
        const { entityType, entityId, transitionId, data } = action;
        const key = `${entityType}:${entityId}`;
        
        const currentState = state.currentStates[key];
        const transitions = state.availableTransitions[key] || [];
        const transition = transitions.find(t => t.id === transitionId);
        
        if (!currentState || !transition) {
          return of(
            LifecycleActions.validateTransitionFailure({
              error: 'Invalid state or transition'
            })
          );
        }
        
        // Find target state (in a real app, this would come from the backend)
        const targetState = {
          id: transition.toState,
          name: transition.toState,
          description: '',
          type: 'active' as const,
          allowedTransitions: [],
          requiredFields: [],
          validations: []
        };
        
        return this.lifecycleService
          .validateTransition(currentState, targetState, transition, data)
          .pipe(
            map(result =>
              LifecycleActions.validateTransitionSuccess({ result })
            ),
            catchError(error =>
              of(
                LifecycleActions.validateTransitionFailure({
                  error: error.message || 'Validation failed'
                })
              )
            )
          );
      })
    )
  );

  /**
   * Execute transition effect
   */
  executeTransition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.executeTransition),
      switchMap(({ entityType, entityId, request }) =>
        this.lifecycleService.executeTransition(entityType, entityId, request).pipe(
          switchMap(transition => [
            LifecycleActions.executeTransitionSuccess({
              entityType,
              entityId,
              transition
            }),
            // Reload lifecycle state after successful transition
            LifecycleActions.loadLifecycleState({ entityType, entityId })
          ]),
          catchError(error =>
            of(
              LifecycleActions.executeTransitionFailure({
                error: error.message || 'Failed to execute transition'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Request approval effect
   */
  requestApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.requestApproval),
      switchMap(({ entityType, entityId, transitionId, reason, metadata }) =>
        this.lifecycleService
          .createApprovalRequest(entityType, entityId, transitionId, reason, metadata)
          .pipe(
            map(approval =>
              LifecycleActions.requestApprovalSuccess({
                entityType,
                entityId,
                approval
              })
            ),
            catchError(error =>
              of(
                LifecycleActions.requestApprovalFailure({
                  error: error.message || 'Failed to request approval'
                })
              )
            )
          )
      )
    )
  );

  /**
   * Approve transition effect
   */
  approveTransition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.approveTransition),
      switchMap(({ approvalId, reason }) =>
        this.lifecycleService.approveTransition(approvalId, reason).pipe(
          map(approval =>
            LifecycleActions.approveTransitionSuccess({ approval })
          ),
          catchError(error =>
            of(
              LifecycleActions.approveTransitionFailure({
                error: error.message || 'Failed to approve transition'
              })
            )
          )
        )
      )
    )
  );

  /**
   * Reject transition effect
   */
  rejectTransition$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LifecycleActions.rejectTransition),
      switchMap(({ approvalId, reason }) =>
        this.lifecycleService.rejectTransition(approvalId, reason).pipe(
          map(approval =>
            LifecycleActions.rejectTransitionSuccess({ approval })
          ),
          catchError(error =>
            of(
              LifecycleActions.rejectTransitionFailure({
                error: error.message || 'Failed to reject transition'
              })
            )
          )
        )
      )
    )
  );
}
