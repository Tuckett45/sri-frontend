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

import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';
import * as TimecardSelectors from '../../../state/timecards/timecard.selectors';
import * as TimecardActions from '../../../state/timecards/timecard.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';

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
  
  // Current user (mock - would come from auth service)
  currentTechnicianId = 'current-technician-id';
  
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
  
  constructor(
    private store: Store,
    public timecardService: TimecardService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private accessibilityService: AccessibilityService
  ) {
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
    
    // Load timecard period
    this.loadCurrentPeriod();
    
    // Start countdown timer
    this.startCountdownTimer();
    
    // Subscribe to error state
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.accessibilityService.announceError(error);
      }
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
    // TODO: Open time entry dialog
    this.snackBar.open('Add time entry dialog - Coming soon', 'Close', { duration: 3000 });
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
    // TODO: Open edit dialog
    this.snackBar.open('Edit time entry dialog - Coming soon', 'Close', { duration: 3000 });
  }
  
  /**
   * View day details
   */
  viewDayDetails(dailySummary: DailyTimeSummary): void {
    // TODO: Open day details dialog
    this.snackBar.open('Day details dialog - Coming soon', 'Close', { duration: 3000 });
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
    this.accessibilityService.announce('Timecard data refreshed');
  }
}
