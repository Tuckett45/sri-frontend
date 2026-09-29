import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import * as Papa from 'papaparse';
import { BarcodeFormat } from '@zxing/library';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialsService } from 'src/app/services/materials.service';
import { GpnPricingService } from 'src/app/services/gpn-pricing.service';
import {
  GpnImportSummary,
  GpnPrice,
  GpnWorkbookImport,
  GpnWorksheetImport
} from 'src/app/models/gpn-pricing.model';
import { Pager } from './pager';
import { MaterialsEditKind, MaterialsEditModalComponent, MaterialsEditPayload } from './materials-edit-modal/materials-edit-modal.component';
import {
  Material,
  MaterialAsset,
  MaterialAssetUpsert,
  MaterialAssignment,
  MaterialAssignmentCreate,
  MaterialCount,
  MaterialCountCreate,
  MaterialCountLineInput,
  MaterialImportSummary,
  MaterialsWorkbookImport,
  MaterialOrder,
  MaterialOrderDirection,
  MaterialOrderStatus,
  MaterialOrderUpsert,
  MaterialStock,
  MaterialStockAdjust,
  MaterialStockReportRow,
  MaterialTransaction,
  MaterialTransfer,
  MaterialTransferCreate,
  MaterialUpsert,
  TechnicianBalanceRow,
  WorkbookImportSummary
} from 'src/app/models/materials.model';

type MaterialsTab =
  | 'inventory'
  | 'stock'
  | 'orders'
  | 'assignments'
  | 'transfers'
  | 'assets'
  | 'counts'
  | 'gpn'
  | 'reports';

/**
 * Recognized GPN worksheet titles → the backend `sourceList` discriminator. Matching is done
 * on a normalized key (lower-case, spaces/underscores stripped) so casing/spacing variants of
 * the tab names all resolve. The backend also accepts these friendly names directly, but we
 * map here so unrecognized tabs in a GPN workbook can be reported rather than silently sent.
 */
const GPN_SHEET_SOURCES: Record<string, string> = {
  activepricelist: 'Active Price List',
  copyofactivepricelist: 'Active Price List',
  allmarketgpnlist: 'All market GPN List',
  allmarket: 'All market GPN List',
  completegpnlist: 'Complete GPN List',
  complete: 'Complete GPN List'
};

/** Per-sheet classification collected while parsing an import workbook, used to explain empty imports. */
interface WorkbookDiagnostics {
  allSheets: string[];
  recognizedSheets: string[];
  unrecognizedSheets: string[];
  emptySheets: string[];
}

/** Result of parsing an import workbook: the payload plus why it may be empty. */
interface ParsedWorkbook {
  data: MaterialsWorkbookImport;
  diagnostics: WorkbookDiagnostics;
}

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.scss'],
  standalone: false
})
export class MaterialsComponent implements OnInit, OnDestroy {
  activeTab: MaterialsTab = 'inventory';

  materials: Material[] = [];
  orders: MaterialOrder[] = [];
  assignments: MaterialAssignment[] = [];
  stock: MaterialStock[] = [];
  transactions: MaterialTransaction[] = [];
  transfers: MaterialTransfer[] = [];
  assets: MaterialAsset[] = [];
  counts: MaterialCount[] = [];
  activeCount: MaterialCount | null = null;

  stockReport: MaterialStockReportRow[] = [];
  technicianBalances: TechnicianBalanceRow[] = [];

  // --- GPN pricing catalog ---
  gpnPrices: GpnPrice[] = [];
  loadingGpn = false;
  gpnSearchTerm = '';
  gpnSourceFilter = '';
  importingGpn = false;
  gpnImportResult: GpnImportSummary | null = null;
  showGpnImportErrors = false;

  // --- pagination (client-side; lists are already loaded into memory) ---
  readonly materialsPager = new Pager<Material>(10);
  readonly ordersPager = new Pager<MaterialOrder>(10);
  readonly assignmentsPager = new Pager<MaterialAssignment>(10);
  readonly stockPager = new Pager<MaterialStock>(10);
  readonly transactionsPager = new Pager<MaterialTransaction>(25);
  readonly transfersPager = new Pager<MaterialTransfer>(10);
  readonly assetsPager = new Pager<MaterialAsset>(10);
  readonly countsPager = new Pager<MaterialCount>(10);
  readonly stockReportPager = new Pager<MaterialStockReportRow>(15);
  readonly technicianBalancesPager = new Pager<TechnicianBalanceRow>(15);
  readonly gpnPricesPager = new Pager<GpnPrice>(15);

  // --- add/edit modal ---
  @ViewChild('editModal') editModal?: MaterialsEditModalComponent;

  // --- inline editing (one row at a time per list) ---
  editingMaterialId: string | null = null;
  editingOrderId: string | null = null;
  editingAssetId: string | null = null;
  private materialDraft: MaterialUpsert | null = null;
  private orderDraft: MaterialOrderUpsert | null = null;
  private assetDraft: MaterialAssetUpsert | null = null;
  savingInline = false;

  loadingMaterials = false;
  loadingOrders = false;
  loadingAssignments = false;
  loadingStock = false;
  loadingTransactions = false;
  loadingTransfers = false;
  loadingAssets = false;
  loadingCounts = false;
  loadingReports = false;

  searchTerm = '';
  assetSearch = '';
  ledgerMaterialId = '';
  reportLowStockOnly = false;

  // --- Import (Inventory): single-sheet CSV or combined multi-sheet workbook ---
  importing = false;
  importResult: MaterialImportSummary | null = null;      // CSV (materials only)
  workbookResult: WorkbookImportSummary | null = null;    // combined workbook
  showImportErrors = false;
  readonly importTemplateColumns = [
    'Name', 'Sku', 'Category', 'Description', 'Unit',
    'Site', 'Market', 'QuantityOnHand', 'ReorderLevel', 'UnitCost', 'IsSerialized'
  ];

