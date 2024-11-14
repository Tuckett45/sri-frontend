import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { debounceTime, distinctUntilChanged, fromEvent, Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss']
})
export class PreliminaryPunchListComponent implements OnInit {
  preliminaryPunchList$: Observable<PreliminaryPunchList[]>;

  displayedColumns: string[] = [
    'segmentId', 'vendorName','streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'dateResolved', 'cmResolved', 'actions'
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource<PreliminaryPunchList>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private changeDetectorRef: ChangeDetectorRef,
    private toastr: ToastrService,
    public authService: AuthService
  ) {
    this.preliminaryPunchList$ = this.punchListService.getEntries();
  }

  ngOnInit(): void {
    this.preliminaryPunchList$.subscribe(data => {
      this.dataSource.data = data;
      this.dataSource.paginator = this.paginator;
    });
  }

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });
  
    dialogRef.afterClosed().subscribe((result: { punchList: PreliminaryPunchList}) => {
      if (result) {
        const { punchList } = result;
        
        const action$ = data
          ? this.punchListService.updateEntry(punchList) 
          : this.punchListService.addEntry(punchList);   
  
        action$.subscribe({
          next: () => {
            this.refreshTable();
            this.toastr.success('Punch List updated');
          },
          error: (err) => {
            this.toastr.error('Error saving Punch List.');
            console.error(err);
          }
        });
      }
    });
  }

  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }

  openDeleteConfirmationDialog(report: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeReport(report);
      }
    });
  }

  removeReport(report: PreliminaryPunchList): void {
    this.punchListService.removeEntry(report.id).subscribe(
      () => {
        this.refreshTable();
        this.toastr.success('Punch List entry deleted');
      },
      (error) => {
        this.toastr.error(error.error, 'Error');
      }
    );
  }

  refreshTable(): void {
    this.punchListService.getEntries().subscribe((entries: PreliminaryPunchList[]) => {
      this.dataSource.data = entries; 
      this.changeDetectorRef.detectChanges(); 
    });
  }

  getImageUrl(fileOrUrl: string | File): string {
    if (typeof fileOrUrl === 'string') {
      return fileOrUrl;
    } else if (fileOrUrl instanceof File) {
      return URL.createObjectURL(fileOrUrl);
    } else {
      return '';
    }
  }
  
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };
  
    this.dataSource.filter = filterValue;
  }
}