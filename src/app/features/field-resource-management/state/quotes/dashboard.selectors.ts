import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.state';
import { DashboardQuote } from '../../models/quote-workflow.model';

export const selectDashboardState = createFeatureSelector<DashboardState>('dashboard');

export const selectRfpRecords = createSelector(
  selectDashboardState,
  (state): DashboardQuote[] => state.rfpRecords
);

export const selectPoTrackingRecords = createSelector(
  selectDashboardState,
  (state): DashboardQuote[] => state.poTrackingRecords
);

export const selectProjectTrackingRecords = createSelector(
  selectDashboardState,
  (state): DashboardQuote[] => state.projectTrackingRecords
);

export const selectDashboardLoading = createSelector(
  selectDashboardState,
  (state): boolean => state.loading
);

export const selectDashboardSaving = createSelector(
  selectDashboardState,
  (state): boolean => state.saving
);

export const selectDashboardError = createSelector(
  selectDashboardState,
  (state): string | null => state.error
);

export const selectDashboardFilters = createSelector(
  selectDashboardState,
  (state) => state.filters
);

export const selectDashboardUsers = createSelector(
  selectDashboardState,
  (state) => state.users
);
