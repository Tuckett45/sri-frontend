/**
 * Materials Effects
 * Handles side effects for materials actions (API calls, notifications)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, concatMap } from 'rxjs/operators';
import * as MaterialsActions from './materials.actions';
import { MaterialsService } from '../../services/materials.service';
import { ReorderUrgency } from '../../models/material.model';

@Injectable()
export class MaterialsEffects {
  // Load Materials
  loadMaterials$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadMaterials),
      switchMap(() =>
        this.materialsService.getMaterials().pipe(
          map((materials) => MaterialsActions.loadMaterialsSuccess({ materials })),
          catchError((error) =>
            of(MaterialsActions.loadMaterialsFailure({
              error: error.message || 'Failed to load materials'
            }))
          )
        )
      )
    )
  );

  // Load Single Material
  loadMaterial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadMaterial),
      switchMap(({ materialId }) =>
        this.materialsService.getMaterial(materialId).pipe(
          map((material) => MaterialsActions.loadMaterialSuccess({ material })),
          catchError((error) =>
            of(MaterialsActions.loadMaterialFailure({
              error: error.message || 'Failed to load material'
            }))
          )
        )
      )
    )
  );

  // Consume Material - get transaction then reload material for updated quantity
  consumeMaterial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.consumeMaterial),
      switchMap(({ dto }) =>
        this.materialsService.consumeMaterial(dto).pipe(
          concatMap((transaction) =>
            this.materialsService.getMaterial(dto.materialId).pipe(
              map((material) =>
                MaterialsActions.consumeMaterialSuccess({ material, transaction })
              )
            )
          ),
          catchError((error) =>
            of(MaterialsActions.consumeMaterialFailure({
              error: error.message || 'Failed to consume material'
            }))
          )
        )
      )
    )
  );

  // Receive Material - get transaction then reload material for updated quantity
  receiveMaterial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.receiveMaterial),
      switchMap(({ materialId, quantity, supplierId, purchaseOrderId }) =>
        this.materialsService.receiveMaterial(materialId, quantity, supplierId, purchaseOrderId).pipe(
          concatMap((transaction) =>
            this.materialsService.getMaterial(materialId).pipe(
              map((material) =>
                MaterialsActions.receiveMaterialSuccess({ material, transaction })
              )
            )
          ),
          catchError((error) =>
            of(MaterialsActions.receiveMaterialFailure({
              error: error.message || 'Failed to receive material'
            }))
          )
        )
      )
    )
  );

  // Load Transaction History
  loadTransactionHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadTransactionHistory),
      switchMap(({ materialId }) =>
        this.materialsService.getTransactionHistory(materialId).pipe(
          map((transactions) =>
            MaterialsActions.loadTransactionHistorySuccess({ materialId, transactions })
          ),
          catchError((error) =>
            of(MaterialsActions.loadTransactionHistoryFailure({
              error: error.message || 'Failed to load transaction history'
            }))
          )
        )
      )
    )
  );

  // Load Reorder Recommendations
  loadReorderRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadReorderRecommendations),
      switchMap(() =>
        this.materialsService.getReorderRecommendations().pipe(
          map((recommendations) =>
            MaterialsActions.loadReorderRecommendationsSuccess({ recommendations })
          ),
          catchError((error) =>
            of(MaterialsActions.loadReorderRecommendationsFailure({
              error: error.message || 'Failed to load reorder recommendations'
            }))
          )
        )
      )
    )
  );

  // Create Purchase Order
  createPurchaseOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.createPurchaseOrder),
      switchMap(({ dto }) =>
        this.materialsService.createPurchaseOrder(dto).pipe(
          map((purchaseOrder) =>
            MaterialsActions.createPurchaseOrderSuccess({ purchaseOrder })
          ),
          catchError((error) =>
            of(MaterialsActions.createPurchaseOrderFailure({
              error: error.message || 'Failed to create purchase order'
            }))
          )
        )
      )
    )
  );

  // Load Purchase Orders
  loadPurchaseOrders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadPurchaseOrders),
      switchMap(() =>
        this.materialsService.getPurchaseOrders().pipe(
          map((purchaseOrders) =>
            MaterialsActions.loadPurchaseOrdersSuccess({ purchaseOrders })
          ),
          catchError((error) =>
            of(MaterialsActions.loadPurchaseOrdersFailure({
              error: error.message || 'Failed to load purchase orders'
            }))
          )
        )
      )
    )
  );

  // Update Purchase Order Status
  updatePurchaseOrderStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.updatePurchaseOrderStatus),
      switchMap(({ purchaseOrderId, status }) =>
        this.materialsService.updatePurchaseOrderStatus(purchaseOrderId, status).pipe(
          map((purchaseOrder) =>
            MaterialsActions.updatePurchaseOrderStatusSuccess({ purchaseOrder })
          ),
          catchError((error) =>
            of(MaterialsActions.updatePurchaseOrderStatusFailure({
              error: error.message || 'Failed to update purchase order status'
            }))
          )
        )
      )
    )
  );

  // Load Suppliers
  loadSuppliers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadSuppliers),
      switchMap(() =>
        this.materialsService.getSuppliers().pipe(
          map((suppliers) =>
            MaterialsActions.loadSuppliersSuccess({ suppliers })
          ),
          catchError((error) =>
            of(MaterialsActions.loadSuppliersFailure({
              error: error.message || 'Failed to load suppliers'
            }))
          )
        )
      )
    )
  );

  // Reorder Alert - triggers after materials load
  reorderAlert$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MaterialsActions.loadMaterialsSuccess),
      map(({ materials }) => {
        const lowStockMaterials = materials.filter(
          m => m.currentQuantity <= m.reorderPoint
        );
        return MaterialsActions.reorderAlert({
          recommendations: lowStockMaterials.map(m => ({
            materialId: m.id,
            materialName: m.name,
            currentQuantity: m.currentQuantity,
            reorderPoint: m.reorderPoint,
            recommendedQuantity: m.reorderQuantity,
            supplierId: m.preferredSupplierId,
            supplierName: '',
            estimatedCost: m.reorderQuantity * m.unitCost,
            urgency: m.currentQuantity === 0
              ? ReorderUrgency.Critical
              : m.currentQuantity <= m.reorderPoint * 0.5
                ? ReorderUrgency.High
                : ReorderUrgency.Medium
          }))
        });
      })
    )
  );

  // Reorder Alert Notification
  reorderAlertNotification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MaterialsActions.reorderAlert),
        tap(({ recommendations }) => {
          if (recommendations.length > 0) {
            this.snackBar.open(
              `⚠️ ${recommendations.length} material(s) at or below reorder point`,
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

  // Success Notifications
  consumeMaterialSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MaterialsActions.consumeMaterialSuccess),
        tap(({ material }) => {
          this.snackBar.open(
            `${material.name} consumed successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  receiveMaterialSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MaterialsActions.receiveMaterialSuccess),
        tap(({ material }) => {
          this.snackBar.open(
            `${material.name} received successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  createPurchaseOrderSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MaterialsActions.createPurchaseOrderSuccess),
        tap(({ purchaseOrder }) => {
          this.snackBar.open(
            `Purchase order ${purchaseOrder.poNumber} created successfully`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  updatePurchaseOrderStatusSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(MaterialsActions.updatePurchaseOrderStatusSuccess),
        tap(({ purchaseOrder }) => {
          this.snackBar.open(
            `Purchase order ${purchaseOrder.poNumber} updated to ${purchaseOrder.status}`,
            'Close',
            { duration: 3000, horizontalPosition: 'end', verticalPosition: 'top' }
          );
        })
      ),
    { dispatch: false }
  );

  // Error Notifications
  materialsFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          MaterialsActions.loadMaterialsFailure,
          MaterialsActions.loadMaterialFailure,
          MaterialsActions.consumeMaterialFailure,
          MaterialsActions.receiveMaterialFailure,
          MaterialsActions.loadTransactionHistoryFailure,
          MaterialsActions.loadReorderRecommendationsFailure,
          MaterialsActions.createPurchaseOrderFailure,
          MaterialsActions.loadPurchaseOrdersFailure,
          MaterialsActions.updatePurchaseOrderStatusFailure,
          MaterialsActions.loadSuppliersFailure
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
    private materialsService: MaterialsService,
    private snackBar: MatSnackBar
  ) {}
}
