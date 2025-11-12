import { Component, Input, OnInit, ViewChild, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { FacetsResponse, PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { map, Observable, Subject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { PreliminaryPunchListResolvedComponent } from './preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';
import { PreliminaryPunchListUnresolvedComponent } from './preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TimelineItem } from 'src/app/models/timeline-item.model';

// Child expects a searchParams bag; define a local type (no import needed)
type ChildSearchParams = {
  term?: string;
  resolved: 'resolved' | 'unresolved';
  state?: string | null;
  company?: string | null;
  segmentIdsCsv?: string;
  vendorsCsv?: string;
  statesCsv?: string;
  dateReportedStart?: string | null;
  dateReportedEnd?: string | null;
  resolvedStart?: string | null;
  resolvedEnd?: string | null;
};

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss'],
  standalone: false
})
export class PreliminaryPunchListComponent implements OnInit, AfterViewInit, OnDestroy {
  preliminaryPunchList$!: Observable<PreliminaryPunchList[]>;
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;
  activeTab = 0; // 0 = Resolved, 1 = Unresolved (adjust if your UI differs)
  filtersOpen = false;
  selectedView: 'table' | 'timeline' = 'table';

  readonly viewOptions = [
    { label: 'Table view', value: 'table' },
    { label: 'Timeline mode', value: 'timeline' }
  ];

  readonly timelineItems = signal<TimelineItem[]>([]);

  // Selected filters (multi-selects in the UI)
  selectedFilters: { column: string, values: string[] }[] = [];
  selectedFilter: { column: string, value: string[] } = { column: '', value: [] };
  selectedSegmentIds: string[] = [];
  selectedVendors: string[] = [];
  selectedStates: string[] = [];
  dateReportedSelectedDates: string[] = [];
  dateReportedStartDate: Date | string = '';
  dateReportedEndDate: Date | string = '';
  resolvedDateSelectedDates: string[] = [];
  resolvedDateStartDate: Date | string = '';
  resolvedDateEndDate: Date | string = '';

  // Data
  filteredData: PreliminaryPunchList[] = [];
  allData: PreliminaryPunchList[] = []; // role-scoped set for the top-level table
  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();

  @ViewChild(PreliminaryPunchListUnresolvedComponent) unresolvedPunchListComponent!: PreliminaryPunchListUnresolvedComponent;
  @ViewChild(PreliminaryPunchListResolvedComponent) resolvedPunchListComponent!: PreliminaryPunchListResolvedComponent;

  @Input() unresolvedPunchListCount = 0;
  @Input() resolvedPunchListCount = 0;

  galleryImages: any[] = [];

  // Distinct options populated from the backend facets endpoint
  filterOptions: { segmentId: string[]; vendorName: string[]; state: string[] } = {
    segmentId: [],
    vendorName: [],
    state: []
  };

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

  // --- Debounced search handling in parent ---
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // --- helpers/normalizers + current search term ---
  private norm = (s?: string | null) => (s ?? '').replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trim();
  private normUpper = (s?: string | null) => this.norm(s).toUpperCase();
  private toIso = (d?: string | Date | null): string | null => {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };
  private currentSearchTerm = '';

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();

    // Load the main list (for top-level table) and the global facets for the active tab/scope
    this.loadPunchLists();
    this.loadFacetsForActiveTab();

    // Seed counts from cache (optional)
    this.unresolvedPunchListCount = this.punchListService.getCachedUnresolvedCount(this.user);
    this.resolvedPunchListCount = this.punchListService.getCachedResolvedCount(this.user);

    // Debounce search input coming from parent search box
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.currentSearchTerm = term; // keep in parent so we include in params
        // Keep legacy wiring for children search boxes (optional)
        const syntheticEvent = { target: { value: term } } as unknown as Event;
        this.resolvedPunchListComponent?.searchFilter(syntheticEvent);
        this.unresolvedPunchListComponent?.searchFilter(syntheticEvent);
        // Ensure children re-fetch with combined filters too
        this.updateChildFilters();
      });
  }

  ngAfterViewInit(): void {
    // Give children a tick to mount, then push current filters
    setTimeout(() => this.updateChildFilters(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Fetch everything (whatever getEntries() returns) and scope to the current user's vendor/market. */
  loadPunchLists(): void {
    this.preliminaryPunchList$ = this.punchListService.getEntries().pipe(
      map(response => response.items)
    );

    this.preliminaryPunchList$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Role scoping first (this becomes "allData" for the top-level table)
        this.allData = this.scopeToUser(data);
        this.dataSource.data = this.allData;
        this.applyFiltersToTimeline();
        // Children use server paging/filtering on their own; we just push filter state
        this.updateChildFilters();
      });
  }

  /** Scope rows to the current PM/CM rules so filters reflect what the user can actually see. */
  private scopeToUser(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    let rows = data ?? [];
    if (!this.user) return rows;

    const market = (this.user.market ?? '').trim();
    const company = (this.user.company ?? '').trim();

    if (this.user.role === 'PM') {
      rows = rows.filter(p =>
        (p.vendorName ?? '').trim() === company &&
        (p.state ?? '').trim().toUpperCase() === market.toUpperCase()
      );
    } else if (market && market.toUpperCase() !== 'RG') {
      rows = rows.filter(p => (p.state ?? '').trim().toUpperCase() === market.toUpperCase());
    }
    return rows;
  }

  /** Determine facet scope by user role (PM=vendor+market, CM (non-RG)=market, others=all). */
  private getFacetScopeFromUser(): { state?: string|null; company?: string|null } {
    const role = (this.user?.role || '').toUpperCase();
    const market = (this.user?.market || '').trim();
    const company = (this.user?.company || '').trim();

    if (role === 'PM') {
      return { state: market || null, company: company || null };
    }
    if (role === 'CM' && market.toUpperCase() !== 'RG') {
      return { state: market, company: null };
    }
    return { state: null, company: null };
  }

  /** Map active tab to resolved/unresolved/all for facets. */
  private getResolvedScopeForActiveTab(): 'resolved' | 'unresolved' | 'all' {
    return this.activeTab === 0 ? 'resolved'
         : this.activeTab === 1 ? 'unresolved'
         : 'all';
  }

  /** Load facets from the backend (distinct values), keep selections if still valid. */
  private loadFacetsForActiveTab(): void {
    const { state, company } = this.getFacetScopeFromUser();
    const resolvedScope = this.getResolvedScopeForActiveTab();

    this.punchListService.getFacets(resolvedScope, state ?? undefined, company ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: FacetsResponse) => {
          const states = (res.states || []).map(s => (s ?? '').toUpperCase());

          this.filterOptions = {
            segmentId: (res.segmentIds || []).slice().sort((a, b) => a.localeCompare(b)),
            vendorName: (res.vendors || []).slice().sort((a, b) => a.localeCompare(b)),
            state: states.slice().sort((a, b) => a.localeCompare(b)),
          };

          // Keep selected values that still exist
          this.selectedSegmentIds = this.selectedSegmentIds.filter(v => this.filterOptions.segmentId.includes(v));
          this.selectedVendors    = this.selectedVendors.filter(v => this.filterOptions.vendorName.includes(v));
          this.selectedStates     = this.selectedStates.filter(v => this.filterOptions.state.includes(v));

          // Push down to children
          this.updateChildFilters();
        },
        error: () => {
          // noop; UI can continue with previous options
        }
      });
  }

  /** If you're using a mat-tab-group, hook this up via (selectedIndexChange). */
  onTabChange(index: number): void {
    this.activeTab = index;
    this.loadFacetsForActiveTab();
    // Optional: clear selections on scope change
    // this.clearAll();
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  removeChip(filter: { column: string, value: string }): void {
    if (filter.column === 'segmentId') {
      this.selectedSegmentIds = this.selectedSegmentIds.filter(id => id !== filter.value);
    } else if (filter.column === 'vendorName') {
      this.selectedVendors = this.selectedVendors.filter(v => v !== filter.value);
    } else if (filter.column === 'state') {
      this.selectedStates = this.selectedStates.filter(st => st !== filter.value);
    } else if (filter.column === 'dateReported') {
      this.dateReportedSelectedDates = this.dateReportedSelectedDates.filter(d => d !== filter.value);
      this.dateReportedStartDate = '';
      this.dateReportedEndDate = '';
    } else if (filter.column === 'resolvedDate') {
      this.resolvedDateSelectedDates = this.resolvedDateSelectedDates.filter(d => d !== filter.value);
      this.resolvedDateStartDate = '';
      this.resolvedDateEndDate = '';
    }

    this.selectedFilters = this.selectedFilters
      .map(f => f.column === filter.column ? { ...f, values: f.values.filter(v => v !== filter.value) } : f)
      .filter(f => f.values.length > 0);

    if (this.selectedFilters.length === 0) {
      this.selectedFilter = { column: '', value: [] };
      this.unresolvedPunchListComponent?.clearAll();
      this.resolvedPunchListComponent?.clearAll();
    }

    this.updateChildFilters();
  }

  clearAll(): void {
    this.selectedFilters = [];
    this.selectedSegmentIds = [];
    this.selectedVendors = [];
    this.selectedStates = [];
    this.dateReportedSelectedDates = [];
    this.dateReportedStartDate = '';
    this.dateReportedEndDate = '';
    this.resolvedDateSelectedDates = [];
    this.resolvedDateStartDate = '';
    this.resolvedDateEndDate = '';
    this.selectedFilter = { column: '', value: [] };
    this.unresolvedPunchListComponent?.clearAll();
    this.resolvedPunchListComponent?.clearAll();
    this.applyFiltersToTimeline();
  }

  onUnresolvedCountChange(count: number): void {
    this.unresolvedPunchListCount = count;
  }

  onResolvedCountChange(count: number): void {
    this.resolvedPunchListCount = count;
  }

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });

    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (!result) return;

      const punchList = result;
      const action$ = punchList.updatedBy
        ? this.punchListService.updateEntry(punchList)
        : this.punchListService.addEntry(punchList);

      action$.subscribe({
        next: () => {
          this.toastr.success('Punch List saved');
          // refresh children (they fetch their own pages)
          this.resolvedPunchListComponent.refreshPunchLists();
          this.unresolvedPunchListComponent.refreshPunchLists();
          // refresh main list and facets
          this.loadPunchLists();
          this.loadFacetsForActiveTab();
        },
        error: () => this.toastr.error('Error saving Punch List.')
      });
    });
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
    this.applyFiltersToTimeline();

    this.punchListService.removeEntry(report.id).subscribe({
      next: () => {
        this.toastr.success('Punch List entry deleted');
        // refresh main list, facets, and children after deletion
        this.loadPunchLists();
        this.loadFacetsForActiveTab();
        this.resolvedPunchListComponent.refreshPunchLists();
        this.unresolvedPunchListComponent.refreshPunchLists();
      },
      error: (error) => this.toastr.error(error.error, 'Error')
    });
  }

  refreshTable(): void {
    // Re-scope table and refresh facets
    this.preliminaryPunchList$?.pipe(takeUntil(this.destroy$)).subscribe(entries => {
      this.allData = this.scopeToUser(entries);
      this.dataSource.data = this.allData;
      this.applyFiltersToTimeline();
      this.updateChildFilters();
      this.loadFacetsForActiveTab();
    });
  }

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({ itemImageSrc: img }));
    if (imageType === 'issueImages') this.isIssueGalleryVisible = true;
    else this.isResolutionGalleryVisible = true;
  }

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }

  // Parent-level debounced search entrypoint
  applyFilter(event: Event): void {
    const term = ((event.target as HTMLInputElement)?.value ?? '').trim();
    this.currentSearchTerm = term; // keep in sync
    this.search$.next(term);
  }

  onFilterChange(filter: { column: string, values: string[] }) {
    // Keep selected values
    if (filter.column === 'segmentId') this.selectedSegmentIds = filter.values;
    if (filter.column === 'vendorName') this.selectedVendors = filter.values;
    if (filter.column === 'state') this.selectedStates = filter.values;
    if (filter.column === 'dateReported') this.dateReportedSelectedDates = filter.values;
    if (filter.column === 'resolvedDate') this.resolvedDateSelectedDates = filter.values;

    this.addOrUpdateFilter(filter);
    this.updateChildFilters();
  }

  private addOrUpdateFilter(filter: { column: string, values: string[] }) {
    const i = this.selectedFilters.findIndex(f => f.column === filter.column);
    if (i >= 0) this.selectedFilters[i] = filter;
    else this.selectedFilters.push(filter);
  }

  clearSelectedValues(column: string) {
    if (column === 'segmentId') this.selectedSegmentIds = [];
    else if (column === 'vendorName') this.selectedVendors = [];
    else if (column === 'state') this.selectedStates = [];
    else if (column === 'dateReported') this.dateReportedSelectedDates = [];
    else if (column === 'resolvedDate') this.resolvedDateSelectedDates = [];
  }

  getChipLabel(filter: { column: string, value: any }): string {
    return Array.isArray(filter.value) ? filter.value.join(', ') : (filter.value || '');
  }

  formatDate(chip: any): string {
    if (chip instanceof Date || !isNaN(Date.parse(chip))) {
      return this.datePipe.transform(chip, 'MM/dd/yyyy') || '';
    }
    return chip;
  }

  /** Build and push the current selectedFilters to children so they re-filter (server-side). */
  updateChildFilters() {
    const resolvedParams = this.buildSearchParams('resolved');
    const unresolvedParams = this.buildSearchParams('unresolved');

    if (this.resolvedPunchListComponent) {
      (this.resolvedPunchListComponent as any).searchParams = resolvedParams; // support @Input in child
      if ((this.resolvedPunchListComponent as any).applyFiltersWithParams) {
        (this.resolvedPunchListComponent as any).applyFiltersWithParams(resolvedParams);
      } else {
        this.resolvedPunchListComponent.applyFilters();
      }
    }

    if (this.unresolvedPunchListComponent) {
      (this.unresolvedPunchListComponent as any).searchParams = unresolvedParams;
      if ((this.unresolvedPunchListComponent as any).applyFiltersWithParams) {
        (this.unresolvedPunchListComponent as any).applyFiltersWithParams(unresolvedParams);
      } else {
        this.unresolvedPunchListComponent.applyFilters();
      }
    }

    this.applyFiltersToTimeline();
  }

  // Back-compat entrypoint
  applyFilters(): void {
    this.updateChildFilters();
  }

  /** Construct the combined params bag the children will send to /PunchList/search */
  private buildSearchParams(scope: 'resolved' | 'unresolved'): ChildSearchParams {
    // Role scoping (same as before)
    const role = (this.user?.role || '').toUpperCase();
    const market = this.norm(this.user?.market || '');
    const company = this.norm(this.user?.company || '');

    let roleState: string | null = null;
    let roleCompany: string | null = null;

    if (role === 'PM') {
      roleState = this.normUpper(market) || null;
      roleCompany = company || null;
    } else if (role === 'CM' && this.normUpper(market) !== 'RG') {
      roleState = this.normUpper(market) || null;
    }

    // Multi-selects → CSV
    const segmentIdsCsv = this.selectedSegmentIds.map(v => this.norm(v)).filter(Boolean).join(',') || undefined;
    const vendorsCsv    = this.selectedVendors.map(v => this.norm(v)).filter(Boolean).join(',') || undefined;
    const statesCsv     = this.selectedStates.map(v => this.normUpper(v)).filter(Boolean).join(',') || undefined;

    // Date ranges (either dedicated fields or 2-item arrays)
    const drStart = this.toIso(this.dateReportedStartDate || this.dateReportedSelectedDates[0] || null);
    const drEnd   = this.toIso(this.dateReportedEndDate   || this.dateReportedSelectedDates[1] || null);
    const rzStart = this.toIso(this.resolvedDateStartDate || this.resolvedDateSelectedDates[0] || null);
    const rzEnd   = this.toIso(this.resolvedDateEndDate   || this.resolvedDateSelectedDates[1] || null);

    return {
      term: this.currentSearchTerm || '',
      resolved: scope,
      state: roleState ?? undefined,
      company: roleCompany ?? undefined,
      segmentIdsCsv,
      vendorsCsv,
      statesCsv,
      dateReportedStart: drStart,
      dateReportedEnd: drEnd,
      resolvedStart: rzStart,
      resolvedEnd: rzEnd
    };
  }

  private applyFiltersToTimeline(): void {
    if (!Array.isArray(this.allData) || this.allData.length === 0) {
      this.timelineItems.set([]);
      return;
    }

    const segmentFilter = new Set(this.selectedSegmentIds);
    const vendorFilter = new Set(this.selectedVendors);
    const stateFilter = new Set(this.selectedStates.map(s => (s ?? '').toUpperCase()));
    const searchTerm = (this.currentSearchTerm || '').toLowerCase();

    const reportedStart = this.parseDateValue(this.dateReportedStartDate || this.dateReportedSelectedDates[0]);
    const reportedEnd = this.parseDateValue(this.dateReportedEndDate || this.dateReportedSelectedDates[1]);
    const resolvedStart = this.parseDateValue(this.resolvedDateStartDate || this.resolvedDateSelectedDates[0]);
    const resolvedEnd = this.parseDateValue(this.resolvedDateEndDate || this.resolvedDateSelectedDates[1]);

    const filtered = this.allData.filter(entry => {
      if (segmentFilter.size && !segmentFilter.has(entry.segmentId)) return false;
      if (vendorFilter.size && !vendorFilter.has(entry.vendorName)) return false;
      if (stateFilter.size && !stateFilter.has((entry.state ?? '').toUpperCase())) return false;

      const reported = this.ensureDate(entry.dateReported);
      if (reportedStart && (!reported || reported < this.startOfDay(reportedStart))) return false;
      if (reportedEnd && (!reported || reported > this.endOfDay(reportedEnd))) return false;

      const resolved = this.ensureDate(entry.resolvedDate ?? null);
      if (resolvedStart && (!resolved || resolved < this.startOfDay(resolvedStart))) return false;
      if (resolvedEnd && (!resolved || resolved > this.endOfDay(resolvedEnd))) return false;

      if (searchTerm) {
        const haystack = [
          entry.segmentId,
          entry.vendorName,
          entry.streetAddress,
          entry.city,
          entry.state
        ]
          .map(value => (value ?? '').toString().toLowerCase());

        if (!haystack.some(value => value.includes(searchTerm))) return false;
      }

      return true;
    });

    const nextItems = filtered.map(entry => this.toTimelineItem(entry));
    const currentItems = this.timelineItems();
    const unchanged = currentItems.length === nextItems.length && currentItems.every((item, idx) => {
      const next = nextItems[idx];
      return item.id === next.id &&
        new Date(item.startDate).getTime() === new Date(next.startDate).getTime() &&
        new Date((item.endDate ?? item.startDate)).getTime() === new Date((next.endDate ?? next.startDate)).getTime() &&
        (item.status ?? '') === (next.status ?? '') &&
        (item.color ?? '') === (next.color ?? '');
    });

    if (!unchanged) {
      this.timelineItems.set(nextItems);
    }
  }

  private toTimelineItem(entry: PreliminaryPunchList): TimelineItem {
    const start = this.ensureDate(entry.dateReported) ?? new Date();
    const resolved = this.ensureDate(entry.resolvedDate ?? null);
    const updated = this.ensureDate(entry.updatedDate ?? null);
    const fallbackEnd = updated ?? (entry.pmResolved || entry.cmResolved ? resolved : null) ?? new Date();
    const end = fallbackEnd && fallbackEnd < start ? start : fallbackEnd;
    const status = entry.cmResolved || entry.pmResolved ? 'resolved' : 'open';

    return {
      id: entry.id,
      label: `${entry.segmentId} · ${entry.vendorName}`,
      startDate: start,
      endDate: end ?? start,
      status,
      color: status === 'resolved' ? 'var(--green-500)' : 'var(--red-500)',
      metadata: {
        segmentId: entry.segmentId,
        vendor: entry.vendorName,
        streetAddress: entry.streetAddress,
        city: entry.city,
        state: entry.state,
        createdBy: entry.createdBy,
        resolvedBy: entry.resolvedBy ?? entry.updatedBy ?? '',
        pmResolved: entry.pmResolved,
        cmResolved: entry.cmResolved,
        issues: entry.issues?.map(issue => issue.category).filter(Boolean).join(', '),
        additionalConcerns: entry.additionalConcerns
      }
    };
  }

  private parseDateValue(value: any): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private ensureDate(value: any): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date.getTime());
    d.setHours(23, 59, 59, 999);
    return d;
  }

  exportToCSV(): void {
    if (this.activeTab === 0) {
      this.dataSource.data = this.resolvedPunchListComponent.dataSource.data;
      const csvData = this.dataSource.data.map((entry: PreliminaryPunchList) => ({
        SegmentID: entry.segmentId,
        VendorName: entry.vendorName,
        StreetAddress: entry.streetAddress,
        City: entry.city,
        State: entry.state,
        Area: entry.issues.filter(i => i.area).map(i => i.area).join(', '),
        Category: entry.issues.filter(i => i.category).map(i => i.category).join(', '),
        SubCategory: entry.issues.filter(i => i.subCategory).map(i => i.subCategory).join(', '),
        AdditionalConcerns: entry.additionalConcerns,
        CreatedBy: entry.createdBy,
        DateReported: entry.dateReported,
        PMResolved: entry.pmResolved ? 'Yes' : 'No',
        PMResolvedDate: entry.resolvedDate,
        CMResolved: entry.cmResolved ? 'Yes' : 'No',
      }));
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'resolved-preliminary-punch-list.csv';
      link.click();
    } else {
      this.dataSource.data = this.unresolvedPunchListComponent.dataSource.data;
      const csvData = this.dataSource.data.map((entry: PreliminaryPunchList) => ({
        SegmentID: entry.segmentId,
        VendorName: entry.vendorName,
        StreetAddress: entry.streetAddress,
        City: entry.city,
        State: entry.state,
        Area: entry.issues.filter(i => i.area).map(i => i.area).join(', '),
        Category: entry.issues.filter(i => i.category).map(i => i.category).join(', '),
        SubCategory: entry.issues.filter(i => i.subCategory).map(i => i.subCategory).join(', '),
        AdditionalConcerns: entry.additionalConcerns,
        CreatedBy: entry.createdBy,
        DateReported: entry.dateReported,
        PMResolved: entry.pmResolved ? 'Yes' : 'No',
        PMResolvedDate: entry.resolvedDate,
        CMResolved: entry.cmResolved ? 'Yes' : 'No',
      }));
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'unresolved-preliminary-punch-list.csv';
      link.click();
    }
  }
}
