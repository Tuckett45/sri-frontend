/**
 * Team Requests Actions
 * Defines all actions for team PTO and overtime request state management.
 * Used by managers to view requests from their direct reports.
 */

import { createAction, props } from '@ngrx/store';
import { PtoRequest } from '../../models/pto.models';
import { OvertimeRequest } from '../../models/overtime.models';

/**
 * Represents a direct report in the manager's team hierarchy.
 */
export interface DirectReport {
  id: string;
  name: string;
  department: string;
}

// ─── Load Team PTO Requests ─────────────────────────────────────────────────────

export const loadTeamPtoRequests = createAction(
  '[Team Requests] Load Team PTO',
  props<{ managerId: string }>()
);

export const loadTeamPtoRequestsSuccess = createAction(
  '[Team Requests] Load Team PTO Success',
  props<{ requests: PtoRequest[] }>()
);

export const loadTeamPtoRequestsFailure = createAction(
  '[Team Requests] Load Team PTO Failure',
  props<{ error: string }>()
);

// ─── Load Team Overtime Requests ────────────────────────────────────────────────

export const loadTeamOvertimeRequests = createAction(
  '[Team Requests] Load Team Overtime',
  props<{ managerId: string }>()
);

export const loadTeamOvertimeRequestsSuccess = createAction(
  '[Team Requests] Load Team Overtime Success',
  props<{ requests: OvertimeRequest[] }>()
);

export const loadTeamOvertimeRequestsFailure = createAction(
  '[Team Requests] Load Team Overtime Failure',
  props<{ error: string }>()
);

// ─── Load Direct Reports ────────────────────────────────────────────────────────

export const loadDirectReports = createAction(
  '[Team Requests] Load Direct Reports',
  props<{ managerId: string }>()
);

export const loadDirectReportsSuccess = createAction(
  '[Team Requests] Load Direct Reports Success',
  props<{ directReports: DirectReport[] }>()
);

export const loadDirectReportsFailure = createAction(
  '[Team Requests] Load Direct Reports Failure',
  props<{ error: string }>()
);

// ─── Clear Team Data ────────────────────────────────────────────────────────────

export const clearTeamData = createAction(
  '[Team Requests] Clear Team Data'
);
