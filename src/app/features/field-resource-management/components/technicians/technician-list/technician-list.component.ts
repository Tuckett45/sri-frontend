import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Technician, TechnicianRole } from '../../../models/technician.model';
import { TechnicianFilters } from '../../../models/dtos/filters.dto';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import { selectTechnicianCurrentJobMap, selectTechnicianCrewMap } from '../../../state/technicians/technician.selectors';
import { ExportService } from '../../../services/export.service';
import { UserRole } from '../../../../../models/role.enum';

@Component({
  selector: 'app-technician-list',
  templateUrl: './technician-list.component.html',
  styleUrls: ['./technician-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianListComponent implements OnInit, OnDestroy {
  technicians$: Observable<Technician[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  displayedColumns: string[] = ['name', 'role', 'region', 'crew', 'travelStatus', 'status', 'currentJob', 'actions'];
  
  // Expose UserRole enum for template
  UserRole = UserRole;
  
  // Search and filter controls
  searchControl = new FormControl('');
  roleControl = new FormControl('');
  availabilityControl = new FormControl(false);
  regionControl = new FormControl('');
  activeStatusControl = new FormControl('');
  
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];
  
  // Available options for filters
  roles = Object.values(TechnicianRole);
  availableRegions: string[] = []; // Will be populated from technicians
  
  // Current job map (technicianId → job label)
  technicianJobMap: Record<string, string> = {};
  
  // Crew map (technicianId → crew name)
  technicianCrewMap: Record<string, string> = {};
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private exportService: ExportService
  ) {
    this.technicians$ = this.store.select(TechnicianSelectors.selectFilteredTechnicians);
    this.loading$ = this.store.select(TechnicianSelectors.selectTechniciansLoading);
    this.error$ = this.store.select(TechnicianSelectors.selectTechniciansError);
  }
  
  ngOnInit(): void {
    // Load filters from URL query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) {
        this.searchControl.setValue(params['search']);
      }
      if (params['role']) {
        this.roleControl.setValue(params['role']);
      }
      if (params['available']) {
        this.availabilityControl.setValue(params['available'] === 'true');
      }
      if (params['region']) {
        this.regionControl.setValue(params['region']);
      }
      if (params['activeStatus']) {
        this.activeStatusControl.setValue(params['activeStatus']);
      }
      // Load pagination from URL
      if (params['page']) {
        this.pageIndex = parseInt(params['page'], 10);
      }
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize'], 10);
      }
    });

    // Load technicians on init
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    
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
    
    // Extract unique regions from all technicians
    this.technicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        const regionsSet = new Set<string>();
        technicians.forEach(tech => {
          if (tech.region) {
            regionsSet.add(tech.region);
          }
        });
        this.availableRegions = Array.from(regionsSet).sort();
      });

    // Subscribe to technician → current job map
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
      isActive: this.activeStatusControl.value === 'active' ? true 
        : this.activeStatusControl.value === 'inactive' ? false 
        : undefined,
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
    const queryParams: any = {};
    
    if (this.searchControl.value) {
      queryParams.search = this.searchControl.value;
    }
    if (this.roleControl.value) {
      queryParams.role = this.roleControl.value;
    }
    if (this.availabilityControl.value) {
      queryParams.available = 'true';
    }
    if (this.regionControl.value) {
      queryParams.region = this.regionControl.value;
    }
    if (this.activeStatusControl.value) {
      queryParams.activeStatus = this.activeStatusControl.value;
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
    if (this.roleControl.value) {
      filters.push({ label: 'Role', value: this.roleControl.value, key: 'role' });
    }
    if (this.availabilityControl.value) {
      filters.push({ label: 'Availability', value: 'Available Only', key: 'available' });
    }
    if (this.regionControl.value) {
      filters.push({ label: 'Region', value: this.regionControl.value, key: 'region' });
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
  removeFilter(key: string): void {
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
    this.activeStatusControl.setValue('');
    this.pageIndex = 0; // Reset to first page
    this.store.dispatch(TechnicianActions.clearTechnicianFilters());
  }
  
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters();
  }
  
  viewTechnician(technician: Technician): void {
    this.store.dispatch(TechnicianActions.selectTechnician({ id: technician.id }));
    // Navigation will be handled by routing
  }
  
  editTechnician(technician: Technician): void {
    this.store.dispatch(TechnicianActions.selectTechnician({ id: technician.id }));
    // Navigation will be handled by routing
  }
  
  toggleTechnicianStatus(technician: Technician): void {
    this.store.dispatch(TechnicianActions.updateTechnician({
      id: technician.id,
      technician: { isActive: !technician.isActive }
    }));
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
    return technician.isActive ? 'Active' : 'Inactive';
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
}
