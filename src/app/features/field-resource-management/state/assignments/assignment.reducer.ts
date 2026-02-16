/**
 * Assignment Reducer
 * Manages assignment state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Assignment } from '../../models/assignment.model';
import { AssignmentState } from './assignment.state';
import * as AssignmentActions from './assignment.actions';

// Entity adapter for normalized state management
export const assignmentAdapter: EntityAdapter<Assignment> = createEntityAdapter<Assignment>({
  selectId: (assignment: Assignment) => assignment.id,
  sortComparer: (a: Assignment, b: Assignment) => 
    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
});

// Initial state
export const initialState: AssignmentState = assignmentAdapter.getInitialState({
  conflicts: [],
  qualifiedTechnicians: [],
  loading: false,
  error: null
});

// Reducer
export const assignmentReducer = createReducer(
  initialState,

  // Assign Technician
  on(AssignmentActions.assignTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.assignTechnicianSuccess, (state, { assignment }) =>
    assignmentAdapter.addOne(assignment, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(AssignmentActions.assignTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Unassign Technician
  on(AssignmentActions.unassignTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.unassignTechnicianSuccess, (state, { assignmentId }) =>
    assignmentAdapter.removeOne(assignmentId, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(AssignmentActions.unassignTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reassign Job
  on(AssignmentActions.reassignJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.reassignJobSuccess, (state, { oldAssignmentId, newAssignment }) =>
    assignmentAdapter.addOne(
      newAssignment,
      assignmentAdapter.removeOne(oldAssignmentId, {
        ...state,
        loading: false,
        error: null
      })
    )
  ),

  on(AssignmentActions.reassignJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Conflicts
  on(AssignmentActions.loadConflicts, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.loadConflictsSuccess, (state, { conflicts }) => ({
    ...state,
    conflicts,
    loading: false,
    error: null
  })),

  on(AssignmentActions.loadConflictsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Check Conflicts
  on(AssignmentActions.checkConflicts, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.checkConflictsSuccess, (state, { conflicts }) => ({
    ...state,
    conflicts,
    loading: false,
    error: null
  })),

  on(AssignmentActions.checkConflictsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Qualified Technicians
  on(AssignmentActions.loadQualifiedTechnicians, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.loadQualifiedTechniciansSuccess, (state, { technicians }) => ({
    ...state,
    qualifiedTechnicians: technicians,
    loading: false,
    error: null
  })),

  on(AssignmentActions.loadQualifiedTechniciansFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Assignments
  on(AssignmentActions.loadAssignments, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.loadAssignmentsSuccess, (state, { assignments }) =>
    assignmentAdapter.setAll(assignments, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(AssignmentActions.loadAssignmentsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Conflicts
  on(AssignmentActions.clearConflicts, (state) => ({
    ...state,
    conflicts: []
  })),

  // Clear Qualified Technicians
  on(AssignmentActions.clearQualifiedTechnicians, (state) => ({
    ...state,
    qualifiedTechnicians: []
  }))
);
