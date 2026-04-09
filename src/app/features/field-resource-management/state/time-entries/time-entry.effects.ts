/**
 * Time Entry Effects
 * Handles side effects for time entry actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import * as TimeEntryActions from './time-entry.actions';
import { selectTimeEntryById, selectActiveTimeEntry } from './time-entry.selectors';
import { GeolocationService } from '../../services/geolocation.service';

@Injectable()
export class TimeEntryEffects {
  // Clock In Effect
  clockIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockIn),
      switchMap(({ jobId, technicianId, location, mileage }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.clockIn(jobId, technicianId, location, mileage).pipe(
        of({
          id: `time-entry-${Date.now()}`,
          jobId,
          technicianId,
          clockInTime: new Date(),
          clockInLocation: location,
          mileage: mileage || 0,
          isManuallyAdjusted: false,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any).pipe( // Placeholder
          map((timeEntry) =>
            TimeEntryActions.clockInSuccess({ timeEntry })
          ),
          catchError((error) =>
            of(TimeEntryActions.clockInFailure({ 
              error: error.message || 'Failed to clock in' 
            }))
          )
        )
      )
    )
  );

  // Clock Out Effect
  clockOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockOut),
      withLatestFrom(
        this.actions$.pipe(
          ofType(TimeEntryActions.clockOut),
          switchMap(action => this.store.select(selectTimeEntryById(action.timeEntryId)))
        )
      ),
      switchMap(([action, existingEntry]) => {
        const { timeEntryId, location, reason } = action;
        
        // Calculate mileage if not manually entered and both locations are available
        let calculatedMileage: number | undefined;
        
        if (existingEntry && !existingEntry.mileage && existingEntry.clockInLocation && location) {
          const distanceMeters = this.geolocationService.calculateDistance(
            existingEntry.clockInLocation,
            location
          );
          calculatedMileage = distanceMeters * 0.000621371; // Convert meters to miles
        }
        
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.clockOut(timeEntryId, location, calculatedMileage).pipe(
        const clockOutTime = new Date();
        let totalHours = 0;
        if (existingEntry?.clockInTime) {
          const clockInMs = new Date(existingEntry.clockInTime).getTime();
          const clockOutMs = clockOutTime.getTime();
          totalHours = Math.max(0, (clockOutMs - clockInMs) / (1000 * 60 * 60));
          totalHours = Math.round(totalHours * 100) / 100; // Round to 2 decimal places
        }
        
        return of({
          id: timeEntryId,
          clockOutTime,
          clockOutLocation: location,
          clockOutReason: reason,
          totalHours,
          mileage: calculatedMileage || existingEntry?.mileage || 0
        } as any).pipe( // Placeholder
          map((timeEntry) =>
            TimeEntryActions.clockOutSuccess({ timeEntry })
          ),
          catchError((error) =>
            of(TimeEntryActions.clockOutFailure({ 
              error: error.message || 'Failed to clock out' 
            }))
          )
        );
      })
    )
  );

  // Load Time Entries Effect
  // Uses upsertMany in the reducer so existing entries are preserved, not replaced.
  // TODO: Replace with actual API call when backend is ready.
  loadTimeEntries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadTimeEntries),
      switchMap(() =>
        // TODO: Replace with actual TimeTrackingService call
        of([]).pipe(
          map((timeEntries) =>
            TimeEntryActions.loadTimeEntriesSuccess({ timeEntries })
          ),
          catchError((error) =>
            of(TimeEntryActions.loadTimeEntriesFailure({
              error: error.message || 'Failed to load time entries'
            }))
          )
        )
      )
    )
  );

  // Update Time Entry Effect
  updateTimeEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.updateTimeEntry),
      switchMap(({ id, timeEntry }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.updateTimeEntry(id, timeEntry).pipe(
        of({ id, ...timeEntry } as any).pipe( // Placeholder
          map((updatedTimeEntry) =>
            TimeEntryActions.updateTimeEntrySuccess({ timeEntry: updatedTimeEntry })
          ),
          catchError((error) =>
            of(TimeEntryActions.updateTimeEntryFailure({ 
              error: error.message || 'Failed to update time entry' 
            }))
          )
        )
      )
    )
  );

  // Load Active Entry Effect
  // Returns existing active entry from store until a real API is wired up.
  loadActiveEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadActiveEntry),
      withLatestFrom(this.store.select(selectActiveTimeEntry)),
      switchMap(([_action, existingActive]) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.getActiveTimeEntry(technicianId).pipe(
        of(existingActive).pipe(
          map((timeEntry) =>
            TimeEntryActions.loadActiveEntrySuccess({ timeEntry })
          ),
          catchError((error) =>
            of(TimeEntryActions.loadActiveEntryFailure({ 
              error: error.message || 'Failed to load active entry' 
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private geolocationService: GeolocationService
    // TODO: Inject TimeTrackingService when implemented
    // private timeTrackingService: TimeTrackingService
  ) {}
}
