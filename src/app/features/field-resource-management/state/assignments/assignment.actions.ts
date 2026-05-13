/**
 * Assignment Actions
 * Defines all actions for assignment state management
 */

import { createAction, props } from '@ngrx/store';
import { Assignment, Conflict, TechnicianMatch } from '../../models/assignment.model';
import { AssignmentDto, AssignmentFilters } from '../../models/dtos';

// Load Assignments
export const loadAssignments = createAction(
  '[Assignment] Load Assignments',
  props<{ filters?: AssignmentFilters }>()
);

export const loadAssignmentsSuccess = createAction(
  '[Assignment] Load Assignments Success',
  props<{ assignments: Assignment[] }>()
);

export const loadAssignmentsFailure = createAction(
  '[Assignment] Load Assignments Failure',
  props<{ error: string }>()
);

// Create Assignment
export const createAssignment = createAction(
  '[Assignment] Create Assignment',
  props<{ assignment: AssignmentDto }>()
);

export const createAssignmentSuccess = createAction(
  '[Assignment] Create Assignment Success',
  props<{ assignment: Assignment }>()
);

export const createAssignmentFailure = createAction(
  '[Assignment] Create Assignment Failure',
  props<{ error: string }>()
);

// Update Assignment
export const updateAssignment = createAction(
  '[Assignment] Update Assignment',
  props<{ id: string; changes: Partial<Assignment> }>()
);

export const updateAssignmentSuccess = createAction(
  '[Assignment] Update Assignment Success',
  props<{ assignment: Assignment }>()
);

export const updateAssignmentFailure = createAction(
  '[Assignment] Update Assignment Failure',
  props<{ error: string }>()
);

// Accept Assignment
export const acceptAssignment = createAction(
  '[Assignment] Accept Assignment',
  props<{ id: string }>()
);

export const acceptAssignmentSuccess = createAction(
  '[Assignment] Accept Assignment Success',
  props<{ assignment: Assignment }>()
);

export const acceptAssignmentFailure = createAction(
  '[Assignment] Accept Assignment Failure',
  props<{ error: string }>()
);

// Reject Assignment
export const rejectAssignment = createAction(
  '[Assignment] Reject Assignment',
  props<{ id: string; reason?: string }>()
);

export const rejectAssignmentSuccess = createAction(
  '[Assignment] Reject Assignment Success',
  props<{ assignment: Assignment }>()
);

export const rejectAssignmentFailure = createAction(
  '[Assignment] Reject Assignment Failure',
  props<{ error: string }>()
);

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

// Select Assignment
export const selectAssignment = createAction(
  '[Assignment] Select Assignment',
  props<{ id: string | null }>()
);

// Set Filters
export const setAssignmentFilters = createAction(
  '[Assignment] Set Filters',
  props<{ filters: AssignmentFilters }>()
);

// Clear Filters
export const clearAssignmentFilters = createAction(
  '[Assignment] Clear Filters'
);

// Clear Conflicts
export const clearConflicts = createAction(
  '[Assignment] Clear Conflicts'
);

// Clear Qualified Technicians
export const clearQualifiedTechnicians = createAction(
  '[Assignment] Clear Qualified Technicians'
);

// Optimistic Update Actions
export const createAssignmentOptimistic = createAction(
  '[Assignment] Create Assignment Optimistic',
  props<{ assignment: Assignment; tempId: string }>()
);

export const rollbackAssignmentCreate = createAction(
  '[Assignment] Rollback Assignment Create',
  props<{ tempId: string }>()
);

export const updateAssignmentOptimistic = createAction(
  '[Assignment] Update Assignment Optimistic',
  props<{ id: string; changes: Partial<Assignment>; originalData: Assignment }>()
);

export const rollbackAssignmentUpdate = createAction(
  '[Assignment] Rollback Assignment Update',
  props<{ id: string; originalData: Assignment }>()
);

export const acceptAssignmentOptimistic = createAction(
  '[Assignment] Accept Assignment Optimistic',
  props<{ id: string; originalData: Assignment }>()
);

export const rollbackAssignmentAccept = createAction(
  '[Assignment] Rollback Assignment Accept',
  props<{ id: string; originalData: Assignment }>()
);

export const rejectAssignmentOptimistic = createAction(
  '[Assignment] Reject Assignment Optimistic',
  props<{ id: string; reason?: string; originalData: Assignment }>()
);

export const rollbackAssignmentReject = createAction(
  '[Assignment] Rollback Assignment Reject',
  props<{ id: string; originalData: Assignment }>()
);
