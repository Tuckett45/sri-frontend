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
import { PreliminaryPunchListResolvedComponent } from '../preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';

@Component({
  selector: 'preliminary-punch-list-unresolved',
  templateUrl: './preliminary-punch-list-unresolved.component.html',
  styleUrls: ['./preliminary-punch-list-unresolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListUnresolvedComponent implements OnInit, AfterViewInit {
  public unresolvedPreliminaryPunchList$: BehaviorSubject<PreliminaryPunchList[]> =
    new BehaviorSubject<PreliminaryPunchList[]>([]);
  unresolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;
  filteredData: PreliminaryPunchList[] = [];

  // Only use client-side paging when filters are active AND no search term is present
  useClientPaging(): boolean {
    return (!!this.selectedFilters?.length) && !this.searchTerm;
  }

  displayedColumns: string[] = [
    'segmentId', 'vendorName', 'streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'createdBy', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'resolvedDate', 'cmResolved', 'actions'
  ];

  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 3 },
    { breakpoint: '768px', numVisible: 2 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource<PreliminaryPunchList>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  total = 0;
  pageSize = 25;
  pageIndex = 0; // 0-based
  searchTerm: string = '';

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
      this.loadUnresolvedPunchLists(this.user);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilters']) {
      this.applyFilters();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      // Pass 0-based pageIndex; loadUnresolvedPunchLists will convert to 1-based for the API
      this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
      this.isInitialized = true;
    }
    // Server-side paging: do not attach local paginator to MatTableDataSource
    // this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // Keep pageNumber 0-based internally; API expects 0-based pageNumber
  loadUnresolvedPunchLists(user: User, pageNumber: number = 0, pageSize: number = 25): void {
    const apiPage = pageNumber;
    const source$ = this.searchTerm
      ? this.punchListService.searchUnresolvedPunchLists(this.user, this.searchTerm, apiPage, pageSize)
      : this.punchListService.getUnresolvedPunchLists(user, apiPage, pageSize);

    source$.subscribe({
      next: (response: any) => {
        // API returns 0-based page index
        const respPage = Number(response?.page ?? apiPage);
        const respSize = Number(response?.pageSize ?? this.pageSize);
        if (!isNaN(respPage)) this.pageIndex = Math.max(0, respPage);
        if (!isNaN(respSize)) this.pageSize = respSize;

        this.total = Number(
          response?.total ?? response?.totalCount ?? response?.count ?? response?.Total ?? response?.TotalCount ??
          (Array.isArray(response) ? response.length : 0)
        );
        this.unresolvedCountChange.emit(this.total);

        const items: PreliminaryPunchList[] = Array.isArray(response)
          ? response
          : (response?.items ?? []);

        const results = items.map(p => ({
          ...p,
          issues: (p.issues || []).map(issue => ({ ...issue }))
        }));

        // Normalize dates
        for (const pl of results) {
          const dr = this.normalizeDate(pl.dateReported as any);
          if (dr) pl.dateReported = dr;
          const rd = this.normalizeDate(pl.resolvedDate as any);
          if (rd) pl.resolvedDate = rd;
          (pl as any).dateReportedDisplay =
            pl.dateReported ? this.datePipe.transform(pl.dateReported as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '' : '';
          (pl as any).resolvedDateDisplay =
            pl.resolvedDate ? this.datePipe.transform(pl.resolvedDate as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '' : '';
        }

        // Trust server results order/uniqueness; do not deduplicate client-side
        this.unresolvedPreliminaryPunchLists = results;
        this.unresolvedPreliminaryPunchList$.next(this.unresolvedPreliminaryPunchLists);
        // During search, trust server scoping entirely; otherwise apply client role/market scoping
        this.dataSource.data = this.searchTerm
          ? this.unresolvedPreliminaryPunchLists
          : this.filterData(this.unresolvedPreliminaryPunchLists);

        // Only apply client-side filters after load when not searching
        if (this.selectedFilters?.length && !this.searchTerm) this.applyFilters(false);

        this.updateUnresolvedCount();
      },
      error: () => {
        this.toastr.error('Error fetching unresolved punch lists');
      }
    });
  }

  onPage(event: any): void {
    this.pageIndex = event.pageIndex; // 0-based
    this.pageSize = event.pageSize;
    if (this.useClientPaging()) {
      this.updatePagedView();
    } else {
      // Pass 0-based index; the loader converts to 1-based for API
      this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
    }
  }

  updateUnresolvedCount(): void {
    const count = this.searchTerm
      ? this.total
      : (this.selectedFilters?.length ? (this.filteredData?.length ?? 0) : this.total);
    this.unresolvedCountChange.emit(count);
  }

  // Server-side search entrypoint (called by parent search box)
  searchFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value?.trim() ?? '';
    this.searchTerm = val;
    this.pageIndex = 0; // reset to first page
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
  }

  filterData(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    const userVendor = this.user.company?.trim().toLowerCase();
    const userMarket = this.user.market?.trim().toLowerCase();

    return data.filter(p => {
      const listVendor = p.vendorName?.trim().toLowerCase();
      const listMarket = p.state?.trim().toLowerCase();

      if (this.user.role === 'PM') {
        return listVendor === userVendor && listMarket === userMarket;
      }
      if (this.user.role === 'CM' && userMarket !== 'rg') {
        return listMarket === userMarket;
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
      if (!result) return;

      const punchList = result;
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
    });
  }

  refreshPunchLists(): void {
    this.loadUnresolvedPunchLists(this.user);
  }

  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }

  openDeleteConfirmationDialog(report: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.removeReport(report);
    });
  }

  removeReport(report: PreliminaryPunchList): void {
    const idx = this.dataSource.data.findIndex(item => item.id === report.id);
    if (idx === -1) return;

    this.dataSource.data.splice(idx, 1);
    this.dataSource.data = [...this.dataSource.data];

    this.punchListService.removeEntry(report.id).subscribe({
      next: () => {
        this.toastr.success('Punch List entry deleted');
        this.updateUnresolvedCount();
      },
      error: (error) => {
        this.toastr.error(error.error, 'Error');
      }
    });
  }

  rejectResolution(punchList: PreliminaryPunchList): void {
    const updatedPunchList: PreliminaryPunchList = {
      ...punchList,
      dateReported: punchList.dateReported instanceof Date
        ? punchList.dateReported
        : new Date(punchList.dateReported as any),
      pmResolved: false,
      resolvedDate: null
    };

    this.punchListService.updateEntry(updatedPunchList).subscribe({
      next: () => {
        this.refreshPunchLists();
        this.toastr.success(`Resolution Rejected. Sent back to ${punchList.vendorName}`);
      },
      error: (err) => {
        console.error('Reject resolution failed:', err);
        this.toastr.error('Failed to reject resolution');
      }
    });
  }

  // Use current BehaviorSubject value instead of subscribing repeatedly
  refreshTable(): void {
    const entries = this.unresolvedPreliminaryPunchList$.value || [];
    const updatedData = this.filterData(entries);
    this.dataSource.data = updatedData;
    this.updateUnresolvedCount();
  }

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({ itemImageSrc: img }));
    if (imageType === 'issueImages') {
      this.isIssueGalleryVisible = true;
    } else {
      this.isResolutionGalleryVisible = true;
    }
  }

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }

  applyFilters(resetPage: boolean = true): void {
    // When searching, keep using server-side search paging for correctness
    if (this.searchTerm) {
      if (resetPage) {
        this.pageIndex = 0;
        try { this.paginator?.firstPage?.(); } catch {}
      }
      this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
      return;
    }

    // Fetch the entire current result set so filters apply to all rows (client-side)
    const desiredSize = this.total && this.total > 0
      ? this.total
      : Math.max(this.pageSize, this.dataSource?.data?.length || 25);

    const source$ = this.searchTerm
      ? this.punchListService.searchUnresolvedPunchLists(this.user, this.searchTerm, 1, desiredSize)
      : this.punchListService.getUnresolvedPunchLists(this.user, 1, desiredSize);

    source$.subscribe({
      next: (response: any) => {
        const items: PreliminaryPunchList[] = Array.isArray(response) ? response : (response?.items ?? []);
        const results = items.map(p => ({
          ...p,
          issues: (p.issues || []).map(issue => ({ ...issue }))
        }));

        // Normalize dates
        for (const pl of results) {
          const dr = this.normalizeDate(pl.dateReported as any);
          if (dr) pl.dateReported = dr;
          const rd = this.normalizeDate(pl.resolvedDate as any);
          if (rd) pl.resolvedDate = rd;
        }

        // Deduplicate by id
        const dedupedResults = results.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

        // If searching, keep only unresolved (not both resolved)
        const baseRows = this.searchTerm
          ? dedupedResults.filter(pl => !(!!pl.pmResolved && !!pl.cmResolved))
          : dedupedResults;

        // Scope by user vendor/market
        let updatedData = this.filterData(baseRows);

        // Apply selected filters across full dataset
        this.selectedFilters.forEach(filter => {
          if (filter.column === 'dateReported') {
            const startDateObj = new Date(filter.values[0]);
            const endDateObj = new Date(filter.values[1]);
            updatedData = updatedData.filter(p => {
              const d = new Date(p.dateReported as any);
              return d >= startDateObj && d <= endDateObj;
            });
          } else if (filter.column === 'resolvedDate') {
            const startDateObj = new Date(filter.values[0]);
            const endDateObj = new Date(filter.values[1]);
            updatedData = updatedData.filter(p => {
              if (!p.resolvedDate) return false;
              const d = new Date(p.resolvedDate as any);
              return d >= startDateObj && d <= endDateObj;
            });
          } else if (filter.column && filter.values) {
            if (Array.isArray(filter.values)) {
              updatedData = updatedData.filter(p =>
                filter.values.some(val =>
                  (p[filter.column as keyof PreliminaryPunchList] ?? '')
                    .toString()
                    .toLowerCase()
                    .includes(val.toLowerCase())
                )
              );
            } else {
              updatedData = updatedData.filter(p =>
                (p[filter.column as keyof PreliminaryPunchList] ?? '')
                  .toString()
                  .toLowerCase()
                  .includes((filter.values as any).toLowerCase())
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
        this.updateUnresolvedCount();
      },
      error: () => this.toastr.error('Error applying filters')
    });
  }

  clearAll(): void {
    this.selectedFilters = [];
    const entries = this.unresolvedPreliminaryPunchList$.value || [];
    const updatedData = this.filterData(entries);
    this.filteredData = [];
    this.dataSource.data = updatedData;
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.updateUnresolvedCount();
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
