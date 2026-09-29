// Models for the GPN pricing catalog. Mirrors the backend `GpnPrice` entity and the
// import DTOs (see sri-backend: Models/Materials/GpnPrice.cs and Contracts/GpnPricingDtos.cs).
//
// The catalog unifies three source worksheets — "Active Price List", "All market GPN List",
// and "Complete GPN List" — onto a single entity, discriminated by `sourceList`. A GPN may
// appear once per worksheet, so the natural key is the composite (gpn, sourceList).

/** Canonical source-worksheet discriminator values (must match backend GpnPricingDtos.Sources). */
export type GpnSourceList = 'ActivePriceList' | 'AllMarket' | 'Complete';

/** A single GPN pricing/catalog entry (superset of all three worksheets). */
export interface GpnPrice {
  id: string;
  sourceList: GpnSourceList;

  // ---- Common across all three worksheets ----
  gpn: string;
  commodityCode?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  mpn?: string | null;
  manufacturer?: string | null;
  uom?: string | null;
  moq?: number | null;
  alternate?: string | null;
  purchaseOrderText?: string | null;

  // ---- Active Price List + All Market ----
  procurementMethod?: string | null;
  standardPackageQty?: number | null;
  masterReel?: string | null;
  leadTimeInDays?: number | null;

  // ---- Active Price List only ----
  gpnBarcode?: string | null;

  // ---- All Market + Complete ----
  mpnLifecyclePhase?: string | null;
  lifecyclePhase?: string | null;
  validityStartDate?: string | Date | null;
  validityEndDate?: string | Date | null;
  pirNumber?: string | null;
  pricingTable?: string | null;
  pricingTableDesc?: string | null;

  // ---- All Market only ----
  supplierName?: string | null;
  startDateValidation?: string | null;

  // ---- Complete only ----
  secondaryCommodityCode?: string | null;
  supplierId?: string | null;
  standardQuantity?: number | null;
  leadTime?: string | null;
  mpnPir?: string | null;
  oracleCommodityCode?: string | null;
  infoRecordNote?: string | null;
  providerClass?: string | null;

  // ---- Audit ----
  createdBy?: string | null;
  createdDate?: string | Date | null;
  updatedBy?: string | null;
  updatedDate?: string | Date | null;
}

/**
 * Payload to upsert a single GPN entry. `sourceList` accepts either the canonical value
 * or the friendly worksheet name — the backend normalizes it.
 */
export interface GpnPriceUpsert extends Partial<Omit<GpnPrice, 'id' | 'sourceList' | 'gpn' | 'createdBy' | 'createdDate' | 'updatedBy' | 'updatedDate'>> {
  id?: string | null;
  sourceList: string;
  gpn: string;
}

/**
 * One worksheet's worth of raw rows. `header` holds the column names exactly as they appear
 * in the sheet (any casing/underscore style); each entry in `rows` is a positional list of
 * cell values aligned to `header`. The backend maps columns and parses types server-side, so
 * the frontend passes everything through untouched.
 */
export interface GpnWorksheetImport {
  sourceList: string;
  header: string[];
  rows: (string | null)[][];
}

/** A whole workbook (one or more of the three worksheets) in a single import request. */
export interface GpnWorkbookImport {
  worksheets: GpnWorksheetImport[];
}

export interface GpnImportRowError {
  rowNumber: number;
  sourceList: string;
  message: string;
}

/** Per-import summary returned by POST /api/GpnPricing/import. */
export interface GpnImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: GpnImportRowError[];
}
