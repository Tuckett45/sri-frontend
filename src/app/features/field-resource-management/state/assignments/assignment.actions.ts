/**
 * Assignment Actions
 * Defines all actions for assignment state management
 */

import { createAction, props } from '@ngrx/store';
import { Assignment, Conflict, TechnicianMatch } from '../../models/assignment.model';

// Assign Technician
export const assignTechnician = createAction(
  '[Assignment] Assign Technician',
  props<{ jobId: string; technicianId: string; override?: boolean; justification?: string }>()
);

export const assignTechnicianSuccess = createAction(
  '[Assignment] Assign Technician Success',
  props<{ assignment: Assignment }>()
);

export const assignTechnicianFailure = createAction(
  '[Assignment] Assign Technician Failure',
  props<{ error: string }>()
);

// Unassign Technician
export const unassignTechnician = createAction(
  '[Assignment] Unassign Technician',
  props<{ assignmentId: string }>()
);

export const unassignTechnicianSuccess = createAction(
  '[Assignment] Unassign Technician Success',
  props<{ assignmentId: string }>()
);

export const unassignTechnicianFailure = createAction(
  '[Assignment] Unassign Technician Failure',
  props<{ error: string }>()
);

// Reassign Job
export const reassignJob = createAction(
  '[Assignment] Reassign Job',
  props<{ jobId: string; fromTechnicianId: string; toTechnicianId: string }>()
);

export const reassignJobSuccess = createAction(
  '[Assignment] Reassign Job Success',
  props<{ oldAssignmentId: string; newAssignment: Assignment }>()
);

export const reassignJobFailure = createAction(
  '[Assignment] Reassign Job Failure',
  props<{ error: string }>()
);

// Load Conflicts
export const loadConflicts = createAction(
  '[Assignment] Load Conflicts',
  props<{ technicianId?: string; dateRange?: { startDate: Date; endDate: Date } }>()
);

export const loadConflictsSuccess = createAction(
  '[Assignment] Load Conflicts Success',
  props<{ conflicts: Conflict[] }>()
);

export const loadConflictsFailure = createAction(
  '[Assignment] Load Conflicts Failure',
  props<{ error: string }>()
);

// Check Conflicts
export const checkConflicts = createAction(
  '[Assignment] Check Conflicts',
  props<{ technicianId: string; jobId: string }>()
);

export const checkConflictsSuccess = createAction(
  '[Assignment] Check Conflicts Success',
  props<{ conflicts: Conflict[] }>()
);

export const checkConflictsFailure = createAction(
  '[Assignment] Check Conflicts Failure',
  props<{ error: string }>()
);

// Load Qualified Technicians
export const loadQualifiedTechnicians = createAction(
  '[Assignment] Load Qualified Technicians',
  props<{ jobId: string }>()
);

export const loadQualifiedTechniciansSuccess = createAction(
  '[Assignment] Load Qualified Technicians Success',
  props<{ technicians: TechnicianMatch[] }>()
);

export const loadQualifiedTechniciansFailure = createAction(
  '[Assignment] Load Qualified Technicians Failure',
  props<{ error: string }>()
);

// Load Assignments
export const loadAssignments = createAction(
  '[Assignment] Load Assignments',
  props<{ technicianId?: string; jobId?: string }>()
);

export const loadAssignmentsSuccess = createAction(
  '[Assignment] Load Assignments Success',
  props<{ assignments: Assignment[] }>()
);

export const loadAssignmentsFailure = createAction(
  '[Assignment] Load Assignments Failure',
  props<{ error: string }>()
);

// Clear Conflicts
export const clearConflicts = createAction(
  '[Assignment] Clear Conflicts'
);

// Clear Qualified Technicians
export const clearQualifiedTechnicians = createAction(
  '[Assignment] Clear Qualified Technicians'
);
