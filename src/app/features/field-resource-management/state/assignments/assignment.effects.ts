/**
 * Assignment Effects
 * Handles side effects for assignment actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as AssignmentActions from './assignment.actions';
import { SchedulingService } from '../../services/scheduling.service';

@Injectable()
export class AssignmentEffects {
  // Load Assignments Effect
  loadAssignments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.loadAssignments),
      switchMap(({ filters }) =>
        this.schedulingService.getAssignments(filters).pipe(
          map((assignments) =>
            AssignmentActions.loadAssignmentsSuccess({ assignments })
          ),
          catchError((error) =>
            of(AssignmentActions.loadAssignmentsFailure({ 
              error: error.message || 'Failed to load assignments' 
            }))
          )
        )
      )
    )
  );

  // Create Assignment Effect
  createAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.createAssignment),
      switchMap(({ assignment }) =>
        this.schedulingService.assignTechnician(
          assignment.jobId,
          assignment.technicianId,
          assignment.overrideConflicts,
          assignment.justification
        ).pipe(
          map((createdAssignment) =>
            AssignmentActions.createAssignmentSuccess({ assignment: createdAssignment })
          ),
          catchError((error) =>
            of(AssignmentActions.createAssignmentFailure({ 
              error: error.message || 'Failed to create assignment' 
            }))
          )
        )
      )
    )
  );

  // Update Assignment Effect
  updateAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.updateAssignment),
      switchMap(({ id, changes }) =>
        // Note: This would typically call a dedicated update endpoint
        // For now, we'll return an error as the API doesn't support direct updates
        // Assignments are typically updated through accept/reject/reassign actions
        of(AssignmentActions.updateAssignmentFailure({ 
          error: 'Direct assignment updates not supported. Use accept, reject, or reassign actions.' 
        }))
      )
    )
  );

  // Accept Assignment Effect
  acceptAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.acceptAssignment),
      switchMap(({ id }) =>
        this.schedulingService.acceptAssignment(id).pipe(
          map((assignment) =>
            AssignmentActions.acceptAssignmentSuccess({ assignment })
          ),
          catchError((error) =>
            of(AssignmentActions.acceptAssignmentFailure({ 
              error: error.message || 'Failed to accept assignment' 
            }))
          )
        )
      )
    )
  );

  // Reject Assignment Effect
  rejectAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.rejectAssignment),
      switchMap(({ id, reason }) =>
        this.schedulingService.rejectAssignment(id, reason).pipe(
          map((assignment) =>
            AssignmentActions.rejectAssignmentSuccess({ assignment })
          ),
          catchError((error) =>
            of(AssignmentActions.rejectAssignmentFailure({ 
              error: error.message || 'Failed to reject assignment' 
            }))
          )
        )
      )
    )
  );

  // Assign Technician Effect
  assignTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.assignTechnician),
      switchMap(({ jobId, technicianId, override, justification }) =>
        this.schedulingService.assignTechnician(
          jobId,
          technicianId,
          override,
          justification
        ).pipe(
          map((assignment) =>
            AssignmentActions.assignTechnicianSuccess({ assignment })
          ),
          catchError((error) =>
            of(AssignmentActions.assignTechnicianFailure({ 
              error: error.message || 'Failed to assign technician' 
            }))
          )
        )
      )
    )
  );

  // Unassign Technician Effect
  unassignTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.unassignTechnician),
      switchMap(({ assignmentId }) =>
        this.schedulingService.unassignTechnician(assignmentId).pipe(
          map(() =>
            AssignmentActions.unassignTechnicianSuccess({ assignmentId })
          ),
          catchError((error) =>
            of(AssignmentActions.unassignTechnicianFailure({ 
              error: error.message || 'Failed to unassign technician' 
            }))
          )
        )
      )
    )
  );

  // Reassign Job Effect
  reassignJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.reassignJob),
      switchMap(({ jobId, fromTechnicianId, toTechnicianId }) =>
        this.schedulingService.reassignJob(
          jobId,
          fromTechnicianId,
          toTechnicianId
        ).pipe(
          map((result) => {
            return AssignmentActions.reassignJobSuccess({ 
              oldAssignmentId: result.oldAssignmentId || '', 
              newAssignment: result.newAssignment 
            });
          }),
          catchError((error) =>
            of(AssignmentActions.reassignJobFailure({ 
              error: error.message || 'Failed to reassign job' 
            }))
          )
        )
      )
    )
  );

  // Load Conflicts Effect
  loadConflicts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.loadConflicts),
      switchMap(({ technicianId, dateRange }) =>
        this.schedulingService.detectAllConflicts(dateRange).pipe(
          map((conflicts) => {
            // Filter by technician if specified
            const filteredConflicts = technicianId
              ? conflicts.filter(c => c.technicianId === technicianId)
              : conflicts;
            
            return AssignmentActions.loadConflictsSuccess({ 
              conflicts: filteredConflicts 
            });
          }),
          catchError((error) =>
            of(AssignmentActions.loadConflictsFailure({ 
              error: error.message || 'Failed to load conflicts' 
            }))
          )
        )
      )
    )
  );

  // Check Conflicts Effect
  checkConflicts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.checkConflicts),
      switchMap(({ technicianId, jobId }) =>
        this.schedulingService.checkConflicts(technicianId, jobId).pipe(
          map((conflicts) =>
            AssignmentActions.checkConflictsSuccess({ conflicts })
          ),
          catchError((error) =>
            of(AssignmentActions.checkConflictsFailure({ 
              error: error.message || 'Failed to check conflicts' 
            }))
          )
        )
      )
    )
  );

  // Load Qualified Technicians Effect
  loadQualifiedTechnicians$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.loadQualifiedTechnicians),
      switchMap(({ jobId }) =>
        this.schedulingService.getQualifiedTechnicians(jobId).pipe(
          map((technicians) =>
            AssignmentActions.loadQualifiedTechniciansSuccess({ technicians })
          ),
          catchError((error) =>
            of(AssignmentActions.loadQualifiedTechniciansFailure({ 
              error: error.message || 'Failed to load qualified technicians' 
            }))
          )
        )
      )
    )
  );

  // Show Create Assignment Success
  showCreateAssignmentSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.createAssignmentSuccess),
      tap(() => {
        this.snackBar.open('Assignment created successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Assign Technician Success
  showAssignTechnicianSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.assignTechnicianSuccess),
      tap(() => {
        this.snackBar.open('Technician assigned successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Unassign Technician Success
  showUnassignTechnicianSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.unassignTechnicianSuccess),
      tap(() => {
        this.snackBar.open('Technician unassigned successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Reassign Job Success
  showReassignJobSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.reassignJobSuccess),
      tap(() => {
        this.snackBar.open('Job reassigned successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Accept Assignment Success
  showAcceptAssignmentSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.acceptAssignmentSuccess),
      tap(() => {
        this.snackBar.open('Assignment accepted', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Reject Assignment Success
  showRejectAssignmentSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.rejectAssignmentSuccess),
      tap(() => {
        this.snackBar.open('Assignment rejected', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Error Notifications
  showErrorNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AssignmentActions.loadAssignmentsFailure,
        AssignmentActions.createAssignmentFailure,
        AssignmentActions.updateAssignmentFailure,
        AssignmentActions.acceptAssignmentFailure,
        AssignmentActions.rejectAssignmentFailure,
        AssignmentActions.assignTechnicianFailure,
        AssignmentActions.unassignTechnicianFailure,
        AssignmentActions.reassignJobFailure,
        AssignmentActions.loadConflictsFailure,
        AssignmentActions.checkConflictsFailure,
        AssignmentActions.loadQualifiedTechniciansFailure
      ),
      tap(({ error }) => {
        this.snackBar.open(error, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  // Log errors for debugging
  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AssignmentActions.loadAssignmentsFailure,
          AssignmentActions.createAssignmentFailure,
          AssignmentActions.updateAssignmentFailure,
          AssignmentActions.acceptAssignmentFailure,
          AssignmentActions.rejectAssignmentFailure,
          AssignmentActions.assignTechnicianFailure,
          AssignmentActions.unassignTechnicianFailure,
          AssignmentActions.reassignJobFailure,
          AssignmentActions.loadConflictsFailure,
          AssignmentActions.checkConflictsFailure,
          AssignmentActions.loadQualifiedTechniciansFailure
        ),
        tap((action) => {
          console.error('Assignment Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  // Optimistic Create Assignment Effect
  createAssignmentOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.createAssignmentOptimistic),
      switchMap(({ assignment, tempId }) =>
        this.schedulingService.assignTechnician(
          assignment.jobId,
          assignment.technicianId,
          false,
          undefined
        ).pipe(
          map((createdAssignment) =>
            AssignmentActions.createAssignmentSuccess({ assignment: createdAssignment })
          ),
          catchError((error) => {
            console.error('Optimistic create failed, rolling back:', error);
            return of(AssignmentActions.rollbackAssignmentCreate({ tempId }));
          })
        )
      )
    )
  );

  // Optimistic Update Assignment Effect
  updateAssignmentOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.updateAssignmentOptimistic),
      switchMap(({ id, changes, originalData }) =>
        // Note: Direct updates not supported, this would need a proper API endpoint
        of(AssignmentActions.updateAssignmentSuccess({ 
          assignment: { ...originalData, ...changes } as any 
        })).pipe(
          catchError((error) => {
            console.error('Optimistic update failed, rolling back:', error);
            return of(AssignmentActions.rollbackAssignmentUpdate({ id, originalData }));
          })
        )
      )
    )
  );

  // Optimistic Accept Assignment Effect
  acceptAssignmentOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.acceptAssignmentOptimistic),
      switchMap(({ id, originalData }) =>
        this.schedulingService.acceptAssignment(id).pipe(
          map((assignment) =>
            AssignmentActions.acceptAssignmentSuccess({ assignment })
          ),
          catchError((error) => {
            console.error('Optimistic accept failed, rolling back:', error);
            return of(AssignmentActions.rollbackAssignmentAccept({ id, originalData }));
          })
        )
      )
    )
  );

  // Optimistic Reject Assignment Effect
  rejectAssignmentOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.rejectAssignmentOptimistic),
      switchMap(({ id, reason, originalData }) =>
        this.schedulingService.rejectAssignment(id, reason).pipe(
          map((assignment) =>
            AssignmentActions.rejectAssignmentSuccess({ assignment })
          ),
          catchError((error) => {
            console.error('Optimistic reject failed, rolling back:', error);
            return of(AssignmentActions.rollbackAssignmentReject({ id, originalData }));
          })
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private schedulingService: SchedulingService
  ) {}
}
