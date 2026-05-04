/**
 * Materials Actions
 * Defines all actions for materials state management
 */

import { createAction, props } from '@ngrx/store';
import {
  Material,
  MaterialTransaction,
  PurchaseOrder,
  PurchaseOrderStatus,
  ReorderRecommendation,
  Supplier,
  ConsumeMaterialDto,
  CreatePurchaseOrderDto
} from '../../models/material.model';

// Load Materials
export const loadMaterials = createAction(
  '[Materials] Load Materials'
);

export const loadMaterialsSuccess = createAction(
  '[Materials] Load Materials Success',
  props<{ materials: Material[] }>()
);

export const loadMaterialsFailure = createAction(
  '[Materials] Load Materials Failure',
  props<{ error: string }>()
);

// Load Single Material
export const loadMaterial = createAction(
  '[Materials] Load Material',
  props<{ materialId: string }>()
);

export const loadMaterialSuccess = createAction(
  '[Materials] Load Material Success',
  props<{ material: Material }>()
);

export const loadMaterialFailure = createAction(
  '[Materials] Load Material Failure',
  props<{ error: string }>()
);

// Consume Material
export const consumeMaterial = createAction(
  '[Materials] Consume Material',
  props<{ dto: ConsumeMaterialDto }>()
);

export const consumeMaterialSuccess = createAction(
  '[Materials] Consume Material Success',
  props<{ material: Material; transaction: MaterialTransaction }>()
);

export const consumeMaterialFailure = createAction(
  '[Materials] Consume Material Failure',
  props<{ error: string }>()
);


// Receive Material
export const receiveMaterial = createAction(
  '[Materials] Receive Material',
  props<{ materialId: string; quantity: number; supplierId: string; purchaseOrderId?: string; notes?: string }>()
);

export const receiveMaterialSuccess = createAction(
  '[Materials] Receive Material Success',
  props<{ material: Material; transaction: MaterialTransaction }>()
);

export const receiveMaterialFailure = createAction(
  '[Materials] Receive Material Failure',
  props<{ error: string }>()
);

// Load Transaction History
export const loadTransactionHistory = createAction(
  '[Materials] Load Transaction History',
  props<{ materialId: string }>()
);

export const loadTransactionHistorySuccess = createAction(
  '[Materials] Load Transaction History Success',
  props<{ materialId: string; transactions: MaterialTransaction[] }>()
);

export const loadTransactionHistoryFailure = createAction(
  '[Materials] Load Transaction History Failure',
  props<{ error: string }>()
);

// Load Reorder Recommendations
export const loadReorderRecommendations = createAction(
  '[Materials] Load Reorder Recommendations'
);

export const loadReorderRecommendationsSuccess = createAction(
  '[Materials] Load Reorder Recommendations Success',
  props<{ recommendations: ReorderRecommendation[] }>()
);

export const loadReorderRecommendationsFailure = createAction(
  '[Materials] Load Reorder Recommendations Failure',
  props<{ error: string }>()
);

// Create Purchase Order
export const createPurchaseOrder = createAction(
  '[Materials] Create Purchase Order',
  props<{ dto: CreatePurchaseOrderDto }>()
);

export const createPurchaseOrderSuccess = createAction(
  '[Materials] Create Purchase Order Success',
  props<{ purchaseOrder: PurchaseOrder }>()
);

export const createPurchaseOrderFailure = createAction(
  '[Materials] Create Purchase Order Failure',
  props<{ error: string }>()
);

// Load Purchase Orders
export const loadPurchaseOrders = createAction(
  '[Materials] Load Purchase Orders'
);

export const loadPurchaseOrdersSuccess = createAction(
  '[Materials] Load Purchase Orders Success',
  props<{ purchaseOrders: PurchaseOrder[] }>()
);

export const loadPurchaseOrdersFailure = createAction(
  '[Materials] Load Purchase Orders Failure',
  props<{ error: string }>()
);

// Update Purchase Order Status
export const updatePurchaseOrderStatus = createAction(
  '[Materials] Update Purchase Order Status',
  props<{ purchaseOrderId: string; status: PurchaseOrderStatus }>()
);

export const updatePurchaseOrderStatusSuccess = createAction(
  '[Materials] Update Purchase Order Status Success',
  props<{ purchaseOrder: PurchaseOrder }>()
);

export const updatePurchaseOrderStatusFailure = createAction(
  '[Materials] Update Purchase Order Status Failure',
  props<{ error: string }>()
);

// Load Suppliers
export const loadSuppliers = createAction(
  '[Materials] Load Suppliers'
);

export const loadSuppliersSuccess = createAction(
  '[Materials] Load Suppliers Success',
  props<{ suppliers: Supplier[] }>()
);

export const loadSuppliersFailure = createAction(
  '[Materials] Load Suppliers Failure',
  props<{ error: string }>()
);

// Reorder Alert
export const reorderAlert = createAction(
  '[Materials] Reorder Alert',
  props<{ recommendations: ReorderRecommendation[] }>()
);

export const dismissReorderAlert = createAction(
  '[Materials] Dismiss Reorder Alert',
  props<{ materialId: string }>()
);

// Select Material
export const selectMaterial = createAction(
  '[Materials] Select Material',
  props<{ materialId: string | null }>()
);

// Clear Error
export const clearMaterialsError = createAction(
  '[Materials] Clear Error'
);
