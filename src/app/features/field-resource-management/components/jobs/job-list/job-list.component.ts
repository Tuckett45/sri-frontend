import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';

import { Job, JobStatus, JobType, Priority, JobReadiness, CustomerReady } from '../../../models/job.model';
import { JobFilters } from '../../../models/dtos/filters.dto';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { selectActiveAssignments } from '../../../state/assignments/assignment.selectors';
import { selectTechnicianEntities } from '../../../state/technicians/technician.selectors';
import { loadAssignments } from '../../../state/assignments/assignment.actions';
import { assignTechnician } from '../../../state/assignments/assignment.actions';
import { loadTechnicians } from '../../../state/technicians/technician.actions';
import { loadCrews } from '../../../state/crews/crew.actions';
import { selectAllCrews } from '../../../state/crews/crew.selectors';
import { selectCrewEntities } from '../../../state/crews/crew.selectors';
import { Technician } from '../../../models/technician.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { BatchStatusDialogComponent } from '../../shared/batch-status-dialog/batch-status-dialog.component';
import { BatchTechnicianDialogComponent } from '../../shared/batch-technician-dialog/batch-technician-dialog.component';
import { AssignJobDialogComponent } from '../../shared/assign-job-dialog/assign-job-dialog.component';
import { JobFormComponent } from '../job-form/job-form.component';
import { ExportService } from '../../../services/export.service';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';

/**
 * Job List Component
 * 
 * Displays a paginated, searchable, and filterable list of jobs.
 * Supports batch operations for selected jobs.
 * 
 * Features:
 * - Paginated job list using mat-table
 * - Search with debounce (300ms)
 * - Multiple filters: status, priority, job type, date range
 * - Batch selection with checkboxes
 * - Batch operations: view, edit, assign, delete
 * - Integration with NgRx job state
 * 
 * Requirements: 3.1-3.8, 16.1, 16.3, 21.1-21.2
 */
