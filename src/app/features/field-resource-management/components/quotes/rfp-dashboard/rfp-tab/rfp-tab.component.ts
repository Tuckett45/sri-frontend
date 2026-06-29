import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote, DashboardUser } from '../../../../models/quote-workflow.model';
import { RfpDetailDialogComponent } from '../rfp-detail-dialog/rfp-detail-dialog.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-rfp-tab',
  templateUrl: './rfp-tab.component.html',
  styleUrls: ['./rfp-tab.component.scss']
})
export class RfpTabComponent implements OnInit, OnChanges {
  @Input() records: DashboardQuote[] = [];
  @Input() users: DashboardUser[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'customer', 'description', 'requestorName', 'rfpReceiveDate',
    'quoteDueDate', 'assignedToQuote', 'quoteSubmittedDate', 'quoteNumber'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);

  editingId: string | null = null;
  editingField: string | null = null;
  editValue: string = '';

  // Per-tab filters
  filterCustomer = '';
  filterAssigned = '';
  filterStatus = '';

  constructor(private store: Store, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: DashboardQuote, filter: string) => {
      const filters = JSON.parse(filter);
      let matches = true;

      if (filters.customer) {
        matches = matches && (data.customer || '').toLowerCase().includes(filters.customer.toLowerCase());
      }
      if (filters.assigned) {
        matches = matches && (data.assignedToQuote || '').toLowerCase().includes(filters.assigned.toLowerCase());
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
    if (changes['records']) {
      this.dataSource.data = this.records;
      setTimeout(() => {
        if (this.sort) { this.dataSource.sort = this.sort; }
        if (this.paginator) { this.dataSource.paginator = this.paginator; }
      });
    }
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
}
