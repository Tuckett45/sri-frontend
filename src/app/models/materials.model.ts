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

/**
 * A material catalog entry / on-hand inventory record for a given site (market).
 *
 * The stock figures mirror the VIMS (Vendor Inventory Management System) export, which
 * reports three distinct quantities per contractor/material:
 *   - totalStock      — everything physically held
 *   - reservedStock   — allocated/committed and therefore not issuable
 *   - availableStock  — issuable now (= totalStock - reservedStock)
 *
 * `quantityOnHand` is retained for backward compatibility and tracks `availableStock`.
 */
export interface Material {
  id: string;
  /** Contractor the stock belongs to (VIMS "Contractor", e.g. "1000000027"). */
  contractor?: string | null;
  /** Material code / number (VIMS "Material", e.g. "7049049" or "1001241-01"). */
  materialCode?: string | null;
  sku?: string | null;
  name: string;
  category?: string | null;
  /** VIMS "Material Description". */
  description?: string | null;
  /** VIMS "Base Unit" (EA, RL, FT, PK, …). */
  unit?: string | null;
  site?: string | null;
  market?: string | null;
  /** VIMS "Total Stock". */
  totalStock?: number;
  /** VIMS "Reserved Stock". */
  reservedStock?: number;
  /** VIMS "Available Stock" (= totalStock - reservedStock). */
  availableStock?: number;
  /** Legacy alias of availableStock, kept for existing stock/ledger logic. */
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
  contractor?: string | null;
  materialCode?: string | null;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  site?: string | null;
  market?: string | null;
  totalStock?: number;
  reservedStock?: number;
  availableStock?: number;
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

// ---- Bulk import ----

/** A single row that could not be imported, with a 1-based row number. */
export interface MaterialImportRowError {
  rowNumber: number;
  message: string;
  sku?: string | null;
  name?: string | null;
}

/** Result of a bulk material CSV import. */
export interface MaterialImportSummary {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: MaterialImportRowError[];
}

// ---- Combined multi-sheet workbook import ----
// Rows are parsed in-browser (SheetJS) into these arrays and posted as JSON. Every
// dependent row references its material by SKU; the backend resolves SKU -> id.

export interface WorkbookMaterialRow {
  contractor?: string | null;
  materialCode?: string | null;
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  unit?: string | null;
  site?: string | null;
  market?: string | null;
  totalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  quantityOnHand?: number;
  reorderLevel?: number;
  unitCost?: number | null;
  isSerialized?: boolean;
}

export interface WorkbookStockRow {
  sku: string;
  site: string;
  quantityOnHand: number;
  reorderLevel?: number | null;
  market?: string | null;
}

export interface WorkbookOrderRow {
  sku: string;
  direction: string;          // Intake | Export
  quantity: number;
  orderNumber?: string | null;
  status?: string | null;     // Received/Shipped => moves stock
  vendor?: string | null;
  site?: string | null;
  market?: string | null;
  unitCost?: number | null;
  notes?: string | null;
}

export interface WorkbookAssignmentRow {
  sku: string;
  quantityIssued: number;
  quantityReturned?: number;
  technicianId?: string | null;
  technicianName?: string | null;
  site?: string | null;
  market?: string | null;
  notes?: string | null;
}

export interface WorkbookTransferRow {
  sku: string;
  fromSite: string;
  toSite: string;
  quantity: number;
  status?: string | null;     // Completed => moves stock
  market?: string | null;
  notes?: string | null;
}

export interface WorkbookAssetRow {
  sku: string;
  serialNumber?: string | null;
  lotNumber?: string | null;
  status?: string | null;
  site?: string | null;
  market?: string | null;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  notes?: string | null;
}

export interface WorkbookCountRow {
  site: string;
  sku: string;
  countedQuantity?: number | null;
  countRef?: string | null;   // groups lines into one count session
  market?: string | null;
  notes?: string | null;
  post?: boolean;             // any true row posts the session
}

export interface MaterialsWorkbookImport {
  materials?: WorkbookMaterialRow[];
  stock?: WorkbookStockRow[];
  orders?: WorkbookOrderRow[];
  assignments?: WorkbookAssignmentRow[];
  transfers?: WorkbookTransferRow[];
  assets?: WorkbookAssetRow[];
  counts?: WorkbookCountRow[];
}

export interface SheetImportResult {
  sheet: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: MaterialImportRowError[];
}

export interface WorkbookImportSummary {
  sheets: SheetImportResult[];
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
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
  contractor?: string | null;
  materialCode?: string | null;
  sku?: string | null;
  name: string;
  category?: string | null;
  unit?: string | null;
  site: string;
  market?: string | null;
  totalStock?: number;
  reservedStock?: number;
  availableStock?: number;
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
