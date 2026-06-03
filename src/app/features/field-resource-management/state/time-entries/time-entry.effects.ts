/**
 * Time Entry Effects
 * Handles side effects for time entry actions (API calls)
 * and ATLAS sync integration after successful create/update operations.
 *
 * Requirements: 8.1, 8.3, 8.5, 8.6
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, take, filter } from 'rxjs/operators';
import * as TimeEntryActions from './time-entry.actions';
import * as AtlasSyncActions from '../atlas-sync/atlas-sync.actions';
import * as TechnicianActions from '../technicians/technician.actions';
import { selectTimeEntryById, selectActiveTimeEntry } from './time-entry.selectors';
import { GeolocationService } from '../../services/geolocation.service';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { Action } from '@ngrx/store';

@Injectable()
export class TimeEntryEffects implements OnInitEffects {

  /**
   * OnInitEffects: dispatch loadActiveEntry when effects are registered.
   * This ensures the active clock-in entry is fetched from the API on app startup,
   * so the user can always clock out even after closing and reopening the browser.
   */
  ngrxOnInitEffects(): Action {
    return { type: '[Time Entry] Init Effects' };
  }

  /**
   * Effect: On init, load active entry from the API for the current user.
   * This ensures that even if localStorage state was lost or expired,
   * the active clock-in is restored from the server.
   */
  initLoadActiveEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType('[Time Entry] Init Effects'),
      switchMap(() => {
        // Get current user's technician ID from the auth token
        const token = this.authTokenService.getToken();
        if (!token) {
          return of(); // Not logged in yet, skip
        }
        // Decode the JWT to get the user/technician ID
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const technicianId = payload.sub || payload.userId || payload.technicianId;
          if (technicianId) {
            return of(TimeEntryActions.loadActiveEntry({ technicianId }));
          }
        } catch (e) {
          console.warn('[TimeEntryEffects] Could not decode token for init load:', e);
        }
        return of();
      }),
      filter((action): action is ReturnType<typeof TimeEntryActions.loadActiveEntry> => !!action)
    )
  );

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
      switchMap((action) => {
        const { timeEntryId, location, reason } = action;

        // Look up the existing entry from the store for mileage calculation
        return this.store.select(selectTimeEntryById(timeEntryId)).pipe(
          take(1),
          switchMap((existingEntry) => {
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

  /**
   * Effect: Sync to ATLAS after successful clock-in
   *
   * Dispatches syncToAtlas with the newly created time entry so that
   * the entry is synchronized with the ATLAS backend immediately.
   *
   * Requirements: 8.1, 8.3
   */
  syncAfterClockIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockInSuccess),
      map(({ timeEntry }) => AtlasSyncActions.syncToAtlas({ entry: timeEntry }))
    )
  );

  /**
   * Effect: Sync to ATLAS after successful clock-out
   *
   * Dispatches syncToAtlas with the updated time entry so that
   * the clock-out data is synchronized with the ATLAS backend.
   *
   * Requirements: 8.1, 8.3
   */
  syncAfterClockOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockOutSuccess),
      map(({ timeEntry }) => AtlasSyncActions.syncToAtlas({ entry: timeEntry }))
    )
  );

  /**
   * Effect: Sync to ATLAS after successful time entry update
   *
   * Dispatches syncToAtlas with the updated time entry so that
   * any modifications are synchronized with the ATLAS backend.
   *
   * Requirements: 8.1, 8.3
   */
  syncAfterUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.updateTimeEntrySuccess),
      map(({ timeEntry }) => AtlasSyncActions.syncToAtlas({ entry: timeEntry }))
    )
  );

  // After successful clock-in, update technician field status
  updateStatusOnClockIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockInSuccess),
      map(({ timeEntry }) => {
        const fieldStatus = timeEntry.timeCategory === 'EnRoute' ? 'EnRoute' : 'OnSite';
        return TechnicianActions.updateTechnicianFieldStatus({
          technicianId: timeEntry.technicianId,
          fieldStatus
        });
      })
    )
  );

  // After successful clock-out, reset technician field status to Available.
  // This is intentional: clock-out means the technician is no longer actively
  // working on an assignment and should be marked available for dispatch.
  // We do not read the status from the API response because the backend always
  // sets FieldStatus='Available' on clock-out, making 'Available' the correct
  // and authoritative value here as well.
  updateStatusOnClockOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimeEntryActions.clockOutSuccess),
      map(({ timeEntry }) => TechnicianActions.updateTechnicianFieldStatus({
        technicianId: timeEntry.technicianId,
        fieldStatus: 'Available'
      }))
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private geolocationService: GeolocationService,
    private timeTrackingService: TimeTrackingService,
    private authTokenService: AuthTokenService
  ) {}
}
