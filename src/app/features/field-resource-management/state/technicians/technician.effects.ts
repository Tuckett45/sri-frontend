/**
 * Technician Effects
 * Handles side effects for technician actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as TechnicianActions from './technician.actions';
import { TechnicianService } from '../../services/technician.service';

@Injectable()
export class TechnicianEffects {
  // Load Technicians Effect
  loadTechnicians$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.loadTechnicians),
      switchMap(({ filters }) =>
        this.technicianService.getTechnicians(filters).pipe(
          map((technicians) =>
            TechnicianActions.loadTechniciansSuccess({ technicians })
          ),
          catchError((error) =>
            of(TechnicianActions.loadTechniciansFailure({ 
              error: error.message || 'Failed to load technicians' 
            }))
          )
        )
      )
    )
  );

  // Create Technician Effect
  createTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.createTechnician),
      switchMap(({ technician }) =>
        this.technicianService.createTechnician(technician).pipe(
          map((createdTechnician) =>
            TechnicianActions.createTechnicianSuccess({ technician: createdTechnician })
          ),
          catchError((error) =>
            of(TechnicianActions.createTechnicianFailure({ 
              error: error.message || 'Failed to create technician' 
            }))
          )
        )
      )
    )
  );

  // Optimistic Create Effect
  createTechnicianOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.createTechnicianOptimistic),
      switchMap(({ technician, tempId }) =>
        this.technicianService.createTechnician(technician as any).pipe(
          map((createdTechnician) => {
            // Replace temp entity with real one
            return TechnicianActions.createTechnicianSuccess({ technician: createdTechnician });
          }),
          catchError((error) => {
            console.error('Optimistic create failed, rolling back:', error);
            return of(TechnicianActions.rollbackTechnicianCreate({ tempId }));
          })
        )
      )
    )
  );

  // Update Technician Effect
  updateTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.updateTechnician),
      switchMap(({ id, technician }) =>
        this.technicianService.updateTechnician(id, technician).pipe(
          map((updatedTechnician) =>
            TechnicianActions.updateTechnicianSuccess({ technician: updatedTechnician })
          ),
          catchError((error) =>
            of(TechnicianActions.updateTechnicianFailure({ 
              error: error.message || 'Failed to update technician' 
            }))
          )
        )
      )
    )
  );

  // Optimistic Update Effect
  updateTechnicianOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.updateTechnicianOptimistic),
      switchMap(({ id, changes, originalData }) =>
        this.technicianService.updateTechnician(id, changes as any).pipe(
          map((updatedTechnician) =>
            TechnicianActions.updateTechnicianSuccess({ technician: updatedTechnician })
          ),
          catchError((error) => {
            console.error('Optimistic update failed, rolling back:', error);
            return of(TechnicianActions.rollbackTechnicianUpdate({ id, originalData }));
          })
        )
      )
    )
  );

  // Delete Technician Effect
  deleteTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.deleteTechnician),
      switchMap(({ id }) =>
        this.technicianService.deleteTechnician(id).pipe(
          map(() =>
            TechnicianActions.deleteTechnicianSuccess({ id })
          ),
          catchError((error) =>
            of(TechnicianActions.deleteTechnicianFailure({ 
              error: error.message || 'Failed to delete technician' 
            }))
          )
        )
      )
    )
  );

  // Optimistic Delete Effect
  deleteTechnicianOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.deleteTechnicianOptimistic),
      switchMap(({ id, originalData }) =>
        this.technicianService.deleteTechnician(id).pipe(
          map(() =>
            TechnicianActions.deleteTechnicianSuccess({ id })
          ),
          catchError((error) => {
            console.error('Optimistic delete failed, rolling back:', error);
            return of(TechnicianActions.rollbackTechnicianDelete({ originalData }));
          })
        )
      )
    )
  );

  // Update Technician Location Effect
  updateTechnicianLocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.updateTechnicianLocation),
      switchMap(({ technicianId, location }) =>
        // Note: This would typically call a dedicated location update endpoint
        // For now, we'll use the general update method
        this.technicianService.updateTechnician(technicianId, { 
          currentLocation: location 
        } as any).pipe(
          map(() =>
            TechnicianActions.updateTechnicianLocationSuccess({ technicianId, location })
          ),
          catchError((error) =>
            of(TechnicianActions.updateTechnicianLocationFailure({ 
              error: error.message || 'Failed to update technician location' 
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
          TechnicianActions.loadTechniciansFailure,
          TechnicianActions.createTechnicianFailure,
          TechnicianActions.updateTechnicianFailure,
          TechnicianActions.deleteTechnicianFailure,
          TechnicianActions.updateTechnicianLocationFailure
        ),
        tap((action) => {
          console.error('Technician Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private technicianService: TechnicianService
  ) {}
}
