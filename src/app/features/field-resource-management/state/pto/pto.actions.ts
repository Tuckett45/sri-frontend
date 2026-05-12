/**
 * PTO Actions
 * Defines all actions for PTO request state management
 */

import { createAction, props } from '@ngrx/store';
import { CreatePtoRequestDto, LeaveType, PtoRequest } from '../../models/pto.models';

// Load Requests (employee's own requests)
export const loadRequests = createAction(
  '[PTO] Load Requests'
);

export const loadRequestsSuccess = createAction(
  '[PTO] Load Requests Success',
  props<{ requests: PtoRequest[] }>()
);

export const loadRequestsFailure = createAction(
  '[PTO] Load Requests Failure',
  props<{ error: string }>()
);

// Create Request
export const createRequest = createAction(
  '[PTO] Create Request',
  props<{ dto: CreatePtoRequestDto }>()
);

export const createRequestSuccess = createAction(
  '[PTO] Create Request Success',
  props<{ request: PtoRequest }>()
);

export const createRequestFailure = createAction(
  '[PTO] Create Request Failure',
  props<{ error: string }>()
);

// Cancel Request
export const cancelRequest = createAction(
  '[PTO] Cancel Request',
  props<{ requestId: string }>()
);

export const cancelRequestSuccess = createAction(
  '[PTO] Cancel Request Success',
  props<{ request: PtoRequest }>()
);

export const cancelRequestFailure = createAction(
  '[PTO] Cancel Request Failure',
  props<{ requestId: string; error: string }>()
);

// Manager Approve
export const managerApprove = createAction(
  '[PTO] Manager Approve',
  props<{ requestId: string }>()
);

export const managerApproveSuccess = createAction(
  '[PTO] Manager Approve Success',
  props<{ request: PtoRequest }>()
);

export const managerApproveFailure = createAction(
  '[PTO] Manager Approve Failure',
  props<{ error: string }>()
);

// Manager Reject
export const managerReject = createAction(
  '[PTO] Manager Reject',
  props<{ requestId: string; reason: string }>()
);

export const managerRejectSuccess = createAction(
  '[PTO] Manager Reject Success',
  props<{ request: PtoRequest }>()
);

export const managerRejectFailure = createAction(
  '[PTO] Manager Reject Failure',
  props<{ error: string }>()
);

// Backoffice Approve
export const backofficeApprove = createAction(
  '[PTO] Backoffice Approve',
  props<{ requestId: string }>()
);

export const backofficeApproveSuccess = createAction(
  '[PTO] Backoffice Approve Success',
  props<{ request: PtoRequest }>()
);

export const backofficeApproveFailure = createAction(
  '[PTO] Backoffice Approve Failure',
  props<{ error: string }>()
);

// Backoffice Reject
export const backofficeReject = createAction(
  '[PTO] Backoffice Reject',
  props<{ requestId: string; reason: string }>()
);

export const backofficeRejectSuccess = createAction(
  '[PTO] Backoffice Reject Success',
  props<{ request: PtoRequest }>()
);

export const backofficeRejectFailure = createAction(
  '[PTO] Backoffice Reject Failure',
  props<{ error: string }>()
);

// Load Leave Types
export const loadLeaveTypes = createAction(
  '[PTO] Load Leave Types'
);

export const loadLeaveTypesSuccess = createAction(
  '[PTO] Load Leave Types Success',
  props<{ leaveTypes: LeaveType[] }>()
);

export const loadLeaveTypesFailure = createAction(
  '[PTO] Load Leave Types Failure',
  props<{ error: string }>()
);

// Load Manager Queue
export const loadManagerQueue = createAction(
  '[PTO] Load Manager Queue'
);

export const loadManagerQueueSuccess = createAction(
  '[PTO] Load Manager Queue Success',
  props<{ requests: PtoRequest[] }>()
);

export const loadManagerQueueFailure = createAction(
  '[PTO] Load Manager Queue Failure',
  props<{ error: string }>()
);

// Load Backoffice Queue
export const loadBackofficeQueue = createAction(
  '[PTO] Load Backoffice Queue'
);

export const loadBackofficeQueueSuccess = createAction(
  '[PTO] Load Backoffice Queue Success',
  props<{ requests: PtoRequest[] }>()
);

export const loadBackofficeQueueFailure = createAction(
  '[PTO] Load Backoffice Queue Failure',
  props<{ error: string }>()
);

// Select Request
export const selectRequest = createAction(
  '[PTO] Select Request',
  props<{ requestId: string | null }>()
);
