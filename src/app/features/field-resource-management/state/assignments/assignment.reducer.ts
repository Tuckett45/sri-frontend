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
    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime() // Most recent first
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

  // Load Assignments
  on(AssignmentActions.loadAssignments, (state, { filters }) => ({
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

  // Create Assignment
  on(AssignmentActions.createAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.createAssignmentSuccess, (state, { assignment }) =>
    assignmentAdapter.addOne(assignment, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(AssignmentActions.createAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Assignment
  on(AssignmentActions.updateAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.updateAssignmentSuccess, (state, { assignment }) =>
    assignmentAdapter.updateOne(
      { id: assignment.id, changes: assignment },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(AssignmentActions.updateAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Accept Assignment
  on(AssignmentActions.acceptAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.acceptAssignmentSuccess, (state, { assignment }) =>
    assignmentAdapter.updateOne(
      { id: assignment.id, changes: assignment },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(AssignmentActions.acceptAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reject Assignment
  on(AssignmentActions.rejectAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AssignmentActions.rejectAssignmentSuccess, (state, { assignment }) =>
    assignmentAdapter.updateOne(
      { id: assignment.id, changes: assignment },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(AssignmentActions.rejectAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

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

  // Select Assignment
  on(AssignmentActions.selectAssignment, (state, { id }) => ({
    ...state
  })),

  // Set Filters
  on(AssignmentActions.setAssignmentFilters, (state, { filters }) => ({
    ...state
  })),

  // Clear Filters
  on(AssignmentActions.clearAssignmentFilters, (state) => ({
    ...state
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
  })),

  // Optimistic Update Handlers
  on(AssignmentActions.createAssignmentOptimistic, (state, { assignment }) =>
    assignmentAdapter.addOne(assignment, {
      ...state,
      error: null
    })
  ),

  on(AssignmentActions.rollbackAssignmentCreate, (state, { tempId }) =>
    assignmentAdapter.removeOne(tempId, {
      ...state,
      error: 'Create failed - changes reverted'
    })
  ),

  on(AssignmentActions.updateAssignmentOptimistic, (state, { id, changes }) =>
    assignmentAdapter.updateOne(
      { id, changes },
      {
        ...state,
        error: null
      }
    )
  ),

  on(AssignmentActions.rollbackAssignmentUpdate, (state, { id, originalData }) =>
    assignmentAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Update failed - changes reverted'
      }
    )
  ),

  on(AssignmentActions.acceptAssignmentOptimistic, (state, { id }) =>
    assignmentAdapter.updateOne(
      { id, changes: { status: 'ACCEPTED' as any } },
      {
        ...state,
        error: null
      }
    )
  ),

  on(AssignmentActions.rollbackAssignmentAccept, (state, { id, originalData }) =>
    assignmentAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Accept failed - changes reverted'
      }
    )
  ),

  on(AssignmentActions.rejectAssignmentOptimistic, (state, { id }) =>
    assignmentAdapter.updateOne(
      { id, changes: { status: 'REJECTED' as any } },
      {
        ...state,
        error: null
      }
    )
  ),

  on(AssignmentActions.rollbackAssignmentReject, (state, { id, originalData }) =>
    assignmentAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Reject failed - changes reverted'
      }
    )
  )
);
