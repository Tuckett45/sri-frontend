/**
 * Materials Reducer
 * Manages materials state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Material } from '../../models/material.model';
import { MaterialsState } from './materials.state';
import * as MaterialsActions from './materials.actions';

// Entity adapter for normalized state management
export const materialsAdapter: EntityAdapter<Material> = createEntityAdapter<Material>({
  selectId: (material: Material) => material.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

// Initial state
export const initialState: MaterialsState = materialsAdapter.getInitialState({
  selectedMaterialId: null,
  loading: false,
  error: null,
  transactions: {},
  purchaseOrders: [],
  reorderRecommendations: [],
  suppliers: []
});

// Reducer
export const materialsReducer = createReducer(
  initialState,

  // Load Materials
  on(MaterialsActions.loadMaterials, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.loadMaterialsSuccess, (state, { materials }) =>
    materialsAdapter.setAll(materials, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(MaterialsActions.loadMaterialsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Material
  on(MaterialsActions.loadMaterial, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.loadMaterialSuccess, (state, { material }) =>
    materialsAdapter.upsertOne(material, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(MaterialsActions.loadMaterialFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Consume Material
  on(MaterialsActions.consumeMaterial, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.consumeMaterialSuccess, (state, { material, transaction }) =>
    materialsAdapter.upsertOne(material, {
      ...state,
      loading: false,
      error: null,
      transactions: {
        ...state.transactions,
        [material.id]: [...(state.transactions[material.id] || []), transaction]
      }
    })
  ),

  on(MaterialsActions.consumeMaterialFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Receive Material
  on(MaterialsActions.receiveMaterial, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.receiveMaterialSuccess, (state, { material, transaction }) =>
    materialsAdapter.upsertOne(material, {
      ...state,
      loading: false,
      error: null,
      transactions: {
        ...state.transactions,
        [material.id]: [...(state.transactions[material.id] || []), transaction]
      }
    })
  ),

  on(MaterialsActions.receiveMaterialFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Transaction History
  on(MaterialsActions.loadTransactionHistorySuccess, (state, { materialId, transactions }) => ({
    ...state,
    transactions: {
      ...state.transactions,
      [materialId]: transactions
    }
  })),

  on(MaterialsActions.loadTransactionHistoryFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Reorder Recommendations
  on(MaterialsActions.loadReorderRecommendations, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.loadReorderRecommendationsSuccess, (state, { recommendations }) => ({
    ...state,
    loading: false,
    error: null,
    reorderRecommendations: recommendations
  })),

  on(MaterialsActions.loadReorderRecommendationsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Purchase Order
  on(MaterialsActions.createPurchaseOrder, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.createPurchaseOrderSuccess, (state, { purchaseOrder }) => ({
    ...state,
    loading: false,
    error: null,
    purchaseOrders: [...state.purchaseOrders, purchaseOrder]
  })),

  on(MaterialsActions.createPurchaseOrderFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Purchase Orders
  on(MaterialsActions.loadPurchaseOrders, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.loadPurchaseOrdersSuccess, (state, { purchaseOrders }) => ({
    ...state,
    loading: false,
    error: null,
    purchaseOrders
  })),

  on(MaterialsActions.loadPurchaseOrdersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Purchase Order Status
  on(MaterialsActions.updatePurchaseOrderStatus, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.updatePurchaseOrderStatusSuccess, (state, { purchaseOrder }) => ({
    ...state,
    loading: false,
    error: null,
    purchaseOrders: state.purchaseOrders.map(po =>
      po.id === purchaseOrder.id ? purchaseOrder : po
    )
  })),

  on(MaterialsActions.updatePurchaseOrderStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Suppliers
  on(MaterialsActions.loadSuppliers, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(MaterialsActions.loadSuppliersSuccess, (state, { suppliers }) => ({
    ...state,
    loading: false,
    error: null,
    suppliers
  })),

  on(MaterialsActions.loadSuppliersFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Material
  on(MaterialsActions.selectMaterial, (state, { materialId }) => ({
    ...state,
    selectedMaterialId: materialId
  })),

  // Clear Error
  on(MaterialsActions.clearMaterialsError, (state) => ({
    ...state,
    error: null
  }))
);
