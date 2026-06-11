import { createReducer, on } from '@ngrx/store';
import { DashboardState, initialDashboardState } from './dashboard.state';
import * as DashboardActions from './dashboard.actions';
import { DashboardQuote } from '../../models/quote-workflow.model';

/**
 * Helper to update a quote record across all three record arrays.
 */
function updateQuoteInArrays(state: DashboardState, updatedQuote: DashboardQuote): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => q.id === updatedQuote.id ? updatedQuote : q);

  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}

export const dashboardReducer = createReducer(
  initialDashboardState,

  // Load Dashboard
  on(DashboardActions.loadDashboard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DashboardActions.loadDashboardSuccess, (state, { response }) => ({
    ...state,
    rfpRecords: response.rfpRecords,
    poTrackingRecords: response.poTrackingRecords,
    projectTrackingRecords: response.projectTrackingRecords,
    loading: false,
    error: null
  })),

  on(DashboardActions.loadDashboardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Filters
  on(DashboardActions.updateFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  // Load Users
  on(DashboardActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    users
  })),

  // Inline Edit
  on(DashboardActions.updateDashboardFields, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(DashboardActions.updateDashboardFieldsSuccess, (state, { quote }) => ({
    ...updateQuoteInArrays(state, quote),
    saving: false,
    error: null
  })),

  on(DashboardActions.updateDashboardFieldsFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // BOM Tracking
  on(DashboardActions.createBomTracking, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(DashboardActions.createBomTrackingSuccess, (state, { quoteId, tracking }) => {
    const projectTrackingRecords = state.projectTrackingRecords.map(q => {
      if (q.id === quoteId) {
        return { ...q, bomTrackings: [...q.bomTrackings, tracking] };
      }
      return q;
    });
    return {
      ...state,
      projectTrackingRecords,
      saving: false,
      error: null
    };
  }),

  on(DashboardActions.createBomTrackingFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  }))
);
