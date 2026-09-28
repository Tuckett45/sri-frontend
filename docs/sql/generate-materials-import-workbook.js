/**
 * Generates `materials-seed-import.xlsx` — a ready-to-import workbook containing the
 * same sample data as `seed-materials-data.sql`, but in the multi-sheet format the
 * Materials "Import" button expects (one sheet per tab, dependent rows keyed by SKU).
 *
 * Rows are expressed in their final/applied state (Option A): Received/Shipped orders,
 * Issued/returned assignments, Completed/Pending transfers, Posted/Open counts. The
 * importer replays these through the audit ledger so balances reconcile — it does NOT
 * import the raw MaterialTransactions ledger (that is derived).
 *
 * Usage (from the sri-frontend project root, so it resolves the installed xlsx lib):
 *   node docs/sql/generate-materials-import-workbook.js
 *
 * Material Id -> SKU mapping used to translate the SQL seed to SKU-keyed rows:
 *   MAT-0001 = CBL-SM-144   MAT-0002 = CON-SC-APC   MAT-0003 = HW-ANCH-38
 *   MAT-0004 = CNS-CLEAN-1   MAT-0005 = TST-OTDR-1
 */
const path = require('path');
const XLSX = require('xlsx');

// ---- Materials (Inventory) ----
const materials = [
  { Name: 'Single-Mode Fiber Cable 144ct', Sku: 'CBL-SM-144', Category: 'Cable',       Description: '144-count single-mode OSP fiber, per foot',            Unit: 'ft',  Site: 'Dallas WH', Market: 'DALLAS', QuantityOnHand: 12500, ReorderLevel: 3000, UnitCost: 0.85, IsSerialized: false },
  { Name: 'SC/APC Connector',             Sku: 'CON-SC-APC', Category: 'Connectors',  Description: 'SC/APC field-installable connector',                 Unit: 'ea',  Site: 'Dallas WH', Market: 'DALLAS', QuantityOnHand: 4200,  ReorderLevel: 1000, UnitCost: 3.25, IsSerialized: false },
  { Name: 'Anchor Bolt 3/8in',            Sku: 'HW-ANCH-38', Category: 'Hardware',    Description: 'Galvanized anchor bolt, 3/8 inch',                   Unit: 'ea',  Site: 'Plano WH',  Market: 'DALLAS', QuantityOnHand: 850,   ReorderLevel: 250,  UnitCost: 1.10, IsSerialized: false },
  { Name: 'Fiber Cleaning Wipes',         Sku: 'CNS-CLEAN-1',Category: 'Consumables', Description: 'Lint-free fiber optic cleaning wipes, box of 50',     Unit: 'box', Site: 'Plano WH',  Market: 'DALLAS', QuantityOnHand: 180,   ReorderLevel: 60,   UnitCost: 12.50, IsSerialized: false },
  { Name: 'OTDR Test Unit',               Sku: 'TST-OTDR-1', Category: 'Other',       Description: 'Handheld OTDR test unit (serialized asset)',         Unit: 'ea',  Site: 'Dallas WH', Market: 'DALLAS', QuantityOnHand: 6,     ReorderLevel: 2,    UnitCost: 4800, IsSerialized: true }
];

// ---- Stock (per-site opening balances) ----
const stock = [
  { Sku: 'CBL-SM-144', Site: 'Dallas WH', QuantityOnHand: 12500, ReorderLevel: 3000, Market: 'DALLAS' },
  { Sku: 'CON-SC-APC', Site: 'Dallas WH', QuantityOnHand: 4200,  ReorderLevel: 1000, Market: 'DALLAS' },
  { Sku: 'HW-ANCH-38', Site: 'Plano WH',  QuantityOnHand: 850,   ReorderLevel: 250,  Market: 'DALLAS' },
  { Sku: 'CNS-CLEAN-1',Site: 'Plano WH',  QuantityOnHand: 180,   ReorderLevel: 60,   Market: 'DALLAS' },
  { Sku: 'TST-OTDR-1', Site: 'Dallas WH', QuantityOnHand: 6,     ReorderLevel: 2,    Market: 'DALLAS' }
];

