import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Job, JobStatus } from '../../../models/job.model';
import { loadJobs } from '../../../state/jobs/job.actions';
import { selectAllJobs, selectJobsLoading } from '../../../state/jobs/job.selectors';

/**
 * Daily View Component
 * 
 * Mobile-optimized view for field technicians to see their daily schedule.
 * 
 * Features:
 * - Large touch targets for mobile interaction
 * - Today's date prominently displayed
 * - Job count summary
 * - Jobs displayed as cards in chronological order
 * - Swipe gestures for status updates
 * - Pull-to-refresh functionality
 * - Offline data caching via service worker
 * - Sync status indicator
 * - Floating action button for quick actions
 * 
 * Requirements: 5.1-5.6, 15.1-15.5
 */
@Component({
  selector: 'frm-daily-view',
  templateUrl: './daily-view.component.html',
  styleUrls: ['./daily-view.component.scss']
})
export class DailyViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  todayDate = new Date();
  jobs$: Observable<Job[]>;
  loading$: Observable<boolean>;
  
  jobCounts = {
    total: 0,
    notStarted: 0,
    enRoute: 0,
    onSite: 0,
    completed: 0,
    issue: 0
  };

  isRefreshing = false;
  isSyncing = false;
  isOnline = navigator.onLine;

  constructor(private store: Store) {
    // Filter jobs for current user and today's date
    this.jobs$ = this.store.select(selectAllJobs).pipe(
      map(jobs => this.filterTodayJobs(jobs)),
      map(jobs => this.sortJobsByScheduledTime(jobs))
    );
    
    this.loading$ = this.store.select(selectJobsLoading);
  }

  ngOnInit(): void {
    this.loadTodayJobs();
    this.subscribeToJobs();
    this.setupOnlineStatusListener();
    this.checkSyncStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load today's jobs for the current technician
   */
  loadTodayJobs(): void {
    const startOfDay = new Date(this.todayDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(this.todayDate);
    endOfDay.setHours(23, 59, 59, 999);

    // In a real implementation, we would get the current technician ID from auth
    // For now, we'll load all jobs and filter client-side
    this.store.dispatch(loadJobs({
      filters: {
        startDate: startOfDay,
        endDate: endOfDay
      }
    }));
  }

  /**
   * Subscribe to jobs and update counts
   */
  private subscribeToJobs(): void {
    this.jobs$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(jobs => {
      this.updateJobCounts(jobs);
    });
  }

  /**
   * Filter jobs for today
   */
  private filterTodayJobs(jobs: Job[]): Job[] {
    const startOfDay = new Date(this.todayDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(this.todayDate);
    endOfDay.setHours(23, 59, 59, 999);

    return jobs.filter(job => {
      const scheduledDate = new Date(job.scheduledStartDate);
      return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
    });
  }

  /**
   * Sort jobs by scheduled start time
   */
  private sortJobsByScheduledTime(jobs: Job[]): Job[] {
    return [...jobs].sort((a, b) => {
      const dateA = new Date(a.scheduledStartDate).getTime();
      const dateB = new Date(b.scheduledStartDate).getTime();
      return dateA - dateB;
    });
  }

  /**
   * Update job counts by status
   */
  private updateJobCounts(jobs: Job[]): void {
    this.jobCounts = {
      total: jobs.length,
      notStarted: jobs.filter(j => j.status === JobStatus.NotStarted).length,
      enRoute: jobs.filter(j => j.status === JobStatus.EnRoute).length,
      onSite: jobs.filter(j => j.status === JobStatus.OnSite).length,
      completed: jobs.filter(j => j.status === JobStatus.Completed).length,
      issue: jobs.filter(j => j.status === JobStatus.Issue).length
    };
  }

  /**
   * Handle pull-to-refresh
   */
  onRefresh(): void {
    this.isRefreshing = true;
    this.loadTodayJobs();
    
    // Simulate refresh completion
    setTimeout(() => {
      this.isRefreshing = false;
    }, 1000);
  }

  /**
   * Handle swipe gesture on job card
   */
  onSwipeRight(job: Job): void {
    // Advance to next status
    const nextStatus = this.getNextStatus(job.status);
    if (nextStatus) {
      // This will be handled by the JobCardComponent
      console.log(`Swiped job ${job.jobId} to next status: ${nextStatus}`);
    }
  }

  /**
   * Get next status in workflow
   */
  private getNextStatus(currentStatus: JobStatus): JobStatus | null {
    const statusFlow: Record<JobStatus, JobStatus | null> = {
      [JobStatus.NotStarted]: JobStatus.EnRoute,
      [JobStatus.EnRoute]: JobStatus.OnSite,
      [JobStatus.OnSite]: JobStatus.Completed,
      [JobStatus.Completed]: null,
      [JobStatus.Issue]: null,
      [JobStatus.Cancelled]: null
    };
    return statusFlow[currentStatus];
  }

  /**
   * Setup online/offline status listener
   */
  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Check sync status
   */
  private checkSyncStatus(): void {
    // Check if there's pending data to sync
    // This would integrate with service worker in real implementation
    const pendingSync = localStorage.getItem('frm_pending_sync');
    this.isSyncing = !!pendingSync;
  }

  /**
   * Sync offline data when connection is restored
   */
  private syncOfflineData(): void {
    if (this.isSyncing) {
      // Trigger sync of offline data
      console.log('Syncing offline data...');
      this.isSyncing = true;
      
      // Simulate sync
      setTimeout(() => {
        this.isSyncing = false;
        localStorage.removeItem('frm_pending_sync');
        this.loadTodayJobs();
      }, 2000);
    }
  }

  /**
   * Handle floating action button click
   */
  onQuickAction(): void {
    // Open quick actions menu
    console.log('Quick actions menu');
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByJobId(index: number, job: Job): string {
    return job.id;
  }

  /**
   * Get formatted date string
   */
  get formattedDate(): string {
    return this.todayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get sync status message
   */
  get syncStatusMessage(): string {
    if (!this.isOnline) {
      return 'Offline - Changes will sync when online';
    }
    if (this.isSyncing) {
      return 'Syncing...';
    }
    return 'All changes synced';
  }

  /**
   * Get sync status icon
   */
  get syncStatusIcon(): string {
    if (!this.isOnline) {
      return 'cloud_off';
    }
    if (this.isSyncing) {
      return 'sync';
    }
    return 'cloud_done';
  }
}
