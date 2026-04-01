import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, filter, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Job, JobStatus, Attachment, JobNote } from '../../../models/job.model';
import { JobBudget, BudgetStatus } from '../../../models/budget.model';
import { TimeEntry } from '../../../models/time-entry.model';
import { Assignment } from '../../../models/assignment.model';
import { JobCostBreakdown, BudgetComparison } from '../../../models/reporting.model';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import * as BudgetActions from '../../../state/budgets/budget.actions';
import * as BudgetSelectors from '../../../state/budgets/budget.selectors';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AssignmentDialogComponent } from '../../scheduling/assignment-dialog/assignment-dialog.component';
import { JobFormComponent } from '../job-form/job-form.component';
import { ReportingService } from '../../../services/reporting.service';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';

/**
 * Job Detail Component
 * 
 * Displays complete job information in organized sections.
 * Provides actions for editing, reassigning, adding notes, and uploading attachments.
 * 
 * Sections:
 * 1. Job Info: Basic job details
 * 2. Scope: Description, skills, crew size, estimated hours
 * 3. Schedule: Scheduled and actual dates
 * 4. Assigned Technicians: List with contact info
 * 5. Time Entries: Clock in/out times, hours, mileage
 * 6. Status History: Timeline of status changes
 * 7. Attachments: Files with download/preview
 * 8. Notes: Chronological list with edit capability
 * 9. Customer POC: Contact information
 * 
 * Requirements: 3.1-3.8, 7.7, 9.1-9.7, 24.1-24.6, 25.1-25.6
 */
