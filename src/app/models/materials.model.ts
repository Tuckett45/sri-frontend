// Models for the Materials feature: inventory across sites, intake/export orders,
// and materials issued/assigned to technicians.

export type MaterialOrderDirection = 'Intake' | 'Export';

export type MaterialOrderStatus =
  | 'Pending'
  | 'Ordered'
  | 'Received'
  | 'Shipped'
  | 'Cancelled';

export type MaterialAssignmentStatus =
  | 'Issued'
  | 'PartiallyReturned'
  | 'Returned';

/** A material catalog entry / on-hand inventory record for a given site (market). */
export interface Material {
  id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  site?: string | null;
  market?: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost?: number | null;
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

/** An intake (received) or export (shipped/returned) order for a material. */
export interface MaterialOrder {
  id: string;
  materialId: string;
  orderNumber?: string | null;
  direction: MaterialOrderDirection;
  status: MaterialOrderStatus;
  quantity: number;
  vendor?: string | null;
  site?: string | null;
  market?: string | null;
  unitCost?: number | null;
  notes?: string | null;
  orderedDate?: string | Date | null;
  fulfilledDate?: string | Date | null;
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

/** A quantity of a material issued/assigned to a technician, with return tracking. */
export interface MaterialAssignment {
  id: string;
  materialId: string;
  technicianId?: string | null;
  technicianName?: string | null;
  quantityIssued: number;
  quantityReturned: number;
  status: MaterialAssignmentStatus;
  site?: string | null;
  market?: string | null;
  notes?: string | null;
  issuedDate?: string | Date | null;
  returnedDate?: string | Date | null;
  issuedBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

// ---- Request payloads (mirror backend DTOs) ----

export interface MaterialUpsert {
  id?: string | null;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  site?: string | null;
  market?: string | null;
  quantityOnHand?: number;
  reorderLevel?: number;
  unitCost?: number | null;
}

export interface MaterialOrderUpsert {
  id?: string | null;
  materialId: string;
  direction: MaterialOrderDirection;
  quantity: number;
  orderNumber?: string | null;
  status?: MaterialOrderStatus | null;
  vendor?: string | null;
  site?: string | null;
  market?: string | null;
  unitCost?: number | null;
  notes?: string | null;
  orderedDate?: string | Date | null;
  fulfilledDate?: string | Date | null;
}

export interface MaterialAssignmentCreate {
  materialId: string;
  quantityIssued: number;
  technicianId?: string | null;
  technicianName?: string | null;
  site?: string | null;
  market?: string | null;
  notes?: string | null;
}

export interface MaterialAssignmentReturn {
  quantityReturned: number;
  returnedDate?: string | Date | null;
}
