/**
 * Assignment Effects
 * Handles side effects for assignment actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as AssignmentActions from './assignment.actions';

@Injectable()
export class AssignmentEffects {
  // Assign Technician Effect
  assignTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.assignTechnician),
      switchMap(({ jobId, technicianId, override, justification }) =>
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.assignTechnician(jobId, technicianId, override, justification).pipe(
        of({
          id: 'temp-assignment-id',
          jobId,
          technicianId,
          assignedBy: 'current-user',
          assignedAt: new Date(),
          isActive: true
        } as any).pipe( // Placeholder
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
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.unassignTechnician(assignmentId).pipe(
        of(void 0).pipe( // Placeholder
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
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.reassignJob(jobId, fromTechnicianId, toTechnicianId).pipe(
        of({
          oldAssignmentId: 'old-assignment-id',
          newAssignment: {
            id: 'new-assignment-id',
            jobId,
            technicianId: toTechnicianId,
            assignedBy: 'current-user',
            assignedAt: new Date(),
            isActive: true
          }
        } as any).pipe( // Placeholder
          map((result) =>
            AssignmentActions.reassignJobSuccess({ 
              oldAssignmentId: result.oldAssignmentId,
              newAssignment: result.newAssignment
            })
          ),
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
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.detectAllConflicts(technicianId, dateRange).pipe(
        of([]).pipe( // Placeholder - returns empty array
          map((conflicts) =>
            AssignmentActions.loadConflictsSuccess({ conflicts })
          ),
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
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.checkConflicts(technicianId, jobId).pipe(
        of([]).pipe( // Placeholder - returns empty array
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
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.getQualifiedTechnicians(jobId).pipe(
        of([]).pipe( // Placeholder - returns empty array
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

  // Load Assignments Effect
  loadAssignments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.loadAssignments),
      switchMap(({ technicianId, jobId }) =>
        // TODO: Replace with actual SchedulingService call when service is implemented
        // this.schedulingService.getAssignments({ technicianId, jobId }).pipe(
        of([]).pipe( // Placeholder - returns empty array
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

  constructor(
    private actions$: Actions
    // TODO: Inject SchedulingService when implemented
    // private schedulingService: SchedulingService
  ) {}
}
