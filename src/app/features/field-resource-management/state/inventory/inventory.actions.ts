/**
 * Inventory Actions
 * Defines all actions for inventory state management
 */

import { createAction, props } from '@ngrx/store';
import { InventoryItem, InventoryLocationHistory, InventoryFilters } from '../../models/inventory.model';

// Load Inventory
export const loadInventory = createAction(
  '[Inventory] Load Inventory',
  props<{ filters?: InventoryFilters }>()
);

export const loadInventorySuccess = createAction(
  '[Inventory] Load Inventory Success',
  props<{ items: InventoryItem[] }>()
);

export const loadInventoryFailure = createAction(
  '[Inventory] Load Inventory Failure',
  props<{ error: string }>()
);

// Load Single Item
export const loadInventoryItem = createAction(
  '[Inventory] Load Inventory Item',
  props<{ itemId: string }>()
);

export const loadInventoryItemSuccess = createAction(
  '[Inventory] Load Inventory Item Success',
  props<{ item: InventoryItem }>()
);

export const loadInventoryItemFailure = createAction(
  '[Inventory] Load Inventory Item Failure',
  props<{ error: string }>()
);

// Assign to Job
export const assignToJob = createAction(
  '[Inventory] Assign To Job',
  props<{ itemId: string; jobId: string; reason?: string }>()
);

export const assignToJobSuccess = createAction(
  '[Inventory] Assign To Job Success',
  props<{ item: InventoryItem }>()
);

export const assignToJobFailure = createAction(
  '[Inventory] Assign To Job Failure',
  props<{ error: string }>()
);

// Assign to Technician
export const assignToTechnician = createAction(
  '[Inventory] Assign To Technician',
  props<{ itemId: string; technicianId: string; reason?: string }>()
);

export const assignToTechnicianSuccess = createAction(
  '[Inventory] Assign To Technician Success',
  props<{ item: InventoryItem }>()
);

export const assignToTechnicianFailure = createAction(
  '[Inventory] Assign To Technician Failure',
  props<{ error: string }>()
);


// Assign to Vendor
export const assignToVendor = createAction(
  '[Inventory] Assign To Vendor',
  props<{ itemId: string; vendorId: string; reason?: string }>()
);

export const assignToVendorSuccess = createAction(
  '[Inventory] Assign To Vendor Success',
  props<{ item: InventoryItem }>()
);

export const assignToVendorFailure = createAction(
  '[Inventory] Assign To Vendor Failure',
  props<{ error: string }>()
);

// Set Filters
export const setFilters = createAction(
  '[Inventory] Set Filters',
  props<{ filters: InventoryFilters }>()
);

export const clearFilters = createAction(
  '[Inventory] Clear Filters'
);

// Load Location History
export const loadLocationHistory = createAction(
  '[Inventory] Load Location History',
  props<{ itemId: string }>()
);

export const loadLocationHistorySuccess = createAction(
  '[Inventory] Load Location History Success',
  props<{ itemId: string; history: InventoryLocationHistory[] }>()
);

export const loadLocationHistoryFailure = createAction(
  '[Inventory] Load Location History Failure',
  props<{ error: string }>()
);

// Low Stock Alert
export const lowStockAlert = createAction(
  '[Inventory] Low Stock Alert',
  props<{ items: InventoryItem[] }>()
);

export const dismissLowStockAlert = createAction(
  '[Inventory] Dismiss Low Stock Alert',
  props<{ itemId: string }>()
);

// Select Item
export const selectInventoryItem = createAction(
  '[Inventory] Select Item',
  props<{ itemId: string | null }>()
);

// Clear Error
export const clearInventoryError = createAction(
  '[Inventory] Clear Error'
);
