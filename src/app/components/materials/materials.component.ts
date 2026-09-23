import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import * as Papa from 'papaparse';
import { BarcodeFormat } from '@zxing/library';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialsService } from 'src/app/services/materials.service';
import { Pager } from './pager';
import {
  Material,
  MaterialAsset,
  MaterialAssetUpsert,
  MaterialAssignment,
  MaterialAssignmentCreate,
  MaterialCount,
  MaterialCountLineInput,
  MaterialImportSummary,
  MaterialOrder,
  MaterialOrderDirection,
  MaterialOrderUpsert,
  MaterialStock,
  MaterialStockAdjust,
  MaterialStockReportRow,
  MaterialTransaction,
  MaterialTransfer,
  MaterialTransferCreate,
  MaterialUpsert,
  TechnicianBalanceRow
} from 'src/app/models/materials.model';

type MaterialsTab =
  | 'inventory'
  | 'stock'
  | 'orders'
  | 'assignments'
  | 'transfers'
  | 'assets'
  | 'counts'
  | 'reports';

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

  // --- CSV import (Inventory) ---
  importing = false;
  importResult: MaterialImportSummary | null = null;
  showImportErrors = false;
  readonly importTemplateColumns = [
    'Name', 'Sku', 'Category', 'Description', 'Unit',
    'Site', 'Market', 'QuantityOnHand', 'ReorderLevel', 'UnitCost', 'IsSerialized'
  ];

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

  // ---------------- CSV import ----------------

  /** Triggered by the hidden file input. Validates and uploads the chosen CSV. */
  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset the input so selecting the same file again re-triggers change.
    input.value = '';
    if (!file) return;

    const validationError = this.validateImportFile(file);
    if (validationError) {
      this.toastr.warning(validationError, 'Cannot import file');
      return;
    }

    this.importing = true;
    this.importResult = null;
    this.showImportErrors = false;

    this.materialsService.importMaterials(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.importing = false;
          this.importResult = summary;
          const changed = summary.inserted + summary.updated;
          if (summary.errors.length === 0) {
            this.toastr.success(
              `${summary.inserted} added, ${summary.updated} updated${summary.skipped ? `, ${summary.skipped} skipped` : ''}.`,
              'Import complete'
            );
          } else {
            this.toastr.warning(
              `${changed} imported, ${summary.errors.length} row(s) had errors.`,
              'Import finished with errors'
            );
            this.showImportErrors = true;
          }
          this.loadMaterials();
        },
        error: err => {
          this.importing = false;
          this.toastr.error(this.errorText(err), 'Import failed');
        }
      });
  }

  /** Downloads a blank CSV template with the supported column headers. */
  downloadImportTemplate(): void {
    const csv = Papa.unparse({ fields: this.importTemplateColumns, data: [] });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materials-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  dismissImportResult(): void {
    this.importResult = null;
    this.showImportErrors = false;
  }

  private validateImportFile(file: File): string | null {
    const isCsv = file.name.toLowerCase().endsWith('.csv')
      || file.type === 'text/csv'
      || file.type === 'application/vnd.ms-excel';
    if (!isCsv) return 'Please choose a .csv file. Export your spreadsheet as CSV first.';
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
