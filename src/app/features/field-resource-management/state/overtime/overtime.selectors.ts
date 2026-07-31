/**
 * Overtime Selectors
 * Provides memoized selectors for accessing overtime request state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OvertimeState, overtimeAdapter, OVERTIME_FEATURE_KEY } from './overtime.reducer';
import { OvertimeRequestStatus } from '../../models/overtime.models';

// Feature selector
export const selectOvertimeState = createFeatureSelector<OvertimeState>(OVERTIME_FEATURE_KEY);

// Entity adapter selectors
const { selectAll, selectEntities } = overtimeAdapter.getSelectors();

// Select all overtime requests
export const selectAllOvertimeRequests = createSelector(
  selectOvertimeState,
  selectAll
);

// Select loading state
export const selectOvertimeLoading = createSelector(
  selectOvertimeState,
  (state) => state.loading
);

// Select error state
export const selectOvertimeError = createSelector(
  selectOvertimeState,
  (state) => state.error
);

// Select selected request ID
export const selectSelectedOvertimeRequestId = createSelector(
  selectOvertimeState,
  (state) => state.selectedRequestId
);

// Select the currently selected request
export const selectSelectedOvertimeRequest = createSelector(
  selectAllOvertimeRequests,
  selectSelectedOvertimeRequestId,
  (requests, selectedId) => requests.find(r => r.id === selectedId) ?? null
);

// Select manager queue — only requests with Pending_Manager_Approval status
export const selectOvertimeManagerQueue = createSelector(
  selectAllOvertimeRequests,
  selectOvertimeState,
  (requests, state) =>
    requests.filter(
      r => state.managerQueue.includes(r.id) && r.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval
    )
);

// Select requests by status
export const selectOvertimeByStatus = (status: OvertimeRequestStatus) => createSelector(
  selectAllOvertimeRequests,
  (requests) => requests.filter(r => r.approvalStatus === status)
);

// Select pending overtime requests count (for badges)
export const selectPendingOvertimeCount = createSelector(
  selectAllOvertimeRequests,
  (requests) => requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval).length
);

// Factory selector: select requests for a specific employee
export const selectMyOvertimeRequests = (employeeId: string) => createSelector(
  selectAllOvertimeRequests,
  (requests) => requests.filter(r => r.employeeId === employeeId)
);