  /** Column headers for each sheet of the combined workbook template. */
  private readonly workbookTemplate: Record<string, string[]> = {
    Materials: ['Name', 'Sku', 'Category', 'Description', 'Unit', 'Site', 'Market', 'QuantityOnHand', 'ReorderLevel', 'UnitCost', 'IsSerialized'],
    Stock: ['Sku', 'Site', 'QuantityOnHand', 'ReorderLevel', 'Market'],
    Orders: ['Sku', 'Direction', 'Quantity', 'OrderNumber', 'Status', 'Vendor', 'Site', 'Market', 'UnitCost', 'Notes'],
    Assignments: ['Sku', 'QuantityIssued', 'QuantityReturned', 'TechnicianId', 'TechnicianName', 'Site', 'Market', 'Notes'],
    Transfers: ['Sku', 'FromSite', 'ToSite', 'Quantity', 'Status', 'Market', 'Notes'],
    Assets: ['Sku', 'SerialNumber', 'LotNumber', 'Status', 'Site', 'Market', 'AssignedTechnicianId', 'AssignedTechnicianName', 'Notes'],
    Counts: ['Site', 'Sku', 'CountedQuantity', 'CountRef', 'Market', 'Notes', 'Post']
  };

  /** Maps a worksheet name (any case) to the workbook entity key. */
  private readonly sheetAliases: Record<string, keyof MaterialsWorkbookImport> = {
    materials: 'materials', inventory: 'materials',
    // Master price/GPN catalog export. Only the Active Price List is treated as the
    // source of truth; the other two GPN tabs overlap and would create duplicate SKUs,
    // so they are intentionally left unrecognized (reported as skipped on import).
    'copy of active price list': 'materials', 'active price list': 'materials',
    stock: 'stock', 'stock & ledger': 'stock', ledger: 'stock',
    orders: 'orders',
    assignments: 'assignments',
    transfers: 'transfers',
    assets: 'assets',
    counts: 'counts'
  };

  /**
   * Per-entity column-header aliases. Maps a normalized (lower-cased, underscores
   * stripped) source header onto the DTO property the backend expects. This lets us
   * ingest exported master catalogs whose column names differ from the template.
   * Keys are matched after normalizeHeader() so "Commodity_Code", "commodity_code",
   * and "Commodity Code" all collapse to "commoditycode".
   */
  private readonly columnAliases: Partial<Record<keyof MaterialsWorkbookImport, Record<string, keyof MaterialUpsert>>> = {
    materials: {
      gpn: 'sku',
      sku: 'sku',
      name: 'name',
      description: 'description',
      commoditycode: 'category',
      category: 'category',
      price: 'unitCost',
      unitcost: 'unitCost'
    }
  };

  // --- form models ---
  newMaterial: MaterialUpsert = this.emptyMaterial();
  newOrder: MaterialOrderUpsert = this.emptyOrder();
  newAssignment: MaterialAssignmentCreate = this.emptyAssignment();
  newAdjust: MaterialStockAdjust = this.emptyAdjust();
  newTransfer: MaterialTransferCreate = this.emptyTransfer();
  newAsset: MaterialAssetUpsert = this.emptyAsset();
  newCountSite = '';
  newCountPrefill = true;

  readonly directions: MaterialOrderDirection[] = ['Intake', 'Export'];

