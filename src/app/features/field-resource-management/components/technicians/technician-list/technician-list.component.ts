import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Technician, TechnicianRole } from '../../../models/technician.model';
import { TechnicianFilters } from '../../../models/dtos/filters.dto';
import { TravelProfile } from '../../../models/travel.model';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import { selectAllTravelProfiles } from '../../../state/travel/travel.selectors';
import * as TravelActions from '../../../state/travel/travel.actions';
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
  
  displayedColumns: string[] = ['name', 'role', 'skills', 'travelStatus', 'status', 'actions'];
  
  // Expose UserRole enum for template
  UserRole = UserRole;
  
  // Search and filter controls
  searchControl = new FormControl('');
  roleControl = new FormControl('');
  skillsControl = new FormControl([]);
  availabilityControl = new FormControl(false);
  travelWillingnessControl = new FormControl('');
  
  // Travel profiles map for display
  travelProfilesMap: Map<string, TravelProfile> = new Map();
  
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];
  
  // Available options for filters
  roles = Object.values(TechnicianRole);
  availableSkills: string[] = []; // Will be populated from technicians
  
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
      if (params['skills']) {
        const skills = params['skills'].split(',');
        this.skillsControl.setValue(skills);
      }
      if (params['available']) {
        this.availabilityControl.setValue(params['available'] === 'true');
      }
      if (params['travelWillingness']) {
        this.travelWillingnessControl.setValue(params['travelWillingness']);
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
    
    // Load travel profiles for all technicians
    this.store.dispatch(TravelActions.loadAllTravelProfiles());
    
    // Subscribe to travel profiles to build the map
    this.store.select(selectAllTravelProfiles)
      .pipe(takeUntil(this.destroy$))
      .subscribe(profiles => {
        this.travelProfilesMap.clear();
        profiles.forEach(profile => {
          this.travelProfilesMap.set(profile.technicianId, profile);
        });
      });
    
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
    
    this.skillsControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.availabilityControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    this.travelWillingnessControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
    
    // Extract unique skills from all technicians
    this.technicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        const skillsSet = new Set<string>();
        technicians.forEach(tech => {
          tech.skills.forEach(skill => skillsSet.add(skill.name));
        });
        this.availableSkills = Array.from(skillsSet).sort();
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
      skills: this.skillsControl.value && this.skillsControl.value.length > 0 
        ? this.skillsControl.value 
        : undefined,
      isAvailable: this.availabilityControl.value || undefined,
      page: this.pageIndex,
      pageSize: this.pageSize
    };
    
    this.store.dispatch(TechnicianActions.setTechnicianFilters({ filters }));
    
    // Reset to page 1 when filters change (but not when pagination changes)
    const isFilterChange = this.searchControl.value || this.roleControl.value || 
                          (this.skillsControl.value && this.skillsControl.value.length > 0) ||
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
    if (this.skillsControl.value && this.skillsControl.value.length > 0) {
      queryParams.skills = this.skillsControl.value.join(',');
    }
    if (this.availabilityControl.value) {
      queryParams.available = 'true';
    }
    if (this.travelWillingnessControl.value) {
      queryParams.travelWillingness = this.travelWillingnessControl.value;
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
    if (this.skillsControl.value && this.skillsControl.value.length > 0) {
      filters.push({ 
        label: 'Skills', 
        value: this.skillsControl.value.join(', '), 
        key: 'skills' 
      });
    }
    if (this.availabilityControl.value) {
      filters.push({ label: 'Availability', value: 'Available Only', key: 'available' });
    }
    if (this.travelWillingnessControl.value) {
      const travelLabel = this.travelWillingnessControl.value === 'willing' 
        ? 'Willing to Travel' 
        : 'Not Willing to Travel';
      filters.push({ label: 'Travel', value: travelLabel, key: 'travelWillingness' });
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
      case 'skills':
        this.skillsControl.setValue([]);
        break;
      case 'available':
        this.availabilityControl.setValue(false);
        break;
      case 'travelWillingness':
        this.travelWillingnessControl.setValue('');
        break;
    }
    this.applyFilters();
  }
  
  clearFilters(): void {
    this.searchControl.setValue('');
    this.roleControl.setValue('');
    this.skillsControl.setValue([]);
    this.availabilityControl.setValue(false);
    this.travelWillingnessControl.setValue('');
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
  
  getSkillNames(technician: Technician): string[] {
    return technician.skills.map(skill => skill.name);
  }
  
  getCurrentStatus(technician: Technician): string {
    return technician.isActive ? 'Active' : 'Inactive';
  }

  /**
   * Get travel willingness status for a technician
   */
  getTravelStatus(technician: Technician): { willing: boolean; label: string } | null {
    const profile = this.travelProfilesMap.get(technician.id);
    if (!profile) {
      return null;
    }
    return {
      willing: profile.willingToTravel,
      label: profile.willingToTravel ? 'Willing' : 'Not Willing'
    };
  }

  /**
   * Export technicians to CSV
   */
  exportToCSV(): void {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(technicians => {
      const headers = [
        'Technician ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Employment Type',
        'Home Base',
        'Region',
        'Skills',
        'Status'
      ];

      const data = technicians.map(tech => [
        tech.technicianId,
        this.getFullName(tech),
        tech.email,
        tech.phone,
        tech.role,
        tech.employmentType,
        tech.homeBase,
        tech.region,
        this.getSkillNames(tech).join('; '),
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
        'Skills',
        'Status'
      ];

      const data = technicians.map(tech => [
        tech.technicianId,
        this.getFullName(tech),
        tech.role,
        this.getSkillNames(tech).slice(0, 3).join(', ') + (tech.skills.length > 3 ? '...' : ''),
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
