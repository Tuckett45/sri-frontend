import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, take } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Technician, TechnicianRole, TechnicianStatus, Skill, Certification, Availability } from '../../../models/technician.model';
import { TechnicianFilters } from '../../../models/dtos/filters.dto';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import { selectTechnicianCurrentJobMap, selectTechnicianCrewMap } from '../../../state/technicians/technician.selectors';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as JobActions from '../../../state/jobs/job.actions';
import { ExportService } from '../../../services/export.service';
import { TechnicianService } from '../../../services/technician.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import {
  AddTechnicianModalComponent,
  AddTechnicianModalResult
} from '../add-technician-modal/add-technician-modal.component';
import { UserRole } from '../../../../../models/role.enum';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-technician-list',
  templateUrl: './technician-list.component.html',
  styleUrls: ['./technician-list.component.scss']
})
export class TechnicianListComponent implements OnInit, OnDestroy {
  technicians$: Observable<Technician[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  displayedColumns: string[] = ['name', 'role', 'region', 'crew', 'fieldStatus', 'actions'];
  
  // Expose UserRole enum for template
  UserRole = UserRole;
  
  // Search and filter controls
  searchControl = new FormControl('');
  roleControl = new FormControl('');
  availabilityControl = new FormControl(false);
  regionControl = new FormControl('');
  activeStatusControl = new FormControl('');
  referredByControl = new FormControl('');
  crewControl = new FormControl('');    // Crew the technician is assigned to (Crew.Id)
  
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];
  
  // Available options for filters
  roles = Object.values(TechnicianRole);
  availableRegions: string[] = [];
  availableReferrers: string[] = []; // Will be populated from technicians
  availableCrewOptions: { id: string; name: string }[] = []; // Crews, from technicians' crew info
  
  // Current job map (technicianId → job label) — used by the Pipeline/Schedule tab cards
  technicianJobMap: Record<string, string> = {};
  
  // Crew map (technicianId → crew name)
  technicianCrewMap: Record<string, string> = {};

  // Tabs
  activeTabIndex = 0;

  // Table sorting
  tableSortColumn: string = '';
  tableSortDirection: 'asc' | 'desc' = 'asc';

