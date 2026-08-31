/**
 * Team Requests Selectors
 * Provides memoized selectors for accessing team PTO and overtime request state.
 * Used by managers to view requests from their direct reports.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  TEAM_REQUESTS_FEATURE_KEY,
  TeamRequestsState,
  teamPtoAdapter,
  teamOvertimeAdapter
} from './team-requests.reducer';

// ─── Feature Selector ───────────────────────────────────────────────────────────

export const selectTeamRequestsState = createFeatureSelector<TeamRequestsState>(
  TEAM_REQUESTS_FEATURE_KEY
);

// ─── Entity Adapter Selectors ───────────────────────────────────────────────────

const { selectAll: selectAllTeamPto } = teamPtoAdapter.getSelectors();
const { selectAll: selectAllTeamOvertime } = teamOvertimeAdapter.getSelectors();

// ─── Team PTO Selectors ─────────────────────────────────────────────────────────

/** Select all team PTO requests from the team state slice */
export const selectAllTeamPtoRequests = createSelector(
  selectTeamRequestsState,
  (state) => selectAllTeamPto(state.teamPto)
);

/** Select team PTO requests filtered by department (uses `market` field on PTO requests) */
export const selectTeamPtoByDepartment = (department: string) =>
  createSelector(
    selectAllTeamPtoRequests,
    (requests) =>
      department === 'All Departments'
        ? requests
        : requests.filter((r) => r.market === department)
  );

/** Derive unique sorted department options from loaded team PTO requests (based on `market` field) */
export const selectTeamPtoDepartments = createSelector(
  selectAllTeamPtoRequests,
  (requests) =>
    [...new Set(requests.map((r) => r.market).filter(Boolean))].sort() as string[]
);

/** Select loading state for team PTO requests */
export const selectTeamPtoLoading = createSelector(
  selectTeamRequestsState,
  (state) => state.teamPto.loading
);

/** Select error state for team PTO requests */
export const selectTeamPtoError = createSelector(
  selectTeamRequestsState,
  (state) => state.teamPto.error
);

// ─── Team Overtime Selectors ────────────────────────────────────────────────────

/** Select all team overtime requests from the team state slice */
export const selectAllTeamOvertimeRequests = createSelector(
  selectTeamRequestsState,
  (state) => selectAllTeamOvertime(state.teamOvertime)
);

/** Select team overtime requests filtered by department (uses `department` field on overtime requests) */
export const selectTeamOvertimeByDepartment = (department: string) =>
  createSelector(
    selectAllTeamOvertimeRequests,
    (requests) =>
      department === 'All Departments'
        ? requests
        : requests.filter((r) => r.department === department)
  );

/** Derive unique sorted department options from loaded team overtime requests (based on `department` field) */
export const selectTeamOvertimeDepartments = createSelector(
  selectAllTeamOvertimeRequests,
  (requests) =>
    [...new Set(requests.map((r) => r.department).filter(Boolean))].sort()
);

/** Select loading state for team overtime requests */
export const selectTeamOvertimeLoading = createSelector(
  selectTeamRequestsState,
  (state) => state.teamOvertime.loading
);

/** Select error state for team overtime requests */
export const selectTeamOvertimeError = createSelector(
  selectTeamRequestsState,
  (state) => state.teamOvertime.error
);

// ─── Direct Reports Selectors ───────────────────────────────────────────────────

/** Select direct reports list */
export const selectDirectReports = createSelector(
  selectTeamRequestsState,
  (state) => state.directReports
);

/** Select loading state for direct reports resolution */
export const selectDirectReportsLoading = createSelector(
  selectTeamRequestsState,
  (state) => state.directReportsLoading
);

/** Select error state for direct reports resolution */
export const selectDirectReportsError = createSelector(
  selectTeamRequestsState,
  (state) => state.directReportsError
);
