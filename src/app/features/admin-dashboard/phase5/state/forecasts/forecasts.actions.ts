import { createAction, props } from '@ngrx/store';
import {
  Forecast,
  ForecastParams,
  Prediction,
  PredictionContext,
  Trend,
  TimeRange
} from '../../models/forecast.models';

/**
 * Forecasts Actions
 * 
 * Defines all actions for managing forecasts, predictions, and trends state.
 * 
 * **Validates: Requirements 13.1, 13.6, 13.7**
 */

// Load Forecasts
export const loadForecasts = createAction(
  '[Forecasts] Load Forecasts',
  props<{ params: ForecastParams }>()
);

export const loadForecastsSuccess = createAction(
  '[Forecasts] Load Forecasts Success',
  props<{ forecasts: Forecast[]; params: ForecastParams }>()
);

export const loadForecastsFailure = createAction(
  '[Forecasts] Load Forecasts Failure',
  props<{ error: string }>()
);

// Refresh Forecasts (bypass cache)
export const refreshForecasts = createAction(
  '[Forecasts] Refresh Forecasts',
  props<{ params: ForecastParams }>()
);

// Load Forecast by ID
export const loadForecastById = createAction(
  '[Forecasts] Load Forecast By ID',
  props<{ id: string }>()
);

export const loadForecastByIdSuccess = createAction(
  '[Forecasts] Load Forecast By ID Success',
  props<{ forecast: Forecast }>()
);

export const loadForecastByIdFailure = createAction(
  '[Forecasts] Load Forecast By ID Failure',
  props<{ error: string }>()
);

// Load Predictions
export const loadPredictions = createAction(
  '[Forecasts] Load Predictions',
  props<{ context: PredictionContext }>()
);

export const loadPredictionsSuccess = createAction(
  '[Forecasts] Load Predictions Success',
  props<{ predictions: Prediction[]; context: PredictionContext }>()
);

export const loadPredictionsFailure = createAction(
  '[Forecasts] Load Predictions Failure',
  props<{ error: string }>()
);

// Load Trends
export const loadTrends = createAction(
  '[Forecasts] Load Trends',
  props<{ metric: string; timeRange: TimeRange }>()
);

export const loadTrendsSuccess = createAction(
  '[Forecasts] Load Trends Success',
  props<{ trends: Trend[]; metric: string; timeRange: TimeRange }>()
);

export const loadTrendsFailure = createAction(
  '[Forecasts] Load Trends Failure',
  props<{ error: string }>()
);

// Change Time Horizon
export const changeTimeHorizon = createAction(
  '[Forecasts] Change Time Horizon',
  props<{ timeHorizon: 'week' | 'month' | 'quarter' | 'year' }>()
);

// Select Forecast
export const selectForecast = createAction(
  '[Forecasts] Select Forecast',
  props<{ forecast: Forecast }>()
);

// Clear Actions
export const clearForecasts = createAction(
  '[Forecasts] Clear Forecasts'
);

export const clearErrors = createAction(
  '[Forecasts] Clear Errors'
);

// Cache Management
export const clearForecastCache = createAction(
  '[Forecasts] Clear Forecast Cache'
);
