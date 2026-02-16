/**
 * Reporting Reducer
 * Manages reporting state updates
 */

import { createReducer, on } from '@ngrx/store';
import { ReportingState } from './reporting.state';
import * as ReportingActions from './reporting.actions';

// Initial state
export const initialState: ReportingState = {
  dashboard: null,
  utilization: null,
  performance: null,
  kpis: [],
  loading: false,
  error: null
};

// Reducer
export const reportingReducer = createReducer(
  initialState,

  // Load Dashboard
  on(ReportingActions.loadDashboard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ReportingActions.loadDashboardSuccess, (state, { dashboard }) => ({
    ...state,
    dashboard,
    loading: false,
    error: null
  })),

  on(ReportingActions.loadDashboardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Utilization Report
  on(ReportingActions.loadUtilization, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ReportingActions.loadUtilizationSuccess, (state, { utilization }) => ({
    ...state,
    utilization,
    loading: false,
    error: null
  })),

  on(ReportingActions.loadUtilizationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Job Performance Report
  on(ReportingActions.loadJobPerformance, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ReportingActions.loadJobPerformanceSuccess, (state, { performance }) => ({
    ...state,
    performance,
    loading: false,
    error: null
  })),

  on(ReportingActions.loadJobPerformanceFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load KPIs
  on(ReportingActions.loadKPIs, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ReportingActions.loadKPIsSuccess, (state, { kpis }) => ({
    ...state,
    kpis,
    loading: false,
    error: null
  })),

  on(ReportingActions.loadKPIsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Refresh Dashboard (triggers loadDashboard)
  on(ReportingActions.refreshDashboard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  // Clear Reports
  on(ReportingActions.clearReports, () => initialState)
);
