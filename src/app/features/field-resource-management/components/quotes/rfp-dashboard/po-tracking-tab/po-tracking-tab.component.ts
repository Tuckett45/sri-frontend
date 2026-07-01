import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-po-tracking-tab',
  templateUrl: './po-tracking-tab.component.html',
  styleUrls: ['./po-tracking-tab.component.scss']
})
export class PoTrackingTabComponent implements OnChanges {
  @Input() records: DashboardQuote[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'customer', 'description', 'quoteNumber', 'dateReceived', 'poNumber', 'poAmount', 'poReceivedDate'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);

  editingId: string | null = null;
  editingField: string | null = null;
  editValue: string = '';

  // Per-tab filters
  filterCustomer = '';
  filterPoNumber = '';

  constructor(private store: Store) {}

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
}
