import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardMetrics, KPI, ActivityItem } from '../../../models/reporting.model';
import { Job, JobStatus } from '../../../models/job.model';
import * as ReportingActions from '../../../state/reporting/reporting.actions';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';
import { AccessibilityService } from '../../../services/accessibility.service';

/**
 * Dashboard Component
 * Displays KPI summary cards, charts, and recent activity
 * Auto-refreshes every 5 minutes
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Observable data streams
  dashboard$: Observable<DashboardMetrics | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Dashboard metrics
  totalActiveJobs$: Observable<number>;
  totalAvailableTechnicians$: Observable<number>;
  averageUtilization$: Observable<number>;
  jobsByStatus$: Observable<Record<JobStatus, number> | {}>;
  jobsRequiringAttention$: Observable<Job[]>;
  recentActivity$: Observable<ActivityItem[]>;
  kpis$: Observable<KPI[]>;
  
  // Chart data
  jobStatusChartData: any[] = [];
  jobStatusChartLabels: string[] = [];
  utilizationGaugeValue: number = 0;
  
  // Chart options
  jobStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };
  
  constructor(
    private store: Store,
    private accessibilityService: AccessibilityService
  ) {
    // Initialize observables
    this.dashboard$ = this.store.select(ReportingSelectors.selectDashboard);
    this.loading$ = this.store.select(ReportingSelectors.selectReportingLoading);
    this.error$ = this.store.select(ReportingSelectors.selectReportingError);
    
    this.totalActiveJobs$ = this.store.select(ReportingSelectors.selectTotalActiveJobs);
    this.totalAvailableTechnicians$ = this.store.select(ReportingSelectors.selectTotalAvailableTechnicians);
    this.averageUtilization$ = this.store.select(ReportingSelectors.selectAverageUtilization);
    this.jobsByStatus$ = this.store.select(ReportingSelectors.selectJobsByStatus);
    this.jobsRequiringAttention$ = this.store.select(ReportingSelectors.selectJobsRequiringAttention);
    this.recentActivity$ = this.store.select(ReportingSelectors.selectRecentActivity);
    this.kpis$ = this.store.select(ReportingSelectors.selectDashboardKPIs);
  }
  
  /**
   * Keyboard shortcut handler
   * Ctrl+R or F5: Refresh dashboard
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ctrl+R or F5 to refresh
    if ((event.ctrlKey && event.key === 'r') || event.key === 'F5') {
      event.preventDefault();
      this.onRefresh();
      this.accessibilityService.announce('Dashboard refreshed');
    }
  }
  
  ngOnInit(): void {
    // Load dashboard data
    this.loadDashboard();
    
    // Subscribe to dashboard data for chart updates
    this.dashboard$.pipe(takeUntil(this.destroy$)).subscribe(dashboard => {
      if (dashboard) {
        this.updateCharts(dashboard);
      }
    });
    
    // Subscribe to loading state for announcements
    this.loading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      if (loading) {
        this.accessibilityService.announce('Loading dashboard data');
      }
    });
    
    // Subscribe to error state for announcements
    this.error$.pipe(takeUntil(this.destroy$)).subscribe(error => {
      if (error) {
        this.accessibilityService.announceError(error);
      }
    });
    
    // Auto-refresh every 5 minutes (300000 ms)
    interval(300000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboard();
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load dashboard data
   */
  loadDashboard(): void {
    this.store.dispatch(ReportingActions.loadDashboard());
  }
  
  /**
   * Manual refresh handler
   */
  onRefresh(): void {
    this.store.dispatch(ReportingActions.refreshDashboard());
    this.accessibilityService.announce('Refreshing dashboard data');
  }
  
  /**
   * Update chart data when dashboard metrics change
   */
  private updateCharts(dashboard: DashboardMetrics): void {
    // Update job status chart
    this.updateJobStatusChart(dashboard.jobsByStatus);
    
    // Update utilization gauge
    this.utilizationGaugeValue = dashboard.averageUtilization;
  }
  
  /**
   * Update job status chart data
   */
  private updateJobStatusChart(jobsByStatus: Record<JobStatus, number>): void {
    this.jobStatusChartLabels = Object.keys(jobsByStatus);
    this.jobStatusChartData = [{
      data: Object.values(jobsByStatus),
      backgroundColor: [
        '#9E9E9E', // NotStarted - gray
        '#2196F3', // EnRoute - blue
        '#42a5f5', // OnSite - light blue
        '#66bb6a', // Completed - green
        '#ef5350', // Issue - red
        '#757575'  // Cancelled - gray
      ]
    }];
  }
  
  /**
   * Get status badge color
   */
  getStatusColor(status: JobStatus): string {
    const colorMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'gray',
      [JobStatus.EnRoute]: 'blue',
      [JobStatus.OnSite]: 'orange',
      [JobStatus.Completed]: 'green',
      [JobStatus.Issue]: 'red',
      [JobStatus.Cancelled]: 'gray'
    };
    return colorMap[status] || 'gray';
  }
  
  /**
   * Format activity timestamp
   */
  formatActivityTime(timestamp: Date): string {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
  
  /**
   * Get icon for activity type
   */
  getActivityIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'job_assigned': 'assignment',
      'job_completed': 'check_circle',
      'status_changed': 'update',
      'technician_added': 'person_add',
      'job_created': 'add_circle',
      'default': 'info'
    };
    return iconMap[type] || iconMap['default'];
  }
  
  /**
   * Navigate to detailed reports
   */
  navigateToUtilizationReport(): void {
    // Navigation will be implemented in routing task
    console.log('Navigate to utilization report');
  }
  
  navigateToPerformanceReport(): void {
    // Navigation will be implemented in routing task
    console.log('Navigate to performance report');
  }
  
  navigateToJobDetail(jobId: string): void {
    // Navigation will be implemented in routing task
    console.log('Navigate to job detail:', jobId);
  }
}
