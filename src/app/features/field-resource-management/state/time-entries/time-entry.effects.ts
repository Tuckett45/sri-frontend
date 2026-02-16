/**
 * Time Entry Effects
 * Handles side effects for time entry actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as TimeEntryActions from './time-entry.actions';

@Injectable()
export class TimeEntryEffects {
  // Clock In Effect
  clockIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockIn),
      switchMap(({ jobId, technicianId, location }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.clockIn(jobId, technicianId, location).pipe(
        of({
          id: 'temp-time-entry-id',
          jobId,
          technicianId,
          clockInTime: new Date(),
          clockInLocation: location,
          isManuallyAdjusted: false,
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
      switchMap(({ timeEntryId, location }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.clockOut(timeEntryId, location).pipe(
        of({
          id: timeEntryId,
          clockOutTime: new Date(),
          clockOutLocation: location,
          totalHours: 8, // Placeholder calculation
          mileage: 25 // Placeholder calculation
        } as any).pipe( // Placeholder
          map((timeEntry) =>
            TimeEntryActions.clockOutSuccess({ timeEntry })
          ),
          catchError((error) =>
            of(TimeEntryActions.clockOutFailure({ 
              error: error.message || 'Failed to clock out' 
            }))
          )
        )
      )
    )
  );

  // Load Time Entries Effect
  loadTimeEntries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadTimeEntries),
      switchMap(({ technicianId, jobId, dateRange }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.getTimeEntries({ technicianId, jobId, dateRange }).pipe(
        of([]).pipe( // Placeholder - returns empty array
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
  loadActiveEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.loadActiveEntry),
      switchMap(({ technicianId }) =>
        // TODO: Replace with actual TimeTrackingService call when service is implemented
        // this.timeTrackingService.getActiveTimeEntry(technicianId).pipe(
        of(null).pipe( // Placeholder - returns null (no active entry)
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
    private actions$: Actions
    // TODO: Inject TimeTrackingService when implemented
    // private timeTrackingService: TimeTrackingService
  ) {}
}
