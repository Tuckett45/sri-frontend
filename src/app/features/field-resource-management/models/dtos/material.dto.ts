/**
 * Material DTOs (Data Transfer Objects)
 * 
 * DTOs for material-related API requests
 */

import { MaterialCategory } from '../material.model';

/**
 * Create material DTO
 */
export interface CreateMaterialDto {
  materialNumber: string;
  name: string;
  description: string;
  category: MaterialCategory;
  unit: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  preferredSupplierId: string;
}

/**
 * Consume material DTO
 */
export interface ConsumeMaterialDto {
  materialId: string;
  jobId: string;
  quantity: number;
  notes?: string;
}

/**
 * Purchase order item DTO
 */
export interface PurchaseOrderItemDto {
  materialId: string;
  quantity: number;
  unitCost: number;
}

/**
 * Create purchase order DTO
 */
export interface CreatePurchaseOrderDto {
  supplierId: string;
  items: PurchaseOrderItemDto[];
  expectedDeliveryDate?: Date;
}
