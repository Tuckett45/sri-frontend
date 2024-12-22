import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss']
})
export class PreliminaryPunchListComponent implements OnInit {
  preliminaryPunchList$: Observable<PreliminaryPunchList[]>;
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;
  user!: User;

  displayedColumns: string[] = [
    'segmentId', 'vendorName','streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'createdBy', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'resolvedDate', 'cmResolved', 'actions'
  ];

  responsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 3
    },
    {
      breakpoint: '768px',
      numVisible: 2


    },
    {
      breakpoint: '560px',
      numVisible: 1
    }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource<PreliminaryPunchList>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  galleryImages: any[] = [];
  
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
    debugger;
    this.filterPunchLists(this.preliminaryPunchList$);
  }

  filterPunchLists(punchlists: Observable<PreliminaryPunchList[]>){
    this.user = this.authService.getUser();
    punchlists.subscribe(data => {
      let filteredData = data;
  
      if (this.user.role === 'PM') {
        filteredData = filteredData.filter(punchList => 
          punchList.vendorName === this.user.company && punchList.state === this.user.market);
      } else if (this.user.market !== 'RG') {
        filteredData = filteredData.filter(punchList => punchList.state === this.user.market);
      }else{
        filteredData = data
      }
  
      this.dataSource.data = filteredData;
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    });
  }

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });
  
    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (result) {
        var punchListAdd = result;
        
        const action$ = data
          ? this.punchListService.updateEntry(punchListAdd) 
          : this.punchListService.addEntry(punchListAdd);   
  
        action$.subscribe({
          next: () => {
            this.refreshTable();
            this.toastr.success('Punch List saved');
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
    const index = this.dataSource.data.findIndex(item => item.id === report.id);
    if (index !== -1) {
        this.dataSource.data.splice(index, 1);
        this.dataSource.data = [...this.dataSource.data];
        this.punchListService.removeEntry(report.id).subscribe(
          () => {
              this.toastr.success('Punch List entry deleted');
          },
          (error) => {
            this.toastr.error(error.error, 'Error');
          }
        );
    }
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

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({
      itemImageSrc: img
    }));
  
    if(imageType == 'issueImages'){
      this.isIssueGalleryVisible = true;
    }else{
      this.isResolutionGalleryVisible = true;
    }
  }
  

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }
  
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.createdBy} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };
  
    this.dataSource.filter = filterValue;
  }
}
