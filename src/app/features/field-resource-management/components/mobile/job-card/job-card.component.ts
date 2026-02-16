import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Job, JobStatus } from '../../../models/job.model';
import { TimeEntry } from '../../../models/time-entry.model';
import { updateJobStatus } from '../../../state/jobs/job.actions';
import { clockIn, clockOut } from '../../../state/time-entries/time-entry.actions';
import { selectActiveTimeEntry } from '../../../state/time-entries/time-entry.selectors';

/**
 * Job Card Component
 * 
 * Compact mobile-optimized card for displaying job information and quick actions.
 * 
 * Features:
 * - Compact layout optimized for mobile
 * - Job ID, client, site name, address display
 * - Status badge with current status
 * - Status update buttons with large touch targets
 * - Clock in/out buttons with prominent styling
 * - Elapsed time display when clocked in
 * - Navigation to full job details
 * - Customer contact quick actions (call, email)
 * - Photo upload shortcut
 * 
 * Requirements: 5.1-5.6, 6.1-6.6, 24.4-24.6
 */
@Component({
  selector: 'frm-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss']
})
export class JobCardComponent implements OnInit, OnDestroy {
  @Input() job!: Job;
  @Output() swipeRight = new EventEmitter<Job>();
  @Output() viewDetails = new EventEmitter<Job>();
  @Output() uploadPhoto = new EventEmitter<Job>();

  private destroy$ = new Subject<void>();
  
  activeTimeEntry: TimeEntry | null = null;
  elapsedTime = '';
  isClockedIn = false;

  // Expose enum for template
  JobStatus = JobStatus;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.subscribeToActiveTimeEntry();
    this.startElapsedTimeTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to active time entry for this job
   */
  private subscribeToActiveTimeEntry(): void {
    this.store.select(selectActiveTimeEntry).pipe(
      takeUntil(this.destroy$)
    ).subscribe(entry => {
      this.activeTimeEntry = entry;
      this.isClockedIn = entry?.jobId === this.job.id && !entry.clockOutTime;
    });
  }

  /**
   * Start timer to update elapsed time
   */
  private startElapsedTimeTimer(): void {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isClockedIn && this.activeTimeEntry) {
        this.updateElapsedTime();
      }
    });
  }

  /**
   * Update elapsed time display
   */
  private updateElapsedTime(): void {
    if (!this.activeTimeEntry?.clockInTime) {
      this.elapsedTime = '';
      return;
    }

    const clockInTime = new Date(this.activeTimeEntry.clockInTime).getTime();
    const now = Date.now();
    const elapsed = now - clockInTime;

    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    this.elapsedTime = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  /**
   * Pad number with leading zero
   */
  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Update job status
   */
  updateStatus(status: JobStatus): void {
    this.store.dispatch(updateJobStatus({
      id: this.job.id,
      status
    }));
  }

  /**
   * Handle clock in
   */
  onClockIn(): void {
    // Get current technician ID from auth (mock for now)
    const technicianId = 'current-technician-id';
    
    this.store.dispatch(clockIn({
      jobId: this.job.id,
      technicianId
    }));
  }

  /**
   * Handle clock out
   */
  onClockOut(): void {
    if (this.activeTimeEntry) {
      this.store.dispatch(clockOut({
        timeEntryId: this.activeTimeEntry.id
      }));
    }
  }

  /**
   * Handle view details
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.job);
  }

  /**
   * Handle call customer
   */
  onCallCustomer(): void {
    if (this.job.customerPOC?.phone) {
      window.location.href = `tel:${this.job.customerPOC.phone}`;
    }
  }

  /**
   * Handle email customer
   */
  onEmailCustomer(): void {
    if (this.job.customerPOC?.email) {
      window.location.href = `mailto:${this.job.customerPOC.email}`;
    }
  }

  /**
   * Handle photo upload
   */
  onUploadPhoto(): void {
    this.uploadPhoto.emit(this.job);
  }

  /**
   * Handle swipe gesture
   */
  onSwipe(): void {
    this.swipeRight.emit(this.job);
  }

  /**
   * Get available status actions based on current status
   */
  get availableStatusActions(): { status: JobStatus; label: string; icon: string }[] {
    const actions: { status: JobStatus; label: string; icon: string }[] = [];

    switch (this.job.status) {
      case JobStatus.NotStarted:
        actions.push(
          { status: JobStatus.EnRoute, label: 'En Route', icon: 'directions_car' }
        );
        break;
      case JobStatus.EnRoute:
        actions.push(
          { status: JobStatus.OnSite, label: 'On Site', icon: 'location_on' }
        );
        break;
      case JobStatus.OnSite:
        actions.push(
          { status: JobStatus.Completed, label: 'Complete', icon: 'check_circle' },
          { status: JobStatus.Issue, label: 'Issue', icon: 'error' }
        );
        break;
    }

    return actions;
  }

  /**
   * Check if clock in is available
   */
  get canClockIn(): boolean {
    return !this.isClockedIn && 
           (this.job.status === JobStatus.EnRoute || 
            this.job.status === JobStatus.OnSite);
  }

  /**
   * Check if clock out is available
   */
  get canClockOut(): boolean {
    return this.isClockedIn;
  }

  /**
   * Get formatted address
   */
  get formattedAddress(): string {
    const addr = this.job.siteAddress;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
  }

  /**
   * Get formatted scheduled time
   */
  get formattedScheduledTime(): string {
    const date = new Date(this.job.scheduledStartDate);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Check if customer contact is available
   */
  get hasCustomerContact(): boolean {
    return !!(this.job.customerPOC?.phone || this.job.customerPOC?.email);
  }

  /**
   * Get status color class
   */
  get statusColorClass(): string {
    const colorMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'status-gray',
      [JobStatus.EnRoute]: 'status-blue',
      [JobStatus.OnSite]: 'status-orange',
      [JobStatus.Completed]: 'status-green',
      [JobStatus.Issue]: 'status-red',
      [JobStatus.Cancelled]: 'status-gray'
    };
    return colorMap[this.job.status] || 'status-gray';
  }
}
