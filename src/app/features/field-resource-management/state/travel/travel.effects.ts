/**
 * Travel Effects
 * Handles side effects for travel actions (API calls, geocoding, distance calculations, notifications)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap } from 'rxjs/operators';
import * as TravelActions from './travel.actions';
import { TravelService } from '../../services/travel.service';
import { GeocodingService } from '../../services/geocoding.service';
import { GeocodingStatus } from '../../models/travel.model';

@Injectable()
export class TravelEffects {
  // Load Travel Profile Effect
  loadTravelProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.loadTravelProfile),
      switchMap(({ technicianId }) =>
        this.travelService.getTravelProfile(technicianId).pipe(
          map((profile) =>
            TravelActions.loadTravelProfileSuccess({ profile })
          ),
          catchError((error) =>
            of(TravelActions.loadTravelProfileFailure({ 
              error: error.message || 'Failed to load travel profile' 
            }))
          )
        )
      )
    )
  );

  // Load Multiple Travel Profiles Effect
  loadTravelProfiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.loadTravelProfiles),
      switchMap(({ technicianIds }) => {
        const profileRequests = technicianIds.map(technicianId => 
          this.travelService.getTravelProfile(technicianId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(profileRequests).pipe(
          map((profiles) => {
            const validProfiles = profiles.filter(p => p !== null);
            return TravelActions.loadTravelProfilesSuccess({ profiles: validProfiles as any[] });
          }),
          catchError((error) =>
            of(TravelActions.loadTravelProfilesFailure({ 
              error: error.message || 'Failed to load travel profiles' 
            }))
          )
        );
      })
    )
  );

  // Load All Travel Profiles Effect
  loadAllTravelProfiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.loadAllTravelProfiles),
      switchMap(() =>
        this.travelService.getAllTravelProfiles().pipe(
          map((profiles) =>
            TravelActions.loadAllTravelProfilesSuccess({ profiles })
          ),
          catchError((error) =>
            of(TravelActions.loadAllTravelProfilesFailure({ 
              error: error.message || 'Failed to load all travel profiles' 
            }))
          )
        )
      )
    )
  );

  // Update Travel Flag Effect
  updateTravelFlag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.updateTravelFlag),
      switchMap(({ technicianId, willing }) =>
        this.travelService.updateTravelFlag(technicianId, willing).pipe(
          map((profile) =>
            TravelActions.updateTravelFlagSuccess({ profile })
          ),
          catchError((error) =>
            of(TravelActions.updateTravelFlagFailure({ 
              error: error.message || 'Failed to update travel flag' 
            }))
          )
        )
      )
    )
  );

  // Update Home Address Effect with Geocoding Trigger
  updateHomeAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.updateHomeAddress),
      mergeMap(({ technicianId, address }) => {
        // First, dispatch start geocoding action
        this.store.dispatch(TravelActions.startGeocoding({ technicianId }));
        
        return this.travelService.updateHomeAddress(technicianId, address).pipe(
          map((profile) =>
            TravelActions.updateHomeAddressSuccess({ profile })
          ),
          catchError((error) =>
            of(TravelActions.updateHomeAddressFailure({ 
              error: error.message || 'Failed to update home address' 
            }))
          )
        );
      })
    )
  );

  // Geocoding Success Handler - triggered by updateHomeAddress in TravelService
  // This effect listens for successful address updates and ensures geocoding status is tracked
  handleGeocodingStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.updateHomeAddressSuccess),
      map(({ profile }) => {
        // Check if geocoding was successful
        if (profile.geocodingStatus === GeocodingStatus.Success && profile.homeCoordinates) {
          return TravelActions.geocodingSuccess({ 
            technicianId: profile.technicianId, 
            coordinates: profile.homeCoordinates 
          });
        } else if (profile.geocodingStatus === GeocodingStatus.Failed) {
          return TravelActions.geocodingFailure({ 
            technicianId: profile.technicianId, 
            error: profile.geocodingError || 'Geocoding failed' 
          });
        }
        // If still pending or not geocoded, no additional action needed
        return TravelActions.updateGeocodingStatus({ 
          technicianId: profile.technicianId, 
          status: profile.geocodingStatus 
        });
      })
    )
  );

  // Calculate Distances Effect
  calculateDistances$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TravelActions.calculateDistances),
      switchMap(({ jobId, technicianIds }) =>
        this.travelService.calculateDistancesToJob(jobId).pipe(
          map((distances) => {
            // Filter by technicianIds if provided
            const filteredDistances = technicianIds 
              ? distances.filter(d => technicianIds.includes(d.technicianId))
              : distances;
            
            return TravelActions.calculateDistancesSuccess({ 
              jobId, 
              distances: filteredDistances 
            });
          }),
          catchError((error) =>
            of(TravelActions.calculateDistancesFailure({ 
              error: error.message || 'Failed to calculate distances' 
            }))
          )
        )
      )
    )
  );

  // Success Notifications
  updateTravelFlagSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TravelActions.updateTravelFlagSuccess),
        tap(({ profile }) => {
          const status = profile.willingToTravel ? 'willing to travel' : 'not willing to travel';
          this.snackBar.open(
            `Travel flag updated: ${status}`, 
            'Close', 
            {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          );
        })
      ),
    { dispatch: false }
  );

  updateHomeAddressSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TravelActions.updateHomeAddressSuccess),
        tap(() => {
          this.snackBar.open('Home address updated successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        })
      ),
    { dispatch: false }
  );

  geocodingSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TravelActions.geocodingSuccess),
        tap(() => {
          this.snackBar.open('Address geocoded successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        })
      ),
    { dispatch: false }
  );

  calculateDistancesSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TravelActions.calculateDistancesSuccess),
        tap(({ distances }) => {
          this.snackBar.open(
            `Distances calculated for ${distances.length} technician(s)`, 
            'Close', 
            {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          );
        })
      ),
    { dispatch: false }
  );

  // Error Notifications
  geocodingFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(TravelActions.geocodingFailure),
        tap(({ error }) => {
          this.snackBar.open(
            `Geocoding failed: ${error}`, 
            'Close', 
            {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            }
          );
        })
      ),
    { dispatch: false }
  );

  travelFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          TravelActions.loadTravelProfileFailure,
          TravelActions.loadTravelProfilesFailure,
          TravelActions.loadAllTravelProfilesFailure,
          TravelActions.updateTravelFlagFailure,
          TravelActions.updateHomeAddressFailure,
          TravelActions.calculateDistancesFailure
        ),
        tap(({ error }) => {
          this.snackBar.open(`Error: ${error}`, 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private travelService: TravelService,
    private geocodingService: GeocodingService,
    private snackBar: MatSnackBar
  ) {}
}
