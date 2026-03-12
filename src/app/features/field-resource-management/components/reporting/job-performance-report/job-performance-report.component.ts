import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PerformanceReport, TechnicianPerformance } from '../../../models/reporting.model';
import { DateRange } from '../../../models/assignment.model';
import { JobType, Priority } from '../../../models/job.model';
import * as ReportingActions from '../../../state/reporting/reporting.actions';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';

/**
 * Job Performance Report Component
 * Displays job completion metrics, performance charts, and top performers
 */
@Component({
  selector: 'app-job-performance-report',
  templateUrl: './job-performance-report.component.html',
  styleUrls: ['./job-performance-report.component.scss']
})
export class JobPerformanceReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Observable data streams
  performanceReport$: Observable<PerformanceReport | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Report metrics
  totalJobsCompleted: number = 0;
  totalJobsOpen: number = 0;
  completionRate: number = 0;
  averageLaborHours: number = 0;
  scheduleAdherence: number = 0;
  topPerformers: TechnicianPerformance[] = [];
  
  // Filters
  selectedDateRange: DateRange | null = null;
  selectedJobType: JobType | null = null;
  selectedPriority: Priority | null = null;
  selectedClient: string | null = null;
  
  // Chart data
  plannedVsActualChartData: any[] = [];
  plannedVsActualChartLabels: string[] = [];
  trendChartData: any[] = [];
  trendChartLabels: string[] = [];
  jobsByTypeChartData: any[] = [];
  jobsByTypeChartLabels: string[] = [];
  
  // Enum references for template
  JobType = JobType;
  Priority = Priority;
  
  // Chart options
  groupedBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => value + ' hrs'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };
  
  lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };
  
  pieChartOptions = {
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
    private router: Router
  ) {
    this.performanceReport$ = this.store.select(ReportingSelectors.selectPerformanceReport);
    this.loading$ = this.store.select(ReportingSelectors.selectReportingLoading);
    this.error$ = this.store.select(ReportingSelectors.selectReportingError);
  }
  
  ngOnInit(): void {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    this.selectedDateRange = { startDate, endDate };
    
    // Load initial data
    this.loadPerformanceReport();
    
    // Subscribe to report data
    this.performanceReport$.pipe(takeUntil(this.destroy$)).subscribe(report => {
      if (report) {
        this.updateMetrics(report);
        this.updateCharts(report);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load performance report with current filters
   */
  loadPerformanceReport(): void {
    if (!this.selectedDateRange) return;
    
    this.store.dispatch(ReportingActions.loadJobPerformance({
      dateRange: this.selectedDateRange,
      jobType: this.selectedJobType || undefined,
      priority: this.selectedPriority || undefined,
      client: this.selectedClient || undefined
    }));
  }
  
  /**
   * Handle date range change
   */
  onDateRangeChange(dateRange: DateRange): void {
    this.selectedDateRange = dateRange;
    this.loadPerformanceReport();
  }
  
  /**
   * Handle job type filter change
   */
  onJobTypeFilterChange(jobType: JobType | null): void {
    this.selectedJobType = jobType;
    this.loadPerformanceReport();
  }
  
  /**
   * Handle priority filter change
   */
  onPriorityFilterChange(priority: Priority | null): void {
    this.selectedPriority = priority;
    this.loadPerformanceReport();
  }
  
  /**
   * Handle client filter change
   */
  onClientFilterChange(client: string | null): void {
    this.selectedClient = client;
    this.loadPerformanceReport();
  }
  
  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedJobType = null;
    this.selectedPriority = null;
    this.selectedClient = null;
    this.loadPerformanceReport();
  }
  
  /**
   * Update metrics from report
   */
  private updateMetrics(report: PerformanceReport): void {
    this.totalJobsCompleted = report.totalJobsCompleted;
    this.totalJobsOpen = report.totalJobsOpen;
    this.averageLaborHours = report.averageLaborHours;
    this.scheduleAdherence = report.scheduleAdherence;
    this.topPerformers = report.topPerformers;
    
    // Calculate completion rate
    const total = this.totalJobsCompleted + this.totalJobsOpen;
    this.completionRate = total > 0 ? (this.totalJobsCompleted / total) * 100 : 0;
  }
  
  /**
   * Update charts with performance data
   */
  private updateCharts(report: PerformanceReport): void {
    // Planned vs Actual Hours Chart (mock data - would come from API)
    this.plannedVsActualChartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    this.plannedVsActualChartData = [
      {
        data: [160, 180, 170, 190],
        label: 'Planned Hours',
        backgroundColor: '#3f51b5'
      },
      {
        data: [150, 175, 165, 185],
        label: 'Actual Hours',
        backgroundColor: '#4CAF50'
      }
    ];
    
    // Trend Chart - Completions over time (mock data)
    this.trendChartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    this.trendChartData = [{
      data: [15, 18, 20, 22],
      label: 'Jobs Completed',
      borderColor: '#3f51b5',
      fill: false
    }];
    
    // Jobs by Type Chart
    this.jobsByTypeChartLabels = Object.keys(report.jobsByType);
    this.jobsByTypeChartData = [{
      data: Object.values(report.jobsByType),
      backgroundColor: [
        '#3f51b5', // Install
        '#F44336', // Decom
        '#FF9800', // SiteSurvey
        '#4CAF50'  // PM
      ]
    }];
  }
  
  /**
   * Get schedule adherence color
   */
  getScheduleAdherenceColor(): string {
    if (this.scheduleAdherence >= 90) return 'primary';
    if (this.scheduleAdherence >= 75) return 'accent';
    return 'warn';
  }
  
  /**
   * Get completion rate color
   */
  getCompletionRateColor(): string {
    if (this.completionRate >= 80) return 'primary';
    if (this.completionRate >= 60) return 'accent';
    return 'warn';
  }
  
  /**
   * View technician detail
   */
  viewTechnicianDetail(performer: TechnicianPerformance): void {
    this.router.navigate(['/field-resources/technicians', performer.technician.id]);
  }
  
  /**
   * Handle performer row click
   */
  onPerformerRowClick(performer: TechnicianPerformance): void {
    this.viewTechnicianDetail(performer);
  }
  
  /**
   * Export to CSV
   */
  exportToCSV(): void {
    // Export functionality will use ExportService
    console.log('Export to CSV');
  }
  
  /**
   * Export to PDF
   */
  exportToPDF(): void {
    // Export functionality will use ExportService
    console.log('Export to PDF');
  }
}
