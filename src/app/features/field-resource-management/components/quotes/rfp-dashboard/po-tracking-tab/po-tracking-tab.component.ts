import { Component, Input, OnChanges, SimpleChanges, ViewChild, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { RfpDetailDialogComponent } from '../rfp-detail-dialog/rfp-detail-dialog.component';
import { RfpIntakeFormComponent } from '../../rfp-intake/rfp-intake-form.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-po-tracking-tab',
  templateUrl: './po-tracking-tab.component.html',
  styleUrls: ['./po-tracking-tab.component.scss']
})
export class PoTrackingTabComponent implements OnChanges {
  @Input() records: DashboardQuote[] = [];
  @Output() selectionChanged = new EventEmitter<DashboardQuote[]>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'select', 'customer', 'description', 'requestorName', 'rfpReceiveDate', 'quoteDueDate',
    'assignedToQuote', 'quoteSubmittedDate', 'quoteNumber', 'dateReceived', 'poNumber', 'poAmount', 'poReceivedDate', 'actions'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);
  selection = new SelectionModel<DashboardQuote>(true, []);

  editingId: string | null = null;
  editingField: string | null = null;
  editValue: string = '';

  // Per-tab filters
  filterCustomer = '';
  filterPoNumber = '';

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
        if (filters.poNumber) {
          matches = matches && (data.poNumber || '').toLowerCase().includes(filters.poNumber.toLowerCase());
        }
        return matches;
      };
      setTimeout(() => {
        if (this.sort) { this.dataSource.sort = this.sort; }
        if (this.paginator) { this.dataSource.paginator = this.paginator; }
      });
    }
  }

  startEdit(id: string, field: string): void {
    this.editingId = id;
    this.editingField = field;
    const record = this.records.find(r => r.id === id);
    if (record) {
      if (field === 'poNumber') {
        this.editValue = record.poNumber || '';
      } else if (field === 'poAmount') {
        this.editValue = record.poAmount != null ? String(record.poAmount) : '';
      }
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingField = null;
    this.editValue = '';
  }

  saveEdit(row: DashboardQuote, field: string): void {
    const fields: Partial<DashboardQuote> = {};
    if (field === 'poNumber' && this.editValue !== row.poNumber) {
      fields.poNumber = this.editValue;
    } else if (field === 'poAmount') {
      const parsed = parseFloat(this.editValue);
      if (!isNaN(parsed) && parsed !== row.poAmount) {
        fields.poAmount = parsed;
      }
    }
    if (Object.keys(fields).length > 0) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: row.id,
        fields
      }));
    }
    this.cancelEdit();
  }

  onPoReceivedDateChange(event: any, row: DashboardQuote): void {
    const dateValue = event.value ? event.value.toISOString() : null;
    this.store.dispatch(DashboardActions.updateDashboardFields({
      quoteId: row.id,
      fields: { poReceivedDate: dateValue }
    }));
    this.cancelEdit();
  }

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      customer: this.filterCustomer,
      poNumber: this.filterPoNumber
    });
  }

  clearFilters(): void {
    this.filterCustomer = '';
    this.filterPoNumber = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterCustomer || this.filterPoNumber);
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