  // Pipeline view
  pipelineStatusFilter: string = '';
  pipelineSearchControl = new FormControl('');
  pipelineCrewFilter: string = ''; // '', 'assigned', 'unassigned', or a specific crew name
  pipelineRegionFilter: string = '';
  pipelineRoleFilter: string = '';
  availableCrews: string[] = []; // Populated from technicianCrewMap
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private exportService: ExportService,
    private technicianService: TechnicianService
  ) {
    this.technicians$ = this.store.select(TechnicianSelectors.selectFilteredTechnicians);
    this.loading$ = this.store.select(TechnicianSelectors.selectTechniciansLoading);
    this.error$ = this.store.select(TechnicianSelectors.selectTechniciansError);
  }
  
  ngOnInit(): void {
    // Hydrate filters from the URL ONCE on load. We take only the first emission:
    // subsequent emissions come from our own updateUrlParams() calls, and re-reading
    // them here would fight the user (e.g. re-adding a filter they just removed),
    // using { emitEvent: false } so hydration doesn't trigger a redundant applyFilters.
    this.route.queryParams.pipe(take(1), takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) {
        this.searchControl.setValue(params['search'], { emitEvent: false });
      }
      if (params['role']) {
        this.roleControl.setValue(params['role'], { emitEvent: false });
      }
      if (params['available']) {
        this.availabilityControl.setValue(params['available'] === 'true', { emitEvent: false });
      }
      if (params['region']) {
        this.regionControl.setValue(params['region'], { emitEvent: false });
      }
      if (params['activeStatus']) {
        this.activeStatusControl.setValue(params['activeStatus'], { emitEvent: false });
      }
      if (params['referredBy']) {
        this.referredByControl.setValue(params['referredBy'], { emitEvent: false });
      }
      if (params['crewId']) {
        this.crewControl.setValue(params['crewId'], { emitEvent: false });
      }
      // Load pagination from URL
      if (params['page']) {
        this.pageIndex = parseInt(params['page'], 10);
      }
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize'], 10);
      }
      // Apply the hydrated filters once to the store.
      this.applyFilters();
    });

    // Load technicians on init
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));

    // Load crews and jobs: the crew-name fallback (selectTechnicianCrewMap) and the
    // Pipeline/Schedule tab's current-job labels (selectTechnicianCurrentJobMap) are
    // derived by joining technician → crew → active job from these slices.
    this.store.dispatch(CrewActions.loadCrews({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.applyFilters();
      });
    
    // Setup filter controls
    this.roleControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.availabilityControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.regionControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.activeStatusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.referredByControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.crewControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    // Extract unique regions, referrers, and crews from all technicians
    this.technicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        const regionsSet = new Set<string>();
        const referrersSet = new Set<string>();
        const crewMap = new Map<string, string>(); // crewId → crewName
        technicians.forEach(tech => {
          if (tech.region) {
            regionsSet.add(tech.region);
          }
          if (tech.referredBy) {
            referrersSet.add(tech.referredBy);
          }
          if (tech.crew?.crewId) {
            crewMap.set(tech.crew.crewId, tech.crew.crewName || tech.crew.crewId);
          }
        });
        this.availableRegions = Array.from(regionsSet).sort();
        this.availableReferrers = Array.from(referrersSet).sort();
        this.availableCrewOptions = Array.from(crewMap, ([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      });

    // Subscribe to technician → current job map (used by the Pipeline/Schedule tab cards)
    this.store.select(selectTechnicianCurrentJobMap)
      .pipe(takeUntil(this.destroy$))
      .subscribe(jobMap => {
        this.technicianJobMap = jobMap;
      });

    // Subscribe to technician → crew name map
    this.store.select(selectTechnicianCrewMap)
      .pipe(takeUntil(this.destroy$))
      .subscribe(crewMap => {
        this.technicianCrewMap = crewMap;
        // Extract unique crew names for the pipeline filter dropdown
        const crewNames = new Set<string>(Object.values(crewMap));
        this.availableCrews = Array.from(crewNames).sort();
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  applyFilters(): void {
    const filters: TechnicianFilters = {
      searchTerm: this.searchControl.value || undefined,
      role: (this.roleControl.value as TechnicianRole) || undefined,
      isAvailable: this.availabilityControl.value || undefined,
      region: this.regionControl.value || undefined,
      referredBy: this.referredByControl.value || undefined,
      isActive: this.activeStatusControl.value === 'active' ? true 
        : this.activeStatusControl.value === 'inactive' ? false 
        : undefined,
      crewId: this.crewControl.value || undefined,
      page: this.pageIndex,
      pageSize: this.pageSize
    };
    
    this.store.dispatch(TechnicianActions.setTechnicianFilters({ filters }));
    
    // Reset to page 1 when filters change (but not when pagination changes)
    const isFilterChange = this.searchControl.value || this.roleControl.value || 
                          this.availabilityControl.value;
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
    // Set each param to its value, or null so Angular's 'merge' handling REMOVES
    // it from the URL. Omitting a cleared param would leave the stale value in the
    // URL, which the queryParams subscription would then re-apply — making filters
    // impossible to remove individually.
    const queryParams: any = {
      search: this.searchControl.value || null,
      role: this.roleControl.value || null,
      available: this.availabilityControl.value ? 'true' : null,
      region: this.regionControl.value || null,
      activeStatus: this.activeStatusControl.value || null,
      referredBy: this.referredByControl.value || null,
      crewId: this.crewControl.value || null,
      page: this.pageIndex > 0 ? this.pageIndex.toString() : null,
      pageSize: this.pageSize !== 50 ? this.pageSize.toString() : null
    };

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
    if (this.roleControl.value) {
      filters.push({ label: 'Role', value: this.roleControl.value, key: 'role' });
    }
    if (this.availabilityControl.value) {
      filters.push({ label: 'Availability', value: 'Available Only', key: 'available' });
    }
    if (this.regionControl.value) {
      filters.push({ label: 'Region', value: this.regionControl.value, key: 'region' });
    }
    if (this.referredByControl.value) {
      filters.push({ label: 'Referred By', value: this.referredByControl.value, key: 'referredBy' });
    }
    if (this.crewControl.value) {
      const crewName = this.availableCrewOptions.find(c => c.id === this.crewControl.value)?.name
        || this.crewControl.value;
      filters.push({ label: 'Crew', value: crewName, key: 'crewId' });
    }
    if (this.activeStatusControl.value) {
      const statusLabel = this.activeStatusControl.value === 'active' ? 'Active' : 'Inactive';
      filters.push({ label: 'Status', value: statusLabel, key: 'activeStatus' });
    }
    
    return filters;
  }

  /**
   * Remove a specific filter
   */
  removeFilter(key: string, event?: Event): void {
    event?.stopPropagation();
    switch (key) {
      case 'search':
        this.searchControl.setValue('');
        break;
      case 'role':
        this.roleControl.setValue('');
        break;
      case 'available':
        this.availabilityControl.setValue(false);
        break;
      case 'region':
        this.regionControl.setValue('');
        break;
      case 'referredBy':
        this.referredByControl.setValue('');
        break;
      case 'crewId':
        this.crewControl.setValue('');
        break;
      case 'activeStatus':
        this.activeStatusControl.setValue('');
        break;
    }
    this.applyFilters();
  }
  
  clearFilters(): void {
    this.searchControl.setValue('');
    this.roleControl.setValue('');
    this.availabilityControl.setValue(false);
    this.regionControl.setValue('');
    this.referredByControl.setValue('');
    this.crewControl.setValue('');
    this.activeStatusControl.setValue('');
    this.pageIndex = 0; // Reset to first page
    this.store.dispatch(TechnicianActions.clearTechnicianFilters());
  }

  /**
   * Crew display name for a technician — prefers the backend-provided crew
   * (authoritative, returned by the list endpoint) and falls back to the
   * client-side crew map derived from the loaded crews slice.
   */
  getCrewName(technician: Technician): string {
    return technician.crew?.crewName || this.technicianCrewMap[technician.id] || '—';
  }
  
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }
  
  viewTechnician(technician: Technician): void {
    this.store.dispatch(TechnicianActions.selectTechnician({ id: technician.id }));
    this.router.navigate(['./', technician.id], { relativeTo: this.route });
  }
  
  /**
   * Opens the technician modal in "add" mode and dispatches a create on submit.
   */
  onAddTechnician(): void {
    const dialogRef = this.dialog.open(AddTechnicianModalComponent, {
      width: '780px',
      maxWidth: '90vw',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((result: AddTechnicianModalResult) => {
      if (result) {
        const dto = AddTechnicianModalComponent.toDto(result);
        this.store.dispatch(TechnicianActions.createTechnician({ technician: dto }));
        this.snackBar.open('Creating technician...', 'Close', { duration: 2000 });
      }
    });
  }

  editTechnician(technician: Technician): void {
    this.store.dispatch(TechnicianActions.selectTechnician({ id: technician.id }));

    // Fetch skills / certifications / availability so they can be edited in the modal
    const now = new Date();
    const dateRange = {
      startDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
    };

    forkJoin({
      skills: this.technicianService.getTechnicianSkills(technician.id).pipe(catchError(() => of([] as Skill[]))),
      certifications: this.technicianService.getTechnicianCertifications(technician.id).pipe(catchError(() => of([] as Certification[]))),
      availability: this.technicianService.getTechnicianAvailability(technician.id, dateRange).pipe(catchError(() => of([] as Availability[])))
    }).subscribe(({ skills, certifications, availability }) => {
      const dialogRef = this.dialog.open(AddTechnicianModalComponent, {
        width: '780px',
        maxWidth: '90vw',
        disableClose: true,
        data: { technician, skills, certifications, availability }
      });

      dialogRef.afterClosed().subscribe((result: AddTechnicianModalResult) => {
        if (result) {
          const dto = AddTechnicianModalComponent.toDto(result, technician.id);
          this.store.dispatch(TechnicianActions.updateTechnician({ id: technician.id, technician: dto }));
          this.snackBar.open('Updating technician...', 'Close', { duration: 2000 });
        }
      });
    });
  }
  
  toggleTechnicianStatus(technician: Technician): void {
    this.store.dispatch(TechnicianActions.updateTechnician({
      id: technician.id,
      technician: { isActive: !technician.isActive }
    }));
  }

  deleteTechnician(technician: Technician): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Permanently Delete Technician',
        message: `Are you sure you want to PERMANENTLY delete technician "${this.getFullName(technician)}"? This will remove all associated data and cannot be undone. Consider deactivating instead if you want to preserve historical records.`,
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(TechnicianActions.deleteTechnician({ id: technician.id }));
        this.snackBar.open('Technician permanently deleted', 'Close', { duration: 3000 });
      }
    });
  }

  deactivateTechnician(technician: Technician): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Deactivate Technician',
        message: `Are you sure you want to deactivate technician "${this.getFullName(technician)}"? They will no longer appear in active lists or be available for assignments, but their records will be preserved.`,
        confirmText: 'Deactivate',
        cancelText: 'Cancel',
        variant: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(TechnicianActions.deactivateTechnician({ id: technician.id }));
        this.snackBar.open('Technician deactivated', 'Close', { duration: 3000 });
      }
    });
  }

  reactivateTechnician(technician: Technician): void {
    this.store.dispatch(TechnicianActions.reactivateTechnician({ id: technician.id }));
    this.snackBar.open('Technician reactivated', 'Close', { duration: 3000 });
  }
  
  getFullName(technician: Technician): string {
    return `${technician.firstName} ${technician.lastName}`;
  }

  retryLoad(): void {
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
  }
  
  getSkillNames(technician: Technician): string[] {
    return [];
  }
  
  getCurrentStatus(technician: Technician): string {
    if (technician.currentStatus && technician.currentStatus !== 'Available') {
      const statusMap: Record<string, string> = {
        OnSite: 'On Site',
        EnRoute: 'En Route',
        OffDuty: 'Off Duty'
      };
      return statusMap[technician.currentStatus] || technician.currentStatus;
    }
    return technician.isActive ? 'Active' : 'Inactive';
  }

  getFieldStatus(technician: Technician): { label: string; cssClass: string } | null {
    if (!technician.currentStatus || technician.currentStatus === 'Available') return null;
    const statusMap: Record<string, { label: string; cssClass: string }> = {
      OnSite: { label: 'On Site', cssClass: 'status-on-site' },
      EnRoute: { label: 'En Route', cssClass: 'status-en-route' },
      OffDuty: { label: 'Off Duty', cssClass: 'status-off-duty' }
    };
    return statusMap[technician.currentStatus] || null;
  }

  /**
   * Get travel willingness status for a technician
   */
  getTravelStatus(technician: Technician): { willing: boolean; label: string } {
    return {
      willing: false,
      label: 'Not Willing'
    };
  }

  /**
   * Get human-readable label for field status
   */
  getFieldStatusLabel(technician: Technician): string {
    const status = technician.fieldStatus || 'Available';
    switch (status) {
      case 'OnSite': return 'On Site';
      case 'EnRoute': return 'En Route';
      case 'Available': return 'Available';
      case 'ClockedOut': return 'Clocked Out';
      default: return status;
    }
  }

  /**
   * Get CSS class for field status badge styling
   */
  getFieldStatusClass(technician: Technician): string {
    const status = technician.fieldStatus || 'Available';
    switch (status) {
      case 'OnSite': return 'field-status-onsite';
      case 'EnRoute': return 'field-status-enroute';
      case 'Available': return 'field-status-available';
      case 'ClockedOut': return 'field-status-clockedout';
      default: return 'field-status-available';
    }
  }

  /**
   * Export technicians to CSV
   */
  exportToCSV(): void {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(technicians => {
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Region',
        'Status'
      ];

      const data = technicians.map(tech => [
        tech.id,
        this.getFullName(tech),
        tech.email,
        tech.phone,
        tech.role,
        tech.region,
        this.getCurrentStatus(tech)
      ]);

      // Add filter summary as comment
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? `Filters Applied: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')}`
        : 'No filters applied';

      const filename = this.exportService.generateTimestampFilename('technicians', 'csv');

      this.exportService.generateCSV({
        filename,
        headers: [filterSummary, '', ...headers],
        data: [[], [], ...data]
      });

      this.snackBar.open('Technicians exported to CSV successfully', 'Close', { duration: 3000 });
    });
  }

  /**
   * Export technicians to Excel (XLSX)
   */
  exportToXLSX(): void {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(async technicians => {
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Region',
        'Status'
      ];

      const data = technicians.map(tech => [
        tech.id,
        this.getFullName(tech),
        tech.email,
        tech.phone,
        tech.role,
        tech.region,
        this.getCurrentStatus(tech)
      ]);

      const filename = this.exportService.generateTimestampFilename('technicians', 'xlsx');

      try {
        await this.exportService.generateXLSX({
          filename,
          headers,
          data,
          sheetName: 'Technicians'
        });

        this.snackBar.open('Technicians exported to Excel successfully', 'Close', { duration: 3000 });
      } catch (error) {
        this.snackBar.open('Failed to export to Excel', 'Close', { duration: 5000 });
      }
    });
  }

  /**
   * Export technicians to PDF
   */
  async exportToPDF(): Promise<void> {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(async technicians => {
      const headers = [
        'ID',
        'Name',
        'Role',
        'Region',
        'Status'
      ];

      const data = technicians.map(tech => [
        tech.id,
        this.getFullName(tech),
        tech.role,
        tech.region,
        this.getCurrentStatus(tech)
      ]);

      // Add filter summary to title
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? ` (Filters: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')})`
        : '';

      const filename = this.exportService.generateTimestampFilename('technicians', 'pdf');

      try {
        await this.exportService.generatePDF({
          filename,
          title: `Technicians Report${filterSummary}`,
          headers,
          data,
          orientation: 'portrait'
        });

        this.snackBar.open('Technicians exported to PDF successfully', 'Close', { duration: 3000 });
      } catch (error) {
        this.snackBar.open('Failed to export to PDF', 'Close', { duration: 5000 });
      }
    });
  }

  // ─── Table Sort ──────────────────────────────────────────────────────────────

  onTableSort(column: string): void {
    if (this.tableSortColumn === column) {
      this.tableSortDirection = this.tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.tableSortColumn = column;
      this.tableSortDirection = 'asc';
    }
  }

  getTableSortIcon(column: string): string {
    if (this.tableSortColumn !== column) return '';
    return this.tableSortDirection === 'asc' ? '▲' : '▼';
  }

  getPaginatedTechnicians(technicians: Technician[]): Technician[] {
    let sorted = [...technicians];

    if (this.tableSortColumn) {
      sorted.sort((a, b) => {
        let aVal = '';
        let bVal = '';

        switch (this.tableSortColumn) {
          case 'name':
            aVal = this.getFullName(a).toLowerCase();
            bVal = this.getFullName(b).toLowerCase();
            break;
          case 'email':
            aVal = (a.email || '').toLowerCase();
            bVal = (b.email || '').toLowerCase();
            break;
          case 'phone':
            aVal = a.phone || '';
            bVal = b.phone || '';
            break;
          case 'role':
            aVal = a.role || '';
            bVal = b.role || '';
            break;
          case 'region':
            aVal = (a.region || '').toLowerCase();
            bVal = (b.region || '').toLowerCase();
            break;
          case 'fieldStatus':
            aVal = (a.fieldStatus || 'Available').toLowerCase();
            bVal = (b.fieldStatus || 'Available').toLowerCase();
            break;
          default:
            return 0;
        }

        const comparison = aVal.localeCompare(bVal);
        return this.tableSortDirection === 'asc' ? comparison : -comparison;
      });
    }

    const start = this.pageIndex * this.pageSize;
    return sorted.slice(start, start + this.pageSize);
  }

  // ─── Pipeline / Schedule View ────────────────────────────────────────────────

  filterByFieldStatus(status: string): void {
    this.pipelineStatusFilter = this.pipelineStatusFilter === status ? '' : status;
  }

  clearPipelineFilter(): void {
    this.pipelineStatusFilter = '';
  }

  clearPipelineFilters(): void {
    this.pipelineSearchControl.setValue('');
    this.pipelineCrewFilter = '';
    this.pipelineRegionFilter = '';
    this.pipelineRoleFilter = '';
    this.pipelineStatusFilter = '';
  }

  get hasPipelineFilters(): boolean {
    return !!(this.pipelineSearchControl.value || this.pipelineCrewFilter || this.pipelineRegionFilter || this.pipelineRoleFilter);
  }

  /**
   * Apply pipeline-specific filters (search, crew, region, role) to a list of technicians
   */
  private applyPipelineFilters(technicians: Technician[]): Technician[] {
    let filtered = technicians;

    // Text search filter
    const search = (this.pipelineSearchControl.value || '').toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(t => {
        const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
        const crew = (this.technicianCrewMap[t.id] || '').toLowerCase();
        return fullName.includes(search) || crew.includes(search) || (t.region || '').toLowerCase().includes(search);
      });
    }

    // Crew filter
    if (this.pipelineCrewFilter === 'assigned') {
      filtered = filtered.filter(t => !!this.technicianCrewMap[t.id]);
    } else if (this.pipelineCrewFilter === 'unassigned') {
      filtered = filtered.filter(t => !this.technicianCrewMap[t.id]);
    } else if (this.pipelineCrewFilter) {
      filtered = filtered.filter(t => this.technicianCrewMap[t.id] === this.pipelineCrewFilter);
    }

    // Region filter
    if (this.pipelineRegionFilter) {
      filtered = filtered.filter(t => t.region === this.pipelineRegionFilter);
    }

    // Role filter
    if (this.pipelineRoleFilter) {
      filtered = filtered.filter(t => t.role === this.pipelineRoleFilter);
    }

    return filtered;
  }

  getPipelineCount(technicians: Technician[], status: string): number {
    return technicians.filter(t => t.isActive && (t.fieldStatus || 'Available') === status).length;
  }

  getInactiveCount(technicians: Technician[]): number {
    return technicians.filter(t => !t.isActive).length;
  }

  getAvailableTechnicians(technicians: Technician[]): Technician[] {
    const base = technicians.filter(t => t.isActive && (!t.fieldStatus || t.fieldStatus === 'Available'));
    return this.applyPipelineFilters(base);
  }

  getEnRouteTechnicians(technicians: Technician[]): Technician[] {
    const base = technicians.filter(t => t.isActive && t.fieldStatus === 'EnRoute');
    return this.applyPipelineFilters(base);
  }

  getOnSiteTechnicians(technicians: Technician[]): Technician[] {
    const base = technicians.filter(t => t.isActive && t.fieldStatus === 'OnSite');
    return this.applyPipelineFilters(base);
  }

  getClockedOutTechnicians(technicians: Technician[]): Technician[] {
    const base = technicians.filter(t => t.isActive && t.fieldStatus === 'ClockedOut');
    return this.applyPipelineFilters(base);
  }
}
