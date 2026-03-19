import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import {
  InventoryItem,
  InventoryCategory,
  InventoryStatus,
  InventoryFilters,
  LocationType
} from '../../../models/inventory.model';
import { MaterialUsageReport } from '../../../models/reporting.model';
import * as InventoryActions from '../../../state/inventory/inventory.actions';
import {
  selectFilteredInventory,
  selectInventoryLoading,
  selectInventoryError,
  selectInventoryFilters,
  selectLowStockAlerts,
  selectInventoryStatistics,
  selectInventoryValueByLocationType,
  selectTotalInventoryValue
} from '../../../state/inventory/inventory.selectors';
import { InventoryAssignmentDialogComponent } from '../inventory-assignment-dialog/inventory-assignment-dialog.component';
import { ReportingService } from '../../../services/reporting.service';

export interface InventoryViewModel {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
  lowStockAlerts: InventoryItem[];
  statistics: {
    total: number;
    lowStock: number;
    totalValue: number;
    byStatus: Record<string, number>;
    byLocationType: Record<string, number>;
  };
  valueByLocation: Record<string, number>;
  totalValue: number;
}

@Component({
  selector: 'app-inventory-manager',
  templateUrl: './inventory-manager.component.html',
  styleUrls: ['./inventory-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryManagerComponent implements OnInit, OnDestroy {
  viewModel$!: Observable<InventoryViewModel>;

  readonly categories = Object.values(InventoryCategory);
  readonly statuses = Object.values(InventoryStatus);
  readonly locationTypes = Object.values(LocationType);

  readonly displayedColumns = ['itemNumber', 'name', 'category', 'location', 'quantity', 'status', 'value', 'actions'];

  // Material usage report
  materialUsageReport$ = new BehaviorSubject<MaterialUsageReport | null>(null);
  materialUsageLoading$ = new BehaviorSubject<boolean>(false);
  showMaterialUsage = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private reportingService: ReportingService
  ) {}

  ngOnInit(): void {
    // Inventory data is loaded by MockDataService — no need to dispatch loadInventory

    this.viewModel$ = combineLatest([
      this.store.select(selectFilteredInventory),
      this.store.select(selectInventoryLoading),
      this.store.select(selectInventoryError),
      this.store.select(selectInventoryFilters),
      this.store.select(selectLowStockAlerts),
      this.store.select(selectInventoryStatistics),
      this.store.select(selectInventoryValueByLocationType),
      this.store.select(selectTotalInventoryValue)
    ]).pipe(
      map(([items, loading, error, filters, lowStockAlerts, statistics, valueByLocation, totalValue]) => ({
        items,
        loading,
        error,
        filters,
        lowStockAlerts,
        statistics,
        valueByLocation,
        totalValue
      }))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(searchTerm: string): void {
    this.store.dispatch(InventoryActions.setFilters({ filters: { searchTerm } }));
  }

  onCategoryFilter(category: InventoryCategory | ''): void {
    const filters: InventoryFilters = category ? { category } : {};
    this.store.dispatch(InventoryActions.setFilters({ filters }));
  }

  onStatusFilter(status: InventoryStatus | ''): void {
    const filters: InventoryFilters = status ? { status } : {};
    this.store.dispatch(InventoryActions.setFilters({ filters }));
  }

  onLocationTypeFilter(locationType: LocationType | ''): void {
    const filters: InventoryFilters = locationType ? { locationType } : {};
    this.store.dispatch(InventoryActions.setFilters({ filters }));
  }

  toggleLowStockFilter(enabled: boolean): void {
    this.store.dispatch(InventoryActions.setFilters({ filters: { lowStock: enabled || undefined } }));
  }

  clearFilters(): void {
    this.store.dispatch(InventoryActions.clearFilters());
  }

  openAssignDialog(item: InventoryItem): void {
    const dialogRef = this.dialog.open(InventoryAssignmentDialogComponent, {
      width: '600px',
      data: { item }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        switch (result.locationType) {
          case LocationType.Job:
            this.store.dispatch(InventoryActions.assignToJob({
              itemId: item.id,
              jobId: result.locationId,
              reason: result.reason
            }));
            break;
          case LocationType.Technician:
            this.store.dispatch(InventoryActions.assignToTechnician({
              itemId: item.id,
              technicianId: result.locationId,
              reason: result.reason
            }));
            break;
          case LocationType.Vendor:
            this.store.dispatch(InventoryActions.assignToVendor({
              itemId: item.id,
              vendorId: result.locationId,
              reason: result.reason
            }));
            break;
        }
      }
    });
  }

  dismissAlert(itemId: string): void {
    this.store.dispatch(InventoryActions.dismissLowStockAlert({ itemId }));
  }

  getStatusColor(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.Available: return 'available';
      case InventoryStatus.Assigned: return 'assigned';
      case InventoryStatus.InUse: return 'in-use';
      case InventoryStatus.Maintenance: return 'maintenance';
      case InventoryStatus.Retired: return 'retired';
      default: return '';
    }
  }

  getLocationIcon(type: LocationType | string): string {
    switch (type) {
      case LocationType.Job: return 'work';
      case LocationType.Technician: return 'person';
      case LocationType.Vendor: return 'store';
      case LocationType.Warehouse: return 'warehouse';
      default: return 'place';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatLocationLabel(type: string): string {
    switch (type) {
      case 'job': return 'Jobs';
      case 'technician': return 'Technicians';
      case 'vendor': return 'Vendors';
      case 'warehouse': return 'Warehouse';
      default: return type;
    }
  }

  isLowStock(item: InventoryItem): boolean {
    return item.quantity <= item.minimumThreshold;
  }

  /**
   * Toggle material usage report visibility
   */
  toggleMaterialUsage(): void {
    this.showMaterialUsage = !this.showMaterialUsage;
    if (this.showMaterialUsage) {
      this.loadMaterialUsageReport();
    }
  }

  /**
   * Load material usage report data
   */
  loadMaterialUsageReport(): void {
    this.materialUsageLoading$.next(true);
    this.reportingService.getMaterialUsageReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.materialUsageReport$.next(report);
          this.materialUsageLoading$.next(false);
        },
        error: () => {
          this.materialUsageLoading$.next(false);
        }
      });
  }
}
