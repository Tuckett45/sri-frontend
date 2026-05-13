import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, EMPTY } from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  withLatestFrom,
  filter
} from 'rxjs/operators';

import * as AIRecommendationsActions from './ai-recommendations.actions';
import * as AIRecommendationsSelectors from './ai-recommendations.selectors';
import { RecommendationEngineService } from '../../services/recommendation-engine.service';
import { RecommendationContext } from '../../models/recommendation.models';

/**
 * AI Recommendations Effects
 * 
 * Handles side effects for AI recommendation operations including
 * fetching, accepting, rejecting, and feedback collection.
 * Implements caching with 5-minute TTL.
 * 
 * **Validates: Requirements 8.1, 8.5, 8.6, 16.2**
 */
@Injectable()
export class AIRecommendationsEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private recommendationEngine: RecommendationEngineService
  ) {}

  /**
   * Load recommendations with caching
   * **Validates: Requirements 8.1, 16.2**
   */
  loadRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.loadRecommendations),
      withLatestFrom(
        this.store.select(AIRecommendationsSelectors.selectLastFetchedAt)
      ),
      switchMap(([{ context }, lastFetchedAt]) => {
        // Service handles caching internally with 5-minute TTL
        return this.recommendationEngine.getRecommendations(context).pipe(
          map(recommendations => 
            AIRecommendationsActions.loadRecommendationsSuccess({ 
              recommendations, 
              context 
            })
          ),
          catchError(error => 
            of(AIRecommendationsActions.loadRecommendationsFailure({ 
              error: error.message || 'Failed to load recommendations' 
            }))
          )
        );
      })
    )
  );

  /**
   * Refresh recommendations (bypass cache)
   * **Validates: Requirements 8.1, 16.2**
   */
  refreshRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.refreshRecommendations),
      switchMap(({ context }) => {
        return this.recommendationEngine.refreshRecommendations(context).pipe(
          map(recommendations => 
            AIRecommendationsActions.loadRecommendationsSuccess({ 
              recommendations, 
              context 
            })
          ),
          catchError(error => 
            of(AIRecommendationsActions.loadRecommendationsFailure({ 
              error: error.message || 'Failed to refresh recommendations' 
            }))
          )
        );
      })
    )
  );

  /**
   * Accept recommendation
   * **Validates: Requirements 8.5, 8.6**
   */
  acceptRecommendation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.acceptRecommendation),
      switchMap(({ id, metadata }) => {
        return this.recommendationEngine.acceptRecommendation(id, metadata).pipe(
          map(result => 
            AIRecommendationsActions.acceptRecommendationSuccess({ id, result })
          ),
          catchError(error => 
            of(AIRecommendationsActions.acceptRecommendationFailure({ 
              id,
              error: error.message || 'Failed to accept recommendation' 
            }))
          )
        );
      })
    )
  );

  /**
   * Reject recommendation
   * **Validates: Requirements 8.5, 8.6**
   */
  rejectRecommendation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.rejectRecommendation),
      switchMap(({ id, reason }) => {
        return this.recommendationEngine.rejectRecommendation(id, reason).pipe(
          map(() => 
            AIRecommendationsActions.rejectRecommendationSuccess({ id })
          ),
          catchError(error => 
            of(AIRecommendationsActions.rejectRecommendationFailure({ 
              id,
              error: error.message || 'Failed to reject recommendation' 
            }))
          )
        );
      })
    )
  );

  /**
   * Provide feedback on recommendation
   * **Validates: Requirements 8.5, 8.6**
   */
  provideFeedback$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.provideFeedback),
      switchMap(({ id, feedback }) => {
        return this.recommendationEngine.provideFeedback(id, feedback).pipe(
          map(() => 
            AIRecommendationsActions.provideFeedbackSuccess({ id })
          ),
          catchError(error => 
            of(AIRecommendationsActions.provideFeedbackFailure({ 
              id,
              error: error.message || 'Failed to provide feedback' 
            }))
          )
        );
      })
    )
  );

  /**
   * Load recommendation metrics
   * **Validates: Requirements 8.5, 8.6**
   */
  loadRecommendationMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIRecommendationsActions.loadRecommendationMetrics),
      switchMap(() => {
        return this.recommendationEngine.getRecommendationMetrics().pipe(
          map(metrics => 
            AIRecommendationsActions.loadRecommendationMetricsSuccess({ metrics })
          ),
          catchError(error => 
            of(AIRecommendationsActions.loadRecommendationMetricsFailure({ 
              error: error.message || 'Failed to load recommendation metrics' 
            }))
          )
        );
      })
    )
  );

  /**
   * Reload recommendations after accept/reject
   * **Validates: Requirements 8.1, 8.5, 8.6**
   */
  reloadAfterAction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AIRecommendationsActions.acceptRecommendationSuccess,
        AIRecommendationsActions.rejectRecommendationSuccess
      ),
      withLatestFrom(
        this.store.select(AIRecommendationsSelectors.selectCurrentContext)
      ),
      switchMap(([action, context]) => {
        // Only reload if we have a valid context
        if (context && (context as any).type) {
          return of(AIRecommendationsActions.refreshRecommendations({ 
            context: context as RecommendationContext 
          }));
        }
        return EMPTY;
      })
    )
  );
}
