import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
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

@Component({
  selector: 'preliminary-punch-list-unresolved',
  templateUrl: './preliminary-punch-list-unresolved.component.html',
  styleUrls: ['./preliminary-punch-list-unresolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListUnresolvedComponent implements OnInit, AfterViewInit {
  public unresolvedPreliminaryPunchList$: BehaviorSubject<PreliminaryPunchList[]> = new BehaviorSubject<PreliminaryPunchList[]>([]);
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
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe,
    private cdRef: ChangeDetectorRef
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
      this.loadUnresolvedPunchLists(this.user);
      this.isInitialized = true;
    }
  
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUnresolvedPunchLists(user: User): void {
    this.punchListService.getUnresolvedPunchLists(user).subscribe(
      (response) => {
        const results = response.map((p: { issues: any[]; }) => ({
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
        this.unresolvedPreliminaryPunchList$.next([]);
        this.unresolvedPreliminaryPunchLists = [];
        this.dataSource.data = [];
  
        // ✅ Set new data
        this.unresolvedPreliminaryPunchList$.next(dedupedResults);
        this.dataSource.data = this.filterData(dedupedResults);
        this.unresolvedPreliminaryPunchLists = dedupedResults;
  
        if (this.selectedFilters) {
          this.applyFilters();
        }
  
        this.updateUnresolvedCount();
      },
      (error) => {
        this.toastr.error('Error fetching unresolved punch lists', error);
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
    let filteredData = data;

    if (this.user.role === 'PM') {
      filteredData = filteredData.filter(punchList =>
        punchList.vendorName === this.user.company);
    } else if (this.user.role === 'CM' && this.user.market !== 'RG') {
      filteredData = filteredData.filter(punchList => punchList.state === this.user.market);
    }

    return filteredData;
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
    this.punchListService.getResolvedPunchLists(this.user);
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
      let updatedData = entries;
  
      if (this.user.role === 'PM') {
        updatedData = updatedData.filter(punchList =>
          punchList.vendorName === this.user.company && punchList.state === this.user.market
        );
      } else if (this.user.market !== 'RG') {
        updatedData = updatedData.filter(punchList => punchList.state === this.user.market);
      }
  
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
      let updatedData = entries;
  
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
      let updatedData = entries;
  
      this.dataSource.data = updatedData;
      this.updateUnresolvedCount();
    });
  }
}
