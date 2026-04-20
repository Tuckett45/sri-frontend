import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { 
  TimeEntry, 
  WeeklyTimeSummary,
  DailyTimeSummary,
  TimecardLockConfig,
  Expense
} from '../../../models/time-entry.model';
import { Job } from '../../../models/job.model';
import { TimecardService } from '../../../services/timecard.service';
import { AccessibilityService } from '../../../services/accessibility.service';
import { TimeEntryDialogComponent, TimeEntryDialogData } from '../time-entry-dialog/time-entry-dialog.component';
import { AuthService } from '../../../../../services/auth.service';

import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';
import * as TimeEntryActions from '../../../state/time-entries/time-entry.actions';
import * as TimecardSelectors from '../../../state/timecards/timecard.selectors';
import * as TimecardActions from '../../../state/timecards/timecard.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { loadJobs } from '../../../state/jobs/job.actions';

/**
 * Timecard Weekly View Component
 * 
 * Enhanced weekly timecard view with:
 * - Full week grid (Monday-Sunday)
 * - Daily breakdowns with totals
 * - Overtime highlighting
 * - Lock status indicators
 * - Expense tracking
 * - Quick edit capabilities
 */
@Component({
  selector: 'frm-timecard-weekly-view',
  templateUrl: './timecard-weekly-view.component.html',
  styleUrls: ['./timecard-weekly-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimecardWeeklyViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Current user
  currentTechnicianId = '';
  
  // Observable data
  weeklyTimeEntries$: Observable<TimeEntry[]>;
  weeklyExpenses$: Observable<Expense[]>;
  lockConfig$: Observable<TimecardLockConfig | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  jobs$: Observable<Job[]>;
  
  // Computed data
  weeklySummary$: Observable<WeeklyTimeSummary | null>;
  
  // Week navigation
  currentWeekStart: Date;
  currentWeekEnd: Date;
  
  // Days of week for display
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Lock countdown
  lockCountdown$: Observable<string>;
  private countdownInterval: any;

  // Mobile accordion: track which day index is expanded (-1 = none)
  expandedDayIndex: number = -1;

  // Selected day index for the detail entries section (-1 = show all)
  selectedDayIndex: number = -1;

  // Job lookup map (id → Job) for displaying job info in time entries
  jobMap: Map<string, Job> = new Map();
  
  constructor(
    private store: Store,
    public timecardService: TimecardService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private accessibilityService: AccessibilityService,
    private authService: AuthService
  ) {
    // Set current technician ID from auth
    this.currentTechnicianId = this.authService.getUser()?.id || '';

    // Initialize week dates
    this.currentWeekStart = this.timecardService.getWeekStart();
    this.currentWeekEnd = this.timecardService.getWeekEnd();
    
    // Initialize observables
    this.weeklyTimeEntries$ = this.store.select(TimeEntrySelectors.selectWeekTimeEntries);
    this.weeklyExpenses$ = this.store.select(TimecardSelectors.selectCurrentPeriodExpenses);
    this.lockConfig$ = this.store.select(TimecardSelectors.selectLockConfig);
    this.loading$ = this.store.select(TimecardSelectors.selectTimecardLoading);
    this.error$ = this.store.select(TimecardSelectors.selectTimecardError);
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
    
    // Create weekly summary
    this.weeklySummary$ = combineLatest([
      this.weeklyTimeEntries$,
      this.weeklyExpenses$,
      this.lockConfig$
    ]).pipe(
      map(([entries, expenses, config]) => {
        if (!config) return null;
        return this.timecardService.createWeeklySummary(
          this.currentWeekStart,
          this.currentWeekEnd,
          entries,
          expenses,
          config
        );
      })
    );
    
    // Lock countdown
    this.lockCountdown$ = combineLatest([
      this.weeklySummary$,
      this.lockConfig$
    ]).pipe(
      map(([summary, config]) => {
        if (!summary || !config || !summary.locksIn) {
          return '';
        }
        const timeUntilLock = summary.locksIn.getTime() - Date.now();
        return this.timecardService.formatTimeUntilLock(timeUntilLock);
      })
    );
  }
  
  ngOnInit(): void {
    // Load lock configuration
    this.store.dispatch(TimecardActions.loadLockConfig());

    // Ensure jobs are loaded for name lookups
    this.store.dispatch(loadJobs({}));

    // Load time entries from the API
    this.store.dispatch(TimeEntryActions.loadTimeEntries({
      technicianId: this.currentTechnicianId
    }));
    
    // Load timecard period
    this.loadCurrentPeriod();
    
    // Start countdown timer
    this.startCountdownTimer();

    // Default expanded day to today (if within current week)
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Convert Sunday=0 to index 6, Monday=1 to index 0, etc.
    this.expandedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    this.selectedDayIndex = this.expandedDayIndex;
    
    // Subscribe to error state
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.accessibilityService.announceError(error);
      }
    });

    // Build job lookup map
    this.jobs$.pipe(takeUntil(this.destroy$)).subscribe(jobs => {
      this.jobMap.clear();
      jobs.forEach(j => this.jobMap.set(j.id, j));
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
  
  /**
   * Load current timecard period
   */
  loadCurrentPeriod(): void {
    this.store.dispatch(TimecardActions.loadTimecardPeriod({
      technicianId: this.currentTechnicianId,
      startDate: this.currentWeekStart,
      endDate: this.currentWeekEnd
    }));
  }
  
  /**
   * Start countdown timer for lock
   */
  startCountdownTimer(): void {
    // Update countdown every minute
    this.countdownInterval = setInterval(() => {
      // Trigger change detection by updating observable
      this.weeklySummary$ = combineLatest([
        this.weeklyTimeEntries$,
        this.weeklyExpenses$,
        this.lockConfig$
      ]).pipe(
        map(([entries, expenses, config]) => {
          if (!config) return null;
          return this.timecardService.createWeeklySummary(
            this.currentWeekStart,
            this.currentWeekEnd,
            entries,
            expenses,
            config
          );
        })
      );
    }, 60000); // Update every minute
  }
  
  /**
   * Navigate to previous week
   */
  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() - 7);
    this.loadCurrentPeriod();
    this.accessibilityService.announce('Navigated to previous week');
  }
  
  /**
   * Navigate to next week
   */
  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() + 7);
    this.loadCurrentPeriod();
    this.accessibilityService.announce('Navigated to next week');
  }
  
  /**
   * Navigate to current week
   */
  goToCurrentWeek(): void {
    this.currentWeekStart = this.timecardService.getWeekStart();
    this.currentWeekEnd = this.timecardService.getWeekEnd();
    this.loadCurrentPeriod();
    this.accessibilityService.announce('Navigated to current week');
  }
  
  /**
   * Get date for a specific day of the week
   */
  getDateForDay(dayIndex: number): Date {
    const date = new Date(this.currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }
  
  /**
   * Get daily summary for a specific day
   */
  getDailySummary(summary: WeeklyTimeSummary, dayIndex: number): DailyTimeSummary | null {
    const targetDate = this.getDateForDay(dayIndex);
    return summary.dailySummaries.find(day => 
      day.date.toDateString() === targetDate.toDateString()
    ) || null;
  }
  
  /**
   * Format hours for display
   */
  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }
  
  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  /**
   * Format week range for display
   */
  formatWeekRange(): string {
    return `${this.formatDate(this.currentWeekStart)} - ${this.formatDate(this.currentWeekEnd)}`;
  }
  
  /**
   * Check if day has overtime
   */
  hasOvertime(dailySummary: DailyTimeSummary | null): boolean {
    return dailySummary ? dailySummary.overtimeHours > 0 : false;
  }
  
  /**
   * Check if week has overtime
   */
  weekHasOvertime(summary: WeeklyTimeSummary): boolean {
    return summary.overtimeHours > 0;
  }
  
  /**
   * Open add time entry dialog
   */
  addTimeEntry(date?: Date): void {
    const isMobile = window.innerWidth <= 768;
    const dialogRef = this.dialog.open(TimeEntryDialogComponent, {
      width: isMobile ? '100vw' : '550px',
      maxWidth: isMobile ? '100vw' : '600px',
      maxHeight: isMobile ? '100vh' : '90vh',
      panelClass: isMobile ? 'mobile-dialog' : '',
      data: {
        mode: 'add',
        date: date || new Date(),
        technicianId: this.currentTechnicianId
      } as TimeEntryDialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        // Dispatch clock-in to create the entry via the API
        this.store.dispatch(TimeEntryActions.clockIn({
          jobId: result.jobId,
          technicianId: result.technicianId || this.currentTechnicianId
        }));
        this.snackBar.open('Time entry added', 'Close', { duration: 3000 });
        this.refresh();
      }
    });
  }
  
  /**
   * Open add expense dialog
   */
  addExpense(date?: Date): void {
    // TODO: Open expense dialog
    this.snackBar.open('Add expense dialog - Coming soon', 'Close', { duration: 3000 });
  }
  
  /**
   * Edit time entry
   */
  editTimeEntry(entry: TimeEntry): void {
    const isMobile = window.innerWidth <= 768;
    const dialogRef = this.dialog.open(TimeEntryDialogComponent, {
      width: isMobile ? '100vw' : '550px',
      maxWidth: isMobile ? '100vw' : '600px',
      maxHeight: isMobile ? '100vh' : '90vh',
      panelClass: isMobile ? 'mobile-dialog' : '',
      data: {
        mode: 'edit',
        entry,
        technicianId: this.currentTechnicianId
      } as TimeEntryDialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && result.id) {
        // Dispatch the update to the API
        this.store.dispatch(TimeEntryActions.updateTimeEntry({
          id: result.id,
          timeEntry: {
            clockInTime: result.clockInTime,
            clockOutTime: result.clockOutTime,
            mileage: result.mileage,
            adjustmentReason: result.adjustmentReason,
            isManuallyAdjusted: true
          }
        }));
        this.snackBar.open('Time entry updated', 'Close', { duration: 3000 });
        this.refresh();
      }
    });
  }
  
  /**
   * View day details — select the day for the entries section
   */
  viewDayDetails(dailySummary: DailyTimeSummary): void {
    // Find the index of this day
    const dayIndex = this.daysOfWeek.findIndex((_, i) => {
      const date = this.getDateForDay(i);
      return date.toDateString() === dailySummary.date.toDateString();
    });
    this.selectedDayIndex = dayIndex;
  }

  /**
   * Select a day by index (for desktop grid clicks)
   */
  selectDay(index: number): void {
    this.selectedDayIndex = index;
  }

  /**
   * Get the selected day's summary, or null
   */
  getSelectedDaySummary(summary: WeeklyTimeSummary): DailyTimeSummary | null {
    if (this.selectedDayIndex < 0) return null;
    return this.getDailySummary(summary, this.selectedDayIndex);
  }

  /**
   * Get the selected day's formatted label
   */
  getSelectedDayLabel(): string {
    if (this.selectedDayIndex < 0) return '';
    const date = this.getDateForDay(this.selectedDayIndex);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  
  /**
   * Submit timecard for approval
   */
  submitTimecard(): void {
    // TODO: Implement submit workflow
    this.snackBar.open('Submit timecard - Coming soon', 'Close', { duration: 3000 });
  }
  
  /**
   * Request unlock
   */
  requestUnlock(): void {
    // TODO: Open unlock request dialog
    this.snackBar.open('Request unlock - Coming soon', 'Close', { duration: 3000 });
  }
  
  /**
   * Copy previous week
   */
  copyPreviousWeek(): void {
    // TODO: Implement copy functionality
    this.snackBar.open('Copy previous week - Coming soon', 'Close', { duration: 3000 });
  }
  
  /**
   * Refresh data
   */
  refresh(): void {
    this.loadCurrentPeriod();
    // Also reload time entries from the API
    this.store.dispatch(TimeEntryActions.loadTimeEntries({
      technicianId: this.currentTechnicianId
    }));
    this.accessibilityService.announce('Timecard data refreshed');
  }

  /**
   * Toggle expanded day in mobile accordion view
   */
  toggleDay(index: number): void {
    this.expandedDayIndex = this.expandedDayIndex === index ? -1 : index;
  }

  /**
   * Check if a given date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get job display name for a time entry.
   */
  getJobDisplayName(jobId: string): string {
    const job = this.jobMap.get(jobId);
    if (!job) return jobId;
    return job.jobId || `${job.client} - ${job.siteName}`;
  }

  /**
   * Get job site info for a time entry.
   */
  getJobSiteInfo(jobId: string): string {
    const job = this.jobMap.get(jobId);
    if (!job) return '';
    const addr = job.siteAddress;
    return addr ? `${job.siteName} · ${addr.city}, ${addr.state}` : job.siteName || '';
  }
}
