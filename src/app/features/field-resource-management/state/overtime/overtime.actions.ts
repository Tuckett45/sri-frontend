/**
 * Overtime Actions
 * Defines all actions for overtime request state management
 */

import { createAction, props } from '@ngrx/store';
import { CreateOvertimeRequestDto, OvertimeRequest } from '../../models/overtime.models';

// Load Requests (employee's own requests)
export const loadOvertimeRequests = createAction(
  '[Overtime] Load Requests'
);

export const loadOvertimeRequestsSuccess = createAction(
  '[Overtime] Load Requests Success',
  props<{ requests: OvertimeRequest[] }>()
);

export const loadOvertimeRequestsFailure = createAction(
  '[Overtime] Load Requests Failure',
  props<{ error: string }>()
);

// Create Request
export const createOvertimeRequest = createAction(
  '[Overtime] Create Request',
  props<{ dto: CreateOvertimeRequestDto }>()
);

export const createOvertimeRequestSuccess = createAction(
  '[Overtime] Create Request Success',
  props<{ request: OvertimeRequest }>()
);

export const createOvertimeRequestFailure = createAction(
  '[Overtime] Create Request Failure',
  props<{ error: string }>()
);

// Cancel Request
export const cancelOvertimeRequest = createAction(
  '[Overtime] Cancel Request',
  props<{ requestId: string }>()
);

export const cancelOvertimeRequestSuccess = createAction(
  '[Overtime] Cancel Request Success',
  props<{ request: OvertimeRequest }>()
);

export const cancelOvertimeRequestFailure = createAction(
  '[Overtime] Cancel Request Failure',
  props<{ requestId: string; error: string }>()
);

// Manager Approve
export const approveOvertimeRequest = createAction(
  '[Overtime] Approve Request',
  props<{ requestId: string }>()
);

export const approveOvertimeRequestSuccess = createAction(
  '[Overtime] Approve Request Success',
  props<{ request: OvertimeRequest }>()
);

export const approveOvertimeRequestFailure = createAction(
  '[Overtime] Approve Request Failure',
  props<{ error: string }>()
);

// Manager Reject
export const rejectOvertimeRequest = createAction(
  '[Overtime] Reject Request',
  props<{ requestId: string; reason: string }>()
);

export const rejectOvertimeRequestSuccess = createAction(
  '[Overtime] Reject Request Success',
  props<{ request: OvertimeRequest }>()
);

export const rejectOvertimeRequestFailure = createAction(
  '[Overtime] Reject Request Failure',
  props<{ error: string }>()
);

// Load Manager Queue
export const loadOvertimeManagerQueue = createAction(
  '[Overtime] Load Manager Queue'
);

export const loadOvertimeManagerQueueSuccess = createAction(
  '[Overtime] Load Manager Queue Success',
  props<{ requests: OvertimeRequest[] }>()
);

export const loadOvertimeManagerQueueFailure = createAction(
  '[Overtime] Load Manager Queue Failure',
  props<{ error: string }>()
);

// Select Request
export const selectOvertimeRequest = createAction(
  '[Overtime] Select Request',
  props<{ requestId: string | null }>()
);

// Delete Request (own request only)
export const deleteOvertimeRequest = createAction(
  '[Overtime] Delete Request',
  props<{ requestId: string }>()
);

export const deleteOvertimeRequestSuccess = createAction(
  '[Overtime] Delete Request Success',
  props<{ requestId: string }>()
);

export const deleteOvertimeRequestFailure = createAction(
  '[Overtime] Delete Request Failure',
  props<{ requestId: string; error: string }>()
);
