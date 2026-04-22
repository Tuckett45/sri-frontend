/**
 * Crew Effects
 * Handles side effects for crew actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as CrewActions from './crew.actions';
import { CrewService } from '../../services/crew.service';

@Injectable()
export class CrewEffects {
  // Load Crews Effect
  loadCrews$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.loadCrews),
      switchMap(({ filters }) =>
        this.crewService.getCrews(filters).pipe(
          map((crews) =>
            CrewActions.loadCrewsSuccess({ crews })
          ),
          catchError((error) =>
            of(CrewActions.loadCrewsFailure({ 
              error: error.message || 'Failed to load crews' 
            }))
          )
        )
      )
    )
  );

  // Create Crew Effect
  createCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.createCrew),
      switchMap(({ crew }) =>
        this.crewService.createCrew(crew).pipe(
          map((createdCrew) =>
            CrewActions.createCrewSuccess({ crew: createdCrew })
          ),
          catchError((error) =>
            of(CrewActions.createCrewFailure({ 
              error: error.message || 'Failed to create crew' 
            }))
          )
        )
      )
    )
  );

  // Update Crew Effect
  updateCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.updateCrew),
      switchMap(({ id, crew }) =>
        this.crewService.updateCrew(id, crew).pipe(
          map((updatedCrew) =>
            CrewActions.updateCrewSuccess({ crew: updatedCrew })
          ),
          catchError((error) =>
            of(CrewActions.updateCrewFailure({ 
              error: error.message || 'Failed to update crew' 
            }))
          )
        )
      )
    )
  );

  // Delete Crew Effect
  deleteCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.deleteCrew),
      switchMap(({ id }) =>
        this.crewService.deleteCrew(id).pipe(
          map(() =>
            CrewActions.deleteCrewSuccess({ id })
          ),
          catchError((error) =>
            of(CrewActions.deleteCrewFailure({ 
              error: error.message || 'Failed to delete crew' 
            }))
          )
        )
      )
    )
  );

  // Update Crew Location Effect
  updateCrewLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.updateCrewLocation),
      switchMap(({ crewId, location }) =>
        this.crewService.updateCrewLocation(crewId, location).pipe(
          map(() =>
            CrewActions.updateCrewLocationSuccess({ crewId, location })
          ),
          catchError((error) =>
            of(CrewActions.updateCrewLocationFailure({ 
              error: error.message || 'Failed to update crew location' 
            }))
          )
        )
      )
    )
  );

  // Assign Job to Crew Effect
  assignJobToCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.assignJobToCrew),
      switchMap(({ crewId, jobId }) =>
        this.crewService.assignJobToCrew(crewId, jobId).pipe(
          map((updatedCrew) =>
            CrewActions.assignJobToCrewSuccess({ crew: updatedCrew })
          ),
          catchError((error) =>
            of(CrewActions.assignJobToCrewFailure({ 
              error: error.message || 'Failed to assign job to crew' 
            }))
          )
        )
      )
    )
  );

  // Unassign Job from Crew Effect
  unassignJobFromCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.unassignJobFromCrew),
      switchMap(({ crewId }) =>
        this.crewService.unassignJobFromCrew(crewId).pipe(
          map((updatedCrew) =>
            CrewActions.unassignJobFromCrewSuccess({ crew: updatedCrew })
          ),
          catchError((error) =>
            of(CrewActions.unassignJobFromCrewFailure({ 
              error: error.message || 'Failed to unassign job from crew' 
            }))
          )
        )
      )
    )
  );

  // Add Crew Member Effect
  addCrewMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.addCrewMember),
      switchMap(({ crewId, technicianId }) =>
        this.crewService.addCrewMember(crewId, technicianId).pipe(
          map((updatedCrew) =>
            CrewActions.addCrewMemberSuccess({ crew: updatedCrew })
          ),
          catchError((error) =>
            of(CrewActions.addCrewMemberFailure({ 
              error: error.message || 'Failed to add crew member' 
            }))
          )
        )
      )
    )
  );

  // Remove Crew Member Effect
  removeCrewMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.removeCrewMember),
      switchMap(({ crewId, technicianId }) =>
        this.crewService.removeCrewMember(crewId, technicianId).pipe(
          map((updatedCrew) =>
            CrewActions.removeCrewMemberSuccess({ crew: updatedCrew })
          ),
          catchError((error) =>
            of(CrewActions.removeCrewMemberFailure({ 
              error: error.message || 'Failed to remove crew member' 
            }))
          )
        )
      )
    )
  );

  // Load Crew Location History Effect
  loadCrewLocationHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.loadCrewLocationHistory),
      switchMap(({ filters }) =>
        this.crewService.getCrewLocationHistory(filters).pipe(
          map((history) =>
            CrewActions.loadCrewLocationHistorySuccess({ 
              crewId: filters.entityId, 
              history 
            })
          ),
          catchError((error) =>
            of(CrewActions.loadCrewLocationHistoryFailure({ 
              error: error.message || 'Failed to load location history' 
            }))
          )
        )
      )
    )
  );

  // Log errors for debugging
  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          CrewActions.loadCrewsFailure,
          CrewActions.createCrewFailure,
          CrewActions.updateCrewFailure,
          CrewActions.deleteCrewFailure,
          CrewActions.updateCrewLocationFailure,
          CrewActions.assignJobToCrewFailure,
          CrewActions.unassignJobFromCrewFailure,
          CrewActions.addCrewMemberFailure,
          CrewActions.removeCrewMemberFailure,
          CrewActions.loadCrewLocationHistoryFailure
        ),
        tap((action) => {
          console.error('Crew Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private crewService: CrewService
  ) {}
}
