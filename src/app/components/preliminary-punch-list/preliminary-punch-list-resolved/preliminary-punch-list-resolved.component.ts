import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { DatePipe } from '@angular/common';
import { PreliminaryPunchListUnresolvedComponent } from '../preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';

@Component({
  selector: 'preliminary-punch-list-resolved',
  templateUrl: './preliminary-punch-list-resolved.component.html',
  styleUrls: ['./preliminary-punch-list-resolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListResolvedComponent implements OnInit, AfterViewInit {
  public resolvedPreliminaryPunchList$: BehaviorSubject<PreliminaryPunchList[]> = new BehaviorSubject<PreliminaryPunchList[]>([]);
  resolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;
  user!: User;
  filteredData: PreliminaryPunchList[] = [];

  // Use client-side paging only when chip filters are active (must be public for template binding)
  useClientPaging(): boolean {
    // Only use client-side paging when filters are active AND no search term is present
    return (!!this.selectedFilters?.length) && !this.searchTerm;
  }

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
  total = 0;
  pageSize = 25;
  pageIndex = 0; // 0-based for MatPaginator / frontend
  searchTerm: string = '';
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
    private cdRef: ChangeDetectorRef
  ) {}

  private normalizeDate(value: any): Date | null {
    if (value == null) return null;
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.punchListService.refresh$.subscribe(() => {
      // `loadResolvedPunchLists` handles converting to the API's 1-based pages
      this.loadResolvedPunchLists(this.user, this.pageIndex, this.pageSize);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      this.loadResolvedPunchLists(this.user, this.pageIndex, this.pageSize);
      this.isInitialized = true;
    }
    // Server-side paging: do not attach local paginator to MatTableDataSource
    // this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilters']) {
      this.applyFilters();
    }
  }
  
  // Keep `pageNumber` 0-based for paginator and API
  loadResolvedPunchLists(user: User, pageNumber: number = 0, pageSize: number = 25): void {
    const apiPage = pageNumber; // API expects 0-based pageNumber
    const source$ = this.searchTerm
      ? this.punchListService.searchResolvedPunchLists(this.user, this.searchTerm, apiPage, pageSize)
      : this.punchListService.getResolvedPunchLists(user, apiPage, pageSize);

    source$.subscribe({
      next: (response: any) => {
        // API returns 0-based page index in `page`
        const respPage = Number(response?.page ?? apiPage);
        const respSize = Number(response?.pageSize ?? pageSize);

        if (!isNaN(respPage)) this.pageIndex = Math.max(0, respPage);
        if (!isNaN(respSize)) this.pageSize = respSize;

        this.total = Number(
          response?.total ?? response?.totalCount ?? response?.count ?? response?.Total ?? response?.TotalCount ??
          (Array.isArray(response) ? response.length : 0)
        );
        this.resolvedCountChange.emit(this.total);

        // Support both shapes: envelope {items,...} or raw array
        const items: PreliminaryPunchList[] = Array.isArray(response) ? response : (response?.items ?? []);

        const results = items.map(p => ({
          ...p,
          issues: (p.issues || []).map(issue => ({ ...issue }))
        }));

        // Normalize dates; avoid forcing timezone suffixes
        for (const pl of results) {
          const dr = this.normalizeDate(pl.dateReported as any);
          if (dr) pl.dateReported = dr;
          const rd = this.normalizeDate(pl.resolvedDate as any);
          if (rd) pl.resolvedDate = rd;
          // Optional display fields
          (pl as any).dateReportedDisplay =
            pl.dateReported ? this.datePipe.transform(pl.dateReported as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '' : '';
          (pl as any).resolvedDateDisplay =
            pl.resolvedDate
              ? this.datePipe.transform(pl.resolvedDate as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? ''
              : '';
        }

        // Trust server results order/uniqueness; do not deduplicate client-side
        this.resolvedPreliminaryPunchLists = results;
        this.resolvedPreliminaryPunchList$.next(this.resolvedPreliminaryPunchLists);
        // During search, trust server scoping entirely; otherwise apply client role/market scoping
        this.dataSource.data = this.searchTerm
          ? this.resolvedPreliminaryPunchLists
          : this.filterData(this.resolvedPreliminaryPunchLists);

        // Apply any chip-selected filters to the freshly loaded data
        if (this.selectedFilters?.length) {
          this.applyFilters(false);
        }

        this.updateResolvedCount();
      },
      error: () => {
        this.toastr.error('Error fetching resolved punch lists');
      }
    });
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
          error: () => {
            this.toastr.error('Error saving Punch List.');
          }
        });
      }
    });
    
  }

  refreshPunchLists(): void {
    this.loadResolvedPunchLists(this.user, this.pageIndex, this.pageSize);
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
    const val = (event.target as HTMLInputElement).value.trim();
    this.searchTerm = val;
    this.pageIndex = 0;
    this.loadResolvedPunchLists(this.user, 0, this.pageSize);
  }

  applyFilters(resetPage: boolean = true): void {
    if (this.searchTerm) {
      // Filter the current search results with selected chip filters
      let updatedData = this.filterData(this.resolvedPreliminaryPunchLists);

      this.selectedFilters.forEach(filter => {
        if (filter.column == 'dateReported') {
          const startDateObj = new Date(filter.values[0]);
          const endDateObj = new Date(filter.values[1]);
          updatedData = updatedData.filter(punchList => {
            const punchListDate = new Date(punchList.dateReported as any);
            return punchListDate >= startDateObj && punchListDate <= endDateObj;
          });
        } else if (filter.column == 'resolvedDate') {
          const startDateObj = new Date(filter.values[0]);
          const endDateObj = new Date(filter.values[1]);
          updatedData = updatedData.filter(punchList => {
            if (punchList.resolvedDate != null) {
              const punchListDate = new Date(punchList.resolvedDate as any);
              return punchListDate >= startDateObj && punchListDate <= endDateObj;
            } else {
              return false;
            }
          });
        } else if (filter.column && filter.values) {
          if (Array.isArray(filter.values)) {
            updatedData = updatedData.filter(punchList =>
              filter.values.some(val =>
                (punchList[filter.column as keyof PreliminaryPunchList] ?? '')
                  .toString()
                  .toLowerCase()
                  .includes(val.toLowerCase())
              )
            );
          } else {
            updatedData = updatedData.filter(punchList =>
              (punchList[filter.column as keyof PreliminaryPunchList] ?? '')
                .toString()
                .toLowerCase()
                .includes((filter.values as any))
            );
          }
        }
      });

      this.filteredData = updatedData;
      if (resetPage) {
        this.pageIndex = 0;
        try { this.paginator?.firstPage?.(); } catch {}
      }
      this.updatePagedView();
      this.updateResolvedCount();
      return;
    }

    // Fetch entire set (resolved) then apply filters over all rows (client-side)
    const desiredSize = this.total && this.total > 0
      ? this.total
      : Math.max(this.pageSize, this.dataSource?.data?.length || 25);

    const source$ = this.punchListService.getResolvedPunchLists(this.user, 1, desiredSize);

    source$.subscribe({
      next: (response: any) => {
        const items: PreliminaryPunchList[] = Array.isArray(response) ? response : (response?.items ?? []);
        const results = items.map(p => ({ ...p, issues: (p.issues || []).map(issue => ({ ...issue })) }));

        // Normalize dates
        for (const pl of results) {
          const dr = this.normalizeDate(pl.dateReported as any);
          if (dr) pl.dateReported = dr;
          const rd = this.normalizeDate(pl.resolvedDate as any);
          if (rd) pl.resolvedDate = rd;
        }

        // Deduplicate by id
        const dedupedResults = results.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

        // Scope by user vendor/market
        let updatedData = this.filterData(dedupedResults);

        // Apply selected chip filters over full dataset
        this.selectedFilters.forEach(filter => {
          if (filter.column == 'dateReported') {
            const startDateObj = new Date(filter.values[0]);
            const endDateObj = new Date(filter.values[1]);
            updatedData = updatedData.filter(punchList => {
              const punchListDate = new Date(punchList.dateReported as any);
              return punchListDate >= startDateObj && punchListDate <= endDateObj;
            });
          } else if (filter.column == 'resolvedDate') {
            const startDateObj = new Date(filter.values[0]);
            const endDateObj = new Date(filter.values[1]);
            updatedData = updatedData.filter(punchList => {
              if (punchList.resolvedDate != null) {
                const punchListDate = new Date(punchList.resolvedDate as any);
                return punchListDate >= startDateObj && punchListDate <= endDateObj;
              } else {
                return false;
              }
            });
          } else if (filter.column && filter.values) {
            if (Array.isArray(filter.values)) {
              updatedData = updatedData.filter(punchList =>
                filter.values.some(val =>
                  (punchList[filter.column as keyof PreliminaryPunchList] ?? '')
                    .toString()
                    .toLowerCase()
                    .includes(val.toLowerCase())
                )
              );
            } else {
              updatedData = updatedData.filter(punchList =>
                (punchList[filter.column as keyof PreliminaryPunchList] ?? '')
                  .toString()
                  .toLowerCase()
                  .includes((filter.values as any))
              );
            }
          }
        });

        this.filteredData = updatedData;
        if (resetPage) {
          this.pageIndex = 0;
          try { this.paginator?.firstPage?.(); } catch {}
        }
        this.updatePagedView();
        this.updateResolvedCount();
      },
      error: () => this.toastr.error('Error applying filters')
    });
  }
  
  clearAll() {
    this.selectedFilters = [];
    const unresolvedEntries = this.resolvedPreliminaryPunchList$; 
    unresolvedEntries?.subscribe(entries => {
      let updatedData = this.filterData(entries);
  
      this.dataSource.data = updatedData;
      this.pageIndex = 0;
      try { this.paginator?.firstPage?.(); } catch {}
      this.updateResolvedCount();
    });
  }

  onPage(event: any): void {
    this.pageIndex = event.pageIndex; // 0-based
    this.pageSize = event.pageSize;
    if (this.useClientPaging()) {
      this.updatePagedView();
    } else {
      this.loadResolvedPunchLists(this.user, this.pageIndex, this.pageSize);
    }
  }

  updateResolvedCount(): void {   
    // Emit server total during search; emit filtered total when client filters are active
    const count = this.searchTerm
      ? this.total
      : (this.selectedFilters?.length ? (this.filteredData?.length ?? 0) : this.total);
    this.resolvedCountChange.emit(count); 
  }

  private updatePagedView = (): void => {
    if (!this.useClientPaging()) return;
    const data = Array.isArray(this.filteredData) ? this.filteredData : [];
    const size = Number(this.pageSize) || 25;
    const index = Number(this.pageIndex) || 0;
    const start = Math.max(0, index * size);
    const end = start + size;
    this.dataSource.data = data.slice(start, Math.min(end, data.length));
  }
}
