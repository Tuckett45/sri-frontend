/**
 * Materials State
 * Defines the state structure for materials management
 */

import { EntityState } from '@ngrx/entity';
import { Material, MaterialTransaction, PurchaseOrder, ReorderRecommendation, Supplier } from '../../models/material.model';

/**
 * Materials state interface with EntityAdapter
 */
export interface MaterialsState extends EntityState<Material> {
  selectedMaterialId: string | null;
  loading: boolean;
  error: string | null;
  transactions: Record<string, MaterialTransaction[]>;
  purchaseOrders: PurchaseOrder[];
  reorderRecommendations: ReorderRecommendation[];
  suppliers: Supplier[];
}
