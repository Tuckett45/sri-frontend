/**
 * Inventory Management Models
 * 
 * Models for inventory tracking across jobs, technicians, and vendors
 */

/**
 * Inventory category enum
 */
export enum InventoryCategory {
  Tools = 'tools',
  Equipment = 'equipment',
  Vehicles = 'vehicles',
  SafetyGear = 'safety-gear',
  TestEquipment = 'test-equipment',
  Other = 'other'
}

/**
 * Location type enum
 */
export enum LocationType {
  Job = 'job',
  Technician = 'technician',
  Vendor = 'vendor',
  Warehouse = 'warehouse'
}

/**
 * Inventory status enum
 */
export enum InventoryStatus {
  Available = 'available',
  Assigned = 'assigned',
  InUse = 'in-use',
  Maintenance = 'maintenance',
  Retired = 'retired'
}

/**
 * Inventory location model
 */
export interface InventoryLocation {
  type: LocationType;
  id: string;           // Job ID, Technician ID, Vendor ID, or Warehouse ID
  name: string;         // Display name
  assignedAt: Date;
}

/**
 * Inventory item model
 */
export interface InventoryItem {
  id: string;
  itemNumber: string;
  name: string;
  description: string;
  category: InventoryCategory;
  currentLocation: InventoryLocation;
  quantity: number;
  unitCost: number;
  totalValue: number;
  minimumThreshold: number;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: Date | null;
  warrantyExpiration: Date | null;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory location history
 */
export interface InventoryLocationHistory {
  id: string;
  inventoryItemId: string;
  fromLocation: InventoryLocation | null;
  toLocation: InventoryLocation;
  movedBy: string;      // User ID
  movedByName: string;
  reason: string | null;
  timestamp: Date;
}

/**
 * Inventory filters
 */
export interface InventoryFilters {
  searchTerm?: string;
  category?: InventoryCategory;
  locationType?: LocationType;
  locationId?: string;
  status?: InventoryStatus;
  lowStock?: boolean;
}
