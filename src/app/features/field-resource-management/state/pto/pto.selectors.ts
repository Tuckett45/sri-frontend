/**
 * PTO Selectors
 * Provides memoized selectors for accessing PTO request state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PtoState, adapter, PTO_FEATURE_KEY } from './pto.reducer';
import { RequestStatus } from '../../models/pto.models';

// Feature selector
export const selectPtoState = createFeatureSelector<PtoState>(PTO_FEATURE_KEY);

// Entity adapter selectors
const { selectAll, selectEntities } = adapter.getSelectors();

// Select all PTO requests (sorted by startDate descending via adapter)
export const selectAllPtoRequests = createSelector(
  selectPtoState,
  selectAll
);

// Select loading state
export const selectPtoLoading = createSelector(
  selectPtoState,
  (state) => state.loading
);

// Select error state
export const selectPtoError = createSelector(
  selectPtoState,
  (state) => state.error
);

// Select selected request ID
export const selectSelectedRequestId = createSelector(
  selectPtoState,
  (state) => state.selectedRequestId
);

// Select the currently selected request
export const selectSelectedRequest = createSelector(
  selectAllPtoRequests,
  selectSelectedRequestId,
  (requests, selectedId) => requests.find(r => r.id === selectedId) ?? null
);

// Select leave types
export const selectLeaveTypes = createSelector(
  selectPtoState,
  (state) => state.leaveTypes
);

// Select manager queue — only requests with Pending_Manager_Approval status
export const selectManagerQueue = createSelector(
  selectAllPtoRequests,
  selectPtoState,
  (requests, state) =>
    requests.filter(
      r => state.managerQueue.includes(r.id) && r.status === RequestStatus.Pending_Manager_Approval
    )
);

// Select backoffice queue — only requests with Pending_Backoffice_Approval status
export const selectBackofficeQueue = createSelector(
  selectAllPtoRequests,
  selectPtoState,
  (requests, state) =>
    requests.filter(
      r => state.backofficeQueue.includes(r.id) && r.status === RequestStatus.Pending_Backoffice_Approval
    )
);

// Factory selector: select requests for a specific employee
export const selectMyRequests = (employeeId: string) => createSelector(
  selectAllPtoRequests,
  (requests) => requests.filter(r => r.employeeId === employeeId)
);
