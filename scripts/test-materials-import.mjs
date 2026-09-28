// Standalone test harness that replicates materials.component.ts workbook parsing
// against the real docs/sql/materials-seed-import.xlsx file, without a browser.
// Run: node scripts/test-materials-import.mjs
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, '..', 'docs', 'sql', 'materials-seed-import.xlsx');

// --- mirror of the component maps ---
const sheetAliases = {
  materials: 'materials', inventory: 'materials',
  'copy of active price list': 'materials', 'active price list': 'materials',
  stock: 'stock', 'stock & ledger': 'stock', ledger: 'stock',
  orders: 'orders', assignments: 'assignments', transfers: 'transfers',
  assets: 'assets', counts: 'counts'
};

const columnAliases = {
  materials: {
    gpn: 'sku', sku: 'sku', name: 'name', description: 'description',
    commoditycode: 'category', category: 'category', price: 'unitCost', unitcost: 'unitCost'
  }
};

const materialFieldNames = new Set([
  'id', 'name', 'sku', 'category', 'description', 'unit',
  'site', 'market', 'quantityOnHand', 'reorderLevel', 'unitCost', 'isSerialized'
]);

const normalizeHeader = h => h.trim().toLowerCase().replace(/[\s_]+/g, '');
const isMaterialField = k => materialFieldNames.has(k);

function findRawValue(raw, normalizedName) {
  for (const key of Object.keys(raw)) {
    if (normalizeHeader(key) === normalizedName) return raw[key];
  }
  return null;
}

function finalizeMaterialRow(row, raw) {
  if ((row['name'] === undefined || row['name'] === null || row['name'] === '') && row['description']) {
    row['name'] = row['description'];
  }
  const extras = [];
  const mpn = findRawValue(raw, 'mpn');
  const manufacturer = findRawValue(raw, 'manufacturer');
  if (manufacturer) extras.push(`Mfr: ${manufacturer}`);
  if (mpn) extras.push(`MPN: ${mpn}`);
  if (extras.length > 0) {
    const base = row['description'] ? `${row['description']} ` : '';
    row['description'] = `${base}(${extras.join(', ')})`.trim();
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
  return entity === 'materials' ? finalizeMaterialRow(out, raw) : out;
}

// --- parse ---
const buffer = readFileSync(FILE);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('=== Workbook:', FILE);
console.log('Sheets:', workbook.SheetNames);
console.log();

const result = {};
const recognized = [], unrecognized = [], empty = [];

for (const sheetName of workbook.SheetNames) {
  const entity = sheetAliases[sheetName.trim().toLowerCase()];
  if (!entity) { if (sheetName.trim()) unrecognized.push(sheetName.trim()); continue; }
  recognized.push(`${sheetName.trim()} -> ${entity}`);
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true, defval: null });
  const mapped = rawRows
    .filter(r => Object.values(r).some(v => v !== null && v !== ''))
    .map(r => normalizeRowKeys(r, entity));
  if (mapped.length > 0) (result[entity] = result[entity] || []).push(...mapped);
  else empty.push(sheetName.trim());
}

console.log('Recognized:', recognized);
console.log('Unrecognized (skipped):', unrecognized);
console.log('Empty:', empty);
console.log();

for (const [entity, rows] of Object.entries(result)) {
  console.log(`--- ${entity}: ${rows.length} rows. First 5 mapped: ---`);
  console.log(JSON.stringify(rows.slice(0, 5), null, 2));
  const missingName = rows.filter(r => !r.name).length;
  const missingSku = rows.filter(r => !r.sku).length;
  console.log(`rows missing name: ${missingName}, rows missing sku: ${missingSku}`);
  console.log();
}
