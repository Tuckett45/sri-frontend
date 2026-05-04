/**
 * Materials Management Models
 * 
 * Models for materials tracking with supplier automation
 */

/**
 * Material category enum
 */
export enum MaterialCategory {
  Cable = 'cable',
  Connectors = 'connectors',
  Hardware = 'hardware',
  Consumables = 'consumables',
  Other = 'other'
}

/**
 * Transaction type enum
 */
export enum TransactionType {
  Receipt = 'receipt',
  Consumption = 'consumption',
  Adjustment = 'adjustment',
  Return = 'return'
}

/**
 * Purchase order status enum
 */
export enum PurchaseOrderStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Ordered = 'ordered',
  PartiallyReceived = 'partially-received',
  Received = 'received',
  Cancelled = 'cancelled'
}

/**
 * Reorder urgency enum
 */
export enum ReorderUrgency {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

/**
 * Material model with supplier integration
 */
export interface Material {
  id: string;
  materialNumber: string;
  name: string;
  description: string;
  category: MaterialCategory;
  unit: string;           // e.g., 'ft', 'ea', 'box'
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  preferredSupplierId: string;
  alternateSupplierIds: string[];
  lastOrderDate: Date | null;
  lastReceivedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supplier model
 */
export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  automationEnabled: boolean;
  apiEndpoint: string | null;
  apiKey: string | null;
  leadTimeDays: number;
  minimumOrderAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Material transaction (consumption or receipt)
 */
export interface MaterialTransaction {
  id: string;
  materialId: string;
  transactionType: TransactionType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  jobId: string | null;        // For consumption
  supplierId: string | null;   // For receipt
  purchaseOrderId: string | null;
  performedBy: string;         // User ID
  performedByName: string;
  notes: string | null;
  timestamp: Date;
}

/**
 * Purchase order item
 */
export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Purchase order
 */
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reorder recommendation
 */
export interface ReorderRecommendation {
  materialId: string;
  materialName: string;
  currentQuantity: number;
  reorderPoint: number;
  recommendedQuantity: number;
  supplierId: string;
  supplierName: string;
  estimatedCost: number;
  urgency: ReorderUrgency;
}

/**
 * DTOs (Data Transfer Objects)
 */

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
 * Create purchase order DTO
 */
export interface CreatePurchaseOrderDto {
  supplierId: string;
  items: PurchaseOrderItemDto[];
  expectedDeliveryDate?: Date;
}

/**
 * Purchase order item DTO
 */
export interface PurchaseOrderItemDto {
  materialId: string;
  quantity: number;
  unitCost: number;
}
