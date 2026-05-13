/**
 * PTO Reducer
 * Manages PTO request state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, EntityState, createEntityAdapter } from '@ngrx/entity';
import { LeaveType, PtoRequest } from '../../models/pto.models';
import * as PtoActions from './pto.actions';

// Feature key for store registration
export const PTO_FEATURE_KEY = 'pto';

// State interface extending EntityState
export interface PtoState extends EntityState<PtoRequest> {
  leaveTypes: LeaveType[];
  managerQueue: string[];
  backofficeQueue: string[];
  selectedRequestId: string | null;
  loading: boolean;
  error: string | null;
}

// Entity adapter for normalized state management
export const adapter: EntityAdapter<PtoRequest> = createEntityAdapter<PtoRequest>({
  selectId: (request: PtoRequest) => request.id,
  sortComparer: (a: PtoRequest, b: PtoRequest) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
});

// Initial state
export const initialState: PtoState = adapter.getInitialState({
  leaveTypes: [],
  managerQueue: [],
  backofficeQueue: [],
  selectedRequestId: null,
  loading: false,
  error: null
});

// Reducer
export const ptoReducer = createReducer(
  initialState,

  // Load Requests
  on(PtoActions.loadRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(PtoActions.loadRequestsSuccess, (state, { requests }) =>
    adapter.setAll(requests, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(PtoActions.loadRequestsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Request
  on(PtoActions.createRequestSuccess, (state, { request }) =>
    adapter.addOne(request, {
      ...state,
      error: null
    })
  ),

  on(PtoActions.createRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Cancel Request
  on(PtoActions.cancelRequestSuccess, (state, { request }) =>
    adapter.upsertOne(request, {
      ...state,
      error: null
    })
  ),

  on(PtoActions.cancelRequestFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Manager Approve
  on(PtoActions.managerApproveSuccess, (state, { request }) =>
    adapter.upsertOne(request, {
      ...state,
      managerQueue: state.managerQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(PtoActions.managerApproveFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Manager Reject
  on(PtoActions.managerRejectSuccess, (state, { request }) =>
    adapter.upsertOne(request, {
      ...state,
      managerQueue: state.managerQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(PtoActions.managerRejectFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Backoffice Approve
  on(PtoActions.backofficeApproveSuccess, (state, { request }) =>
    adapter.upsertOne(request, {
      ...state,
      backofficeQueue: state.backofficeQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(PtoActions.backofficeApproveFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Backoffice Reject
  on(PtoActions.backofficeRejectSuccess, (state, { request }) =>
    adapter.upsertOne(request, {
      ...state,
      backofficeQueue: state.backofficeQueue.filter(id => id !== request.id),
      error: null
    })
  ),

  on(PtoActions.backofficeRejectFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Leave Types
  on(PtoActions.loadLeaveTypesSuccess, (state, { leaveTypes }) => ({
    ...state,
    leaveTypes,
    error: null
  })),

  on(PtoActions.loadLeaveTypesFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Manager Queue
  on(PtoActions.loadManagerQueueSuccess, (state, { requests }) =>
    adapter.upsertMany(requests, {
      ...state,
      managerQueue: requests.map(r => r.id),
      error: null
    })
  ),

  on(PtoActions.loadManagerQueueFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Backoffice Queue
  on(PtoActions.loadBackofficeQueueSuccess, (state, { requests }) =>
    adapter.upsertMany(requests, {
      ...state,
      backofficeQueue: requests.map(r => r.id),
      error: null
    })
  ),

  on(PtoActions.loadBackofficeQueueFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Select Request
  on(PtoActions.selectRequest, (state, { requestId }) => ({
    ...state,
    selectedRequestId: requestId
  }))
);