// ---- Orders (intake / export) ----
const orders = [
  { Sku: 'CBL-SM-144', Direction: 'Intake', Quantity: 5000, OrderNumber: 'PO-2026-1001', Status: 'Received', Vendor: 'Corning Optical',          Site: 'Dallas WH', Market: 'DALLAS', UnitCost: 0.83, Notes: 'Restock of 144ct SM fiber' },
  { Sku: 'CON-SC-APC', Direction: 'Intake', Quantity: 2000, OrderNumber: 'PO-2026-1002', Status: 'Ordered',  Vendor: 'CommScope',                Site: 'Dallas WH', Market: 'DALLAS', UnitCost: 3.10, Notes: 'SC/APC connectors bulk order' },
  { Sku: 'CNS-CLEAN-1',Direction: 'Intake', Quantity: 100,  OrderNumber: 'PO-2026-1003', Status: 'Pending',  Vendor: 'Fiber Instrument Sales',   Site: 'Plano WH',  Market: 'DALLAS', UnitCost: 12.00, Notes: 'Cleaning wipes reorder' },
  { Sku: 'HW-ANCH-38', Direction: 'Export', Quantity: 150,  OrderNumber: 'SO-2026-2001', Status: 'Shipped',  Vendor: 'Verizon Site 42',          Site: 'Plano WH',  Market: 'DALLAS', UnitCost: 1.10, Notes: 'Anchor bolts shipped to field site' }
];

// ---- Assignments (issued to technicians) ----
const assignments = [
  { Sku: 'CON-SC-APC', QuantityIssued: 200, QuantityReturned: 0,  TechnicianId: 'TECH-101', TechnicianName: 'Marcus Rivera', Site: 'Dallas WH', Market: 'DALLAS', Notes: 'Connectors for install job J-5001' },
  { Sku: 'CNS-CLEAN-1',QuantityIssued: 10,  QuantityReturned: 4,  TechnicianId: 'TECH-102', TechnicianName: 'Priya Patel',   Site: 'Plano WH',  Market: 'DALLAS', Notes: '6 boxes consumed, 4 returned' },
  { Sku: 'HW-ANCH-38', QuantityIssued: 50,  QuantityReturned: 50, TechnicianId: 'TECH-103', TechnicianName: 'James OConnor', Site: 'Plano WH',  Market: 'DALLAS', Notes: 'All anchor bolts returned - job cancelled' }
];

// ---- Transfers (site-to-site) ----
const transfers = [
  { Sku: 'CBL-SM-144', FromSite: 'Dallas WH', ToSite: 'Plano WH', Quantity: 1000, Status: 'Completed', Market: 'DALLAS', Notes: 'Balance stock between warehouses' },
  { Sku: 'CON-SC-APC', FromSite: 'Dallas WH', ToSite: 'Plano WH', Quantity: 500,  Status: 'Pending',   Market: 'DALLAS', Notes: 'Connector transfer awaiting truck' }
];

// ---- Assets (serialized units of the OTDR) ----
const assets = [
  { Sku: 'TST-OTDR-1', SerialNumber: 'OTDR-SN-0001', LotNumber: 'LOT-2025-A', Status: 'InStock', Site: 'Dallas WH', Market: 'DALLAS', AssignedTechnicianId: '', AssignedTechnicianName: '', Notes: '' },
  { Sku: 'TST-OTDR-1', SerialNumber: 'OTDR-SN-0002', LotNumber: 'LOT-2025-A', Status: 'Issued',  Site: 'Dallas WH', Market: 'DALLAS', AssignedTechnicianId: 'TECH-101', AssignedTechnicianName: 'Marcus Rivera', Notes: 'Assigned to lead tech' },
  { Sku: 'TST-OTDR-1', SerialNumber: 'OTDR-SN-0003', LotNumber: 'LOT-2025-B', Status: 'Retired', Site: 'Dallas WH', Market: 'DALLAS', AssignedTechnicianId: '', AssignedTechnicianName: '', Notes: 'Out of calibration, retired' }
];

// ---- Counts (grouped by Site + CountRef; CNT-0001 posted, CNT-0002 open) ----
const counts = [
  { Site: 'Dallas WH', Sku: 'CBL-SM-144', CountedQuantity: 12480, CountRef: 'Q1 cycle count - Dallas',              Market: 'DALLAS', Notes: 'Minor shrinkage on reel', Post: true },
  { Site: 'Dallas WH', Sku: 'CON-SC-APC', CountedQuantity: 4200,  CountRef: 'Q1 cycle count - Dallas',              Market: 'DALLAS', Notes: 'Exact match',            Post: true },
  { Site: 'Plano WH',  Sku: 'HW-ANCH-38', CountedQuantity: null,  CountRef: 'Q1 cycle count - Plano (in progress)', Market: 'DALLAS', Notes: '',                       Post: false },
  { Site: 'Plano WH',  Sku: 'CNS-CLEAN-1',CountedQuantity: null,  CountRef: 'Q1 cycle count - Plano (in progress)', Market: 'DALLAS', Notes: '',                       Post: false }
];

const sheets = { Materials: materials, Stock: stock, Orders: orders, Assignments: assignments, Transfers: transfers, Assets: assets, Counts: counts };

const wb = XLSX.utils.book_new();
for (const [name, rows] of Object.entries(sheets)) {
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

const outPath = path.join(__dirname, 'materials-seed-import.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Wrote', outPath);
for (const [name, rows] of Object.entries(sheets)) console.log(`  ${name}: ${rows.length} rows`);
