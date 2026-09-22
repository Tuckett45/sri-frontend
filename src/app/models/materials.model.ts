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
  isSerialized?: boolean;
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
  isSerialized?: boolean;
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


// ============================================================
// Multi-site stock + audit ledger
// ============================================================

export type MaterialTxnType =
  | 'Intake'
  | 'Export'
  | 'Issue'
  | 'Return'
  | 'Transfer'
  | 'Adjustment'
  | 'Count';

/** On-hand balance of a material at a single site. */
export interface MaterialStock {
  id: string;
  materialId: string;
  site: string;
  market?: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
  createdDate?: string | Date | null;
}

/** An append-only ledger entry recording a single stock movement. */
export interface MaterialTransaction {
  id: number;
  materialId: string;
  site?: string | null;
  market?: string | null;
  txnType: MaterialTxnType;
  quantityDelta: number;
  quantityAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  performedAt?: string | Date | null;
}

export interface MaterialStockAdjust {
  materialId: string;
  site: string;
  quantityDelta: number;
  market?: string | null;
  reason?: string | null;
}

// ============================================================
// Transfers (site-to-site)
// ============================================================

export type MaterialTransferStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface MaterialTransfer {
  id: string;
  materialId: string;
  fromSite: string;
  toSite: string;
  market?: string | null;
  quantity: number;
  status: MaterialTransferStatus;
  notes?: string | null;
  completedDate?: string | Date | null;
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

export interface MaterialTransferCreate {
  materialId: string;
  fromSite: string;
  toSite: string;
  quantity: number;
  market?: string | null;
  notes?: string | null;
}

// ============================================================
// Assets (serial / lot)
// ============================================================

export type MaterialAssetStatus = 'InStock' | 'Issued' | 'Retired' | 'Lost';

export interface MaterialAsset {
  id: string;
  materialId: string;
  serialNumber?: string | null;
  lotNumber?: string | null;
  status: MaterialAssetStatus;
  site?: string | null;
  market?: string | null;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

export interface MaterialAssetUpsert {
  id?: string | null;
  materialId: string;
  serialNumber?: string | null;
  lotNumber?: string | null;
  status?: MaterialAssetStatus | null;
  site?: string | null;
  market?: string | null;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  notes?: string | null;
}

// ============================================================
// Reconciliation / cycle counts
// ============================================================

export type MaterialCountStatus = 'Open' | 'Posted' | 'Cancelled';

export interface MaterialCountLine {
  id: string;
  countId: string;
  materialId: string;
  systemQuantity: number;
  countedQuantity?: number | null;
  variance?: number | null;
  notes?: string | null;
}

export interface MaterialCount {
  id: string;
  site: string;
  market?: string | null;
  status: MaterialCountStatus;
  notes?: string | null;
  postedDate?: string | Date | null;
  postedBy?: string | null;
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
  lines: MaterialCountLine[];
}

export interface MaterialCountCreate {
  site: string;
  market?: string | null;
  notes?: string | null;
  prefillFromStock?: boolean;
}

export interface MaterialCountLineInput {
  materialId: string;
  countedQuantity?: number | null;
  notes?: string | null;
}

// ============================================================
// Reporting (read models)
// ============================================================

export interface MaterialStockReportRow {
  materialId: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  unit?: string | null;
  site: string;
  market?: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean;
  unitCost?: number | null;
  extendedValue?: number | null;
}

export interface TechnicianBalanceRow {
  technicianId?: string | null;
  technicianName?: string | null;
  materialId: string;
  name: string;
  unit?: string | null;
  quantityOutstanding: number;
}
