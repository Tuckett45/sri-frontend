import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, EMPTY } from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  withLatestFrom,
  tap
} from 'rxjs/operators';

import * as ForecastsActions from './forecasts.actions';
import * as ForecastsSelectors from './forecasts.selectors';
import { ForecastService } from '../../services/forecast.service';

/**
 * Forecasts Effects
 * 
 * Handles side effects for forecast operations including
 * fetching forecasts, predictions, and trends.
 * Implements caching with expiration.
 * 
 * **Validates: Requirements 13.1, 13.6, 13.7**
 */
@Injectable()
export class ForecastsEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private forecastService: ForecastService
  ) {}

  /**
   * Load forecasts with caching
   * **Validates: Requirements 13.1, 13.6**
   */
  loadForecasts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.loadForecasts),
      switchMap(({ params }) => {
        // Service handles caching internally with expiration
        return this.forecastService.getForecasts(params).pipe(
          map(forecasts => 
            ForecastsActions.loadForecastsSuccess({ 
              forecasts, 
              params 
            })
          ),
          catchError(error => 
            of(ForecastsActions.loadForecastsFailure({ 
              error: error.message || 'Failed to load forecasts' 
            }))
          )
        );
      })
    )
  );

  /**
   * Refresh forecasts (bypass cache)
   * **Validates: Requirements 13.1, 13.6**
   */
  refreshForecasts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.refreshForecasts),
      tap(() => {
        // Clear service cache before fetching
        this.forecastService.clearCache();
      }),
      switchMap(({ params }) => {
        return this.forecastService.getForecasts(params).pipe(
          map(forecasts => 
            ForecastsActions.loadForecastsSuccess({ 
              forecasts, 
              params 
            })
          ),
          catchError(error => 
            of(ForecastsActions.loadForecastsFailure({ 
              error: error.message || 'Failed to refresh forecasts' 
            }))
          )
        );
      })
    )
  );

  /**
   * Load forecast by ID
   * **Validates: Requirements 13.1**
   */
  loadForecastById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.loadForecastById),
      switchMap(({ id }) => {
        return this.forecastService.getForecastById(id).pipe(
          map(forecast => 
            ForecastsActions.loadForecastByIdSuccess({ forecast })
          ),
          catchError(error => 
            of(ForecastsActions.loadForecastByIdFailure({ 
              error: error.message || 'Failed to load forecast' 
            }))
          )
        );
      })
    )
  );

  /**
   * Load predictions
   * **Validates: Requirements 13.1**
   */
  loadPredictions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.loadPredictions),
      switchMap(({ context }) => {
        return this.forecastService.getPredictions(context).pipe(
          map(predictions => 
            ForecastsActions.loadPredictionsSuccess({ 
              predictions, 
              context 
            })
          ),
          catchError(error => 
            of(ForecastsActions.loadPredictionsFailure({ 
              error: error.message || 'Failed to load predictions' 
            }))
          )
        );
      })
    )
  );

  /**
   * Load trends
   * **Validates: Requirements 14.1**
   */
  loadTrends$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.loadTrends),
      switchMap(({ metric, timeRange }) => {
        return this.forecastService.getTrends(metric, timeRange).pipe(
          map(trends => 
            ForecastsActions.loadTrendsSuccess({ 
              trends, 
              metric, 
              timeRange 
            })
          ),
          catchError(error => 
            of(ForecastsActions.loadTrendsFailure({ 
              error: error.message || 'Failed to load trends' 
            }))
          )
        );
      })
    )
  );

  /**
   * Reload forecasts when time horizon changes
   * **Validates: Requirements 13.7**
   */
  reloadOnTimeHorizonChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.changeTimeHorizon),
      withLatestFrom(
        this.store.select(ForecastsSelectors.selectCurrentParams)
      ),
      switchMap(([{ timeHorizon }, currentParams]) => {
        // Only reload if we have previous params
        if (currentParams) {
          const updatedParams = {
            ...currentParams,
            timeHorizon
          };
          return of(ForecastsActions.loadForecasts({ params: updatedParams }));
        }
        return EMPTY;
      })
    )
  );

  /**
   * Clear service cache when clearing forecast cache
   * **Validates: Requirements 13.6**
   */
  clearServiceCache$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ForecastsActions.clearForecastCache),
      tap(() => {
        this.forecastService.clearCache();
      })
    ),
    { dispatch: false }
  );
}