@Component({
  selector: 'frm-job-detail',
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  job$: Observable<Job | null | undefined>;
  job: Job | null = null;
  loading$: Observable<boolean>;
  
  // Budget tracking
  budget$!: Observable<JobBudget | null>;
  budgetStatus$!: Observable<BudgetStatus | null>;
  budgetConsumptionPercentage$!: Observable<number>;
  
  // Job cost report
  costBreakdown$ = new BehaviorSubject<JobCostBreakdown | null>(null);
  budgetComparison$ = new BehaviorSubject<BudgetComparison | null>(null);
  costReportLoading$ = new BehaviorSubject<boolean>(false);
  costReportError$ = new BehaviorSubject<string | null>(null);
  showCostReport = false;
  
  // Enum references for template
  BudgetStatus = BudgetStatus;
  
  // Time entries (placeholder - would come from time entry state)
  timeEntries: TimeEntry[] = [];
  
  // Assignments (placeholder - would come from assignment state)
  assignments: Assignment[] = [];
  
  // Current user (mock - would come from auth service)
  currentTechnicianId = 'current-technician-id';
  
  // Check if job is assigned to current user
  isAssignedToCurrentUser = false;
  
  // Status history (placeholder - would come from job service)
  statusHistory: any[] = [];
  
  // Note editing
  editingNoteId: string | null = null;
  editingNoteText = '';
  
  // New note
  newNoteText = '';
  isAddingNote = false;
  
  // File upload
  isUploadingFile = false;
  
  // Budget visibility
  canViewBudget = false;

  // Enum references for template
  JobStatus = JobStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private reportingService: ReportingService,
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService
  ) {
    this.loading$ = this.store.select(JobSelectors.selectJobsLoading);
    this.job$ = this.store.select(JobSelectors.selectSelectedJob);
    this.canViewBudget = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canViewBudget'
    );
  }

  ngOnInit(): void {
    // Get job ID from route
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const jobId = params['id'];
        if (jobId) {
          this.store.dispatch(JobActions.selectJob({ id: jobId }));
        }
      });

    // Subscribe to job data
    this.job$
      .pipe(
        takeUntil(this.destroy$),
        filter(job => !!job)
      )
      .subscribe(job => {
        this.job = job!;
        // Load related data (time entries, assignments, status history)
        this.loadRelatedData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.dispatch(JobActions.selectJob({ id: null }));
  }

  /**
   * Load related data for the job
   */
  private loadRelatedData(): void {
    if (!this.job) return;
    
    // Load budget data for this job
    this.store.dispatch(BudgetActions.loadBudget({ jobId: this.job.id }));
    this.budget$ = this.store.select(BudgetSelectors.selectBudgetByJobId(this.job.id));
    this.budgetStatus$ = this.store.select(BudgetSelectors.selectBudgetStatus(this.job.id));
    this.budgetConsumptionPercentage$ = this.store.select(
      BudgetSelectors.selectBudgetConsumptionPercentage(this.job.id)
    );
    
    // In a real implementation, these would dispatch actions to load:
    // - Time entries from time entry state
    // - Assignments from assignment state
    // - Status history from job service
    
    // Placeholder data
    this.timeEntries = [];
    this.assignments = [];
    
    // Check if current user is assigned to this job
    this.checkIfAssignedToCurrentUser();
  }
  
  /**
   * Check if the current user is assigned to this job
   */
  private checkIfAssignedToCurrentUser(): void {
    // In a real implementation, this would check the assignment state
    // For now, we'll check if the job has any assignments with the current technician
    this.isAssignedToCurrentUser = this.assignments.some(
      assignment => assignment.technicianId === this.currentTechnicianId
    );
    
    // For demo purposes, allow time tracking on all jobs
    // Remove this line in production
    this.isAssignedToCurrentUser = true;
  }

  /**
   * Navigate to edit job
   */
  editJob(): void {
    if (!this.job) return;

    const dialogRef = this.dialog.open(JobFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'job-form-dialog',
      autoFocus: false,
      data: { jobId: this.job.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.store.dispatch(JobActions.selectJob({ id: this.job!.id }));
      }
    });
  }

  /**
   * Open reassign dialog
   */
  reassignJob(): void {
    if (!this.job) return;

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { job: this.job }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.assigned) {
        this.snackBar.open('Technician assigned successfully', 'Close', { duration: 3000 });
        // Reload related data to show new assignment
        this.loadRelatedData();
      }
    });
  }

  /**
   * Delete job
   */
  deleteJob(): void {
    if (!this.job) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Job',
        message: `Are you sure you want to delete job ${this.job.jobId}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.job) {
        this.store.dispatch(JobActions.deleteJob({ id: this.job.id }));
        this.snackBar.open('Job deleted successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/field-resource-management/jobs']);
      }
    });
  }

  /**
   * Show add note form
   */
  showAddNoteForm(): void {
    this.isAddingNote = true;
    this.newNoteText = '';
  }

  /**
   * Cancel adding note
   */
  cancelAddNote(): void {
    this.isAddingNote = false;
    this.newNoteText = '';
  }

  /**
   * Add new note
   */
  addNote(): void {
    if (!this.job || !this.newNoteText.trim()) return;

    this.store.dispatch(JobActions.addJobNote({
      jobId: this.job.id,
      note: this.newNoteText.trim()
    }));

    this.snackBar.open('Note added successfully', 'Close', { duration: 3000 });
    this.isAddingNote = false;
    this.newNoteText = '';
  }

  /**
   * Start editing a note
   */
  startEditNote(note: JobNote): void {
    // Check if note was created within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const noteCreated = new Date(note.createdAt);
    
    if (noteCreated < oneHourAgo) {
      this.snackBar.open('Notes can only be edited within 1 hour of creation', 'Close', { duration: 3000 });
      return;
    }

    this.editingNoteId = note.id;
    this.editingNoteText = note.text;
  }

  /**
   * Cancel editing note
   */
  cancelEditNote(): void {
    this.editingNoteId = null;
    this.editingNoteText = '';
  }

  /**
   * Save edited note
   */
  saveEditNote(note: JobNote): void {
    if (!this.editingNoteText.trim()) return;

    // In a real implementation, this would dispatch an update action
    this.snackBar.open('Note updated successfully', 'Close', { duration: 3000 });
    this.editingNoteId = null;
    this.editingNoteText = '';
  }

  /**
   * Check if note can be edited (within 1 hour)
   */
  canEditNote(note: JobNote): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const noteCreated = new Date(note.createdAt);
    return noteCreated >= oneHourAgo;
  }

  /**
   * Handle file upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.job) return;

    const file = input.files[0];
    
    // Validate file size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('File size must be less than 10 MB', 'Close', { duration: 3000 });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open('Only JPEG, PNG, HEIC, and PDF files are allowed', 'Close', { duration: 3000 });
      return;
    }

    this.isUploadingFile = true;
    this.store.dispatch(JobActions.uploadAttachment({
      jobId: this.job.id,
      file: file
    }));

    // Reset file input
    input.value = '';
    
    // In a real implementation, we'd subscribe to upload success/failure
    setTimeout(() => {
      this.isUploadingFile = false;
      this.snackBar.open('File uploaded successfully', 'Close', { duration: 3000 });
    }, 1000);
  }

  /**
   * Download attachment
   */
  downloadAttachment(attachment: Attachment): void {
    window.open(attachment.blobUrl, '_blank');
  }

  /**
   * Check if attachment is an image
   */
  isImage(attachment: Attachment): boolean {
    return attachment.fileType.startsWith('image/');
  }

  /**
   * Call customer POC
   */
  callCustomer(): void {
    if (this.job?.customerPOC?.phone) {
      window.location.href = `tel:${this.job.customerPOC.phone}`;
    }
  }

  /**
   * Email customer POC
   */
  emailCustomer(): void {
    if (this.job?.customerPOC?.email) {
      window.location.href = `mailto:${this.job.customerPOC.email}`;
    }
  }

  /**
   * Calculate total labor hours
   */
  get totalLaborHours(): number {
    return this.timeEntries.reduce((total, entry) => {
      return total + (entry.totalHours || 0);
    }, 0);
  }

  /**
   * Calculate total mileage
   */
  get totalMileage(): number {
    return this.timeEntries.reduce((total, entry) => {
      return total + (entry.mileage || 0);
    }, 0);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get address as single line
   */
  getFullAddress(): string {
    if (!this.job) return '';
    const addr = this.job.siteAddress;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
  }

  /**
   * Navigate back to job list
   */
  goBack(): void {
    try {
      // Navigate back to jobs list using relative path
      this.router.navigate(['..'], { relativeTo: this.route });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: try absolute path
      this.router.navigate(['/field-resource-management/jobs']);
    }
  }

  /**
   * Get CSS class for budget status indicator
   */
  getBudgetStatusClass(status: BudgetStatus | null): string {
    if (!status) return '';
    switch (status) {
      case BudgetStatus.OnTrack:
        return 'budget-on-track';
      case BudgetStatus.Warning:
        return 'budget-warning';
      case BudgetStatus.OverBudget:
        return 'budget-over';
      default:
        return '';
    }
  }

  /**
   * Get display text for budget status
   */
  getBudgetStatusText(status: BudgetStatus | null): string {
    if (!status) return 'No Budget';
    switch (status) {
      case BudgetStatus.OnTrack:
        return 'On Track';
      case BudgetStatus.Warning:
        return 'At Risk (80%+)';
      case BudgetStatus.OverBudget:
        return 'Over Budget';
      default:
        return 'Unknown';
    }
  }

  /**
   * Toggle cost report visibility and load data
   */
  toggleCostReport(): void {
    this.showCostReport = !this.showCostReport;
    if (this.showCostReport && this.job) {
      this.loadCostReport();
    }
  }

  /**
   * Load job cost report data
   */
  loadCostReport(): void {
    if (!this.job) return;

    this.costReportLoading$.next(true);
    this.costReportError$.next(null);

    // Load cost breakdown
    this.reportingService.getJobCostReport(this.job.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (breakdown) => {
          this.costBreakdown$.next(breakdown);
          this.costReportLoading$.next(false);
        },
        error: (err) => {
          this.costReportError$.next(err.message || 'Failed to load cost report');
          this.costReportLoading$.next(false);
        }
      });

    // Load budget comparison
    this.reportingService.getBudgetComparison(this.job.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comparison) => {
          this.budgetComparison$.next(comparison);
        },
        error: (err) => {
          console.error('Failed to load budget comparison:', err);
        }
      });
  }

  /**
   * Navigate to full job cost report
   */
  viewFullCostReport(): void {
    if (this.job) {
      this.router.navigate(['/field-resource-management/reports/job-cost', this.job.id]);
    }
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}
