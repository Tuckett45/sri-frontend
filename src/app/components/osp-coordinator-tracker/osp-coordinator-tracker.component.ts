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
import { v4 as uuidv4 } from 'uuid';

@Component({
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
    this.coordinatorService.getEntries().subscribe(entries => {
        this.dataSource = new MatTableDataSource(entries);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      }, () => {
        this.toastr.error('Failed to load OSP entries');
      }
    );
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
      const dataStr = `${data.segmentId} ${data.vendor} ${data.crew} ${data.ospType} ${data.materialOrder} ${data.date} ${data.workPackageCreated} ${data.amount} ${data.workPackageAmount} ${data.crew} ${data.materialOrder} ${data.workPackageContingency} ${data.highCostAnalysis} ${data.ntp} ${data.asbuiltSubmitted} ${data.coordinatorCloseout} ${data.amendmentVersion} ${data.newWPLaborAmount} ${data.contingencyAmount} ${data.amendmentReason} ${data.adminAudit} ${data.adminAuditDate} ${data.pass ? 'Pass' : 'Fall'} ${data.passFailReason}`.toLowerCase();
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
            'Segment ID',
            'Vendor',
            'Crew',
            'OSP Type',
            'Material Order',
            'Work Package Created',
            'Amount',
            'WP Amount',
            'WP Contingency',
            'High Cost Analysis',
            'NTP',
            'Asbuilt Submitted',
            'Coordinator Closeout',
            'Amendment Version',
            'WP Labor Amount',
            'Contingency Amount',
            'Amendment Reason',
            'Admin Audit',
            'Audit Date',
            'Pass/Fail',
            'Pass/Fail Reason'
          ];

          const missingHeaders = expectedHeaders.filter(h => !parsedHeaders.includes(h));
          if (missingHeaders.length) {
            this.toastr.error(`Missing headers: ${missingHeaders.join(', ')}`);
            return;
          }

          const parseDateToISOString = (value: any): string | undefined => {
            if (!value) return undefined;
          
            const date = new Date(value);
            return isNaN(date.getTime()) ? undefined : date.toISOString();
          };

          const parseNumber = (val: any): number | undefined => {
            if (!val) return undefined;
            const cleaned = val.toString().replace(/[^0-9.-]+/g, '');
            const num = Number(cleaned);
            return isNaN(num) ? undefined : num;
          };

          rows.forEach(row => {
            const entry: OspCoordinatorItem = {
              id: uuidv4(),
              segmentId: row['Segment ID'] || '',
              vendor: row['Vendor'] || '',
              crew: row['Crew'] || '',
              ospType: row['OSP Type'] || '',
              materialOrder: parseDateToISOString(row['Material Order']),
              date: new Date().toISOString(),
              workPackageCreated: parseDateToISOString(row['Work Package Created']),
              amount: parseNumber(row['Amount']),
              workPackageAmount: parseNumber(row['WP Amount']),
              workPackageContingency: parseNumber(row['WP Contingency']),
              highCostAnalysis: parseDateToISOString(row['High Cost Analysis']),
              ntp: parseDateToISOString(row['NTP']),
              asbuiltSubmitted: parseDateToISOString(row['Asbuilt Submitted']),
              coordinatorCloseout: parseDateToISOString(row['Coordinator Closeout']),
              amendmentVersion: parseNumber(row['Amendment Version']),
              newWPLaborAmount: parseNumber(row['WP Labor Amount']),
              contingencyAmount: parseNumber(row['Contingency Amount']),
              amendmentReason: row['Amendment Reason'] || '',
              adminAudit: parseNumber(row['Admin Audit']),
              adminAuditDate: parseDateToISOString(row['Audit Date']),
              pass: (() => {
                const value = row['Pass/Fail']?.toString().toLowerCase();
                if (value === 'pass' || value === 'Pass') return true;
                if (value === 'fail' || value === 'Fail') return false;
                return undefined;
              })(),
              passFailReason: row['Pass/Fail Reason'] || ''
            };
          
            this.coordinatorService.addEntry(entry).subscribe({
              next: () => this.toastr.success('OSP Entry added'),
              error: () => this.toastr.error('Error adding OSP Entry')
            });
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

