import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import { 
  TimeEntry, 
  TimecardPeriod,
  TimecardLockConfig
} from '../../../models/time-entry.model';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { Job } from '../../../models/job.model';
import { TimecardService } from '../../../services/timecard.service';
import { AccessibilityService } from '../../../services/accessibility.service';
import { AuthService } from '../../../../../services/auth.service';

import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';
import * as TimecardSelectors from '../../../state/timecards/timecard.selectors';
import * as TimecardActions from '../../../state/timecards/timecard.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as JobSelectors from '../../../state/jobs/job.selectors';

/**
 * Timecard Manager View Component
 * 
 * Provides comprehensive timecard management for HR and Managers:
 * - View all timecards across organization
 * - Filter by technician, crew, or job
 * - Approve/reject timecards
 * - Unlock locked periods
 * - Export timecard data
 * - Bulk operations
 */
@Component({
  selector: 'frm-timecard-manager-view',
  templateUrl: './timecard-manager-view.component.html',
  styleUrls: ['./timecard-manager-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimecardManagerViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Filter controls
  filterByControl = new FormControl('all'); // all, technician, crew, job
  selectedTechnicianControl = new FormControl(null);
  selectedCrewControl = new FormControl(null);
  selectedJobControl = new FormControl(null);
  dateRangeControl = new FormControl('week'); // week, biweek, month, custom
  statusFilterControl = new FormControl('all'); // all, draft, submitted, approved, rejected
  
  // Observable data
  allTimeEntries$: Observable<TimeEntry[]>;
  filteredTimeEntries$: Observable<TimeEntry[]>;
  allPeriods$: Observable<TimecardPeriod[]>;
  filteredPeriods$: Observable<TimecardPeriod[]>;
  filteredPeriodsData: TimecardPeriod[] = []; // For table datasource
  technicians$: Observable<Technician[]>;
  crews$: Observable<Crew[]>;
  jobs$: Observable<Job[]>;
  lockConfig$: Observable<TimecardLockConfig | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Summary data
  totalHours = 0;
  totalRegularHours = 0;
  totalOvertimeHours = 0;
  totalExpenses = 0;
  pendingApprovals = 0;
  
  // Date range
  startDate: Date;
  endDate: Date;
  
  // View mode
  viewMode: 'summary' | 'detail' = 'summary';
  
  // Selected items for bulk operations
  selectedPeriodIds: Set<string> = new Set();
  
  // Table columns
  displayedColumns = ['select', 'technician', 'period', 'hours', 'overtime', 'expenses', 'status', 'actions'];
  
  constructor(
    private store: Store,
    private timecardService: TimecardService,
    private accessibilityService: AccessibilityService,
    private authService: AuthService
  ) {
    // Initialize date range (current week)
    this.startDate = this.timecardService.getWeekStart();
    this.endDate = this.timecardService.getWeekEnd();
    
    // Initialize observables
    this.allTimeEntries$ = this.store.select(TimeEntrySelectors.selectAllTimeEntries);
    this.allPeriods$ = this.store.select(TimecardSelectors.selectAllPeriods);
    this.technicians$ = this.store.select(TechnicianSelectors.selectAllTechnicians);
    this.crews$ = this.store.select(CrewSelectors.selectAllCrews);
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
    this.lockConfig$ = this.store.select(TimecardSelectors.selectLockConfig);
    this.loading$ = this.store.select(TimecardSelectors.selectTimecardLoading);
    this.error$ = this.store.select(TimecardSelectors.selectTimecardError);
    
    // Setup filtered entries based on controls
    this.filteredTimeEntries$ = combineLatest([
      this.allTimeEntries$,
      this.filterByControl.valueChanges,
      this.selectedTechnicianControl.valueChanges,
      this.selectedCrewControl.valueChanges,
      this.selectedJobControl.valueChanges
    ]).pipe(
      map(([entries, filterBy, techId, crewId, jobId]) => {
        return this.filterTimeEntries(entries, filterBy, techId, crewId, jobId);
      })
    );
    
    // Setup filtered periods
    this.filteredPeriods$ = combineLatest([
      this.allPeriods$,
      this.statusFilterControl.valueChanges
    ]).pipe(
      map(([periods, status]) => {
        if (status === 'all') return periods;
        return periods.filter(p => p.status === status);
      })
    );
    
    // Subscribe to filtered periods for table datasource
    this.filteredPeriods$.pipe(takeUntil(this.destroy$)).subscribe(periods => {
      this.filteredPeriodsData = periods;
    });
  }
  
  ngOnInit(): void {
    // Load initial data
    this.loadData();
    
    // Subscribe to filtered entries for summary calculations
    this.filteredTimeEntries$.pipe(takeUntil(this.destroy$)).subscribe(entries => {
      this.calculateSummary(entries);
    });
    
    // Subscribe to periods for pending approvals count
    this.allPeriods$.pipe(takeUntil(this.destroy$)).subscribe(periods => {
      this.pendingApprovals = periods.filter(p => p.status === 'submitted').length;
    });
    
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
  }
  
  /**
   * Load data based on current filters
   */
  loadData(): void {
    this.store.dispatch(TimecardActions.loadLockConfig());
    // In production, would dispatch actions to load periods based on date range
  }
  
  /**
   * Filter time entries based on selected criteria
   */
  private filterTimeEntries(
    entries: TimeEntry[], 
    filterBy: string | null, 
    techId: string | null, 
    crewId: string | null, 
    jobId: string | null
  ): TimeEntry[] {
    let filtered = entries;
    
    // Filter by date range
    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      return entryDate >= this.startDate && entryDate <= this.endDate;
    });
    
    // Apply specific filters
    if (filterBy === 'technician' && techId) {
      filtered = filtered.filter(e => e.technicianId === techId);
    } else if (filterBy === 'crew' && crewId) {
      // Would need to get crew members and filter by them
      // For now, simplified
    } else if (filterBy === 'job' && jobId) {
      filtered = filtered.filter(e => e.jobId === jobId);
    }
    
    return filtered;
  }
  
  /**
   * Calculate summary statistics
   */
  private calculateSummary(entries: TimeEntry[]): void {
    const hours = this.timecardService.calculateHours(entries);
    this.totalHours = hours.total;
    this.totalRegularHours = hours.regular;
    this.totalOvertimeHours = hours.overtime;
    
    // Calculate total expenses (would come from expense data)
    this.totalExpenses = 0;
  }
  
  /**
   * Handle filter change
   */
  onFilterChange(): void {
    this.accessibilityService.announce('Filter updated');
  }
  
  /**
   * Handle date range change
   */
  onDateRangeChange(range: string): void {
    switch (range) {
      case 'week':
        this.startDate = this.timecardService.getWeekStart();
        this.endDate = this.timecardService.getWeekEnd();
        break;
      case 'biweek':
        const biweekly = this.timecardService.getBiweeklyPeriod();
        this.startDate = biweekly.start;
        this.endDate = biweekly.end;
        break;
      case 'month':
        const now = new Date();
        this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    this.loadData();
    this.accessibilityService.announce(`Date range changed to ${range}`);
  }
  
  /**
   * Toggle period selection
   */
  togglePeriodSelection(periodId: string): void {
    if (this.selectedPeriodIds.has(periodId)) {
      this.selectedPeriodIds.delete(periodId);
    } else {
      this.selectedPeriodIds.add(periodId);
    }
  }
  
  /**
   * Select all periods
   */
  selectAllPeriods(checked: boolean): void {
    if (checked) {
      this.filteredPeriodsData.forEach(p => this.selectedPeriodIds.add(p.id));
    } else {
      this.selectedPeriodIds.clear();
    }
  }
  
  /**
   * Check if all periods are selected
   */
  get allPeriodsSelected(): boolean {
    return this.filteredPeriodsData.length > 0 && 
           this.selectedPeriodIds.size === this.filteredPeriodsData.length;
  }
  
  /**
   * Approve timecard period
   */
  approvePeriod(period: TimecardPeriod): void {
    const user = this.authService.getUser();
    this.store.dispatch(TimecardActions.updateTimecardPeriod({
      id: period.id,
      changes: { 
        status: 'approved' as any,
        approvedAt: new Date(),
        approvedBy: user?.id ?? user?.name ?? 'unknown'
      }
    }));
    this.accessibilityService.announce('Timecard approved');
  }
  
  /**
   * Reject timecard period
   */
  rejectPeriod(period: TimecardPeriod, reason: string): void {
    this.store.dispatch(TimecardActions.updateTimecardPeriod({
      id: period.id,
      changes: { 
        status: 'rejected' as any,
        rejectionReason: reason
      }
    }));
    this.accessibilityService.announce('Timecard rejected');
  }
  
  /**
   * Unlock period
   */
  unlockPeriod(period: TimecardPeriod): void {
    this.store.dispatch(TimecardActions.updateTimecardPeriod({
      id: period.id,
      changes: { isLocked: false }
    }));
    this.accessibilityService.announce('Timecard unlocked');
  }
  
  /**
   * Bulk approve selected periods
   */
  bulkApprove(): void {
    const user = this.authService.getUser();
    const approvedBy = user?.id ?? user?.name ?? 'unknown';
    this.selectedPeriodIds.forEach(id => {
      this.store.dispatch(TimecardActions.updateTimecardPeriod({
        id,
        changes: { 
          status: 'approved' as any,
          approvedAt: new Date(),
          approvedBy
        }
      }));
    });
    this.selectedPeriodIds.clear();
    this.accessibilityService.announce(`${this.selectedPeriodIds.size} timecards approved`);
  }
  
  /**
   * Export timecard data
   */
  exportData(): void {
    // Would implement CSV/Excel export
    this.accessibilityService.announce('Exporting timecard data');
  }
  
  /**
   * View period details
   */
  viewPeriodDetails(period: TimecardPeriod): void {
    // Would navigate to detail view or open dialog
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
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  /**
   * Get technician name
   */
  getTechnicianName(techId: string): Observable<string> {
    return this.store.select(TechnicianSelectors.selectTechnicianById(techId)).pipe(
      map(tech => tech ? `${tech.firstName} ${tech.lastName}` : 'Unknown')
    );
  }
  
  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'status-draft',
      'submitted': 'status-submitted',
      'approved': 'status-approved',
      'rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-draft';
  }
  
  /**
   * Refresh data
   */
  refresh(): void {
    this.loadData();
    this.accessibilityService.announce('Data refreshed');
  }
}