@Component({
  selector: 'frm-job-list',
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobListComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;

  /** true when the table is scrolled horizontally — used to shrink the sticky Job ID column */
  isScrolled = false;

  // Observable data
  jobs$: Observable<Job[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  filters$: Observable<JobFilters>;

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'jobId',
    'client',
    'siteName',
    'jobType',
    'status',
    'priority',
    'scheduledDate',
    'assignedTechnicians',
    'actions'
  ];

  // Selection model for batch operations
  selection = new SelectionModel<Job>(true, []);

  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];
  totalJobs = 0;

  // Filter values
  searchTerm = '';
  selectedStatus: JobStatus | null = null;
  selectedPriority: Priority | null = null;
  selectedJobType: JobType | null = null;
  selectedClient: string | null = null;
  selectedMarket: string | null = null;
  selectedJobReadiness: JobReadiness | null = null;
  selectedCustomerReady: CustomerReady | null = null;
  dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };

  // Dynamic dropdown options
  clientOptions: string[] = [];
  marketOptions: string[] = [];

  // Enum references for template
  JobStatus = JobStatus;
  JobType = JobType;
  Priority = Priority;
  UserRole = UserRole;
  JobReadiness = JobReadiness;
  CustomerReady = CustomerReady;

  // Enum arrays for dropdowns
  statusOptions = Object.values(JobStatus);
  priorityOptions = Object.values(Priority);
  jobTypeOptions = Object.values(JobType);
  jobReadinessOptions = Object.values(JobReadiness);
  customerReadyOptions = Object.values(CustomerReady);

  // Filtered and paginated jobs
  displayedJobs: Job[] = [];

  // Technician names lookup by job ID
  private techniciansByJobId: Record<string, string> = {};

  // Crew names lookup by job ID
  private crewByJobId: Record<string, string> = {};

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private exportService: ExportService,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    this.jobs$ = this.store.select(JobSelectors.selectFilteredJobs);
    this.loading$ = this.store.select(JobSelectors.selectJobsLoading);
    this.error$ = this.store.select(JobSelectors.selectJobsError);
    this.filters$ = this.store.select(JobSelectors.selectJobFilters);
  }

  ngOnInit(): void {
    // Add market column for Admin users
    if (this.authService.isAdmin()) {
      const actionsIndex = this.displayedColumns.indexOf('actions');
      if (actionsIndex > -1) {
        this.displayedColumns.splice(actionsIndex, 0, 'market');
      }
    }
    // Load filters from URL query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      if (params['status']) {
        this.selectedStatus = params['status'] as JobStatus;
      }
      if (params['priority']) {
        this.selectedPriority = params['priority'] as Priority;
      }
      if (params['jobType']) {
        this.selectedJobType = params['jobType'] as JobType;
      }
      if (params['startDate'] && params['endDate']) {
        this.dateRange = {
          start: new Date(params['startDate']),
          end: new Date(params['endDate'])
        };
      }
      // Load pagination from URL
      if (params['page']) {
        this.pageIndex = parseInt(params['page'], 10);
      }
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize'], 10);
      }
    });

    // Load jobs on init
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));

    // Load supporting data only if not already in the store
    this.store.select(selectTechnicianEntities).pipe(take(1)).subscribe(entities => {
      if (Object.keys(entities).length === 0) {
        this.store.dispatch(loadTechnicians({}));
      }
    });

    this.store.select(selectActiveAssignments).pipe(take(1)).subscribe(assignments => {
      if (assignments.length === 0) {
        this.store.dispatch(loadAssignments({}));
      }
    });

    this.store.select(selectAllCrews).pipe(take(1)).subscribe(crews => {
      if (crews.length === 0) {
        this.store.dispatch(loadCrews({}));
      }
    });

    // Build technician and crew lookups per job
    combineLatest([
      this.store.select(selectActiveAssignments),
      this.store.select(selectTechnicianEntities),
      this.store.select(selectCrewEntities),
      this.store.select(JobSelectors.selectAllJobs)
    ]).pipe(takeUntil(this.destroy$)).subscribe(([assignments, techEntities, crewEntities, jobs]) => {
      const techMap: Record<string, string[]> = {};
      for (const a of assignments) {
        const tech = techEntities[a.technicianId] as Technician | undefined;
        if (tech) {
          if (!techMap[a.jobId]) {
            techMap[a.jobId] = [];
          }
          techMap[a.jobId].push(`${tech.firstName} ${tech.lastName}`);
        }
      }
      const result: Record<string, string> = {};
      for (const jobId of Object.keys(techMap)) {
        result[jobId] = techMap[jobId].join(', ');
      }
      this.techniciansByJobId = result;

      // Build crew lookup from job.crewId
      const crewResult: Record<string, string> = {};
      for (const job of jobs) {
        if (job.crewId) {
          const crew = crewEntities[job.crewId];
          if (crew) {
            crewResult[job.id] = crew.name;
          }
        }
      }
      this.crewByJobId = crewResult;
    });

    // Subscribe to jobs for pagination and dynamic filter options
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(jobs => {
      this.totalJobs = jobs.length;
      this.updateDisplayedJobs(jobs);
    });

    // Populate dynamic filter options from all jobs
    this.store.select(JobSelectors.selectAllJobs).pipe(takeUntil(this.destroy$)).subscribe(allJobs => {
      this.clientOptions = [...new Set(allJobs.map(j => j.client).filter(Boolean))].sort();
      this.marketOptions = [...new Set(allJobs.map(j => j.market).filter(Boolean))].sort();
    });

    // Setup search debounce
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });

    // Subscribe to error state
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.snackBar.open(`Error: ${error}`, 'Close', { duration: 5000 });
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.tableContainer) {
      // Run scroll listener outside Angular zone for performance
      this.ngZone.runOutsideAngular(() => {
        this.tableContainer.nativeElement.addEventListener('scroll', () => {
          const scrolled = this.tableContainer.nativeElement.scrollLeft > 20;
          if (scrolled !== this.isScrolled) {
            this.isScrolled = scrolled;
            // Toggle a CSS class directly to avoid change detection on every scroll frame
            this.tableContainer.nativeElement.classList.toggle('is-scrolled', scrolled);
          }
        }, { passive: true });
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle search input
   */
  onSearchChange(searchTerm: string): void {
    this.searchSubject$.next(searchTerm);
  }

  /**
   * Apply filters to job list
   */
  applyFilters(): void {
    const filters: JobFilters = {
      searchTerm: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
      priority: this.selectedPriority || undefined,
      jobType: this.selectedJobType || undefined,
      client: this.selectedClient || undefined,
      region: this.selectedMarket || undefined,
      jobReadiness: this.selectedJobReadiness || undefined,
      customerReady: this.selectedCustomerReady || undefined,
      dateRange: (this.dateRange.start && this.dateRange.end) ? {
        startDate: this.dateRange.start,
        endDate: this.dateRange.end
      } : undefined,
      page: this.pageIndex,
      pageSize: this.pageSize
    };

    this.store.dispatch(JobActions.setJobFilters({ filters }));
    
    // Reset to first page when filters change (not when pagination changes)
    const hasActiveFilters = this.searchTerm || this.selectedStatus || 
                            this.selectedPriority || this.selectedJobType ||
                            this.selectedClient || this.selectedMarket ||
                            this.selectedJobReadiness || this.selectedCustomerReady ||
                            (this.dateRange.start && this.dateRange.end);
    if (hasActiveFilters && this.pageIndex !== 0) {
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
    
    if (this.searchTerm) {
      queryParams.search = this.searchTerm;
    }
    if (this.selectedStatus) {
      queryParams.status = this.selectedStatus;
    }
    if (this.selectedPriority) {
      queryParams.priority = this.selectedPriority;
    }
    if (this.selectedJobType) {
      queryParams.jobType = this.selectedJobType;
    }
    if (this.dateRange.start && this.dateRange.end) {
      queryParams.startDate = this.dateRange.start.toISOString();
      queryParams.endDate = this.dateRange.end.toISOString();
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
    
    if (this.searchTerm) {
      filters.push({ label: 'Search', value: this.searchTerm, key: 'search' });
    }
    if (this.selectedStatus) {
      filters.push({ label: 'Status', value: this.selectedStatus, key: 'status' });
    }
    if (this.selectedPriority) {
      filters.push({ label: 'Priority', value: this.selectedPriority, key: 'priority' });
    }
    if (this.selectedJobType) {
      filters.push({ label: 'Job Type', value: this.selectedJobType, key: 'jobType' });
    }
    if (this.selectedClient) {
      filters.push({ label: 'Client', value: this.selectedClient, key: 'client' });
    }
    if (this.selectedMarket) {
      filters.push({ label: 'Market', value: this.selectedMarket, key: 'market' });
    }
    if (this.selectedJobReadiness) {
      filters.push({ label: 'Job Readiness', value: this.selectedJobReadiness.replace(/_/g, ' '), key: 'jobReadiness' });
    }
    if (this.selectedCustomerReady) {
      filters.push({ label: 'Customer Ready', value: this.selectedCustomerReady.replace(/_/g, ' '), key: 'customerReady' });
    }
    if (this.dateRange.start && this.dateRange.end) {
      const dateStr = `${this.formatDate(this.dateRange.start)} - ${this.formatDate(this.dateRange.end)}`;
      filters.push({ label: 'Date Range', value: dateStr, key: 'dateRange' });
    }
    
    return filters;
  }

  /**
   * Remove a specific filter
   */
  removeFilter(key: string): void {
    switch (key) {
      case 'search':
        this.searchTerm = '';
        break;
      case 'status':
        this.selectedStatus = null;
        break;
      case 'priority':
        this.selectedPriority = null;
        break;
      case 'jobType':
        this.selectedJobType = null;
        break;
      case 'client':
        this.selectedClient = null;
        break;
      case 'market':
        this.selectedMarket = null;
        break;
      case 'jobReadiness':
        this.selectedJobReadiness = null;
        break;
      case 'customerReady':
        this.selectedCustomerReady = null;
        break;
      case 'dateRange':
        this.dateRange = { start: null, end: null };
        break;
    }
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = null;
    this.selectedPriority = null;
    this.selectedJobType = null;
    this.selectedClient = null;
    this.selectedMarket = null;
    this.selectedJobReadiness = null;
    this.selectedCustomerReady = null;
    this.dateRange = { start: null, end: null };
    this.store.dispatch(JobActions.clearJobFilters());
    this.pageIndex = 0;
  }

  /**
   * Retry loading jobs after an error
   */
  retryLoad(): void {
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
  }

  /**
   * Update displayed jobs based on pagination
   */
  private updateDisplayedJobs(jobs: Job[]): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedJobs = jobs.slice(startIndex, endIndex);
  }

  /**
   * Handle page change
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(jobs => {
      this.updateDisplayedJobs(jobs);
    });
  }

  /**
   * Check if all displayed jobs are selected
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.displayedJobs.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Toggle all displayed jobs selection
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.displayedJobs.forEach(job => this.selection.select(job));
    }
  }

  /**
   * Check if some but not all jobs are selected
   */
  isIndeterminate(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.displayedJobs.length;
    return numSelected > 0 && numSelected < numRows;
  }

  /**
   * Get selected job count
   */
  get selectedCount(): number {
    return this.selection.selected.length;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection.clear();
  }

  /**
   * Navigate to job detail view
   */
  viewJob(job: Job): void {
    this.router.navigate(['/field-resource-management/jobs', job.id]);
  }

  /**
   * Navigate to job edit form
   */
  editJob(job: Job): void {
    const dialogRef = this.dialog.open(JobFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'job-form-dialog',
      autoFocus: false,
      data: { jobId: job.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.applyFilters();
      }
    });
  }

  /**
   * Open assignment dialog for a single job (technician and/or crew)
   */
  assignJob(job: Job): void {
    const dialogRef = this.dialog.open(AssignJobDialogComponent, {
      width: '600px',
      data: {
        jobId: job.id,
        jobTitle: job.jobId,
        currentCrewId: job.crewId || undefined
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Build the job update payload
        const jobUpdate: any = {};

        if (result.technicianId) {
          // Create the assignment record
          this.store.dispatch(assignTechnician({
            jobId: job.id,
            technicianId: result.technicianId
          }));
          // Also set the technicianId on the job itself
          jobUpdate.technicianId = result.technicianId;
        }

        if (result.crewId) {
          jobUpdate.crewId = result.crewId;
        }

        // Update the job record with technicianId and/or crewId
        if (Object.keys(jobUpdate).length > 0) {
          this.store.dispatch(JobActions.updateJob({
            id: job.id,
            job: jobUpdate
          }));
        }

        const parts: string[] = [];
        if (result.technicianId) parts.push('lead technician');
        if (result.crewId) parts.push('crew');
        this.snackBar.open(
          `Assigning ${parts.join(' and ')} to ${job.jobId}...`,
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * Delete a single job
   */
  deleteJob(job: Job): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Job',
        message: `Are you sure you want to delete job ${job.jobId}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(JobActions.deleteJob({ id: job.id }));
        this.snackBar.open('Job deleted successfully', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Navigate to create new job
   */
  createJob(): void {
    const dialogRef = this.dialog.open(JobFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'job-form-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.applyFilters();
      }
    });
  }

  /**
   * Batch delete selected jobs
   */
  batchDelete(): void {
    const selectedJobs = this.selection.selected;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Jobs',
        message: `Are you sure you want to delete ${selectedJobs.length} job(s)? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const jobIds = selectedJobs.map(job => job.id);
        this.store.dispatch(JobActions.batchDelete({ jobIds }));
        
        // Show progress message
        this.snackBar.open(
          `Deleting ${jobIds.length} job(s)...`,
          'Close',
          { duration: 2000 }
        );
        
        this.clearSelection();
      }
    });
  }

  /**
   * Batch assign selected jobs
   */
  batchAssign(): void {
    const selectedJobs = this.selection.selected;
    const dialogRef = this.dialog.open(BatchTechnicianDialogComponent, {
      width: '600px',
      data: {
        selectedCount: selectedJobs.length
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const jobIds = selectedJobs.map(job => job.id);
        this.store.dispatch(JobActions.batchReassign({
          jobIds,
          technicianId: result.technicianId
        }));
        
        // Show progress message
        this.snackBar.open(
          `Assigning ${jobIds.length} job(s) to technician...`,
          'Close',
          { duration: 2000 }
        );
        
        this.clearSelection();
      }
    });
  }

  /**
   * Batch update status for selected jobs
   */
  batchUpdateStatus(): void {
    const selectedJobs = this.selection.selected;
    const dialogRef = this.dialog.open(BatchStatusDialogComponent, {
      width: '500px',
      data: {
        selectedCount: selectedJobs.length
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const jobIds = selectedJobs.map(job => job.id);
        this.store.dispatch(JobActions.batchUpdateStatus({
          jobIds,
          status: result.status,
          reason: result.reason
        }));
        
        // Show progress message
        this.snackBar.open(
          `Updating status for ${jobIds.length} job(s)...`,
          'Close',
          { duration: 2000 }
        );
        
        this.clearSelection();
      }
    });
  }

  /**
   * Get assigned technician/crew info for a job
   */
  getAssignedTechnicians(job: Job): string {
    const techName = this.techniciansByJobId[job.id];
    const crewName = this.crewByJobId[job.id];

    if (techName && crewName) {
      return `${techName} · ${crewName}`;
    }
    if (techName) {
      return techName;
    }
    if (crewName) {
      return crewName;
    }
    return 'Unassigned';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Get priority display text
   */
  getPriorityText(priority: Priority): string {
    return priority;
  }

  /**
   * Get priority CSS class
   */
  getPriorityClass(priority: Priority): string {
    const classMap: Record<Priority, string> = {
      [Priority.P1]: 'priority-critical',
      [Priority.P2]: 'priority-high',
      [Priority.Normal]: 'priority-normal'
    };
    return classMap[priority] || '';
  }

  /**
   * Format readiness enum values for display
   */
  formatReadiness(value: string | undefined): string {
    if (!value) return 'Not Set';
    return value.replace(/_/g, ' ');
  }

  /**
   * Export jobs to CSV
   */
  exportToCSV(): void {
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(jobs => {
      const headers = [
        'Job ID',
        'Client',
        'Site Name',
        'Site Address',
        'Status',
        'Priority',
        'Job Type',
        'Scheduled Start',
        'Scheduled End',
        'Crew Size',
        'Estimated Hours'
      ];

      const data = jobs.map(job => [
        job.jobId,
        job.client,
        job.siteName,
        `${job.siteAddress.street}, ${job.siteAddress.city}, ${job.siteAddress.state} ${job.siteAddress.zipCode}`,
        job.status,
        job.priority,
        job.jobType,
        this.exportService.formatDate(job.scheduledStartDate),
        this.exportService.formatDate(job.scheduledEndDate),
        job.requiredCrewSize.toString(),
        job.estimatedLaborHours.toString()
      ]);

      // Add filter summary as comment
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? `Filters Applied: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')}`
        : 'No filters applied';

      const filename = this.exportService.generateTimestampFilename('jobs', 'csv');

      this.exportService.generateCSV({
        filename,
        headers: [filterSummary, '', ...headers],
        data: [[], [], ...data]
      });

      this.snackBar.open('Jobs exported to CSV successfully', 'Close', { duration: 3000 });
    });
  }

  /**
   * Export jobs to PDF
   */
  async exportToPDF(): Promise<void> {
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(async jobs => {
      const headers = [
        'Job ID',
        'Client',
        'Site',
        'Status',
        'Priority',
        'Type',
        'Scheduled'
      ];

      const data = jobs.map(job => [
        job.jobId,
        job.client,
        job.siteName,
        job.status,
        job.priority,
        job.jobType,
        this.exportService.formatDate(job.scheduledStartDate)
      ]);

      // Add filter summary to title
      const activeFilters = this.getActiveFilters();
      const filterSummary = activeFilters.length > 0
        ? ` (Filters: ${activeFilters.map(f => `${f.label}: ${f.value}`).join(', ')})`
        : '';

      const filename = this.exportService.generateTimestampFilename('jobs', 'pdf');

      try {
        await this.exportService.generatePDF({
          filename,
          title: `Jobs Report${filterSummary}`,
          headers,
          data,
          orientation: 'landscape'
        });

        this.snackBar.open('Jobs exported to PDF successfully', 'Close', { duration: 3000 });
      } catch (error) {
        this.snackBar.open('Failed to export to PDF', 'Close', { duration: 5000 });
      }
    });
  }
}
