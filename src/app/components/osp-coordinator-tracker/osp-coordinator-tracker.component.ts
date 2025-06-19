import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { OspCoordinatorService } from 'src/app/services/osp-coordinator.service';
import { OspCoordinatorItem } from 'src/app/models/osp-coordinator-item.model';
import * as Papa from 'papaparse';
import { OspCoordinatorModalComponent } from '../modals/osp-coordinator-modal/osp-coordinator-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { ParseResult } from 'papaparse';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-osp-coordinator-tracker',
  templateUrl: './osp-coordinator-tracker.component.html',
  styleUrls: ['./osp-coordinator-tracker.component.scss']
})
export class OspCoordinatorTrackerComponent implements OnInit {
  statCards: any[] = [];
  user!: User;
  displayedColumns: string[] = ['segmentId','vendor','crew', 'ospType', 'materialOrder','workPackageCreated','amount','workPackageAmount','workPackageContingency','highCostAnalysis','ntp','asbuiltSubmitted','coordinatorCloseout','amendmentVersion','newWPLaborAmount','contingencyAmount','amendmentReason','adminAudit','adminAuditDate','pass','passFailReason','actions'];
  dataSource = new MatTableDataSource<OspCoordinatorItem>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public authService: AuthService,
    private toastr: ToastrService,
    private coordinatorService: OspCoordinatorService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.coordinatorService.getStats().subscribe(stats => 
      this.statCards = stats
    );
    this.loadEntries();
  }

  loadEntries(): void {
    this.coordinatorService.getEntries().subscribe({
      next: entries => {
        this.dataSource = new MatTableDataSource(entries);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: err => {
        this.toastr.error('Failed to load OSP entries');
        console.error(err);
      }
    });
  }

  openAddEditModal(entry?: OspCoordinatorItem): void {
    const dialogRef = this.dialog.open(OspCoordinatorModalComponent, {
      width: '400px',
      data: entry || null
    });

    dialogRef.afterClosed().subscribe((result: OspCoordinatorItem) => {
      if (result) {
        if (entry) {
          this.coordinatorService.updateEntry(result).subscribe(() => {
            this.toastr.success('OSP Entry updated');
            this.loadEntries();
          });
        } else {
          this.coordinatorService.addEntry(result).subscribe(() => {
            this.toastr.success('OSP Entry added');
            this.loadEntries()
          });
        }
      }
    },
    (error) => {
      this.toastr.error('Error saving OSP Entry');
    });
  }

  editMetric(entry: OspCoordinatorItem): void {
    this.openAddEditModal(entry);
  }

  openDeleteConfirmationDialog(entry: OspCoordinatorItem): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coordinatorService.deleteEntry(entry.id).subscribe(() => {
          this.toastr.success('OSP Entry deleted');
          this.loadEntries()
      },
      (error) => {
        this.toastr.error('Error deleting OSP Entry');
      });
      }
    });
  }

  searchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendor} ${data.crew} ${data.ospType} ${data.materialOrder} ${data.date} ${data.workPackageCreated} ${data.amount} ${data.workPackageAmount} ${data.crew} ${data.materialOrder} ${data.workPackageContingency} ${data.highCostAnalysis} ${data.ntp} ${data.asbuiltSubmitted} ${data.coordinatorCloseout} ${data.amendmentVersion} ${data.newWPLaborAmount} ${data.contingencyAmount} ${data.amendmentReason} ${data.adminAudit} ${data.adminAuditDate} ${data.pass ? 'Pass' : 'Fall'} ${(data.passFailReason || []).join(' ')}`.toLowerCase();
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
        complete: (results: ParseResult<any>) => {
          const rows = results.data as any[];
          const parsedHeaders = results.meta.fields ?? [];
          const expectedHeaders = [
            'id',
            'segmentId',
            'vendor',
            'crew',
            'ospType',
            'materialOrder',
            'workPackageCreated',
            'amount',
            'workPackageAmount',
            'workPackageContingency',
            'highCostAnalysis',
            'ntp',
            'asbuiltSubmitted',
            'coordinatorCloseout',
            'amendmentVersion',
            'newWPLaborAmount',
            'contingencyAmount',
            'amendmentReason',
            'adminAudit',
            'adminAuditDate',
            'pass',
            'passFailReason'
          ];

          const missingHeaders = expectedHeaders.filter(h => !parsedHeaders.includes(h));
          if (missingHeaders.length) {
            this.toastr.error(`Missing headers: ${missingHeaders.join(', ')}`);
            return;
          }

          rows.forEach(row => {
            const entry: OspCoordinatorItem = {
              id: row['id'] || '',
              segmentId: row['segmentId'] || '',
              vendor: row['vendor'] || '',
              crew: row['crew'] || '',
              ospType: row['ospType'] || '',
              materialOrder: row['materialOrder'] || '',
              workPackageCreated: row['workPackageCreated'] || '',
              amount: row['amount'] ? Number(row['amount']) : undefined,
              workPackageAmount: row['workPackageAmount'] ? Number(row['workPackageAmount']) : undefined,
              workPackageContingency: row['workPackageContingency'] ? Number(row['workPackageContingency']) : undefined,
              highCostAnalysis: row['highCostAnalysis'] || '',
              ntp: row['ntp'] || '',
              asbuiltSubmitted: row['asbuiltSubmitted'] || '',
              coordinatorCloseout: row['coordinatorCloseout'] || '',
              amendmentVersion: row['amendmentVersion'] ? Number(row['amendmentVersion']) : undefined,
              newWPLaborAmount: row['newWPLaborAmount'] ? Number(row['newWPLaborAmount']) : undefined,
              contingencyAmount: row['contingencyAmount'] ? Number(row['contingencyAmount']) : undefined,
              amendmentReason: row['amendmentReason'] || '',
              adminAudit: row['adminAudit'] ? Number(row['adminAudit']) : undefined,
              adminAuditDate: row['adminAuditDate'] || '',
              pass: row['pass'] ? row['pass'].toString().toLowerCase() === 'true' : true,
              passFailReason: row['passFailReason'] ? row['passFailReason'].split(';').map((s: string) => s.trim()).filter((s: string) => s) : []
            };
            this.coordinatorService.addEntry(entry).subscribe();
          });
          this.loadEntries();
        }
      });
    }
  }

  getSeverity(pass: boolean): 'success' | 'danger' {
    return pass ? 'success' : 'danger';
  }
}
