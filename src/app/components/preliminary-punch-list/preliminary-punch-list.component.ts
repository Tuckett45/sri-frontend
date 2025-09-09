import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { FacetsResponse, PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { map, Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { PreliminaryPunchListResolvedComponent } from './preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';
import { PreliminaryPunchListUnresolvedComponent } from './preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss'],
  standalone: false
})
export class PreliminaryPunchListComponent implements OnInit, AfterViewInit {
  preliminaryPunchList$!: Observable<PreliminaryPunchList[]>;
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;
  activeTab = 0; // 0 = Resolved, 1 = Unresolved (adjust if your UI differs)
  filtersOpen = false;

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
  }

  ngAfterViewInit(): void {
    // Give children a tick to mount, then push current filters
    setTimeout(() => this.updateChildFilters(), 0);
  }

  /** Fetch everything (whatever getEntries() returns) and scope to the current user's vendor/market. */
  loadPunchLists(): void {
    this.preliminaryPunchList$ = this.punchListService.getEntries().pipe(
      map(response => response.items)
    );

    this.preliminaryPunchList$.subscribe(data => {
      // Role scoping first (this becomes "allData" for the top-level table)
      this.allData = this.scopeToUser(data);
      this.dataSource.data = this.allData;
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
    this.preliminaryPunchList$?.subscribe(entries => {
      this.allData = this.scopeToUser(entries);
      this.dataSource.data = this.allData;
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

  applyFilter(event: Event): void {
    // forwards to children; they will perform search (server) using current chip filters
    this.resolvedPunchListComponent.searchFilter(event);
    this.unresolvedPunchListComponent.searchFilter(event);
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

  /** Push the current selectedFilters to children so they re-filter. */
  updateChildFilters() {
    this.resolvedPunchListComponent?.applyFilters();
    this.unresolvedPunchListComponent?.applyFilters();
  }

  // Back-compat entrypoint
  applyFilters(): void {
    this.updateChildFilters();
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
