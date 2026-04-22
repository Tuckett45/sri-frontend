/**
 * Inventory Effects
 * Handles side effects for inventory actions (API calls, notifications)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import * as InventoryActions from './inventory.actions';
import { selectInventoryFilters } from './inventory.selectors';
import { InventoryService } from '../../services/inventory.service';

@Injectable()
export class InventoryEffects {
  // Load Inventory Effect
  loadInventory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.loadInventory),
      withLatestFrom(this.store.select(selectInventoryFilters)),
      switchMap(([action, currentFilters]) => {
        const filters = action.filters || currentFilters;
        return this.inventoryService.getInventory(filters).pipe(
          map((items) => InventoryActions.loadInventorySuccess({ items })),
          catchError((error) =>
            of(InventoryActions.loadInventoryFailure({
              error: error.message || 'Failed to load inventory'
            }))
          )
        );
      })
    )
  );

  // Load Single Item Effect
  loadInventoryItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.loadInventoryItem),
      switchMap(({ itemId }) =>
        this.inventoryService.getInventoryItem(itemId).pipe(
          map((item) => InventoryActions.loadInventoryItemSuccess({ item })),
          catchError((error) =>
            of(InventoryActions.loadInventoryItemFailure({
              error: error.message || 'Failed to load inventory item'
            }))
          )
        )
      )
    )
  );

  // Assign to Job Effect
  assignToJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.assignToJob),
      switchMap(({ itemId, jobId, reason }) =>
        this.inventoryService.assignToJob(itemId, jobId, reason).pipe(
          map((item) => InventoryActions.assignToJobSuccess({ item })),
          catchError((error) =>
            of(InventoryActions.assignToJobFailure({
              error: error.message || 'Failed to assign item to job'
            }))
          )
        )
      )
    )
  );

  // Assign to Technician Effect
  assignToTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.assignToTechnician),
      switchMap(({ itemId, technicianId, reason }) =>
        this.inventoryService.assignToTechnician(itemId, technicianId, reason).pipe(
          map((item) => InventoryActions.assignToTechnicianSuccess({ item })),
          catchError((error) =>
            of(InventoryActions.assignToTechnicianFailure({
              error: error.message || 'Failed to assign item to technician'
            }))
          )
        )
      )
    )
  );

  // Assign to Vendor Effect
  assignToVendor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.assignToVendor),
      switchMap(({ itemId, vendorId, reason }) =>
        this.inventoryService.assignToVendor(itemId, vendorId, reason).pipe(
          map((item) => InventoryActions.assignToVendorSuccess({ item })),
          catchError((error) =>
            of(InventoryActions.assignToVendorFailure({
              error: error.message || 'Failed to assign item to vendor'
            }))
          )
        )
      )
    )
  );

  // Load Location History Effect
  loadLocationHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.loadLocationHistory),
      switchMap(({ itemId }) =>
        this.inventoryService.getLocationHistory(itemId).pipe(
          map((history) =>
            InventoryActions.loadLocationHistorySuccess({ itemId, history })
          ),
          catchError((error) =>
            of(InventoryActions.loadLocationHistoryFailure({
              error: error.message || 'Failed to load location history'
            }))
          )
        )
      )
    )
  );

  // Low Stock Alert Effect - triggers after inventory load
  lowStockAlert$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InventoryActions.loadInventorySuccess),
      map(({ items }) => {
        const lowStockItems = items.filter(
          item => item.quantity <= item.minimumThreshold
        );
        return InventoryActions.lowStockAlert({ items: lowStockItems });
      })
    )
  );

  // Filtering is handled client-side by selectFilteredInventory selector
  // No need to reload from server on filter change

  // Success Notifications
  assignToJobSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(InventoryActions.assignToJobSuccess),
        tap(({ item }) => {
          this.snackBar.open(
            `${item.name} assigned to job successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  assignToTechnicianSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(InventoryActions.assignToTechnicianSuccess),
        tap(({ item }) => {
          this.snackBar.open(
            `${item.name} assigned to technician successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  assignToVendorSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(InventoryActions.assignToVendorSuccess),
        tap(({ item }) => {
          this.snackBar.open(
            `${item.name} assigned to vendor successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  // Low Stock Alert Notification
  lowStockAlertNotification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(InventoryActions.lowStockAlert),
        tap(({ items }) => {
          if (items.length > 0) {
            this.snackBar.open(
              `⚠️ ${items.length} item(s) below minimum stock threshold`,
              'View',
              {
                duration: 5000,
                horizontalPosition: 'end',
                verticalPosition: 'top',
                panelClass: ['warning-snackbar']
              }
            );
          }
        })
      ),
    { dispatch: false }
  );

  // Error Notifications
  inventoryFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          InventoryActions.loadInventoryFailure,
          InventoryActions.loadInventoryItemFailure,
          InventoryActions.assignToJobFailure,
          InventoryActions.assignToTechnicianFailure,
          InventoryActions.assignToVendorFailure,
          InventoryActions.loadLocationHistoryFailure
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
    private inventoryService: InventoryService,
    private snackBar: MatSnackBar
  ) {}
}
