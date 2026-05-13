import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ForecastsState } from './forecasts.reducer';

/**
 * Forecasts Selectors
 * 
 * Provides selectors for accessing forecasts state.
 * 
 * **Validates: Requirements 13.1, 13.6, 13.7**
 */

// Feature selector
export const selectForecastsState = createFeatureSelector<ForecastsState>('forecasts');

// Forecasts selectors
export const selectForecasts = createSelector(
  selectForecastsState,
  (state) => state.forecasts
);

export const selectSelectedForecast = createSelector(
  selectForecastsState,
  (state) => state.selectedForecast
);

export const selectForecastById = (id: string) => createSelector(
  selectForecasts,
  (forecasts) => forecasts.find(f => f.id === id)
);

// Predictions selectors
export const selectPredictions = createSelector(
  selectForecastsState,
  (state) => state.predictions
);

// Trends selectors
export const selectTrends = createSelector(
  selectForecastsState,
  (state) => state.trends
);

// Current parameters selectors
export const selectCurrentParams = createSelector(
  selectForecastsState,
  (state) => state.currentParams
);

export const selectCurrentPredictionContext = createSelector(
  selectForecastsState,
  (state) => state.currentPredictionContext
);

export const selectCurrentTrendMetric = createSelector(
  selectForecastsState,
  (state) => state.currentTrendMetric
);

export const selectCurrentTrendTimeRange = createSelector(
  selectForecastsState,
  (state) => state.currentTrendTimeRange
);

export const selectCurrentTimeHorizon = createSelector(
  selectForecastsState,
  (state) => state.currentTimeHorizon
);

// Loading state selectors
export const selectLoadingForecasts = createSelector(
  selectForecastsState,
  (state) => state.loadingForecasts
);

export const selectLoadingPredictions = createSelector(
  selectForecastsState,
  (state) => state.loadingPredictions
);

export const selectLoadingTrends = createSelector(
  selectForecastsState,
  (state) => state.loadingTrends
);

export const selectIsLoading = createSelector(
  selectLoadingForecasts,
  selectLoadingPredictions,
  selectLoadingTrends,
  (loadingForecasts, loadingPredictions, loadingTrends) => 
    loadingForecasts || loadingPredictions || loadingTrends
);

// Error selector
export const selectError = createSelector(
  selectForecastsState,
  (state) => state.error
);

// Cache metadata selectors
export const selectLastForecastFetchedAt = createSelector(
  selectForecastsState,
  (state) => state.lastForecastFetchedAt
);

export const selectLastPredictionFetchedAt = createSelector(
  selectForecastsState,
  (state) => state.lastPredictionFetchedAt
);

export const selectLastTrendFetchedAt = createSelector(
  selectForecastsState,
  (state) => state.lastTrendFetchedAt
);

// Computed selectors
export const selectForecastsCount = createSelector(
  selectForecasts,
  (forecasts) => forecasts.length
);

export const selectPredictionsCount = createSelector(
  selectPredictions,
  (predictions) => predictions.length
);

export const selectTrendsCount = createSelector(
  selectTrends,
  (trends) => trends.length
);

// Filter forecasts by metric
export const selectForecastsByMetric = (metric: string) => createSelector(
  selectForecasts,
  (forecasts) => forecasts.filter(f => f.metric === metric)
);

// Filter forecasts by time horizon
export const selectForecastsByTimeHorizon = (timeHorizon: string) => createSelector(
  selectForecasts,
  (forecasts) => forecasts.filter(f => f.timeHorizon === timeHorizon)
);

// Get active forecasts (not expired)
export const selectActiveForecasts = createSelector(
  selectForecasts,
  (forecasts) => {
    const now = new Date();
    return forecasts.filter(f => new Date(f.expiresAt) > now);
  }
);

// Get expired forecasts
export const selectExpiredForecasts = createSelector(
  selectForecasts,
  (forecasts) => {
    const now = new Date();
    return forecasts.filter(f => new Date(f.expiresAt) <= now);
  }
);

// Filter predictions by type
export const selectPredictionsByType = (type: string) => createSelector(
  selectPredictions,
  (predictions) => predictions.filter(p => p.type === type)
);

// Filter predictions by impact
export const selectPredictionsByImpact = (impact: string) => createSelector(
  selectPredictions,
  (predictions) => predictions.filter(p => p.impact === impact)
);

// Get high-impact predictions
export const selectHighImpactPredictions = createSelector(
  selectPredictions,
  (predictions) => predictions.filter(p => p.impact === 'high' || p.impact === 'critical')
);
