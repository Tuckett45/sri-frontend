import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { OspCoordinatorService } from 'src/app/services/osp-coordinator.service';
import { OspCoordinatorItem } from 'src/app/models/osp-coordinator-item.model';
import * as Papa from 'papaparse';
import { OspCoordinatorModalComponent } from '../modals/osp-coordinator-modal/osp-coordinator-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-osp-coordinator-tracker',
  templateUrl: './osp-coordinator-tracker.component.html',
  styleUrls: ['./osp-coordinator-tracker.component.scss']
})
export class OspCoordinatorTrackerComponent implements OnInit {
  statCards: any[] = [];
  displayedColumns: string[] = ['segmentId','vendor','crew','materialOrder','date','workPackageCreated','amount','workPackageAmount','originalContinuingCost','highCostAnalysis','ntp','asbuiltSubmitted','coordinatorCloseout','amendmentVersion','amendmentAmount','continuingAmount','amendmentReason','adminAudit','adminAuditDate','pass','passFailReason','actions'];
  dataSource = new MatTableDataSource<OspCoordinatorItem>();

  constructor(
    private coordinatorService: OspCoordinatorService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.coordinatorService.getStats().subscribe(stats => this.statCards = stats);
    this.coordinatorService.getEntries().subscribe(entries => this.dataSource.data = entries);
  }

  openAddEditModal(entry?: OspCoordinatorItem): void {
    const dialogRef = this.dialog.open(OspCoordinatorModalComponent, {
      width: '400px',
      data: entry || null
    });

    dialogRef.afterClosed().subscribe((result: OspCoordinatorItem) => {
      if (result) {
        if (entry) {
          this.coordinatorService.updateEntry(result).subscribe();
        } else {
          this.coordinatorService.addEntry(result).subscribe();
        }
      }
    });
  }

  editMetric(entry: OspCoordinatorItem): void {
    this.openAddEditModal(entry);
  }

  openDeleteConfirmationDialog(entry: OspCoordinatorItem): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coordinatorService.deleteEntry(entry.id).subscribe();
      }
    });
  }

  searchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.createdBy} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };
  
    this.dataSource.filter = filterValue;
  }

  importFromCSV(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          rows.forEach(row => {
            const entry: OspCoordinatorItem = {
              id: 0,
              segmentId: row['segmentId'] || '',
              vendor: row['vendor'] || '',
              crew: row['crew'] || '',
              materialOrder: row['materialOrder'] || '',
              date: row['date'] || '',
              workPackageCreated: row['workPackageCreated'] || '',
              amount: row['amount'] ? Number(row['amount']) : undefined,
              workPackageAmount: row['workPackageAmount'] ? Number(row['workPackageAmount']) : undefined,
              originalContinuingCost: row['originalContinuingCost'] ? Number(row['originalContinuingCost']) : undefined,
              highCostAnalysis: row['highCostAnalysis'] || '',
              ntp: row['ntp'] || '',
              asbuiltSubmitted: row['asbuiltSubmitted'] || '',
              coordinatorCloseout: row['coordinatorCloseout'] || '',
              amendmentVersion: row['amendmentVersion'] ? Number(row['amendmentVersion']) : undefined,
              amendmentAmount: row['amendmentAmount'] ? Number(row['amendmentAmount']) : undefined,
              continuingAmount: row['continuingAmount'] ? Number(row['continuingAmount']) : undefined,
              amendmentReason: row['amendmentReason'] || '',
              adminAudit: row['adminAudit'] ? Number(row['adminAudit']) : undefined,
              adminAuditDate: row['adminAuditDate'] || '',
              pass: row['pass'] ? row['pass'].toString().toLowerCase() === 'true' : true,
              passFailReason: row['passFailReason'] || ''
            };
            this.coordinatorService.addEntry(entry).subscribe();
          });
        }
      });
    }
  }
}
