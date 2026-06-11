import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { BomHistoryDialogComponent } from '../bom-history-dialog/bom-history-dialog.component';

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
    'materialsOrdered', 'materialsEta', 'customerEquipment', 'jobStart', 'jobComplete', 'invoiceNumber', 'closeout'
  ];

  dataSource = new MatTableDataSource<DashboardQuote>([]);

  constructor(private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['records']) {
      this.dataSource.data = this.records;
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
}
