import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote, DashboardUser } from '../../../../models/quote-workflow.model';
import { RfpDetailDialogComponent } from '../rfp-detail-dialog/rfp-detail-dialog.component';
import { RfpIntakeFormComponent } from '../../rfp-intake/rfp-intake-form.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-rfp-tab',
  templateUrl: './rfp-tab.component.html',
  styleUrls: ['./rfp-tab.component.scss']
})
export class RfpTabComponent implements OnInit, OnChanges {
  @Input() records: DashboardQuote[] = [];
  @Input() users: DashboardUser[] = [];
  @Output() selectionChanged = new EventEmitter<DashboardQuote[]>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'select', 'customer', 'description', 'requestorName', 'rfpReceiveDate',
    'quoteDueDate', 'assignedToQuote', 'quoteSubmittedDate', 'quoteNumber', 'actions'
  ];

  selection = new SelectionModel<DashboardQuote>(true, []);

  dataSource = new MatTableDataSource<DashboardQuote>([]);

  editingId: string | null = null;
  editingField: string | null = null;
  editValue: string = '';

  // Per-tab filters
  filterCustomer = '';
  filterAssigned = '';
  filterStatus = '';

  // Distinct assignee names derived from the records' assignedToQuote column
  assignedToOptions: string[] = [];

  constructor(private store: Store, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.selection.changed.subscribe(() => {
      this.selectionChanged.emit(this.selection.selected);
    });

    this.dataSource.filterPredicate = (data: DashboardQuote, filter: string) => {
      const filters = JSON.parse(filter);
      let matches = true;

      if (filters.customer) {
        matches = matches && (data.customer || '').toLowerCase().includes(filters.customer.toLowerCase());
      }
      if (filters.assigned) {
        const assigneeName = this.getAssigneeName(data.assignedToQuote);
        matches = matches && assigneeName.toLowerCase().includes(filters.assigned.toLowerCase());
      }
      if (filters.status) {
        if (filters.status === 'overdue') {
          matches = matches && this.isOverdue(data);
        } else if (filters.status === 'submitted') {
          matches = matches && !!data.quoteSubmittedDate;
        } else if (filters.status === 'pending') {
          matches = matches && !data.quoteSubmittedDate && !this.isOverdue(data);
        }
      }
      return matches;
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['records'] || changes['users']) {
      this.dataSource.data = this.records;
      this.buildAssignedToOptions();
      setTimeout(() => {
        if (this.sort) { this.dataSource.sort = this.sort; }
        if (this.paginator) { this.dataSource.paginator = this.paginator; }
      });
    }
  }

  private buildAssignedToOptions(): void {
    const names = this.records
      .map(r => {
        if (!r.assignedToQuote) return null;
        // Try to resolve ID to name via users list
        const user = this.users.find(u => u.id === r.assignedToQuote);
        return user ? user.fullName : r.assignedToQuote;
      })
      .filter((name): name is string => !!name);
    this.assignedToOptions = [...new Set(names)].sort();
  }

  isOverdue(row: DashboardQuote): boolean {
    if (!row.quoteDueDate || row.quoteSubmittedDate) {
      return false;
    }
    return new Date(row.quoteDueDate) < new Date();
  }

  getAssigneeName(assignedId: string | null): string {
    if (!assignedId) return '-';
    const user = this.users.find(u => u.id === assignedId);
    return user ? user.fullName : assignedId;
  }

  startEdit(id: string, field: string): void {
    this.editingId = id;
    this.editingField = field;
    const record = this.records.find(r => r.id === id);
    if (record && field === 'quoteNumber') {
      this.editValue = record.quoteNumber || '';
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingField = null;
    this.editValue = '';
  }

  saveEdit(row: DashboardQuote, field: string): void {
    if (field === 'quoteNumber' && this.editValue !== row.quoteNumber) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: row.id,
        fields: { quoteNumber: this.editValue }
      }));
    }
    this.cancelEdit();
  }

  onSubmittedDateChange(event: any, row: DashboardQuote): void {
    const dateValue = event.value ? event.value.toISOString() : null;
    this.store.dispatch(DashboardActions.updateDashboardFields({
      quoteId: row.id,
      fields: { quoteSubmittedDate: dateValue }
    }));
    this.cancelEdit();
  }

  onRowClick(row: DashboardQuote): void {
    this.dialog.open(RfpDetailDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: { record: row }
    });
  }

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      customer: this.filterCustomer,
      assigned: this.filterAssigned,
      status: this.filterStatus
    });
  }

  clearFilters(): void {
    this.filterCustomer = '';
    this.filterAssigned = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterCustomer || this.filterAssigned || this.filterStatus);
  }

  // ─── Selection Helpers ────────────────────────────────────────────────────

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows && numRows > 0;
  }

  /** Whether some but not all rows are selected. */
  isIndeterminate(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.filteredData.forEach(row => this.selection.select(row));
    }
  }

  /** Clear selection when data changes. */
  clearSelection(): void {
    this.selection.clear();
  }

  /** Bulk delete selected items. */
  bulkDelete(): void {
    const count = this.selection.selected.length;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${count} selected RFP${count > 1 ? 's' : ''}?\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      this.selection.selected.forEach(row => {
        this.store.dispatch(DashboardActions.deleteRfp({ quoteId: row.id }));
      });
      this.selection.clear();
    }
  }

  // ─── Action Button Handlers ─────────────────────────────────────────────────

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
      `Are you sure you want to delete this RFP?\n\n"${row.description}" (${row.customer})\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      this.store.dispatch(DashboardActions.deleteRfp({ quoteId: row.id }));
    }
  }

  onAddPo(row: DashboardQuote, event: Event): void {
    event.stopPropagation();
    const poNumber = window.prompt('Enter PO Number:', row.poNumber || '');
    if (poNumber !== null && poNumber.trim() !== '') {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: row.id,
        fields: { poNumber: poNumber.trim() }
      }));
    }
  }
}
