import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable, of } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss'],
  standalone: false
})
export class PreliminaryPunchListComponent implements OnInit, AfterViewInit {
  preliminaryPunchList$!: Observable<PreliminaryPunchList[]>;
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;
  user!: User;

  selectedFilters: string[] = [];
  selectedFilter!: string;

  filterOptions = [
    { name: 'Filter 1', value: 'filter1' },
    { name: 'Filter 2', value: 'filter2' },
    { name: 'Filter 3', value: 'filter3' },
  ];

  displayedColumns: string[] = [
    'segmentId', 'vendorName','streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'createdBy', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'resolvedDate', 'cmResolved', 'actions'
  ];

  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 3 },
    { breakpoint: '768px', numVisible: 2 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  galleryImages: any[] = [];
  
  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadUnresolvedPunchLists('UT');
    // this.loadPunchLists();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUnresolvedPunchLists(state: string): void {
    this.punchListService.getUnresolvedPunchLists(state).subscribe(
      (response) => {
        this.preliminaryPunchList$ = response;  // Store the response
        console.log(this.preliminaryPunchList$); // Log the response for debugging
      },
      (error) => {
        console.error('Error fetching unresolved punch lists', error);  // Handle error
      }
    );
  }

  loadPunchLists(): void {
    this.preliminaryPunchList$ = this.punchListService.getEntries(); 
    this.preliminaryPunchList$.subscribe(data => {
      this.dataSource.data = this.filterData(data);
    });
  }
  
  filterData(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    let filteredData = data;

    if (this.user.role === 'PM') {
      filteredData = filteredData.filter(punchList =>
        punchList.vendorName === this.user.company && punchList.state.toUpperCase() === this.user.market);
    } else if (this.user.market && this.user.market !== 'RG') {
      filteredData = filteredData.filter(punchList => punchList.state === this.user.market);
    }

    return filteredData;
  }

  addFilter() {
    if (this.selectedFilter && !this.selectedFilters.includes(this.selectedFilter)) {
      this.selectedFilters.push(this.selectedFilter);
      this.selectedFilter = '';
    }
  }

  removeChip(filter: string) {
    this.selectedFilters = this.selectedFilters.filter(f => f !== filter);
  }

  clearAll() {
    this.selectedFilters = [];
  }
  

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });
  
    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (result) {
        let punchList = result;
        let action$: Observable<any>;
        
        if (punchList.updatedBy) {
          action$ = this.punchListService.updateEntry(punchList);
        } else {
          action$ = this.punchListService.addEntry(punchList);
        }
    
        action$.subscribe({
          next: () => {
            this.loadPunchLists(); 
            this.toastr.success('Punch List saved');
          },
          error: (err) => {
            this.toastr.error('Error saving Punch List.');
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
    const filteredEntries = this.preliminaryPunchList$; 
    filteredEntries?.subscribe(entries => {
      let updatedData = entries;
  
      if (this.user.role === 'PM') {
        updatedData = updatedData.filter(punchList =>
          punchList.vendorName === this.user.company && punchList.state === this.user.market
        );
      } else if (this.user.market !== 'RG') {
        updatedData = updatedData.filter(punchList => punchList.state === this.user.market);
      }
  
      this.dataSource.data = updatedData;
    });
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
