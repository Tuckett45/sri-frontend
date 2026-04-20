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
import { TimeTrackingService } from '../../services/time-tracking.service';

@Injectable()
export class TimeEntryEffects {
  // Clock In Effect
  clockIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockIn),
      switchMap(({ jobId, technicianId, location }) =>
        this.timeTrackingService.clockIn(jobId, technicianId, location).pipe(
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
        
        // Calculate mileage if both locations are available
        let calculatedMileage: number | undefined;
        if (existingEntry && !existingEntry.mileage && existingEntry.clockInLocation && location) {
          const distanceMeters = this.geolocationService.calculateDistance(
            existingEntry.clockInLocation,
            location
          );
          calculatedMileage = distanceMeters * 0.000621371; // meters to miles
        }

        return this.timeTrackingService.clockOut(
          timeEntryId, location, calculatedMileage, reason
        ).pipe(
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
  loadTimeEntries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadTimeEntries),
      switchMap(({ technicianId, jobId, dateRange }) =>
        this.timeTrackingService.getTimeEntries({
          technicianId,
          jobId,
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate
        }).pipe(
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
        this.timeTrackingService.updateTimeEntry(id, timeEntry).pipe(
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
  loadActiveEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadActiveEntry),
      switchMap(({ technicianId }) =>
        this.timeTrackingService.getActiveTimeEntry(technicianId).pipe(
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
    private geolocationService: GeolocationService,
    private timeTrackingService: TimeTrackingService
  ) {}
}
