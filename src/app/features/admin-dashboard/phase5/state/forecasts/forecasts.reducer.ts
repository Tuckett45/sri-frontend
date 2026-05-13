import { createReducer, on } from '@ngrx/store';
import { 
  Forecast, 
  ForecastParams, 
  Prediction, 
  PredictionContext, 
  Trend, 
  TimeRange 
} from '../../models/forecast.models';
import * as ForecastsActions from './forecasts.actions';

/**
 * Forecasts State
 * 
 * Manages the state of forecasts, predictions, and trends including
 * loaded data, loading status, errors, and cache metadata.
 * 
 * **Validates: Requirements 13.1, 13.6, 13.7**
 */
export interface ForecastsState {
  // Forecasts data
  forecasts: Forecast[];
  selectedForecast: Forecast | null;
  
  // Predictions data
  predictions: Prediction[];
  
  // Trends data
  trends: Trend[];
  
  // Current parameters
  currentParams: ForecastParams | null;
  currentPredictionContext: PredictionContext | null;
  currentTrendMetric: string | null;
  currentTrendTimeRange: TimeRange | null;
  currentTimeHorizon: 'week' | 'month' | 'quarter' | 'year';
  
  // Loading states
  loadingForecasts: boolean;
  loadingPredictions: boolean;
  loadingTrends: boolean;
  
  // Error handling
  error: string | null;
  
  // Cache metadata
  lastForecastFetchedAt: Date | null;
  lastPredictionFetchedAt: Date | null;
  lastTrendFetchedAt: Date | null;
}

export const initialState: ForecastsState = {
  forecasts: [],
  selectedForecast: null,
  predictions: [],
  trends: [],
  currentParams: null,
  currentPredictionContext: null,
  currentTrendMetric: null,
  currentTrendTimeRange: null,
  currentTimeHorizon: 'month',
  loadingForecasts: false,
  loadingPredictions: false,
  loadingTrends: false,
  error: null,
  lastForecastFetchedAt: null,
  lastPredictionFetchedAt: null,
  lastTrendFetchedAt: null
};

export const forecastsReducer = createReducer(
  initialState,

  // Load Forecasts
  on(ForecastsActions.loadForecasts, (state, { params }) => ({
    ...state,
    currentParams: params,
    loadingForecasts: true,
    error: null
  })),

  on(ForecastsActions.loadForecastsSuccess, (state, { forecasts, params }) => ({
    ...state,
    forecasts,
    currentParams: params,
    loadingForecasts: false,
    lastForecastFetchedAt: new Date()
  })),

  on(ForecastsActions.loadForecastsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingForecasts: false
  })),

  // Refresh Forecasts
  on(ForecastsActions.refreshForecasts, (state, { params }) => ({
    ...state,
    currentParams: params,
    loadingForecasts: true,
    error: null
  })),

  // Load Forecast by ID
  on(ForecastsActions.loadForecastById, (state) => ({
    ...state,
    loadingForecasts: true,
    error: null
  })),

  on(ForecastsActions.loadForecastByIdSuccess, (state, { forecast }) => {
    // Add or update forecast in the list
    const existingIndex = state.forecasts.findIndex(f => f.id === forecast.id);
    const updatedForecasts = existingIndex >= 0
      ? state.forecasts.map((f, i) => i === existingIndex ? forecast : f)
      : [...state.forecasts, forecast];

    return {
      ...state,
      forecasts: updatedForecasts,
      selectedForecast: forecast,
      loadingForecasts: false
    };
  }),

  on(ForecastsActions.loadForecastByIdFailure, (state, { error }) => ({
    ...state,
    error,
    loadingForecasts: false
  })),

  // Load Predictions
  on(ForecastsActions.loadPredictions, (state, { context }) => ({
    ...state,
    currentPredictionContext: context,
    loadingPredictions: true,
    error: null
  })),

  on(ForecastsActions.loadPredictionsSuccess, (state, { predictions, context }) => ({
    ...state,
    predictions,
    currentPredictionContext: context,
    loadingPredictions: false,
    lastPredictionFetchedAt: new Date()
  })),

  on(ForecastsActions.loadPredictionsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingPredictions: false
  })),

  // Load Trends
  on(ForecastsActions.loadTrends, (state, { metric, timeRange }) => ({
    ...state,
    currentTrendMetric: metric,
    currentTrendTimeRange: timeRange,
    loadingTrends: true,
    error: null
  })),

  on(ForecastsActions.loadTrendsSuccess, (state, { trends, metric, timeRange }) => ({
    ...state,
    trends,
    currentTrendMetric: metric,
    currentTrendTimeRange: timeRange,
    loadingTrends: false,
    lastTrendFetchedAt: new Date()
  })),

  on(ForecastsActions.loadTrendsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingTrends: false
  })),

  // Change Time Horizon
  on(ForecastsActions.changeTimeHorizon, (state, { timeHorizon }) => ({
    ...state,
    currentTimeHorizon: timeHorizon,
    // Clear forecasts when time horizon changes to force reload
    forecasts: [],
    predictions: [],
    trends: []
  })),

  // Select Forecast
  on(ForecastsActions.selectForecast, (state, { forecast }) => ({
    ...state,
    selectedForecast: forecast
  })),

  // Clear Actions
  on(ForecastsActions.clearForecasts, () => initialState),

  on(ForecastsActions.clearErrors, (state) => ({
    ...state,
    error: null
  })),

  // Cache Management
  on(ForecastsActions.clearForecastCache, (state) => ({
    ...state,
    lastForecastFetchedAt: null,
    lastPredictionFetchedAt: null,
    lastTrendFetchedAt: null
  }))
);
