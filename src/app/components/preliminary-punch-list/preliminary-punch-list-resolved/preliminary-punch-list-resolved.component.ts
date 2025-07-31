import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable, of } from 'rxjs';
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
import { PreliminaryPunchListUnresolvedComponent } from '../preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';
import { PunchListStateService } from 'src/app/services/punch-list-state.service';

@Component({
  selector: 'preliminary-punch-list-resolved',
  templateUrl: './preliminary-punch-list-resolved.component.html',
  styleUrls: ['./preliminary-punch-list-resolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListResolvedComponent implements OnInit, AfterViewInit {
  isLoading = false;
  pageSize = 10;
  pageIndex = 0;
  public resolvedPreliminaryPunchList$ = this.state.resolved$;
  resolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
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

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @Input('PreliminaryPunchListUnresolvedComponent') unresolvedPunchListComponent!: PreliminaryPunchListUnresolvedComponent;
  @Input() selectedFilters: { column: string, values: string[] }[] = [];
  @Output() resolvedCountChange = new EventEmitter<number>();

  galleryImages: any[] = [];
  private isInitialized = false;
  
  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe,
    private cdRef: ChangeDetectorRef,
    private state: PunchListStateService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();

    this.punchListService.refresh$.subscribe(() => {
      this.loadResolvedPunchLists(this.user);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      if (this.state.resolved$.value.length) {
        this.pageIndex = this.state.resolvedPage;
        this.pageSize = this.state.pageSize;
        this.paginator.pageIndex = this.pageIndex;
        this.dataSource.data = this.filterData(this.state.resolved$.value);
        this.resolvedPreliminaryPunchLists = this.state.resolved$.value;
        this.isLoading = false;
      } else {
        this.loadResolvedPunchLists(this.user);
      }
      this.isInitialized = true;
    }
    this.paginator.page.subscribe(event => {
      this.pageIndex = event.pageIndex;
      this.pageSize = event.pageSize;
      this.loadResolvedPunchLists(this.user);
    });

    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilters']) {
      this.applyFilters();
    }
  }
  

  loadResolvedPunchLists(user: User): void {
    this.isLoading = true;
    this.punchListService.getResolvedPunchLists(user, this.pageIndex, this.pageSize).subscribe(
      (response) => {
        const results = response.map((p: { issues: any[]; }) => ({
          ...p,
          issues: p.issues.map((issue: any) => ({ ...issue }))
        }));
  
        for (const punchList of results) {
          const reportedDate = new Date(punchList.dateReported + 'Z');
          punchList.dateReported = this.datePipe.transform(reportedDate, 'MM/dd/yy hh:mm a', 'America/Denver') || '';
          if (punchList.resolvedDate) {
            const resolvedDate = new Date(punchList.resolvedDate + 'Z');
            punchList.resolvedDate = this.datePipe.transform(resolvedDate, 'MM/dd/yy hh:mm a', 'America/Denver') || '';
          }
        }
  
        // ✅ Deduplicate by ID
        const dedupedResults = results.filter((item: { id: any; }, index: any, self: any[]) =>
          index === self.findIndex((t: { id: any; }) => t.id === item.id)
        );
  
        // ✅ Clear previous data
        this.state.setResolved([]);
        this.resolvedPreliminaryPunchLists = [];
        this.dataSource.data = [];

        // ✅ Set deduped data
        this.state.setResolved(dedupedResults, this.pageIndex, this.pageSize);
        this.dataSource.data = this.filterData(dedupedResults);
        this.resolvedPreliminaryPunchLists = dedupedResults;
  
        if (this.selectedFilters) {
          this.applyFilters();
        }
  
        this.updateResolvedCount();
        this.isLoading = false;
      },
      (error) => {
        this.toastr.error('Error fetching resolved punch lists', error);
        this.isLoading = false;
      }
    );
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

  updateResolvedCount(): void {
    if(this.dataSource.filter != ''){
      const resolvedCount = this.dataSource.filteredData.length; 
      this.resolvedCountChange.emit(resolvedCount);
    }else{
      const resolvedCount = this.dataSource.data.length; 
      this.resolvedCountChange.emit(resolvedCount);
    }
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
    this.loadResolvedPunchLists(this.user);
    this.punchListService.getUnresolvedPunchLists(this.user, 0, this.pageSize).subscribe();
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
    const filteredEntries = this.resolvedPreliminaryPunchList$; 
    filteredEntries?.subscribe(entries => {
      let updatedData = this.filterData(entries);  
  
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

  searchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.createdBy} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };
  
    this.dataSource.filter = filterValue;
    this.updateResolvedCount();
  }
  
  applyFilters(): void {
    const filteredEntries = this.resolvedPreliminaryPunchList$;
  
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
        }else {
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
      this.updateResolvedCount();
    });
  }
  

  clearAll() {
    this.selectedFilters = [];
    const unresolvedEntries = this.resolvedPreliminaryPunchList$; 
    unresolvedEntries?.subscribe(entries => {
      let updatedData = this.filterData(entries);
  
      this.dataSource.data = updatedData;
      this.updateResolvedCount();
    });
  }
}
