// Standalone test that replicates materials.component.ts VIMS parsing (columnAliases +
// finalizeMaterialRow + parseStockNumber) against real rows from a VIMS "Inventory Report"
// export. No browser needed. Run: node scripts/test-vims-import.mjs
//
// This mirrors the component logic so we can verify, without the full Angular app, that the
// real export columns (Contractor, Material, Material Description, Total Stock, Reserved
// Stock, Available Stock, Base Unit) map correctly — including thousands-separated numbers.

// --- mirror of the component maps/logic (materials.component.ts) ---
const columnAliases = {
  materials: {
    contractor: 'contractor',
    material: 'materialCode',
    materialdescription: 'description',
    totalstock: 'totalStock',
    reservedstock: 'reservedStock',
    availablestock: 'availableStock',
    baseunit: 'unit',
    sku: 'sku',
    name: 'name',
    description: 'description',
    category: 'category',
    unit: 'unit',
    quantityonhand: 'quantityOnHand',
    unitcost: 'unitCost'
  }
};

const materialFieldNames = new Set([
  'id', 'contractor', 'materialCode', 'name', 'sku', 'category', 'description', 'unit',
  'site', 'market', 'totalStock', 'reservedStock', 'availableStock',
  'quantityOnHand', 'reorderLevel', 'unitCost', 'isSerialized'
]);

const normalizeHeader = h => h.trim().toLowerCase().replace(/[\s_]+/g, '');
const isMaterialField = k => materialFieldNames.has(k);

function parseStockNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value).replace(/[,\s]/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function finalizeMaterialRow(row) {
  for (const key of ['totalStock', 'reservedStock', 'availableStock', 'quantityOnHand']) {
    if (key in row) {
      const parsed = parseStockNumber(row[key]);
      if (parsed === undefined) delete row[key];
      else row[key] = parsed;
    }
  }
  const total = row['totalStock'];
  const reserved = row['reservedStock'];
  if (row['availableStock'] === undefined && typeof total === 'number') {
    row['availableStock'] = total - (typeof reserved === 'number' ? reserved : 0);
  }
  if (row['availableStock'] !== undefined && row['quantityOnHand'] === undefined) {
    row['quantityOnHand'] = row['availableStock'];
  }
  if ((row['name'] === undefined || row['name'] === null || row['name'] === '')) {
    if (row['description']) row['name'] = row['description'];
    else if (row['materialCode']) row['name'] = String(row['materialCode']);
  }
  if ((row['sku'] === undefined || row['sku'] === null || row['sku'] === '') && row['materialCode']) {
    row['sku'] = String(row['materialCode']);
  }
  for (const key of Object.keys(row)) {
    if (!isMaterialField(key)) delete row[key];
  }
  return row;
}

function normalizeRowKeys(raw, entity) {
  const aliases = columnAliases[entity];
  const out = {};
  for (const key of Object.keys(raw)) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    const aliased = aliases?.[normalizeHeader(trimmed)];
    const target = aliased ?? (trimmed.charAt(0).toLowerCase() + trimmed.slice(1));
    out[target] = raw[key];
  }
  return entity === 'materials' ? finalizeMaterialRow(out) : out;
}

// --- real rows copied from the VIMS "Inventory Report" export (headers verbatim) ---
const header = ['Contractor', 'Material', 'Material Description', 'Total Stock', 'Reserved Stock', 'Available Stock', 'Base Unit'];
const rows = [
  ['1000000027', '1141443', 'Wallmount, Switch, BLACK FLUSH MOUNTED W', '32', '32', '0', 'EA'],
  ['1000000027', '7049049', 'Clamp, Drop Wire, E Style, 1 Pair, .209i', '2,020', '2,020', '0', 'EA'],
  ['1000000027', '7050899', 'Kit, Splice Tray Accessory, Fiber Optic,', '307', '83', '224', 'EA'],
  ['1000000027', '7088247', 'Microduct, For Cables, 12.7/10mm, .053in', '900,100', '0', '900,100', 'FT'],
  ['1000000027', '1001241-01', 'Cable, Ethernet, Cat5e Patch Cable 3 Fee', '1,223', '1,223', '0', 'EA'],
  ['1000000027', '7088350', 'Pack of 6, Connector, SC/APC, SM, Field', '336', '336', '0', 'PK'],
  ['1000000027', '1053670-01', 'Cable Fiber, 2, 10.2 mm x 4.7 mm, Standa', '677,000', '462,300', '214,700', 'FT']
];

const mapped = rows
  .map(cells => Object.fromEntries(header.map((h, i) => [h, cells[i]])))
  .map(raw => normalizeRowKeys(raw, 'materials'));

console.log('=== VIMS import parse — mapped MaterialUpsert rows ===\n');
console.log(JSON.stringify(mapped, null, 2));

// --- assertions ---
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('FAIL:', msg); } };

// Row 2: "2,020" total/reserved parsed, available derived to 0.
assert(mapped[1].totalStock === 2020, 'row2 totalStock 2,020 -> 2020');
assert(mapped[1].reservedStock === 2020, 'row2 reservedStock 2,020 -> 2020');
assert(mapped[1].availableStock === 0, 'row2 availableStock -> 0');
// Row 3: partial reservation.
assert(mapped[2].totalStock === 307 && mapped[2].reservedStock === 83 && mapped[2].availableStock === 224, 'row3 307/83/224');
// Row 4: large value + unit FT.
assert(mapped[3].totalStock === 900100 && mapped[3].availableStock === 900100 && mapped[3].unit === 'FT', 'row4 900,100 FT');
// Row 5: dash-suffixed material code, used as sku fallback.
assert(mapped[4].materialCode === '1001241-01' && mapped[4].sku === '1001241-01', 'row5 materialCode -> sku');
// Row 7: three distinct large values.
assert(mapped[6].totalStock === 677000 && mapped[6].reservedStock === 462300 && mapped[6].availableStock === 214700, 'row7 677,000/462,300/214,700');
// Contractor + description + name mirror + quantityOnHand mirror available.
assert(mapped.every(r => r.contractor === '1000000027'), 'all contractor 1000000027');
assert(mapped.every(r => r.name === r.description), 'name mirrors description');
assert(mapped.every(r => r.quantityOnHand === r.availableStock), 'quantityOnHand mirrors availableStock');

console.log(`\n${failures === 0 ? 'ALL ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
