/**
 * Assignment Selectors
 * Provides memoized selectors for accessing assignment state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AssignmentState } from './assignment.state';
import { assignmentAdapter } from './assignment.reducer';

// Feature selector
export const selectAssignmentState = createFeatureSelector<AssignmentState>('assignments');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = assignmentAdapter.getSelectors();

// Select all assignments
export const selectAllAssignments = createSelector(
  selectAssignmentState,
  selectAll
);

// Select assignment entities
export const selectAssignmentEntities = createSelector(
  selectAssignmentState,
  selectEntities
);

// Select assignment by ID
export const selectAssignmentById = (id: string) => createSelector(
  selectAssignmentEntities,
  (entities) => entities[id]
);

// Select loading state
export const selectAssignmentsLoading = createSelector(
  selectAssignmentState,
  (state) => state.loading
);

// Select error state
export const selectAssignmentsError = createSelector(
  selectAssignmentState,
  (state) => state.error
);

// Select conflicts
export const selectConflicts = createSelector(
  selectAssignmentState,
  (state) => state.conflicts
);

// Select qualified technicians
export const selectQualifiedTechnicians = createSelector(
  selectAssignmentState,
  (state) => state.qualifiedTechnicians
);

// Select total count
export const selectAssignmentsTotal = createSelector(
  selectAssignmentState,
  selectTotal
);

// Select assignments by job
export const selectAssignmentsByJob = (jobId: string) => createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => 
    assignment.jobId === jobId && assignment.isActive
  )
);

// Select assignments by technician
export const selectAssignmentsByTechnician = (technicianId: string) => createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => 
    assignment.technicianId === technicianId && assignment.isActive
  )
);

// Select active assignments
export const selectActiveAssignments = createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => assignment.isActive)
);

// Select conflicts by technician
export const selectConflictsByTechnician = (technicianId: string) => createSelector(
  selectConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.technicianId === technicianId)
);

// Select has conflicts
export const selectHasConflicts = createSelector(
  selectConflicts,
  (conflicts) => conflicts.length > 0
);

// Select critical conflicts (severity = Error)
export const selectCriticalConflicts = createSelector(
  selectConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.severity === 'Error')
);

// Select warning conflicts (severity = Warning)
export const selectWarningConflicts = createSelector(
  selectConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.severity === 'Warning')
);

// Select qualified technicians count
export const selectQualifiedTechniciansCount = createSelector(
  selectQualifiedTechnicians,
  (technicians) => technicians.length
);

// Select best matched technicians (top 5 by match percentage)
export const selectBestMatchedTechnicians = createSelector(
  selectQualifiedTechnicians,
  (technicians) => [...technicians]
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 5)
);

// Select technicians without conflicts
export const selectTechniciansWithoutConflicts = createSelector(
  selectQualifiedTechnicians,
  (technicians) => technicians.filter(tech => !tech.hasConflicts)
);

// Select technicians with perfect skill match
export const selectPerfectMatchTechnicians = createSelector(
  selectQualifiedTechnicians,
  (technicians) => technicians.filter(tech => tech.matchPercentage === 100)
);
