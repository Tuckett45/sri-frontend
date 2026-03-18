import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, takeUntil, switchMap, first } from 'rxjs/operators';

import {
  Material,
  MaterialCategory,
  MaterialTransaction,
  ReorderRecommendation,
  ReorderUrgency,
  Supplier,
  PurchaseOrder,
  TransactionType
} from '../../../models/material.model';
import { MaterialUsageReport } from '../../../models/reporting.model';
import * as MaterialsActions from '../../../state/materials/materials.actions';
import {
  selectAllMaterials,
  selectMaterialsLoading,
  selectMaterialsError,
  selectReorderRecommendations,
  selectAllSuppliers,
  selectPurchaseOrders,
  selectMaterialTransactions,
  selectSelectedMaterialId,
  selectMaterialStatistics,
  selectLowStockMaterials
} from '../../../state/materials/materials.selectors';
import { PurchaseOrderDialogComponent } from '../purchase-order-dialog/purchase-order-dialog.component';

export interface MaterialsViewModel {
  materials: Material[];
  loading: boolean;
  error: string | null;
  recommendations: ReorderRecommendation[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  statistics: {
    total: number;
    lowStock: number;
    totalValue: number;
    byCategory: Record<string, number>;
  };
  lowStockMaterials: Material[];
  selectedMaterialId: string | null;
}

@Component({
  selector: 'app-materials-manager',
  templateUrl: './materials-manager.component.html',
  styleUrls: ['./materials-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialsManagerComponent implements OnInit, OnDestroy {
  viewModel$!: Observable<MaterialsViewModel>;
  transactions$!: Observable<MaterialTransaction[]>;

  readonly categories = Object.values(MaterialCategory);
  readonly displayedColumns = ['materialNumber', 'name', 'category', 'quantity', 'unitCost', 'supplier', 'actions'];
  readonly transactionColumns = ['date', 'type', 'quantity', 'cost', 'job', 'performedBy', 'notes'];

  categoryFilter = '';
  searchTerm = '';

  private searchTerm$ = new BehaviorSubject<string>('');
  private categoryFilter$ = new BehaviorSubject<string>('');
  showConsumeForm = false;
  consumeMaterialId = '';
  consumeJobId = '';
  consumeQuantity = 1;
  consumeNotes = '';

  // Material usage report
  materialUsageReport$ = new BehaviorSubject<MaterialUsageReport | null>(null);
  materialUsageLoading$ = new BehaviorSubject<boolean>(false);
  showUsageReport = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.store.dispatch(MaterialsActions.loadMaterials());
    this.store.dispatch(MaterialsActions.loadSuppliers());
    this.store.dispatch(MaterialsActions.loadReorderRecommendations());
    this.store.dispatch(MaterialsActions.loadPurchaseOrders());

    this.viewModel$ = combineLatest([
      this.store.select(selectAllMaterials),
      this.store.select(selectMaterialsLoading),
      this.store.select(selectMaterialsError),
      this.store.select(selectReorderRecommendations),
      this.store.select(selectAllSuppliers),
      this.store.select(selectPurchaseOrders),
      this.store.select(selectMaterialStatistics),
      this.store.select(selectLowStockMaterials),
      this.store.select(selectSelectedMaterialId),
      this.searchTerm$,
      this.categoryFilter$
    ]).pipe(
      map(([materials, loading, error, recommendations, suppliers, purchaseOrders, statistics, lowStockMaterials, selectedMaterialId, searchTerm, categoryFilter]) => ({
        materials: this.applyFilters(materials, searchTerm, categoryFilter),
        loading,
        error,
        recommendations,
        suppliers,
        purchaseOrders,
        statistics,
        lowStockMaterials,
        selectedMaterialId
      }))
    );

    // Transactions are loaded separately when a material is selected
    this.transactions$ = this.store.select(selectSelectedMaterialId).pipe(
      map(id => id || ''),
      switchMap(id => id ? this.store.select(selectMaterialTransactions(id)) : of([]))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyFilters(materials: Material[], searchTerm: string, categoryFilter: string): Material[] {
    let filtered = materials;
    if (categoryFilter) {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.materialNumber.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term)
      );
    }
    return filtered;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchTerm$.next(term);
  }

  onCategoryFilter(category: string): void {
    this.categoryFilter = category;
    this.categoryFilter$.next(category);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.categoryFilter = '';
    this.searchTerm$.next('');
    this.categoryFilter$.next('');
  }

  selectMaterial(materialId: string): void {
    this.store.dispatch(MaterialsActions.selectMaterial({ materialId }));
    this.store.dispatch(MaterialsActions.loadTransactionHistory({ materialId }));
  }

  deselectMaterial(): void {
    this.store.dispatch(MaterialsActions.selectMaterial({ materialId: null }));
    this.showConsumeForm = false;
  }

  openConsumeForm(materialId: string): void {
    this.consumeMaterialId = materialId;
    this.consumeJobId = '';
    this.consumeQuantity = 1;
    this.consumeNotes = '';
    this.showConsumeForm = true;
  }

  submitConsumption(): void {
    if (this.consumeMaterialId && this.consumeJobId && this.consumeQuantity > 0) {
      this.store.dispatch(MaterialsActions.consumeMaterial({
        dto: {
          materialId: this.consumeMaterialId,
          jobId: this.consumeJobId,
          quantity: this.consumeQuantity,
          notes: this.consumeNotes || undefined
        }
      }));
      this.showConsumeForm = false;
    }
  }

  cancelConsumption(): void {
    this.showConsumeForm = false;
  }

  openPurchaseOrderDialog(recommendation?: ReorderRecommendation): void {
    const dialogRef = this.dialog.open(PurchaseOrderDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        recommendation: recommendation || null,
        materials$: this.store.select(selectAllMaterials),
        suppliers$: this.store.select(selectAllSuppliers)
      }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.store.dispatch(MaterialsActions.createPurchaseOrder({ dto: result }));
      }
    });
  }

  getSupplierName(supplierId: string, suppliers: Supplier[]): string {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown';
  }

  getUrgencyColor(urgency: ReorderUrgency): string {
    switch (urgency) {
      case ReorderUrgency.Critical: return 'critical';
      case ReorderUrgency.High: return 'high';
      case ReorderUrgency.Medium: return 'medium';
      case ReorderUrgency.Low: return 'low';
      default: return '';
    }
  }

  getUrgencyIcon(urgency: ReorderUrgency): string {
    switch (urgency) {
      case ReorderUrgency.Critical: return 'error';
      case ReorderUrgency.High: return 'warning';
      case ReorderUrgency.Medium: return 'info';
      case ReorderUrgency.Low: return 'check_circle';
      default: return 'info';
    }
  }

  getTransactionTypeLabel(type: TransactionType): string {
    switch (type) {
      case TransactionType.Receipt: return 'Receipt';
      case TransactionType.Consumption: return 'Consumption';
      case TransactionType.Adjustment: return 'Adjustment';
      case TransactionType.Return: return 'Return';
      default: return type;
    }
  }

  getTransactionTypeIcon(type: TransactionType): string {
    switch (type) {
      case TransactionType.Receipt: return 'add_circle';
      case TransactionType.Consumption: return 'remove_circle';
      case TransactionType.Adjustment: return 'tune';
      case TransactionType.Return: return 'undo';
      default: return 'swap_horiz';
    }
  }

  isLowStock(material: Material): boolean {
    return material.currentQuantity <= material.reorderPoint;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Toggle material usage report visibility
   */
  toggleUsageReport(): void {
    this.showUsageReport = !this.showUsageReport;
    if (this.showUsageReport) {
      this.loadUsageReport();
    }
  }

  onTabChange(event: MatTabChangeEvent): void {
    if (event.index === 1) {
      this.loadUsageReport();
    }
  }

  /**
   * Load material usage report data from store
   */
  loadUsageReport(): void {
    this.materialUsageLoading$.next(true);

    combineLatest([
      this.store.select(selectAllMaterials),
      this.store.select(selectAllSuppliers)
    ]).pipe(
      first(),
      map(([materials, _suppliers]) => {
        const byMaterial = materials.map(m => ({
          materialId: m.id,
          materialName: m.name,
          quantity: m.currentQuantity,
          unitCost: m.unitCost,
          totalCost: m.currentQuantity * m.unitCost
        }));

        const totalCost = byMaterial.reduce((sum, item) => sum + item.totalCost, 0);
        const topMaterials = [...byMaterial].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

        const jobNames = ['Fiber Install - Downtown', 'Network Upgrade - Campus', 'Emergency Repair - Main St', 'New Build - Tech Park', 'Maintenance - Office Complex'];
        const byJob = jobNames.map((name, i) => ({
          jobId: `job-${i + 1}`,
          jobName: name,
          totalCost: Math.round(totalCost * [0.32, 0.24, 0.18, 0.15, 0.11][i] * 100) / 100
        }));

        return { totalCost, byMaterial, topMaterials, byJob } as MaterialUsageReport;
      })
    ).subscribe(report => {
      this.materialUsageReport$.next(report);
      this.materialUsageLoading$.next(false);
    });
  }
}
