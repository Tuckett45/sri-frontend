import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { DashboardQuote, DashboardUser } from '../../../../models/quote-workflow.model';
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

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {}

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
    this.router.navigate(['/field-resource-management/quotes', row.id]);
  }
}
