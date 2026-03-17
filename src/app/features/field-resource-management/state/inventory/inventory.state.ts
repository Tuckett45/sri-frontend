/**
 * Inventory State
 * Defines the state structure for inventory management
 */

import { EntityState } from '@ngrx/entity';
import { InventoryItem, InventoryLocationHistory, InventoryFilters } from '../../models/inventory.model';

/**
 * Inventory state interface with EntityAdapter
 */
export interface InventoryState extends EntityState<InventoryItem> {
  selectedItemId: string | null;
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
  locationHistory: Record<string, InventoryLocationHistory[]>;
  lowStockAlertDismissed: Record<string, boolean>;
}
