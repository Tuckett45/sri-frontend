/**
 * Inventory Selectors
 * Provides memoized selectors for accessing inventory state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { InventoryState } from './inventory.state';
import { inventoryAdapter } from './inventory.reducer';
import { InventoryItem, InventoryStatus, LocationType } from '../../models/inventory.model';

// Feature selector
export const selectInventoryState = createFeatureSelector<InventoryState>('inventory');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = inventoryAdapter.getSelectors();

// Select all inventory items
export const selectAllInventory = createSelector(
  selectInventoryState,
  selectAll
);

// Select inventory entities map
export const selectInventoryEntities = createSelector(
  selectInventoryState,
  selectEntities
);

// Select inventory item by ID
export const selectInventoryItemById = (itemId: string) => createSelector(
  selectInventoryEntities,
  (entities) => entities[itemId] || null
);

// Select selected item ID
export const selectSelectedItemId = createSelector(
  selectInventoryState,
  (state) => state.selectedItemId
);

// Select selected inventory item
export const selectSelectedInventoryItem = createSelector(
  selectInventoryEntities,
  selectSelectedItemId,
  (entities, selectedId) => selectedId ? entities[selectedId] || null : null
);

// Select loading state
export const selectInventoryLoading = createSelector(
  selectInventoryState,
  (state) => state.loading
);

// Select error state
export const selectInventoryError = createSelector(
  selectInventoryState,
  (state) => state.error
);

// Select current filters
export const selectInventoryFilters = createSelector(
  selectInventoryState,
  (state) => state.filters
);

// Select total count
export const selectInventoryTotal = createSelector(
  selectInventoryState,
  selectTotal
);

// Select filtered inventory
export const selectFilteredInventory = createSelector(
  selectAllInventory,
  selectInventoryFilters,
  (items, filters) => {
    let filtered = [...items];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.itemNumber.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.locationType) {
      filtered = filtered.filter(item => item.currentLocation.type === filters.locationType);
    }

    if (filters.locationId) {
      filtered = filtered.filter(item => item.currentLocation.id === filters.locationId);
    }

    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    if (filters.lowStock) {
      filtered = filtered.filter(item => item.quantity <= item.minimumThreshold);
    }

    return filtered;
  }
);

// Select inventory by location type
export const selectInventoryByLocationType = (locationType: LocationType) => createSelector(
  selectAllInventory,
  (items) => items.filter(item => item.currentLocation.type === locationType)
);

// Select inventory by location ID
export const selectInventoryByLocationId = (locationId: string) => createSelector(
  selectAllInventory,
  (items) => items.filter(item => item.currentLocation.id === locationId)
);

// Select low stock items
export const selectLowStockItems = createSelector(
  selectAllInventory,
  (items) => items.filter(item => item.quantity <= item.minimumThreshold)
);

// Select low stock items with undismissed alerts
export const selectLowStockAlerts = createSelector(
  selectLowStockItems,
  selectInventoryState,
  (lowStockItems, state) =>
    lowStockItems.filter(item => !state.lowStockAlertDismissed[item.id])
);

// Select location history for an item
export const selectLocationHistory = (itemId: string) => createSelector(
  selectInventoryState,
  (state) => state.locationHistory[itemId] || []
);

// Select inventory value by location type
export const selectInventoryValueByLocationType = createSelector(
  selectAllInventory,
  (items) => {
    const valueMap: Record<string, number> = {};
    items.forEach(item => {
      const key = item.currentLocation.type;
      valueMap[key] = (valueMap[key] || 0) + item.totalValue;
    });
    return valueMap;
  }
);

// Select total inventory value
export const selectTotalInventoryValue = createSelector(
  selectAllInventory,
  (items) => items.reduce((sum, item) => sum + item.totalValue, 0)
);

// Select inventory statistics
export const selectInventoryStatistics = createSelector(
  selectAllInventory,
  selectLowStockItems,
  (items, lowStock) => ({
    total: items.length,
    lowStock: lowStock.length,
    totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
    byStatus: items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byLocationType: items.reduce((acc, item) => {
      acc[item.currentLocation.type] = (acc[item.currentLocation.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  })
);

// Select inventory IDs
export const selectInventoryIds = createSelector(
  selectInventoryState,
  selectIds
);
