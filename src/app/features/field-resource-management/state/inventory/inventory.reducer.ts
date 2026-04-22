/**
 * Inventory Reducer
 * Manages inventory state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { InventoryItem } from '../../models/inventory.model';
import { InventoryState } from './inventory.state';
import * as InventoryActions from './inventory.actions';

// Entity adapter for normalized state management
export const inventoryAdapter: EntityAdapter<InventoryItem> = createEntityAdapter<InventoryItem>({
  selectId: (item: InventoryItem) => item.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

// Initial state
export const initialState: InventoryState = inventoryAdapter.getInitialState({
  selectedItemId: null,
  loading: false,
  error: null,
  filters: {},
  locationHistory: {},
  lowStockAlertDismissed: {}
});

// Reducer
export const inventoryReducer = createReducer(
  initialState,

  // Load Inventory
  on(InventoryActions.loadInventory, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(InventoryActions.loadInventorySuccess, (state, { items }) =>
    inventoryAdapter.setAll(items, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(InventoryActions.loadInventoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Item
  on(InventoryActions.loadInventoryItem, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(InventoryActions.loadInventoryItemSuccess, (state, { item }) =>
    inventoryAdapter.upsertOne(item, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(InventoryActions.loadInventoryItemFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Assign to Job
  on(InventoryActions.assignToJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(InventoryActions.assignToJobSuccess, (state, { item }) =>
    inventoryAdapter.upsertOne(item, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(InventoryActions.assignToJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Assign to Technician
  on(InventoryActions.assignToTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(InventoryActions.assignToTechnicianSuccess, (state, { item }) =>
    inventoryAdapter.upsertOne(item, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(InventoryActions.assignToTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Assign to Vendor
  on(InventoryActions.assignToVendor, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(InventoryActions.assignToVendorSuccess, (state, { item }) =>
    inventoryAdapter.upsertOne(item, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(InventoryActions.assignToVendorFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Filters
  on(InventoryActions.setFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  on(InventoryActions.clearFilters, (state) => ({
    ...state,
    filters: {}
  })),

  // Load Location History
  on(InventoryActions.loadLocationHistorySuccess, (state, { itemId, history }) => ({
    ...state,
    locationHistory: {
      ...state.locationHistory,
      [itemId]: history
    }
  })),

  on(InventoryActions.loadLocationHistoryFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Low Stock Alert
  on(InventoryActions.dismissLowStockAlert, (state, { itemId }) => ({
    ...state,
    lowStockAlertDismissed: {
      ...state.lowStockAlertDismissed,
      [itemId]: true
    }
  })),

  // Select Item
  on(InventoryActions.selectInventoryItem, (state, { itemId }) => ({
    ...state,
    selectedItemId: itemId
  })),

  // Clear Error
  on(InventoryActions.clearInventoryError, (state) => ({
    ...state,
    error: null
  }))
);
