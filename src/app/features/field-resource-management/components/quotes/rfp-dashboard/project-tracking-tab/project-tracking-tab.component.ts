import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { BomHistoryDialogComponent } from '../bom-history-dialog/bom-history-dialog.component';
import { RfpDetailDialogComponent } from '../rfp-detail-dialog/rfp-detail-dialog.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

@Component({
  selector: 'app-project-tracking-tab',
  templateUrl: './project-tracking-tab.component.html',
  styleUrls: ['./project-tracking-tab.component.scss']
})
export class ProjectTrackingTabComponent implements OnChanges {
  @Input() records: DashboardQuote[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'customer', 'description', 'quoteNumber', 'poNumber', 'jobNumber',
    'materialsOrdered', 'materialsEta', 'customerEquipment', 'jobStart', 'jobComplete', 'invoiceNumber', 'closeout', 'actions'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);

  // Per-tab filters
  filterCustomer = '';
  filterJobNumber = '';
  filterStatus = '';

  constructor(private store: Store, private dialog: MatDialog) {}

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
      status: this.filterStatus
    });
  }

  clearFilters(): void {
    this.filterCustomer = '';
    this.filterJobNumber = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterCustomer || this.filterJobNumber || this.filterStatus);
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
