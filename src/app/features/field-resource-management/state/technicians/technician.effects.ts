/**
 * Technician Effects
 * Handles side effects for technician actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as TechnicianActions from './technician.actions';

@Injectable()
export class TechnicianEffects {
  // Load Technicians Effect
  loadTechnicians$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.loadTechnicians),
      switchMap(({ filters }) =>
        // TODO: Replace with actual TechnicianService call when service is implemented
        // this.technicianService.getTechnicians(filters).pipe(
        of([]).pipe( // Placeholder - returns empty array
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
        // TODO: Replace with actual TechnicianService call when service is implemented
        // this.technicianService.createTechnician(technician).pipe(
        of({ id: 'temp-id', ...technician } as any).pipe( // Placeholder
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

  // Update Technician Effect
  updateTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.updateTechnician),
      switchMap(({ id, technician }) =>
        // TODO: Replace with actual TechnicianService call when service is implemented
        // this.technicianService.updateTechnician(id, technician).pipe(
        of({ id, ...technician } as any).pipe( // Placeholder
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

  // Delete Technician Effect
  deleteTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TechnicianActions.deleteTechnician),
      switchMap(({ id }) =>
        // TODO: Replace with actual TechnicianService call when service is implemented
        // this.technicianService.deleteTechnician(id).pipe(
        of(void 0).pipe( // Placeholder
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

  constructor(
    private actions$: Actions
    // TODO: Inject TechnicianService when implemented
    // private technicianService: TechnicianService
  ) {}
}
