/**
 * Materials Selectors
 * Provides memoized selectors for accessing materials state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MaterialsState } from './materials.state';
import { materialsAdapter } from './materials.reducer';
import { MaterialCategory, PurchaseOrderStatus, ReorderUrgency } from '../../models/material.model';

// Feature selector
export const selectMaterialsState = createFeatureSelector<MaterialsState>('materials');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = materialsAdapter.getSelectors();

// Select all materials
export const selectAllMaterials = createSelector(
  selectMaterialsState,
  selectAll
);

// Select material entities map
export const selectMaterialEntities = createSelector(
  selectMaterialsState,
  selectEntities
);

// Select material by ID
export const selectMaterialById = (materialId: string) => createSelector(
  selectMaterialEntities,
  (entities) => entities[materialId] || null
);

// Select selected material ID
export const selectSelectedMaterialId = createSelector(
  selectMaterialsState,
  (state) => state.selectedMaterialId
);

// Select selected material
export const selectSelectedMaterial = createSelector(
  selectMaterialEntities,
  selectSelectedMaterialId,
  (entities, selectedId) => selectedId ? entities[selectedId] || null : null
);

// Select loading state
export const selectMaterialsLoading = createSelector(
  selectMaterialsState,
  (state) => state.loading
);

// Select error state
export const selectMaterialsError = createSelector(
  selectMaterialsState,
  (state) => state.error
);

// Select material transactions by material ID
export const selectMaterialTransactions = (materialId: string) => createSelector(
  selectMaterialsState,
  (state) => state.transactions[materialId] || []
);

// Select materials by job (filter transactions by jobId)
export const selectMaterialsByJob = (jobId: string) => createSelector(
  selectAllMaterials,
  selectMaterialsState,
  (materials, state) => {
    const materialIds = new Set<string>();
    Object.values(state.transactions).forEach(txns => {
      txns.forEach(txn => {
        if (txn.jobId === jobId) {
          materialIds.add(txn.materialId);
        }
      });
    });
    return materials.filter(m => materialIds.has(m.id));
  }
);

// Select reorder recommendations
export const selectReorderRecommendations = createSelector(
  selectMaterialsState,
  (state) => state.reorderRecommendations
);

// Select critical reorder recommendations (urgency = Critical or High)
export const selectCriticalReorderRecommendations = createSelector(
  selectReorderRecommendations,
  (recommendations) => recommendations.filter(
    r => r.urgency === ReorderUrgency.Critical || r.urgency === ReorderUrgency.High
  )
);

// Select all suppliers
export const selectAllSuppliers = createSelector(
  selectMaterialsState,
  (state) => state.suppliers
);

// Select supplier by ID
export const selectSupplierById = (supplierId: string) => createSelector(
  selectAllSuppliers,
  (suppliers) => suppliers.find(s => s.id === supplierId) || null
);

// Select purchase orders
export const selectPurchaseOrders = createSelector(
  selectMaterialsState,
  (state) => state.purchaseOrders
);

// Select purchase orders by status
export const selectPurchaseOrdersByStatus = (status: PurchaseOrderStatus) => createSelector(
  selectPurchaseOrders,
  (orders) => orders.filter(o => o.status === status)
);

// Select materials total count
export const selectMaterialsTotal = createSelector(
  selectMaterialsState,
  selectTotal
);

// Select low stock materials (currentQuantity <= reorderPoint)
export const selectLowStockMaterials = createSelector(
  selectAllMaterials,
  (materials) => materials.filter(m => m.currentQuantity <= m.reorderPoint)
);

// Select material statistics
export const selectMaterialStatistics = createSelector(
  selectAllMaterials,
  selectLowStockMaterials,
  (materials, lowStock) => ({
    total: materials.length,
    lowStock: lowStock.length,
    totalValue: materials.reduce((sum, m) => sum + (m.currentQuantity * m.unitCost), 0),
    byCategory: materials.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  })
);

// Select material IDs
export const selectMaterialIds = createSelector(
  selectMaterialsState,
  selectIds
);
