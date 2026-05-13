/**
 * Inventory DTOs (Data Transfer Objects)
 * 
 * DTOs for inventory-related API requests
 */

import { InventoryCategory, LocationType } from '../inventory.model';

/**
 * Create inventory item DTO
 */
export interface CreateInventoryItemDto {
  itemNumber: string;
  name: string;
  description: string;
  category: InventoryCategory;
  quantity: number;
  unitCost: number;
  minimumThreshold: number;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
}

/**
 * Assign inventory DTO
 */
export interface AssignInventoryDto {
  locationType: LocationType;
  locationId: string;
  reason?: string;
}
