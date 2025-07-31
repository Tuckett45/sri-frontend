import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { MatIcon } from '@angular/material/icon';
import { GalleriaModule } from 'primeng/galleria';
import { DropdownChangeEvent } from 'primeng/dropdown';
import { DatePipe } from '@angular/common';
import { PreliminaryPunchListResolvedComponent } from '../preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';
import { PunchListStateService } from 'src/app/services/punch-list-state.service';

@Component({
  selector: 'preliminary-punch-list-unresolved',
  templateUrl: './preliminary-punch-list-unresolved.component.html',
  styleUrls: ['./preliminary-punch-list-unresolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListUnresolvedComponent implements OnInit, AfterViewInit {
  isLoading = false;
  pageIndex = 0;
  public unresolvedPreliminaryPunchList$ = this.punchListStateService.unresolved$;
  unresolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;
  user!: User;
  filteredData: PreliminaryPunchList[] = [];

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

  totalCount = 0;
  pageSize = 25;

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @Input('PreliminaryPunchListResolvedComponent') resolvedPunchListComponent!: PreliminaryPunchListResolvedComponent;
  @Input() selectedFilters: { column: string, values: string[] }[] = [];
  @Output() unresolvedCountChange = new EventEmitter<number>();

  galleryImages: any[] = [];
  private isInitialized = false;
  
  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private punchListStateService: PunchListStateService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.punchListService.refresh$.subscribe(() => {
      this.loadUnresolvedPunchLists(this.user);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilter']) {
      this.applyFilters();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      if (this.punchListStateService.unresolved$.value.length) {
        this.pageIndex = this.punchListStateService.unresolvedPage;
        this.pageSize = this.punchListStateService.pageSize;
        this.paginator.pageIndex = this.pageIndex;
        this.dataSource.data = this.filterData(this.punchListStateService.unresolved$.value);
        this.unresolvedPreliminaryPunchLists = this.punchListStateService.unresolved$.value;
        this.isLoading = false;
      } else {
        this.loadUnresolvedPunchLists(this.user);
      }
      this.isInitialized = true;
    }

    this.paginator.page.subscribe(event => {
      this.pageIndex = event.pageIndex;
      this.pageSize = event.pageSize;
      this.loadUnresolvedPunchLists(this.user);
    });

    this.dataSource.sort = this.sort;
  }

  loadUnresolvedPunchLists(user: User): void {
    this.isLoading = true;
    this.punchListService.getUnresolvedPunchLists(user, this.pageIndex, this.pageSize).subscribe(
      (response) => {
        this.totalCount = response.totalCount ?? response.length ?? 0;
        const entries = response.items ?? response;
        const results = entries.map((p: { issues: any[]; }) => ({
          ...p,
          issues: p.issues.map((issue: any) => ({ ...issue }))
        }));
  
        // Format dates
        for (const punchList of results) {
          const reportedDate = new Date(punchList.dateReported + 'Z');
          punchList.dateReported = this.datePipe.transform(reportedDate, 'MM/dd/yy hh:mm a', 'America/Denver') || '';
          if (punchList.resolvedDate) {
            const resolvedDate = new Date(punchList.resolvedDate + 'Z');
            punchList.resolvedDate = this.datePipe.transform(resolvedDate, 'MM/dd/yy hh:mm a', 'America/Denver') || '';
          }
        }
  
        // ✅ Deduplicate by ID here
        const dedupedResults = results.filter((item: { id: any; }, index: any, self: any[]) =>
          index === self.findIndex((t: { id: any; }) => t.id === item.id)
        );
  
        // ✅ Clear previous data
        this.punchListStateService.setUnresolved([]);
        this.unresolvedPreliminaryPunchLists = [];
        this.dataSource.data = [];

        // ✅ Set new data
        this.punchListStateService.setUnresolved(dedupedResults, this.pageIndex, this.pageSize);
        this.dataSource.data = this.filterData(dedupedResults);
        this.unresolvedPreliminaryPunchLists = dedupedResults;
  
        if (this.selectedFilters) {
          this.applyFilters();
        }
  
        this.updateUnresolvedCount();
        this.isLoading = false;
      },
      (error) => {
        this.toastr.error('Error fetching unresolved punch lists', error);
        this.isLoading = false;
      }
    );
  }
  

  updateUnresolvedCount(): void {
    if(this.dataSource.filter != ''){
      const unresolvedCount = this.dataSource.filteredData.length; 
      this.unresolvedCountChange.emit(unresolvedCount);
    }else{
      const unresolvedCount = this.dataSource.data.length; 
      this.unresolvedCountChange.emit(unresolvedCount);
    }
  }
  
  filterData(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    const userVendor = this.user.company?.trim().toLowerCase();
    const userMarket = this.user.market?.trim().toLowerCase();
  
    return data.filter(punchList => {
      const listVendor = punchList.vendorName?.trim().toLowerCase();
      const listMarket = punchList.state?.trim().toLowerCase();
  
      if (this.user.role === 'PM') {
        const matches = listVendor === userVendor && listMarket === userMarket;
        return matches;
      }
  
      if (this.user.role === 'CM' && userMarket !== 'rg') {
        const matches = listMarket === userMarket;
        return matches;
      }
  
      return true;
    });
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
            this.toastr.success('Punch List saved');
            this.punchListService.triggerRefresh();
          },
          error: (err) => {
            this.toastr.error('Error saving Punch List.');
          }
        });
      }
    });
    
  }

  refreshPunchLists(): void {
    this.loadUnresolvedPunchLists(this.user);
    this.punchListService.getResolvedPunchLists(this.user, 0, this.pageSize).subscribe();
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
              this.updateUnresolvedCount();
          },
          (error) => {
            this.toastr.error(error.error, 'Error');
          }
        );
    }
  }

  rejectResolution(punchList: PreliminaryPunchList): void {
    const updatedPunchList = {
      ...punchList,
      dateReported: punchList.dateReported instanceof Date
        ? punchList.dateReported
        : new Date(punchList.dateReported)
    };
    updatedPunchList.pmResolved = false;
    updatedPunchList.resolvedDate = null;
  
    this.punchListService.updateEntry(updatedPunchList).subscribe({
      next: () => {
        this.refreshPunchLists()
        this.toastr.success(`Resolution Rejected. Sent back to ${punchList.vendorName}`);
      },
      error: (err) => {
        console.error('Reject resolution failed:', err);
        this.toastr.error('Failed to reject resolution');
      }
    });
  }

  refreshTable(): void {    
    const filteredEntries = this.unresolvedPreliminaryPunchList$; 
    filteredEntries?.subscribe(entries => {
      let updatedData = this.filterData(entries);  

      this.dataSource.data = updatedData;
      this.updateUnresolvedCount();
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

  searchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.createdBy} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };
  
    this.dataSource.filter = filterValue;
    this.updateUnresolvedCount();
  }
  
  applyFilters(): void {
    const filteredEntries = this.unresolvedPreliminaryPunchList$;
  
    filteredEntries?.subscribe(entries => {
      let updatedData = this.filterData(entries);
  
      this.selectedFilters.forEach(filter => {
        if (filter.column == 'dateReported') {
          const startDateObj = new Date(filter.values[0]);
          const endDateObj = new Date(filter.values[1]);
          
          updatedData = updatedData.filter(punchList => {
            const punchListDate = new Date(punchList.dateReported);
            return punchListDate >= startDateObj && punchListDate <= endDateObj;
          });
        } else if (filter.column == 'resolvedDate') {
          const startDateObj = new Date(filter.values[0]);
          const endDateObj = new Date(filter.values[1]);

          updatedData = updatedData.filter(punchList => {
            if(punchList.resolvedDate != null){
              const punchListDate = new Date(punchList.resolvedDate);
              return punchListDate >= startDateObj && punchListDate <= endDateObj;
            }else{
              return;
            }
          
          });
        } else {
          if (filter.column && filter.values) {
            if (Array.isArray(filter.values)) {
              updatedData = updatedData.filter(punchList => 
                filter.values.some(val => 
                  punchList[filter.column as keyof PreliminaryPunchList]?.toString().toLowerCase().includes(val.toLowerCase())
                )
              );
            } else {
              updatedData = updatedData.filter(punchList => 
                punchList[filter.column as keyof PreliminaryPunchList]?.toString().toLowerCase().includes(filter.values)
              );
            }
          }
        }
      });
  
      this.filteredData = updatedData;
      this.dataSource.data = this.filteredData;
      this.updateUnresolvedCount();
    });
  }
  
  

  clearAll() {
  this.selectedFilters = [];
  const unresolvedEntries = this.unresolvedPreliminaryPunchList$; 
  unresolvedEntries?.subscribe(entries => {
    const updatedData = this.filterData(entries); 
    this.dataSource.data = updatedData;
    this.updateUnresolvedCount();
  });
}
}
