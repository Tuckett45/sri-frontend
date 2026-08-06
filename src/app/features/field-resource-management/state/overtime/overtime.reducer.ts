/**
 * Overtime Reducer
 * Manages overtime request state using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, EntityState, createEntityAdapter } from '@ngrx/entity';
import { OvertimeRequest } from '../../models/overtime.models';
import * as OvertimeActions from './overtime.actions';

// Feature key for store registration
export const OVERTIME_FEATURE_KEY = 'overtime';

// State interface extending EntityState
export interface OvertimeState extends EntityState<OvertimeRequest> {
  managerQueue: string[];
  selectedRequestId: string | null;
  loading: boolean;
  error: string | null;
}

// Entity adapter for normalized state management
export const overtimeAdapter: EntityAdapter<OvertimeRequest> = createEntityAdapter<OvertimeRequest>({
  selectId: (request: OvertimeRequest) => request.id,
  sortComparer: (a: OvertimeRequest, b: OvertimeRequest) =>
    new Date(b.overtimeStartDate).getTime() - new Date(a.overtimeStartDate).getTime()
});

// Initial state
export const initialOvertimeState: OvertimeState = overtimeAdapter.getInitialState({
  managerQueue: [],
  selectedRequestId: null,
  loading: false,
  error: null
});

// Reducer
export const overtimeReducer = createReducer(
  initialOvertimeState,

  // Load Requests
  on(OvertimeActions.loadOvertimeRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(OvertimeActions.loadOvertimeRequestsSuccess, (state, { requests }) =>
    overtimeAdapter.setAll(requests, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(OvertimeActions.loadOvertimeRequestsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Request
  on(OvertimeActions.createOvertimeRequestSuccess, (state, { request }) =>
    overtimeAdapter.addOne(request, {
      ...state,
      error: null
    })
  ),

  on(OvertimeActions.createOvertimeRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Cancel Request
  on(OvertimeActions.cancelOvertimeRequestSuccess, (state, { request }) =>
    overtimeAdapter.upsertOne(request, {
      ...state,
      error: null
    })
  ),

  on(OvertimeActions.cancelOvertimeRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Approve
  on(OvertimeActions.approveOvertimeRequestSuccess, (state, { request }) =>
    overtimeAdapter.upsertOne(request, {
      ...state,
      managerQueue: state.managerQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(OvertimeActions.approveOvertimeRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Reject
  on(OvertimeActions.rejectOvertimeRequestSuccess, (state, { request }) =>
    overtimeAdapter.upsertOne(request, {
      ...state,
      managerQueue: state.managerQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(OvertimeActions.rejectOvertimeRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Manager Queue
  on(OvertimeActions.loadOvertimeManagerQueueSuccess, (state, { requests }) =>
    overtimeAdapter.upsertMany(requests, {
      ...state,
      managerQueue: requests.map(r => r.id),
      error: null
    })
  ),

  on(OvertimeActions.loadOvertimeManagerQueueFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Select Request
  on(OvertimeActions.selectOvertimeRequest, (state, { requestId }) => ({
    ...state,
    selectedRequestId: requestId
  })),

  // Delete Request
  on(OvertimeActions.deleteOvertimeRequestSuccess, (state, { requestId }) =>
    overtimeAdapter.removeOne(requestId, {
      ...state,
      error: null
    })
  ),

  on(OvertimeActions.deleteOvertimeRequestFailure, (state, { error }) => ({
    ...state,
    error
  }))
);
