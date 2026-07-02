import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as DashboardActions from './dashboard.actions';
import { RfpDashboardService } from '../../services/rfp-dashboard.service';

@Injectable()
export class DashboardEffects {

  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadDashboard),
      switchMap(({ filters }) =>
        this.dashboardService.getDashboard(filters).pipe(
          map((response) => DashboardActions.loadDashboardSuccess({ response })),
          catchError((error) =>
            of(DashboardActions.loadDashboardFailure({
              error: error.message || 'Failed to load dashboard'
            }))
          )
        )
      )
    )
  );

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadUsers),
      switchMap(() =>
        this.dashboardService.getUsers().pipe(
          map((users) => DashboardActions.loadUsersSuccess({ users })),
          catchError((error) =>
            of(DashboardActions.loadUsersFailure({
              error: error.message || 'Failed to load users'
            }))
          )
        )
      )
    )
  );

  updateDashboardFields$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.updateDashboardFields),
      switchMap(({ quoteId, fields }) =>
        this.dashboardService.updateDashboardFields(quoteId, fields).pipe(
          map((quote) => DashboardActions.updateDashboardFieldsSuccess({ quote })),
          catchError((error) =>
            of(DashboardActions.updateDashboardFieldsFailure({
              error: error.message || 'Failed to update fields'
            }))
          )
        )
      )
    )
  );

  createBomTracking$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.createBomTracking),
      switchMap(({ quoteId, entry }) =>
        this.dashboardService.createBomTracking(quoteId, entry).pipe(
          map((tracking) => DashboardActions.createBomTrackingSuccess({ quoteId, tracking })),
          catchError((error) =>
            of(DashboardActions.createBomTrackingFailure({
              error: error.message || 'Failed to create BOM tracking'
            }))
          )
        )
      )
    )
  );

  showUpdateSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.updateDashboardFieldsSuccess),
      tap(() => {
        this.snackBar.open('Record updated successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showBomTrackingSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.createBomTrackingSuccess),
      tap(() => {
        this.snackBar.open('BOM tracking entry added', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        DashboardActions.loadDashboardFailure,
        DashboardActions.loadUsersFailure,
        DashboardActions.updateDashboardFieldsFailure,
        DashboardActions.createBomTrackingFailure,
        DashboardActions.bulkImportRfpsFailure,
        DashboardActions.deleteRfpFailure
      ),
      tap(({ error }) => {
        this.snackBar.open(error, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  bulkImportRfps$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.bulkImportRfps),
      switchMap(({ records }) =>
        this.dashboardService.bulkImportRfps(records).pipe(
          map((response) => DashboardActions.bulkImportRfpsSuccess({
            importedCount: response.importedCount,
            failedCount: response.failedCount,
            errors: response.errors
          })),
          catchError((error) =>
            of(DashboardActions.bulkImportRfpsFailure({
              error: error?.error?.message || error.message || 'Failed to import RFP records'
            }))
          )
        )
      )
    )
  );

  bulkImportSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.bulkImportRfpsSuccess),
      tap(({ importedCount }) => {
        this.snackBar.open(
          `Successfully imported ${importedCount} RFP record${importedCount !== 1 ? 's' : ''}`,
          'Close',
          { duration: 5000 }
        );
      })
    ),
    { dispatch: false }
  );

  deleteRfp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.deleteRfp),
      switchMap(({ quoteId }) =>
        this.dashboardService.deleteRfp(quoteId).pipe(
          map(() => DashboardActions.deleteRfpSuccess({ quoteId })),
          catchError((error) =>
            of(DashboardActions.deleteRfpFailure({
              error: error?.error?.message || error.message || 'Failed to delete RFP'
            }))
          )
        )
      )
    )
  );

  deleteRfpSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.deleteRfpSuccess),
      tap(() => {
        this.snackBar.open('RFP deleted successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private dashboardService: RfpDashboardService,
    private snackBar: MatSnackBar
  ) {}
}
