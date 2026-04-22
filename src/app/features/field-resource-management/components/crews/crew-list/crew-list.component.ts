import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map, filter } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Crew, CrewStatus } from '../../../models/crew.model';
import { CrewFilters } from '../../../models/dtos/filters.dto';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { CrewFormComponent } from '../crew-form/crew-form.component';
import { ExportService } from '../../../services/export.service';
import { UserRole } from '../../../../../models/role.enum';
import { PermissionService } from '../../../../../services/permission.service';
import { User } from '../../../../../models/user.model';
import { DataScope } from '../../../services/data-scope.service';
import * as RolePermissionsSelectors from '../../../../../store/role-permissions/role-permissions.selectors';

/**
 * Crew List Component
 * 
 * Displays a paginated, searchable, and filterable list of crews with virtual scrolling.
 * Follows the same patterns as technician-list and job-list components.
 * 
 * Features:
 * - Virtual scrolling for performance with large datasets
 * - Search with debounce (300ms)
 * - Multiple filters: status, market, company
 * - Integration with NgRx crew state
 * - Role-based data scope filtering (Admin, CM, PM/Vendor, Technician)
 * - Export to CSV/PDF
 * 
 * Role-Based Filtering:
 * - Admin: sees all crews across all markets
 * - CM: sees crews in their market (or all if RG market)
 * - PM/Vendor: sees crews in their company AND market
 * - Technician: sees only crews they are part of (as lead or member)
 * 
 * Requirements: 1.3.1-1.3.6, 2.2.1-2.2.4, 4.1.4
 */
