import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';

import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { JobFilters } from '../../../models/dtos/filters.dto';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { BatchStatusDialogComponent } from '../../shared/batch-status-dialog/batch-status-dialog.component';
import { BatchTechnicianDialogComponent } from '../../shared/batch-technician-dialog/batch-technician-dialog.component';
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
export class JobListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

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
  dateRange: { start: Date | null; end: Date | null } = { start: null, end: null };

  // Enum references for template
  JobStatus = JobStatus;
  JobType = JobType;
  Priority = Priority;
  UserRole = UserRole;

  // Enum arrays for dropdowns
  statusOptions = Object.values(JobStatus);
  priorityOptions = Object.values(Priority);
  jobTypeOptions = Object.values(JobType);

  // Filtered and paginated jobs
  displayedJobs: Job[] = [];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private exportService: ExportService,
    private authService: AuthService
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

    // Subscribe to jobs for pagination
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(jobs => {
      this.totalJobs = jobs.length;
      this.updateDisplayedJobs(jobs);
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
    this.dateRange = { start: null, end: null };
    this.store.dispatch(JobActions.clearJobFilters());
    this.pageIndex = 0;
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
   * Navigate to job assignment dialog
   */
  assignJob(job: Job): void {
    this.router.navigate(['/field-resource-management/jobs', job.id, 'assign']);
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
   * Get assigned technician names for a job
   */
  getAssignedTechnicians(job: Job): string {
    // This is a placeholder - in a real implementation, this would
    // join with assignment state to get technician names
    return 'N/A';
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
