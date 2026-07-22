import { Component, Input, OnChanges, SimpleChanges, ViewChild, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { BomHistoryDialogComponent } from '../bom-history-dialog/bom-history-dialog.component';
import { RfpDetailDialogComponent } from '../rfp-detail-dialog/rfp-detail-dialog.component';
import { RfpIntakeFormComponent } from '../../rfp-intake/rfp-intake-form.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-project-tracking-tab',
  templateUrl: './project-tracking-tab.component.html',
  styleUrls: ['./project-tracking-tab.component.scss']
})
export class ProjectTrackingTabComponent implements OnChanges {
  @Input() records: DashboardQuote[] = [];
  @Output() selectionChanged = new EventEmitter<DashboardQuote[]>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'select', 'customer', 'description', 'requestorName',
    'quoteNumber', 'poNumber', 'poReceivedDate',
    'jobNumber', 'materialsOrdered', 'materialsEta', 'customerEquipment', 'jobStart', 'jobComplete', 'invoiceNumber', 'closeout', 'actions'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);
  selection = new SelectionModel<DashboardQuote>(true, []);

  // Inline editing state
  editingId: string | null = null;
  editingField: string | null = null;
  editValue: string = '';

  // Per-tab filters
  filterCustomer = '';
  filterJobNumber = '';
  filterStatus = '';
  filterPo = '';
  filterMaterials = '';

  constructor(private store: Store, private dialog: MatDialog) {
    this.selection.changed.subscribe(() => {
      this.selectionChanged.emit(this.selection.selected);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['records']) {
      this.dataSource.data = this.records;
      this.dataSource.filterPredicate = (data: DashboardQuote, filter: string) => {
        const filters = JSON.parse(filter);
        let matches = true;
        if (filters.customer) {
          matches = matches && (data.customer || '').toLowerCase().includes(filters.customer.toLowerCase());
        }
        if (filters.jobNumber) {
          matches = matches && (data.jobNumber || '').toLowerCase().includes(filters.jobNumber.toLowerCase());
        }
        if (filters.po) {
          if (filters.po === 'has') {
            matches = matches && !!data.poNumber;
          } else if (filters.po === 'none') {
            matches = matches && !data.poNumber;
          }
        }
        if (filters.materials) {
          const status = this.getMaterialsStatus(data).toLowerCase();
          if (filters.materials === 'ordered') {
            matches = matches && status === 'on the way';
          } else if (filters.materials === 'received') {
            matches = matches && status === 'received';
          } else if (filters.materials === 'notOrdered') {
            matches = matches && status === 'not ordered';
          }
        }
        if (filters.status) {
          if (filters.status === 'active') {
            matches = matches && !data.jobComplete;
          } else if (filters.status === 'complete') {
            matches = matches && !!data.jobComplete && !!data.invoiceNumber;
          } else if (filters.status === 'pendingCloseout') {
            matches = matches && !!data.jobComplete && !data.invoiceNumber;
          }
        }
        return matches;
      };
      setTimeout(() => {
        if (this.sort) { this.dataSource.sort = this.sort; }
        if (this.paginator) { this.dataSource.paginator = this.paginator; }
      });
    }
  }

  getLatestBomStatus(row: DashboardQuote): string {
    if (!row.bomTrackings || row.bomTrackings.length === 0) {
      return 'None';
    }
    return row.bomTrackings[row.bomTrackings.length - 1].status;
  }

  getMaterialsOrderedDate(row: DashboardQuote): string | null {
    if (!row.bomTrackings || row.bomTrackings.length === 0) return null;
    const ordered = row.bomTrackings.find(b => b.orderedDate);
    return ordered?.orderedDate ?? null;
  }

  getMaterialsEta(row: DashboardQuote): string | null {
    if (!row.bomTrackings || row.bomTrackings.length === 0) return null;
    // Use the latest tracking entry's received date as ETA indicator
    const latest = row.bomTrackings[row.bomTrackings.length - 1];
    return latest.receivedDate ?? null;
  }

  getMaterialsStatus(row: DashboardQuote): string {
    if (!row.bomTrackings || row.bomTrackings.length === 0) return 'Not Ordered';
    const latest = row.bomTrackings[row.bomTrackings.length - 1];
    if (latest.receivedDate) return 'Received';
    if (latest.orderedDate) return 'On the Way';
    return 'Pending';
  }

  openBomHistory(row: DashboardQuote): void {
    this.dialog.open(BomHistoryDialogComponent, {
      width: '700px',
      data: { quoteId: row.id, bomTrackings: row.bomTrackings || [] }
    });
  }

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      customer: this.filterCustomer,
      jobNumber: this.filterJobNumber,
      status: this.filterStatus,
      po: this.filterPo,
      materials: this.filterMaterials
    });
  }

  clearFilters(): void {
    this.filterCustomer = '';
    this.filterJobNumber = '';
    this.filterStatus = '';
    this.filterPo = '';
    this.filterMaterials = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterCustomer || this.filterJobNumber || this.filterStatus || this.filterPo || this.filterMaterials);
  }

  // ─── Inline Editing ────────────────────────────────────────────────────────

  startEdit(id: string, field: string): void {
    this.editingId = id;
    this.editingField = field;
    const record = this.records.find(r => r.id === id);
    if (record) {
      this.editValue = (record as any)[field] || '';
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingField = null;
    this.editValue = '';
  }

  saveEdit(row: DashboardQuote, field: string): void {
    const currentValue = (row as any)[field];
    if (this.editValue !== (currentValue || '')) {
      const fields: Partial<DashboardQuote> = {};
      (fields as any)[field] = this.editValue || null;
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: row.id,
        fields
      }));
    }
    this.cancelEdit();
  }

  onDateFieldChange(event: any, row: DashboardQuote, field: string): void {
    const dateValue = event.value ? event.value.toISOString() : null;
    this.store.dispatch(DashboardActions.updateDashboardFields({
      quoteId: row.id,
      fields: { [field]: dateValue } as Partial<DashboardQuote>
    }));
    this.cancelEdit();
  }

  // ─── Selection Helpers ────────────────────────────────────────────────────

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows && numRows > 0;
  }

  isIndeterminate(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.filteredData.forEach(row => this.selection.select(row));
    }
  }

  clearSelection(): void {
    this.selection.clear();
  }

  bulkDelete(): void {
    const count = this.selection.selected.length;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} selected record${count > 1 ? 's' : ''}?\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      this.selection.selected.forEach(row => {
        this.store.dispatch(DashboardActions.deleteRfp({ quoteId: row.id }));
      });
      this.selection.clear();
    }
  }

  // ─── Action Button Handlers ─────────────────────────────────────────────────

  onViewDetails(row: DashboardQuote, event: Event): void {
    event.stopPropagation();
    this.dialog.open(RfpDetailDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: { record: row }
    });
  }

  onEdit(row: DashboardQuote, event: Event): void {
    event.stopPropagation();
    this.dialog.open(RfpIntakeFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { editRecord: row }
    });
  }

  onDelete(row: DashboardQuote, event: Event): void {
    event.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete this record?\n\n"${row.description}" (${row.customer})\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      this.store.dispatch(DashboardActions.deleteRfp({ quoteId: row.id }));
    }
  }
}