@Component({
  selector: 'frm-crew-list',
  templateUrl: './crew-list.component.html',
  styleUrls: ['./crew-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrewListComponent implements OnInit, OnDestroy, AfterViewInit {
  crews$: Observable<Crew[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Current user and data scopes for role-based filtering
  private currentUser: User | null = null;
  private currentDataScopes: DataScope[] = [];
  
  // Table data source for sorting
  dataSource = new MatTableDataSource<Crew>();
  
  @ViewChild(MatSort) sort!: MatSort;
  
  displayedColumns: string[] = ['name', 'leadTechnician', 'memberCount', 'status', 'market', 'company', 'actions'];
  
  // Search and filter controls
  searchControl = new FormControl('');
  statusControl = new FormControl('');
  marketControl = new FormControl('');
  companyControl = new FormControl('');
  
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];
  
  // Available options for filters
  statusOptions = Object.values(CrewStatus);
  availableMarkets: string[] = [];
  availableCompanies: string[] = [];
  
  // Technician name lookup
  technicianNameMap: Map<string, string> = new Map();
  
  // Enum references for template
  CrewStatus = CrewStatus;
  UserRole = UserRole;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private exportService: ExportService,
    private permissionService: PermissionService
  ) {
    // Initialize with non-scoped selector, will be replaced in ngOnInit
    this.crews$ = this.store.select(CrewSelectors.selectFilteredCrews);
    this.loading$ = this.store.select(CrewSelectors.selectCrewsLoading);
    this.error$ = this.store.select(CrewSelectors.selectCrewsError);
  }
  
  ngOnInit(): void {
    // Setup role-based filtering by getting current user and data scopes
    combineLatest([
      this.permissionService.getCurrentUser(),
      this.permissionService.getCurrentUserDataScopes()
    ]).pipe(
      filter(([user, dataScopes]) => !!user && !!dataScopes && dataScopes.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(([user, dataScopes]) => {
      this.currentUser = user;
      this.currentDataScopes = dataScopes;
      
      // Switch to scoped selector with current user and data scopes
      this.crews$ = this.store.select(
        CrewSelectors.selectFilteredScopedCrews(user, dataScopes)
      );
      
      // Re-subscribe to crews data with scoped selector
      this.crews$
        .pipe(takeUntil(this.destroy$))
        .subscribe(crews => {
          this.dataSource.data = crews;
          
          // Extract unique markets and companies from scoped data
          const marketsSet = new Set<string>();
          const companiesSet = new Set<string>();
          crews.forEach(crew => {
            marketsSet.add(crew.market);
            companiesSet.add(crew.company);
          });
          this.availableMarkets = Array.from(marketsSet).sort();
          this.availableCompanies = Array.from(companiesSet).sort();
        });
    });
    
    // Load filters from URL query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) {
        this.searchControl.setValue(params['search']);
      }
      if (params['status']) {
        this.statusControl.setValue(params['status']);
      }
      if (params['market']) {
        this.marketControl.setValue(params['market']);
      }
      if (params['company']) {
        this.companyControl.setValue(params['company']);
      }
      // Load pagination from URL
      if (params['page']) {
        this.pageIndex = parseInt(params['page'], 10);
      }
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize'], 10);
      }
    });

    // Load crews on init
    this.store.dispatch(CrewActions.loadCrews({ filters: {} }));

    // Load technicians for name lookups
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.select(selectAllTechnicians).pipe(
      takeUntil(this.destroy$)
    ).subscribe(technicians => {
      this.technicianNameMap.clear();
      technicians.forEach(t => {
        this.technicianNameMap.set(t.id, `${t.firstName} ${t.lastName}`);
      });
    });
    
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
    
    // Setup filter controls
    this.statusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.marketControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.companyControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }
  
  ngAfterViewInit(): void {
    // Connect sort to data source after view init
    if (this.sort) {
      this.dataSource.sort = this.sort;
      
      // Custom sort accessor for member count
      this.dataSource.sortingDataAccessor = (crew: Crew, property: string) => {
        switch (property) {
          case 'memberCount':
            return crew.memberIds.length;
          case 'name':
            return crew.name.toLowerCase();
          case 'status':
            return crew.status;
          case 'market':
            return crew.market.toLowerCase();
          case 'company':
            return crew.company.toLowerCase();
          case 'leadTechnician':
            return crew.leadTechnicianId;
          default:
            return (crew as any)[property];
        }
      };
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  applyFilters(): void {
    const filters: CrewFilters = {
      searchTerm: this.searchControl.value || undefined,
      status: (this.statusControl.value as CrewStatus) || undefined,
      market: this.marketControl.value || undefined,
      company: this.companyControl.value || undefined,
      page: this.pageIndex,
      pageSize: this.pageSize
    };
    
    this.store.dispatch(CrewActions.setCrewFilters({ filters }));
    
    // Reset to page 1 when filters change (but not when pagination changes)
    const isFilterChange = this.searchControl.value || this.statusControl.value || 
                          this.marketControl.value || this.companyControl.value;
    if (isFilterChange && this.pageIndex !== 0) {
      this.pageIndex = 0;
      filters.page = 0;
    }
    
    // Update URL query params
    this.updateUrlParams();
  }

  /**
   * Update URL query params with current filters
   */
  private updateUrlParams(): void {
    const queryParams: any = {};
    
    if (this.searchControl.value) {
      queryParams.search = this.searchControl.value;
    }
    if (this.statusControl.value) {
      queryParams.status = this.statusControl.value;
    }
    if (this.marketControl.value) {
      queryParams.market = this.marketControl.value;
    }
    if (this.companyControl.value) {
      queryParams.company = this.companyControl.value;
    }
    // Add pagination to URL
    if (this.pageIndex > 0) {
      queryParams.page = this.pageIndex.toString();
    }
    if (this.pageSize !== 50) {
      queryParams.pageSize = this.pageSize.toString();
    }
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Get active filters as array for chips display
   */
  getActiveFilters(): Array<{ label: string; value: string; key: string }> {
    const filters: Array<{ label: string; value: string; key: string }> = [];
    
    if (this.searchControl.value) {
      filters.push({ label: 'Search', value: this.searchControl.value, key: 'search' });
    }
    if (this.statusControl.value) {
      filters.push({ label: 'Status', value: this.statusControl.value, key: 'status' });
    }
    if (this.marketControl.value) {
      filters.push({ label: 'Market', value: this.marketControl.value, key: 'market' });
    }
    if (this.companyControl.value) {
      filters.push({ label: 'Company', value: this.companyControl.value, key: 'company' });
    }
    
    return filters;
  }

  /**
   * Remove a specific filter
   */
  removeFilter(key: string): void {
    switch (key) {
      case 'search':
        this.searchControl.setValue('');
        break;
      case 'status':
        this.statusControl.setValue('');
        break;
      case 'market':
        this.marketControl.setValue('');
        break;
      case 'company':
        this.companyControl.setValue('');
        break;
    }
    this.applyFilters();
  }
  
  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('');
    this.marketControl.setValue('');
    this.companyControl.setValue('');
    this.pageIndex = 0; // Reset to first page
    this.store.dispatch(CrewActions.clearCrewFilters());
  }
  
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }
  
  viewCrew(crew: Crew): void {
    this.store.dispatch(CrewActions.selectCrew({ id: crew.id }));
    this.router.navigate(['/field-resource-management/crews', crew.id]);
  }
  
  editCrew(crew: Crew): void {
    this.store.dispatch(CrewActions.selectCrew({ id: crew.id }));
    this.router.navigate(['/field-resource-management/crews', crew.id, 'edit']);
  }

  openCrewDialog(crewId?: string): void {
    const dialogRef = this.dialog.open(CrewFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      data: crewId ? { crewId } : {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.store.dispatch(CrewActions.loadCrews({ filters: {} }));
      }
    });
  }

  retryLoad(): void {
    this.store.dispatch(CrewActions.loadCrews({ filters: {} }));
  }

  deleteCrew(crew: Crew): void {
    const confirmed = confirm(`Are you sure you want to delete crew "${crew.name}"?`);
    if (confirmed) {
      this.store.dispatch(CrewActions.deleteCrew({ id: crew.id }));
      this.snackBar.open('Crew deleted', 'Close', { duration: 3000 });
    }
  }

  getTechnicianName(technicianId: string): string {
    return this.technicianNameMap.get(technicianId) || technicianId.substring(0, 8) + '...';
  }
  
  getMemberCount(crew: Crew): number {
    return crew.memberIds.length;
  }
  
  getStatusBadgeClass(status: CrewStatus): string {
    const classMap: Record<CrewStatus, string> = {
      [CrewStatus.Available]: 'status-available',
      [CrewStatus.OnJob]: 'status-on-job',
      [CrewStatus.Unavailable]: 'status-unavailable'
    };
    return classMap[status] || '';
  }

  /**
   * Export crews to CSV
   */
  exportToCSV(): void {
    this.crews$.pipe(takeUntil(this.destroy$)).subscribe(crews => {
      const headers = [
        'Crew ID',
        'Crew Name',
        'Lead Technician ID',
        'Member Count',
        'Status',
        'Market',
        'Company',
        'Active Job ID',
        'Has Location'
      ];

      const data = crews.map(crew => [
        crew.id,
        crew.name,
        crew.leadTechnicianId,
        this.getMemberCount(crew).toString(),
        crew.status,
        crew.market,
        crew.company,
        crew.activeJobId || 'N/A',
        crew.currentLocation ? 'Yes' : 'No'
      ]);

      // Add filter summary as comment
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? `Filters Applied: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')}`
        : 'No filters applied';

      const filename = this.exportService.generateTimestampFilename('crews', 'csv');

      this.exportService.generateCSV({
        filename,
        headers: [filterSummary, '', ...headers],
        data: [[], [], ...data]
      });

      this.snackBar.open('Crews exported to CSV successfully', 'Close', { duration: 3000 });
    });
  }

  /**
   * Export crews to PDF
   */
  async exportToPDF(): Promise<void> {
    this.crews$.pipe(takeUntil(this.destroy$)).subscribe(async crews => {
      const headers = [
        'Crew Name',
        'Members',
        'Status',
        'Market',
        'Company'
      ];

      const data = crews.map(crew => [
        crew.name,
        this.getMemberCount(crew).toString(),
        crew.status,
        crew.market,
        crew.company
      ]);

      // Add filter summary to title
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? ` (Filters: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')})`
        : '';

      const filename = this.exportService.generateTimestampFilename('crews', 'pdf');

      try {
        await this.exportService.generatePDF({
          filename,
          title: `Crews Report${filterSummary}`,
          headers,
          data,
          orientation: 'portrait'
        });

        this.snackBar.open('Crews exported to PDF successfully', 'Close', { duration: 3000 });
      } catch (error) {
        this.snackBar.open('Failed to export to PDF', 'Close', { duration: 5000 });
      }
    });
  }
}