  // --- barcode scanning ---
  scannerOpen = false;
  scanTarget: 'material' | 'order' | 'assignment' | 'adjust' | 'transfer' | 'asset' = 'material';
  scannerEnabled = false;
  readonly allowedScanFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.UPC_A,
    BarcodeFormat.DATA_MATRIX
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private materialsService: MaterialsService,
    private gpnPricingService: GpnPricingService,
    private toastr: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
    this.loadOrders();
    this.loadAssignments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: MaterialsTab): void {
    this.activeTab = tab;
    switch (tab) {
      case 'stock': if (!this.stock.length) this.loadStock(); break;
      case 'transfers': if (!this.transfers.length) this.loadTransfers(); break;
      case 'assets': if (!this.assets.length) this.loadAssets(); break;
      case 'counts': if (!this.counts.length) this.loadCounts(); break;
      case 'gpn': if (!this.gpnPrices.length) this.loadGpnPrices(); break;
      case 'reports': this.loadReports(); break;
    }
  }

  // ---------------- Inventory ----------------

  loadMaterials(): void {
    this.loadingMaterials = true;
    this.materialsService.getMaterials({ search: this.searchTerm || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.materials = data ?? []; this.materialsPager.setItems(this.materials); this.loadingMaterials = false; },
        error: err => { this.loadingMaterials = false; this.toastr.error(this.errorText(err), 'Could not load materials'); }
      });
  }

  saveMaterial(): void {
    if (!this.newMaterial.name?.trim()) {
      this.toastr.warning('Material name is required.');
      return;
    }
    this.materialsService.saveMaterial(this.newMaterial)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Material saved');
          this.newMaterial = this.emptyMaterial();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not save material')
      });
  }

  deleteMaterial(material: Material): void {
    this.materialsService.deleteMaterial(material.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Material deleted'); this.loadMaterials(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete material')
      });
  }

  isLowStock(material: Material): boolean {
    return material.reorderLevel > 0 && material.quantityOnHand <= material.reorderLevel;
  }

  // ---------------- Import (CSV or combined workbook) ----------------

  /**
   * Triggered by the hidden file input. A single-sheet CSV is imported as materials only;
   * a multi-sheet .xlsx workbook is parsed in-browser and imported across every tab.
   */
  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;

    const validationError = this.validateImportFile(file);
    if (validationError) {
      this.toastr.warning(validationError, 'Cannot import file');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      void this.importWorkbookFile(file);
    } else {
      this.importCsvFile(file);
    }
  }

  /** Triggered by the GPN tab's hidden file input. Only .xlsx/.xls workbooks are supported. */
  onGpnImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      this.toastr.warning('Please choose an .xlsx or .xls GPN workbook.', 'Cannot import file');
      return;
    }
    void this.importGpnWorkbook(file);
  }

  /** Single-sheet CSV → materials catalog only. */
  private importCsvFile(file: File): void {
    this.beginImport();
    this.materialsService.importMaterials(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.importing = false;
          this.importResult = summary;
          if (summary.errors.length === 0) {
            this.toastr.success(
              `${summary.inserted} added, ${summary.updated} updated${summary.skipped ? `, ${summary.skipped} skipped` : ''}.`,
              'Import complete'
            );
          } else {
            this.toastr.warning(
              `${summary.inserted + summary.updated} imported, ${summary.errors.length} row(s) had errors.`,
              'Import finished with errors'
            );
            this.showImportErrors = true;
          }
          this.loadMaterials();
        },
        error: err => { this.importing = false; this.toastr.error(this.errorText(err), 'Import failed'); }
      });
  }

  /** Multi-sheet workbook → parse every recognized sheet and import across all tabs. */
  private async importWorkbookFile(file: File): Promise<void> {
    this.beginImport();
    let payload: ParsedWorkbook;
    try {
      payload = await this.parseWorkbook(file);
    } catch (e: any) {
      this.importing = false;
      this.toastr.error(e?.message || 'Could not read the workbook.', 'Import failed');
      return;
    }

    const sheetCount = Object.values(payload.data).filter(a => Array.isArray(a) && a.length > 0).length;
    if (sheetCount === 0) {
      this.importing = false;
      this.toastr.warning(this.buildNoDataMessage(payload.diagnostics), 'Nothing to import');
      return;
    }

    this.materialsService.importWorkbook(payload.data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.importing = false;
          this.workbookResult = summary;
          const changed = summary.totalInserted + summary.totalUpdated;
          if (summary.totalErrors === 0) {
            this.toastr.success(`${changed} record(s) imported across ${summary.sheets.length} sheet(s).`, 'Import complete');
          } else {
            this.toastr.warning(`${changed} imported, ${summary.totalErrors} row(s) had errors.`, 'Import finished with errors');
            this.showImportErrors = true;
          }
          this.refreshAllTabs();
        },
        error: err => { this.importing = false; this.toastr.error(this.errorText(err), 'Import failed'); }
      });
  }

  /** Parses an .xlsx/.xls workbook into the per-entity JSON payload (SheetJS, dynamically imported). */
  private async parseWorkbook(file: File): Promise<ParsedWorkbook> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const result: MaterialsWorkbookImport = {};

    const allSheets = workbook.SheetNames.map(s => s.trim()).filter(s => s.length > 0);
    const recognizedSheets: string[] = [];
    const unrecognizedSheets: string[] = [];
    const emptySheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const entity = this.sheetAliases[sheetName.trim().toLowerCase()];
      if (!entity) {
        if (sheetName.trim()) unrecognizedSheets.push(sheetName.trim());
        continue; // ignore unrecognized sheets (notes, legends, etc.)
      }
      recognizedSheets.push(sheetName.trim());
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true, defval: null }) as Record<string, any>[];
      const mapped = rawRows
        .filter(r => Object.values(r).some(v => v !== null && v !== ''))
        .map(r => this.normalizeRowKeys(r, entity));
      if (mapped.length > 0) {
        (result[entity] as any[]) = mapped;
      } else {
        emptySheets.push(sheetName.trim());
      }
    }

    return {
      data: result,
      diagnostics: { allSheets, recognizedSheets, unrecognizedSheets, emptySheets }
    };
  }

  /** Builds a specific, actionable message explaining why a workbook produced no rows. */
  private buildNoDataMessage(d: WorkbookDiagnostics): string {
    const known = Object.keys(this.workbookTemplate).join(', ');
    if (d.allSheets.length === 0) {
      return 'The workbook has no worksheets. Download the template and fill in at least one tab.';
    }
    if (d.recognizedSheets.length === 0) {
      return `None of the tabs matched a supported sheet. Found: ${d.allSheets.join(', ')}. ` +
        `Rename a tab to one of: ${known}.`;
    }
    // We recognized tabs but every one was empty (header row only, or no non-blank cells).
    return `Recognized tab(s) ${d.recognizedSheets.join(', ')} but found no data rows. ` +
      'Add at least one row of data below the header row, then import again.';
  }

  /**
   * Maps spreadsheet columns onto the JSON DTO property names the backend expects.
   *
   * Resolution order per header:
   *   1. If the entity has a column-alias entry (e.g. materials: "GPN" -> "sku"),
   *      use the aliased DTO field.
   *   2. Otherwise fall back to lower-casing the first letter ("Sku" -> "sku",
   *      "QuantityOnHand" -> "quantityOnHand") to preserve template behavior.
   *
   * A per-entity finalizer then runs to enforce required fields and fold extra
   * source columns (MPN, Manufacturer) that have no DTO field into a text field.
   */
  private normalizeRowKeys(raw: Record<string, any>, entity: keyof MaterialsWorkbookImport): Record<string, any> {
    const aliases = this.columnAliases[entity];
    const out: Record<string, any> = {};
    for (const key of Object.keys(raw)) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      const aliased = aliases?.[this.normalizeHeader(trimmed)];
      const target = aliased ?? (trimmed.charAt(0).toLowerCase() + trimmed.slice(1));
      out[target] = raw[key];
    }
    return entity === 'materials' ? this.finalizeMaterialRow(out, raw) : out;
  }

  /** Collapses a header to a comparison key: lower-case, no spaces/underscores. */
  private normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replace(/[\s_]+/g, '');
  }

  /**
   * Ensures an imported material row satisfies MaterialUpsert:
   * - name is required, so fall back to Description when Name is absent.
   * - MPN and Manufacturer have no DTO field; append them to description so the
   *   catalog detail is not lost. Currency/Procurement_Method are dropped (all USD).
   */
  private finalizeMaterialRow(row: Record<string, any>, raw: Record<string, any>): Record<string, any> {
    if ((row['name'] === undefined || row['name'] === null || row['name'] === '') && row['description']) {
      row['name'] = row['description'];
    }

    const extras: string[] = [];
    const mpn = this.findRawValue(raw, 'mpn');
    const manufacturer = this.findRawValue(raw, 'manufacturer');
    if (manufacturer) extras.push(`Mfr: ${manufacturer}`);
    if (mpn) extras.push(`MPN: ${mpn}`);
    if (extras.length > 0) {
      const base = row['description'] ? `${row['description']} ` : '';
      row['description'] = `${base}(${extras.join(', ')})`.trim();
    }

    // Strip columns with no DTO home so they don't ride along as junk properties.
    for (const key of Object.keys(row)) {
      if (!this.isMaterialField(key)) delete row[key];
    }
    return row;
  }

  /** Looks up a raw cell value by normalized header name, regardless of casing. */
  private findRawValue(raw: Record<string, any>, normalizedName: string): any {
    for (const key of Object.keys(raw)) {
      if (this.normalizeHeader(key) === normalizedName) return raw[key];
    }
    return null;
  }

  private readonly materialFieldNames = new Set<keyof MaterialUpsert>([
    'id', 'name', 'sku', 'category', 'description', 'unit',
    'site', 'market', 'quantityOnHand', 'reorderLevel', 'unitCost', 'isSerialized'
  ]);

  private isMaterialField(key: string): key is keyof MaterialUpsert {
    return this.materialFieldNames.has(key as keyof MaterialUpsert);
  }

  // ---------------- GPN pricing catalog ----------------

  loadGpnPrices(): void {
    this.loadingGpn = true;
    this.gpnPricingService.getPrices({
      sourceList: this.gpnSourceFilter || undefined,
      search: this.gpnSearchTerm || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.gpnPrices = data ?? [];
          this.gpnPricesPager.setItems(this.gpnPrices);
          this.loadingGpn = false;
        },
        error: err => { this.loadingGpn = false; this.toastr.error(this.errorText(err), 'Could not load GPN catalog'); }
      });
  }

  searchGpn(): void {
    this.loadGpnPrices();
  }

  /**
   * Imports a GPN pricing workbook. Each recognized worksheet is passed through as its raw
   * header row + positional cell values; the backend owns all column mapping and type parsing,
   * so nothing is renamed or coerced here.
   */
  async importGpnWorkbook(file: File): Promise<void> {
    this.importingGpn = true;
    this.gpnImportResult = null;
    this.showGpnImportErrors = false;

    let worksheets: GpnWorksheetImport[];
    let unrecognized: string[];
    try {
      ({ worksheets, unrecognized } = await this.parseGpnWorkbook(file));
    } catch (e: any) {
      this.importingGpn = false;
      this.toastr.error(e?.message || 'Could not read the workbook.', 'Import failed');
      return;
    }

    if (worksheets.length === 0) {
      this.importingGpn = false;
      const found = unrecognized.length ? ` Found tab(s): ${unrecognized.join(', ')}.` : '';
      this.toastr.warning(
        `No GPN worksheets recognized.${found} Expected: Active Price List, All market GPN List, or Complete GPN List.`,
        'Nothing to import'
      );
      return;
    }

    const payload: GpnWorkbookImport = { worksheets };
    this.gpnPricingService.importWorkbook(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.importingGpn = false;
          this.gpnImportResult = summary;
          const changed = summary.inserted + summary.updated;
          if (summary.errors.length === 0) {
            this.toastr.success(
              `${changed} record(s) imported across ${worksheets.length} worksheet(s)${summary.skipped ? `, ${summary.skipped} skipped` : ''}.`,
              'Import complete'
            );
          } else {
            this.toastr.warning(
              `${changed} imported, ${summary.errors.length} row(s) had errors.`,
              'Import finished with errors'
            );
            this.showGpnImportErrors = true;
          }
          this.loadGpnPrices();
        },
        error: err => { this.importingGpn = false; this.toastr.error(this.errorText(err), 'Import failed'); }
      });
  }

  /**
   * Parses a GPN .xlsx/.xls workbook into one {@link GpnWorksheetImport} per recognized tab.
   * Reads each sheet as raw rows (header row 1 + positional cells) with no column renaming —
   * the backend normalizes headers and parses types. Returns unrecognized tab names so the
   * caller can explain a no-op import.
   */
  private async parseGpnWorkbook(file: File): Promise<{ worksheets: GpnWorksheetImport[]; unrecognized: string[] }> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const worksheets: GpnWorksheetImport[] = [];
    const unrecognized: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const key = sheetName.trim().toLowerCase().replace(/[\s_]+/g, '');
      const sourceList = GPN_SHEET_SOURCES[key];
      if (!sourceList) {
        if (sheetName.trim()) unrecognized.push(sheetName.trim());
        continue;
      }

      // header: 1 => array-of-arrays; every cell stringified so the backend parses types.
      const aoa = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: null,
        blankrows: false
      });
      if (aoa.length < 2) continue; // need a header row + at least one data row

      const header = (aoa[0] ?? []).map(h => (h == null ? '' : String(h).trim()));
      const rows: (string | null)[][] = [];
      for (let i = 1; i < aoa.length; i++) {
        const raw = aoa[i] ?? [];
        // Skip fully-blank rows.
        if (!raw.some(c => c != null && String(c).trim() !== '')) continue;
        const cells: (string | null)[] = header.map((_, c) => {
          const v = raw[c];
          return v == null || String(v).trim() === '' ? null : String(v).trim();
        });
        rows.push(cells);
      }

      if (rows.length > 0) {
        worksheets.push({ sourceList, header, rows });
      }
    }

    return { worksheets, unrecognized };
  }

  dismissGpnImportResult(): void {
    this.gpnImportResult = null;
    this.showGpnImportErrors = false;
  }

  /** Downloads an .xlsx template with one sheet per GPN worksheet and its column headers. */
  async downloadGpnTemplate(): Promise<void> {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const sheets: Record<string, string[]> = {
      'Active Price List': [
        'Commodity_Code', 'Procurement_Method', 'GPN', 'Description', 'Price', 'Currency', 'Mpn',
        'Manufacturer', 'Supplier_name', 'UOM', 'MOQ', 'Standard_Package_Qty', 'master_reel',
        'Lead_time_in_Days', 'Alternate', 'Purchase_order_text', 'GPN_Barcode'
      ],
      'All market GPN List': [
        'Commodity_Code', 'Procurement_Method', 'GPN', 'Description', 'Price', 'Currency', 'Mpn',
        'Manufacturer', 'Supplier_name', 'UOM', 'MOQ', 'Standard_Package_Qty', 'master_reel',
        'lead_time_in_Days', 'Alternate', 'mpn_lifecycle_phase', 'lifecycle_phase',
        'validity_start_date', 'validity_end_date', 'pir_number', 'pricing_table',
        'pricing_table_desc', 'Purchase_order_text', 'start_date_validation'
      ],
      'Complete GPN List': [
        'Commodity_Code', 'Secondary_Commodity_Code', 'GPN', 'Description', 'Price', 'Currency', 'Mpn',
        'Manufacturer', 'supplier_id', 'UOM', 'Standard_Quantity', 'moq', 'lead_time', 'Alternate',
        'MPN_PIR', 'mpn_lifecycle_phase', 'lifecycle_phase', 'validity_start_date', 'validity_end_date',
        'pir_number', 'pricing_table', 'pricing_table_desc', 'oracle_commodity_code', 'info_record_note',
        'purchase_order_text', 'provider_class'
      ]
    };
    for (const [sheet, headers] of Object.entries(sheets)) {
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, sheet);
    }
    XLSX.writeFile(wb, 'gpn-pricing-template.xlsx');
  }

  /** Downloads a multi-sheet .xlsx template (one sheet per tab) with the supported headers. */
  async downloadImportTemplate(): Promise<void> {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    for (const [sheet, headers] of Object.entries(this.workbookTemplate)) {
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, sheet);
    }
    XLSX.writeFile(wb, 'materials-import-template.xlsx');
  }

  dismissImportResult(): void {
    this.importResult = null;
    this.workbookResult = null;
    this.showImportErrors = false;
  }

  private beginImport(): void {
    this.importing = true;
    this.importResult = null;
    this.workbookResult = null;
    this.showImportErrors = false;
  }

  /** After a workbook import, reload whatever tabs already have data loaded. */
  private refreshAllTabs(): void {
    this.loadMaterials();
    if (this.orders.length || this.activeTab === 'orders') this.loadOrders();
    if (this.assignments.length || this.activeTab === 'assignments') this.loadAssignments();
    if (this.stock.length || this.activeTab === 'stock') this.loadStock();
    if (this.transfers.length || this.activeTab === 'transfers') this.loadTransfers();
    if (this.assets.length || this.activeTab === 'assets') this.loadAssets();
    if (this.counts.length || this.activeTab === 'counts') this.loadCounts();
    if (this.activeTab === 'reports') this.loadReports();
  }

  private validateImportFile(file: File): string | null {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!isCsv && !isXlsx) return 'Please choose a .csv or .xlsx file.';
    if (file.size === 0) return 'The selected file is empty.';
    if (file.size > 10 * 1024 * 1024) return 'File is too large. Maximum size is 10 MB.';
    return null;
  }

  // ---------------- Orders (intake / export) ----------------

  loadOrders(): void {
    this.loadingOrders = true;
    this.materialsService.getOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.orders = data ?? []; this.ordersPager.setItems(this.orders); this.loadingOrders = false; },
        error: err => { this.loadingOrders = false; this.toastr.error(this.errorText(err), 'Could not load orders'); }
      });
  }

  saveOrder(): void {
    if (!this.newOrder.materialId) { this.toastr.warning('Select a material for the order.'); return; }
    if (!this.newOrder.quantity || this.newOrder.quantity <= 0) {
      this.toastr.warning('Order quantity must be greater than zero.');
      return;
    }
    this.materialsService.saveOrder(this.newOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Order saved'); this.newOrder = this.emptyOrder(); this.loadOrders(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not save order')
      });
  }

  fulfillOrder(order: MaterialOrder): void {
    this.materialsService.fulfillOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(order.direction === 'Intake' ? 'Order received — inventory updated' : 'Order shipped — inventory updated');
          this.loadOrders();
          this.loadMaterials();
          this.stock = [];
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not fulfill order')
      });
  }

  deleteOrder(order: MaterialOrder): void {
    this.materialsService.deleteOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Order deleted'); this.loadOrders(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete order')
      });
  }

  isFulfilled(order: MaterialOrder): boolean {
    return order.status === 'Received' || order.status === 'Shipped';
  }

  // ---------------- Assignments (issued to technicians) ----------------

  loadAssignments(): void {
    this.loadingAssignments = true;
    this.materialsService.getAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.assignments = data ?? []; this.assignmentsPager.setItems(this.assignments); this.loadingAssignments = false; },
        error: err => { this.loadingAssignments = false; this.toastr.error(this.errorText(err), 'Could not load assignments'); }
      });
  }

  issueMaterial(): void {
    if (!this.newAssignment.materialId) { this.toastr.warning('Select a material to issue.'); return; }
    if (!this.newAssignment.quantityIssued || this.newAssignment.quantityIssued <= 0) {
      this.toastr.warning('Issued quantity must be greater than zero.');
      return;
    }
    this.materialsService.issueMaterial(this.newAssignment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Material issued to technician');
          this.newAssignment = this.emptyAssignment();
          this.loadAssignments();
          this.loadMaterials();
          this.stock = [];
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not issue material')
      });
  }

  returnMaterial(assignment: MaterialAssignment): void {
    const outstanding = assignment.quantityIssued - assignment.quantityReturned;
    if (outstanding <= 0) { this.toastr.info('This assignment has already been fully returned.'); return; }
    this.materialsService.returnMaterial(assignment.id, { quantityReturned: outstanding })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Return recorded — inventory updated');
          this.loadAssignments();
          this.loadMaterials();
          this.stock = [];
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not record return')
      });
  }

  deleteAssignment(assignment: MaterialAssignment): void {
    this.materialsService.deleteAssignment(assignment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Assignment deleted'); this.loadAssignments(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete assignment')
      });
  }

  // ---------------- Stock + ledger ----------------

  loadStock(): void {
    this.loadingStock = true;
    this.materialsService.getStock()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.stock = data ?? []; this.stockPager.setItems(this.stock); this.loadingStock = false; },
        error: err => { this.loadingStock = false; this.toastr.error(this.errorText(err), 'Could not load stock'); }
      });
  }

  loadTransactions(): void {
    this.loadingTransactions = true;
    this.materialsService.getTransactions({ materialId: this.ledgerMaterialId || undefined, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.transactions = data ?? []; this.transactionsPager.setItems(this.transactions); this.loadingTransactions = false; },
        error: err => { this.loadingTransactions = false; this.toastr.error(this.errorText(err), 'Could not load ledger'); }
      });
  }

  adjustStock(): void {
    if (!this.newAdjust.materialId) { this.toastr.warning('Select a material to adjust.'); return; }
    if (!this.newAdjust.site) { this.toastr.warning('Site is required.'); return; }
    if (!this.newAdjust.quantityDelta) { this.toastr.warning('Enter a non-zero quantity change.'); return; }
    this.materialsService.adjustStock(this.newAdjust)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Stock adjusted — ledger updated');
          this.newAdjust = this.emptyAdjust();
          this.loadStock();
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not adjust stock')
      });
  }

  // ---------------- Transfers ----------------

  loadTransfers(): void {
    this.loadingTransfers = true;
    this.materialsService.getTransfers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.transfers = data ?? []; this.transfersPager.setItems(this.transfers); this.loadingTransfers = false; },
        error: err => { this.loadingTransfers = false; this.toastr.error(this.errorText(err), 'Could not load transfers'); }
      });
  }

  createTransfer(): void {
    if (!this.newTransfer.materialId) { this.toastr.warning('Select a material to transfer.'); return; }
    if (!this.newTransfer.fromSite || !this.newTransfer.toSite) { this.toastr.warning('Both sites are required.'); return; }
    if (this.newTransfer.fromSite === this.newTransfer.toSite) { this.toastr.warning('Source and destination must differ.'); return; }
    if (!this.newTransfer.quantity || this.newTransfer.quantity <= 0) { this.toastr.warning('Quantity must be greater than zero.'); return; }
    this.materialsService.createTransfer(this.newTransfer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Transfer created'); this.newTransfer = this.emptyTransfer(); this.loadTransfers(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not create transfer')
      });
  }

  completeTransfer(transfer: MaterialTransfer): void {
    this.materialsService.completeTransfer(transfer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Transfer completed — stock moved');
          this.loadTransfers();
          this.stock = [];
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not complete transfer')
      });
  }

  deleteTransfer(transfer: MaterialTransfer): void {
    this.materialsService.deleteTransfer(transfer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Transfer deleted'); this.loadTransfers(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete transfer')
      });
  }

  // ---------------- Assets (serial / lot) ----------------

  loadAssets(): void {
    this.loadingAssets = true;
    this.materialsService.getAssets({ search: this.assetSearch || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.assets = data ?? []; this.assetsPager.setItems(this.assets); this.loadingAssets = false; },
        error: err => { this.loadingAssets = false; this.toastr.error(this.errorText(err), 'Could not load assets'); }
      });
  }

  saveAsset(): void {
    if (!this.newAsset.materialId) { this.toastr.warning('Select a material.'); return; }
    if (!this.newAsset.serialNumber && !this.newAsset.lotNumber) {
      this.toastr.warning('Enter a serial or lot number.');
      return;
    }
    this.materialsService.saveAsset(this.newAsset)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Asset saved'); this.newAsset = this.emptyAsset(); this.loadAssets(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not save asset')
      });
  }

  deleteAsset(asset: MaterialAsset): void {
    this.materialsService.deleteAsset(asset.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toastr.success('Asset deleted'); this.loadAssets(); },
        error: err => this.toastr.error(this.errorText(err), 'Could not delete asset')
      });
  }

  // ---------------- Reconciliation / cycle counts ----------------

  loadCounts(): void {
    this.loadingCounts = true;
    this.materialsService.getCounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.counts = data ?? []; this.countsPager.setItems(this.counts); this.loadingCounts = false; },
        error: err => { this.loadingCounts = false; this.toastr.error(this.errorText(err), 'Could not load counts'); }
      });
  }

  createCount(): void {
    if (!this.newCountSite) { this.toastr.warning('Site is required to start a count.'); return; }
    this.materialsService.createCount({ site: this.newCountSite, prefillFromStock: this.newCountPrefill })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: count => {
          this.toastr.success('Count session started');
          this.newCountSite = '';
          this.loadCounts();
          this.openCount(count);
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not start count')
      });
  }

  openCount(count: MaterialCount): void {
    this.materialsService.getCount(count.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: full => this.activeCount = full,
        error: err => this.toastr.error(this.errorText(err), 'Could not open count')
      });
  }

  saveCount(): void {
    if (!this.activeCount) return;
    const lines: MaterialCountLineInput[] = this.activeCount.lines.map(l => ({
      materialId: l.materialId,
      countedQuantity: l.countedQuantity ?? null,
      notes: l.notes
    }));
    this.materialsService.saveCountLines(this.activeCount.id, lines)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: full => { this.activeCount = full; this.toastr.success('Count saved'); },
        error: err => this.toastr.error(this.errorText(err), 'Could not save count')
      });
  }

  postCount(): void {
    if (!this.activeCount) return;
    this.materialsService.postCount(this.activeCount.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: full => {
          this.activeCount = full;
          this.toastr.success('Count posted — variances applied to inventory');
          this.loadCounts();
          this.stock = [];
          this.loadMaterials();
        },
        error: err => this.toastr.error(this.errorText(err), 'Could not post count')
      });
  }

  closeCount(): void {
    this.activeCount = null;
  }

  lineVariance(line: { countedQuantity?: number | null; systemQuantity: number }): number | null {
    if (line.countedQuantity === null || line.countedQuantity === undefined) return null;
    return line.countedQuantity - line.systemQuantity;
  }

  // ---------------- Reports + CSV export ----------------

  loadReports(): void {
    this.loadingReports = true;
    this.materialsService.getStockReport({ lowStockOnly: this.reportLowStockOnly })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.stockReport = data ?? []; this.stockReportPager.setItems(this.stockReport); this.loadingReports = false; },
        error: err => { this.loadingReports = false; this.toastr.error(this.errorText(err), 'Could not load report'); }
      });
    this.materialsService.getTechnicianBalances()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.technicianBalances = data ?? []; this.technicianBalancesPager.setItems(this.technicianBalances); },
        error: () => { /* non-fatal */ }
      });
  }

  exportStockReportCsv(): void {
    if (!this.stockReport.length) { this.toastr.info('Nothing to export — load the report first.'); return; }
    const rows = this.stockReport.map(r => ({
      Material: r.name,
      SKU: r.sku ?? '',
      Category: r.category ?? '',
      Site: r.site,
      Market: r.market ?? '',
      OnHand: r.quantityOnHand,
      Unit: r.unit ?? '',
      ReorderLevel: r.reorderLevel,
      LowStock: r.isLowStock ? 'Yes' : 'No',
      UnitCost: r.unitCost ?? '',
      ExtendedValue: r.extendedValue ?? ''
    }));
    this.downloadCsv(rows, 'materials-stock-report');
  }

  exportTechnicianBalancesCsv(): void {
    if (!this.technicianBalances.length) { this.toastr.info('No technician balances to export.'); return; }
    const rows = this.technicianBalances.map(r => ({
      Technician: r.technicianName ?? r.technicianId ?? '',
      TechnicianId: r.technicianId ?? '',
      Material: r.name,
      Unit: r.unit ?? '',
      Outstanding: r.quantityOutstanding
    }));
    this.downloadCsv(rows, 'technician-balances');
  }

  exportLedgerCsv(): void {
    if (!this.transactions.length) { this.toastr.info('No ledger rows to export — load the ledger first.'); return; }
    const rows = this.transactions.map(t => ({
      When: t.performedAt ?? '',
      Material: this.materialName(t.materialId),
      Site: t.site ?? '',
      Type: t.txnType,
      Delta: t.quantityDelta,
      OnHandAfter: t.quantityAfter,
      Reference: `${t.referenceType ?? ''} ${t.referenceId ?? ''}`.trim(),
      Reason: t.reason ?? '',
      By: t.performedBy ?? ''
    }));
    this.downloadCsv(rows, 'materials-ledger');
  }

  private downloadCsv(rows: any[], baseName: string): void {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${baseName}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastr.success('CSV exported');
  }

  // ---------------- Barcode / QR scanning ----------------

  openScanner(target: 'material' | 'order' | 'assignment' | 'adjust' | 'transfer' | 'asset'): void {
    this.scanTarget = target;
    this.scannerOpen = true;
    this.scannerEnabled = true;
  }

  closeScanner(): void {
    this.scannerOpen = false;
    this.scannerEnabled = false;
  }

  onScanSuccess(code: string): void {
    if (!code) return;
    this.scannerEnabled = false;
    this.materialsService.lookupByCode(code.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: material => {
          this.applyScannedMaterial(material);
          this.toastr.success(`Matched: ${material.name}`);
          this.closeScanner();
        },
        error: () => {
          this.toastr.warning(`No material matched "${code}".`);
          this.closeScanner();
        }
      });
  }

  onScanError(_: unknown): void {
    this.toastr.error('Unable to access the camera for scanning.');
    this.closeScanner();
  }

  private applyScannedMaterial(material: Material): void {
    switch (this.scanTarget) {
      case 'material': this.newMaterial = { ...this.newMaterial, id: material.id, name: material.name, sku: material.sku }; break;
      case 'order': this.newOrder.materialId = material.id; break;
      case 'assignment': this.newAssignment.materialId = material.id; break;
      case 'adjust': this.newAdjust.materialId = material.id; break;
      case 'transfer': this.newTransfer.materialId = material.id; break;
      case 'asset': this.newAsset.materialId = material.id; break;
    }
  }

  // ---------------- Add / edit modal ----------------

  /** Open the modal in "add new" mode for the given entity. */
  openAdd(kind: MaterialsEditKind): void {
    this.editModal?.openForCreate(kind);
  }

  /** Open the modal pre-filled to edit an existing material / order / asset. */
  openEditModal(kind: MaterialsEditKind, record: Material | MaterialOrder | MaterialAsset): void {
    this.editModal?.openForEdit(kind, record);
  }

  /** Persist the payload emitted by the modal (create or update, depending on kind/id). */
  onModalSave(payload: MaterialsEditPayload): void {
    const kind = this.editModal?.kind ?? 'material';
    if (kind === 'material') {
      this.materialsService.saveMaterial(payload as MaterialUpsert)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.toastr.success('Material saved'); this.closeModal(); this.loadMaterials(); },
          error: err => this.toastr.error(this.errorText(err), 'Could not save material')
        });
    } else if (kind === 'order') {
      this.materialsService.saveOrder(payload as MaterialOrderUpsert)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.toastr.success('Order saved'); this.closeModal(); this.loadOrders(); },
          error: err => this.toastr.error(this.errorText(err), 'Could not save order')
        });
    } else if (kind === 'asset') {
      this.materialsService.saveAsset(payload as MaterialAssetUpsert)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.toastr.success('Asset saved'); this.closeModal(); this.loadAssets(); },
          error: err => this.toastr.error(this.errorText(err), 'Could not save asset')
        });
    } else if (kind === 'assignment') {
      this.materialsService.issueMaterial(payload as MaterialAssignmentCreate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Material issued to technician');
            this.closeModal();
            this.loadAssignments();
            this.loadMaterials();
            this.stock = [];
          },
          error: err => this.toastr.error(this.errorText(err), 'Could not issue material')
        });
    } else if (kind === 'transfer') {
      this.materialsService.createTransfer(payload as MaterialTransferCreate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.toastr.success('Transfer created'); this.closeModal(); this.loadTransfers(); },
          error: err => this.toastr.error(this.errorText(err), 'Could not create transfer')
        });
    } else if (kind === 'count') {
      this.materialsService.createCount(payload as MaterialCountCreate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: count => {
            this.toastr.success('Count session started');
            this.closeModal();
            this.loadCounts();
            this.openCount(count);
          },
          error: err => this.toastr.error(this.errorText(err), 'Could not start count')
        });
    }
  }

  closeModal(): void {
    if (this.editModal) this.editModal.open = false;
  }

  // ---------------- Inline editing ----------------

  startEditMaterial(m: Material): void {
    this.cancelInlineEdits();
    this.editingMaterialId = m.id;
    this.materialDraft = {
      id: m.id, name: m.name, sku: m.sku, category: m.category, description: m.description,
      unit: m.unit, site: m.site, market: m.market, quantityOnHand: m.quantityOnHand,
      reorderLevel: m.reorderLevel, unitCost: m.unitCost, isSerialized: m.isSerialized
    };
  }

  materialField<K extends keyof MaterialUpsert>(key: K): MaterialUpsert[K] | undefined {
    return this.materialDraft ? this.materialDraft[key] : undefined;
  }

  setMaterialField<K extends keyof MaterialUpsert>(key: K, value: MaterialUpsert[K]): void {
    if (this.materialDraft) this.materialDraft[key] = value;
  }

  saveInlineMaterial(): void {
    if (!this.materialDraft?.name?.trim()) { this.toastr.warning('Material name is required.'); return; }
    this.savingInline = true;
    this.materialsService.saveMaterial(this.materialDraft)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.savingInline = false; this.toastr.success('Material updated'); this.cancelInlineEdits(); this.loadMaterials(); },
        error: err => { this.savingInline = false; this.toastr.error(this.errorText(err), 'Could not update material'); }
      });
  }

  startEditOrder(o: MaterialOrder): void {
    this.cancelInlineEdits();
    this.editingOrderId = o.id;
    this.orderDraft = {
      id: o.id, materialId: o.materialId, direction: o.direction, quantity: o.quantity,
      orderNumber: o.orderNumber, status: o.status, vendor: o.vendor, site: o.site,
      market: o.market, unitCost: o.unitCost, notes: o.notes
    };
  }

  orderField<K extends keyof MaterialOrderUpsert>(key: K): MaterialOrderUpsert[K] | undefined {
    return this.orderDraft ? this.orderDraft[key] : undefined;
  }

  setOrderField<K extends keyof MaterialOrderUpsert>(key: K, value: MaterialOrderUpsert[K]): void {
    if (this.orderDraft) this.orderDraft[key] = value;
  }

  saveInlineOrder(): void {
    if (!this.orderDraft) return;
    if (!this.orderDraft.quantity || this.orderDraft.quantity <= 0) { this.toastr.warning('Quantity must be greater than zero.'); return; }
    this.savingInline = true;
    this.materialsService.saveOrder(this.orderDraft)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.savingInline = false; this.toastr.success('Order updated'); this.cancelInlineEdits(); this.loadOrders(); },
        error: err => { this.savingInline = false; this.toastr.error(this.errorText(err), 'Could not update order'); }
      });
  }

  startEditAsset(a: MaterialAsset): void {
    this.cancelInlineEdits();
    this.editingAssetId = a.id;
    this.assetDraft = {
      id: a.id, materialId: a.materialId, serialNumber: a.serialNumber, lotNumber: a.lotNumber,
      status: a.status, site: a.site, market: a.market,
      assignedTechnicianId: a.assignedTechnicianId, assignedTechnicianName: a.assignedTechnicianName, notes: a.notes
    };
  }

  assetField<K extends keyof MaterialAssetUpsert>(key: K): MaterialAssetUpsert[K] | undefined {
    return this.assetDraft ? this.assetDraft[key] : undefined;
  }

  setAssetField<K extends keyof MaterialAssetUpsert>(key: K, value: MaterialAssetUpsert[K]): void {
    if (this.assetDraft) this.assetDraft[key] = value;
  }

  saveInlineAsset(): void {
    if (!this.assetDraft) return;
    if (!this.assetDraft.serialNumber && !this.assetDraft.lotNumber) { this.toastr.warning('Enter a serial or lot number.'); return; }
    this.savingInline = true;
    this.materialsService.saveAsset(this.assetDraft)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.savingInline = false; this.toastr.success('Asset updated'); this.cancelInlineEdits(); this.loadAssets(); },
        error: err => { this.savingInline = false; this.toastr.error(this.errorText(err), 'Could not update asset'); }
      });
  }

  /** Clear any in-progress inline edit across all lists. */
  cancelInlineEdits(): void {
    this.editingMaterialId = null;
    this.editingOrderId = null;
    this.editingAssetId = null;
    this.materialDraft = null;
    this.orderDraft = null;
    this.assetDraft = null;
  }

  readonly assetStatuses = ['InStock', 'Issued', 'Retired', 'Lost'] as const;
  readonly orderStatuses: MaterialOrderStatus[] = ['Pending', 'Ordered', 'Received', 'Shipped', 'Cancelled'];

  // ---------------- Helpers ----------------

  materialName(materialId: string): string {
    return this.materials.find(m => m.id === materialId)?.name ?? materialId;
  }

  private emptyMaterial(): MaterialUpsert {
    return { name: '', sku: '', category: '', unit: 'ea', site: '', market: '', quantityOnHand: 0, reorderLevel: 0, unitCost: null, isSerialized: false };
  }

  private emptyOrder(): MaterialOrderUpsert {
    return { materialId: '', direction: 'Intake', quantity: 0, orderNumber: '', vendor: '', site: '', market: '', status: 'Pending', notes: '' };
  }

  private emptyAssignment(): MaterialAssignmentCreate {
    return { materialId: '', quantityIssued: 0, technicianId: '', technicianName: '', site: '', market: '', notes: '' };
  }

  private emptyAdjust(): MaterialStockAdjust {
    return { materialId: '', site: '', quantityDelta: 0, market: '', reason: '' };
  }

  private emptyTransfer(): MaterialTransferCreate {
    return { materialId: '', fromSite: '', toSite: '', quantity: 0, market: '', notes: '' };
  }

  private emptyAsset(): MaterialAssetUpsert {
    return { materialId: '', serialNumber: '', lotNumber: '', status: 'InStock', site: '', market: '', assignedTechnicianId: '', assignedTechnicianName: '', notes: '' };
  }

  private errorText(err: any): string {
    if (typeof err === 'string') return err;
    return err?.error?.message || err?.error || err?.message || 'Please try again.';
  }
}
