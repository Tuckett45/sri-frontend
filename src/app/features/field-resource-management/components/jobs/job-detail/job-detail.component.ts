import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { takeUntil, filter, map, catchError, take, distinctUntilChanged } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material/tabs';

import { Job, JobStatus, Attachment, JobNote, JobReadiness, CustomerReady } from '../../../models/job.model';
import { JobBudget, BudgetStatus } from '../../../models/budget.model';
import { TimeEntry } from '../../../models/time-entry.model';
import { Assignment } from '../../../models/assignment.model';
import { Crew } from '../../../models/crew.model';
import { Technician } from '../../../models/technician.model';
import { JobCostBreakdown, BudgetComparison } from '../../../models/reporting.model';
import { ChecklistStatus } from '../../../models/deployment-checklist.model';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import * as BudgetActions from '../../../state/budgets/budget.actions';
import * as BudgetSelectors from '../../../state/budgets/budget.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectCrewById } from '../../../state/crews/crew.selectors';
import { loadCrews } from '../../../state/crews/crew.actions';
import { selectChecklistStatus } from '../../../state/deployment-checklist/checklist.selectors';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { AssignmentDialogComponent } from '../../scheduling/assignment-dialog/assignment-dialog.component';
import { JobFormComponent } from '../job-form/job-form.component';
import { AttachmentPreviewDialogComponent } from '../attachment-preview-dialog/attachment-preview-dialog.component';
import { ReportingService } from '../../../services/reporting.service';
import { JobService } from '../../../services/job.service';
import { SchedulingService } from '../../../services/scheduling.service';
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
  
  @ViewChild('jobTabGroup') jobTabGroup!: MatTabGroup;

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
  
  // Current user
  currentTechnicianId = '';
  
  // Check if job is assigned to current user
  isAssignedToCurrentUser = false;
  
  // Status history (placeholder - would come from job service)
  statusHistory: any[] = [];
  
  // Note editing
  editingNoteId: string | null = null;
  editingNoteText = '';
  
  // Technician name lookup
  technicianNameMap: Map<string, string> = new Map();

  // Crew data
  assignedCrew: Crew | null = null;
  crewMembers: Technician[] = [];
  
  // New note
  newNoteText = '';
  isAddingNote = false;
  
  // File upload
  isUploadingFile = false;
  
  // Budget visibility
  canViewBudget = false;

  // Status transition error
  statusTransitionError: string | null = null;

  // Deployment Checklist
  checklistStatus$!: Observable<ChecklistStatus>;
  canViewChecklist = false;

  // Job Readiness
  canEditJob = false;
  JobReadiness = JobReadiness;
  CustomerReady = CustomerReady;
  jobReadinessOptions = Object.values(JobReadiness);
  customerReadyOptions = Object.values(CustomerReady);

  // Tab management for deep-linking
  selectedTabIndex = 0;
  /** Phase name to deep-link into when the checklist tab activates */
  pendingChecklistPhase: string | null = null;

  // Checklist status enum reference for template
  ChecklistStatus = ChecklistStatus;

  // Valid status transitions map
  private readonly validTransitions: Record<JobStatus, JobStatus[]> = {
    [JobStatus.NotStarted]: [JobStatus.EnRoute, JobStatus.Issue, JobStatus.Cancelled],
    [JobStatus.EnRoute]: [JobStatus.OnSite, JobStatus.Issue, JobStatus.Cancelled],
    [JobStatus.OnSite]: [JobStatus.Completed, JobStatus.Issue, JobStatus.Cancelled],
    [JobStatus.Completed]: [JobStatus.Cancelled],
    [JobStatus.Issue]: [JobStatus.Cancelled],
    [JobStatus.Cancelled]: []
  };

  // Enum references for template
  JobStatus = JobStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private actions$: Actions,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private reportingService: ReportingService,
    private jobService: JobService,
    private schedulingService: SchedulingService,
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.loading$ = this.store.select(JobSelectors.selectJobsLoading);
    this.job$ = this.store.select(JobSelectors.selectSelectedJob);
    this.currentTechnicianId = this.authService.getUser()?.id || '';
    this.canViewBudget = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canViewBudget'
    );
    this.canViewChecklist = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canViewDeploymentChecklist'
    );
    this.canEditJob = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canEditJob'
    );
  }

  ngOnInit(): void {
    // Ensure technicians are loaded for name lookups
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.select(selectAllTechnicians).pipe(
      takeUntil(this.destroy$)
    ).subscribe(technicians => {
      this.technicianNameMap.clear();
      technicians.forEach(t => {
        this.technicianNameMap.set(t.id, `${t.firstName} ${t.lastName}`);
      });
    });

    // Select checklist status from the store
    this.checklistStatus$ = this.store.select(selectChecklistStatus);

    // Handle deep-link query params for tab and phase selection
    this.route.queryParams.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['tab'] === 'deployment-checklist' && this.canViewChecklist) {
        // The checklist tab is at index 1 (after the "Details" tab)
        this.selectedTabIndex = 1;
        if (params['phase']) {
          this.pendingChecklistPhase = params['phase'];
        }
      }
    });

    // Get job ID from route
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const jobId = params['id'];
        if (jobId) {
          this.store.dispatch(JobActions.selectJob({ id: jobId }));
          
          // If job isn't in the store (direct navigation), load all jobs
          this.store.select(JobSelectors.selectJobById(jobId)).pipe(
            takeUntil(this.destroy$),
            filter(job => !job)
          ).subscribe(() => {
            this.store.dispatch(JobActions.loadJobs({ filters: {} }));
          });
        }
      });

    // Subscribe to job data — only reload related data when the job ID changes
    this.job$
      .pipe(
        takeUntil(this.destroy$),
        filter(job => !!job),
        distinctUntilChanged((prev, curr) => prev!.id === curr!.id)
      )
      .subscribe(job => {
        this.job = job!;
        this.loadRelatedData();
      });

    // Keep local job reference in sync for template bindings
    // (without re-dispatching API calls)
    this.job$
      .pipe(
        takeUntil(this.destroy$),
        filter(job => !!job)
      )
      .subscribe(job => {
        this.job = job!;
        this.cdr.markForCheck();
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
    
    // Load budget data for this job (silently skip if not found)
    this.budget$ = this.store.select(BudgetSelectors.selectBudgetByJobId(this.job.id));
    this.budgetStatus$ = this.store.select(BudgetSelectors.selectBudgetStatus(this.job.id));
    this.budgetConsumptionPercentage$ = this.store.select(
      BudgetSelectors.selectBudgetConsumptionPercentage(this.job.id)
    );
    
    // Only load budget if job is not brand new (budget is auto-created on job creation)
    if (this.job.status !== 'NotStarted') {
      this.store.dispatch(BudgetActions.loadBudget({ jobId: this.job.id }));
    }
    
    // Load attachments and notes from their dedicated endpoints
    this.store.dispatch(JobActions.loadJobAttachments({ jobId: this.job.id }));
    this.store.dispatch(JobActions.loadJobNotes({ jobId: this.job.id }));
    
    // Load status history from API
    this.loadStatusHistory(this.job.id);
    
    // Load assignments from API
    this.loadAssignments(this.job.id);
    
    // Load crew if assigned
    this.loadCrew();
    
    // Placeholder data for time entries
    this.timeEntries = [];
    
    // Check if current user is assigned to this job
    this.checkIfAssignedToCurrentUser();
  }

  /**
   * Load crew data and resolve crew members if the job has a crewId
   */
  private loadCrew(): void {
    if (!this.job?.crewId) {
      this.assignedCrew = null;
      this.crewMembers = [];
      return;
    }

    this.store.dispatch(loadCrews({}));

    this.store.select(selectCrewById(this.job.crewId))
      .pipe(takeUntil(this.destroy$), filter(crew => !!crew))
      .subscribe(crew => {
        this.assignedCrew = crew!;
        // Resolve crew members from the technician name map
        this.store.select(selectAllTechnicians)
          .pipe(takeUntil(this.destroy$))
          .subscribe(technicians => {
            this.crewMembers = (crew!.memberIds || [])
              .map(id => technicians.find(t => t.id === id))
              .filter((t): t is Technician => t != null);
            this.cdr.markForCheck();
          });
      });
  }

  private loadStatusHistory(jobId: string): void {
    this.jobService.getJobStatusHistory(jobId).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Failed to load status history:', err);
        return of([]);
      })
    ).subscribe(history => {
      this.statusHistory = history;
      this.cdr.markForCheck();
    });
  }

  private loadAssignments(jobId: string): void {
    this.schedulingService.getAssignments({ jobId, isActive: true }).pipe(
      takeUntil(this.destroy$),
      map(response => {
        if (Array.isArray(response)) return response;
        if ((response as any)?.$values) return (response as any).$values;
        if ((response as any)?.items) return (response as any).items;
        return [];
      }),
      catchError(err => {
        console.error('Failed to load assignments:', err);
        return of([]);
      })
    ).subscribe(assignments => {
      this.assignments = assignments;
      this.checkIfAssignedToCurrentUser();
      this.cdr.markForCheck();
    });
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
   * Check if a status transition is valid
   */
  isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
    const allowed = this.validTransitions[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Get valid target statuses for the current job status
   */
  getValidTransitions(status: JobStatus): JobStatus[] {
    return this.validTransitions[status] || [];
  }

  /**
   * Change job status with validation
   */
  changeStatus(newStatus: JobStatus, reason?: string): void {
    if (!this.job) return;

    this.statusTransitionError = null;

    if (!this.isValidStatusTransition(this.job.status, newStatus)) {
      this.statusTransitionError = `Invalid status transition from ${this.job.status} to ${newStatus}`;
      this.snackBar.open(this.statusTransitionError, 'Close', { duration: 5000 });
      return;
    }

    this.store.dispatch(JobActions.updateJobStatus({
      id: this.job.id,
      status: newStatus,
      reason
    }));
  }

  /**
   * Check if the job is fully ready for deployment
   * (both jobReadiness and customerReady are Ready)
   */
  get isFullyReady(): boolean {
    return this.job?.jobReadiness === JobReadiness.Ready && this.job?.customerReady === CustomerReady.Ready;
  }

  /**
   * Update the jobReadiness field
   */
  onJobReadinessChange(value: JobReadiness): void {
    if (!this.job) return;
    this.store.dispatch(JobActions.updateJob({
      id: this.job.id,
      job: { jobReadiness: value }
    }));
    this.snackBar.open('Job readiness updated', 'Close', { duration: 3000 });
  }

  /**
   * Update the customerReady field
   */
  onCustomerReadyChange(value: CustomerReady): void {
    if (!this.job) return;
    this.store.dispatch(JobActions.updateJob({
      id: this.job.id,
      job: { customerReady: value }
    }));
    this.snackBar.open('Customer readiness updated', 'Close', { duration: 3000 });
  }

  /**
   * Format readiness enum values for display
   */
  formatReadiness(value: string | undefined): string {
    if (!value) return 'Not Set';
    return value.replace(/_/g, ' ');
  }

  /**
   * Navigate to the originating quote workflow
   */
  viewOriginatingQuote(): void {
    if (this.job?.quoteWorkflowId) {
      this.router.navigate(['/field-resource-management/quotes', this.job.quoteWorkflowId]);
    }
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
        // Reload jobs from API to get the updated data
        this.store.dispatch(JobActions.loadJobs({ filters: {} }));
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

        const jobId = this.job!.id;

        // Reload the job to pick up the new technicianId/crewId
        this.store.dispatch(JobActions.loadJobs({ filters: {} }));

        // Give the backend a moment to persist, then reload assignments
        setTimeout(() => {
          this.loadAssignments(jobId);
          this.loadCrew();
        }, 500);
      }
    });
  }

  /**
   * Get technician display name from assignment
   */
  getTechnicianName(assignment: Assignment): string {
    if (assignment.technician) {
      return `${assignment.technician.firstName} ${assignment.technician.lastName}`;
    }
    // Fall back to looking up from the technician store
    const techName = this.technicianNameMap.get(assignment.technicianId);
    if (techName) return techName;
    return `Technician ${assignment.technicianId.substring(0, 8)}...`;
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      this.snackBar.open('Only JPEG, PNG, HEIC, PDF, DOC, and DOCX files are allowed', 'Close', { duration: 3000 });
      return;
    }

    this.isUploadingFile = true;
    this.store.dispatch(JobActions.uploadAttachment({
      jobId: this.job.id,
      file: file
    }));

    // Reset file input
    input.value = '';

    // Listen for actual upload result
    this.actions$.pipe(
      ofType(JobActions.uploadAttachmentSuccess, JobActions.uploadAttachmentFailure),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      this.isUploadingFile = false;
      this.cdr.markForCheck();
    });
  }

  /**
   * Download attachment via the API (with auth headers)
   */
  downloadAttachment(attachment: Attachment): void {
    if (!this.job) return;

    this.jobService.downloadAttachment(this.job.id, attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Failed to download attachment', 'Close', { duration: 3000 });
      }
    });
  }

  /**
   * Preview attachment in a dialog overlay.
   * Images and PDFs are rendered inline; other types trigger a download.
   */
  previewAttachment(attachment: Attachment): void {
    if (!this.job) return;

    const previewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!previewableTypes.includes(attachment.fileType)) {
      // Non-previewable — fall back to download
      this.downloadAttachment(attachment);
      return;
    }

    this.jobService.downloadAttachment(this.job.id, attachment.id).subscribe({
      next: (blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        this.dialog.open(AttachmentPreviewDialogComponent, {
          data: { url: objectUrl, fileName: attachment.fileName, fileType: attachment.fileType },
          width: '90vw',
          maxWidth: '1200px',
          maxHeight: '90vh',
          panelClass: 'attachment-preview-dialog',
          autoFocus: false
        }).afterClosed().subscribe(() => {
          window.URL.revokeObjectURL(objectUrl);
        });
      },
      error: () => {
        this.snackBar.open('Failed to load preview', 'Close', { duration: 3000 });
      }
    });
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

  /**
   * Get CSS class for checklist status badge
   */
  getChecklistStatusClass(status: ChecklistStatus | null): string {
    if (!status) return 'checklist-not-started';
    switch (status) {
      case ChecklistStatus.Completed:
        return 'checklist-completed';
      case ChecklistStatus.InProgress:
        return 'checklist-in-progress';
      case ChecklistStatus.NotStarted:
      default:
        return 'checklist-not-started';
    }
  }

  /**
   * Get display text for checklist status badge
   */
  getChecklistStatusLabel(status: ChecklistStatus | null): string {
    if (!status) return 'Not Started';
    switch (status) {
      case ChecklistStatus.Completed:
        return 'Completed';
      case ChecklistStatus.InProgress:
        return 'In Progress';
      case ChecklistStatus.NotStarted:
      default:
        return 'Not Started';
    }
  }

  /**
   * Resolves the pending checklist phase name to a tab index
   * and passes it to the DeploymentChecklistComponent.
   */
  getChecklistPhaseIndex(): number {
    const phaseMap: Record<string, number> = {
      jobDetails: 0,
      preInstallation: 1,
      eodReports: 2,
      closeOut: 3
    };
    if (this.pendingChecklistPhase && phaseMap[this.pendingChecklistPhase] !== undefined) {
      return phaseMap[this.pendingChecklistPhase];
    }
    return 0;
  }
}
