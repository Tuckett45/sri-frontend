import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { UtilizationReport, TechnicianUtilization } from '../../../models/reporting.model';
import { DateRange } from '../../../models/assignment.model';
import { TechnicianRole } from '../../../models/technician.model';
import * as ReportingActions from '../../../state/reporting/reporting.actions';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';

/**
 * Utilization Report Component
 * Displays technician utilization metrics with charts and export functionality
 */
@Component({
  selector: 'app-utilization-report',
  templateUrl: './utilization-report.component.html',
  styleUrls: ['./utilization-report.component.scss']
})
export class UtilizationReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Observable data streams
  utilizationReport$: Observable<UtilizationReport | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Table data
  dataSource = new MatTableDataSource<TechnicianUtilization>();
  displayedColumns: string[] = ['technicianName', 'availableHours', 'workedHours', 'utilizationRate', 'jobsCompleted', 'actions'];
  
  // Filters
  selectedDateRange: DateRange | null = null;
  selectedTechnicianId: string | null = null;
  selectedRole: TechnicianRole | null = null;
  selectedRegion: string | null = null;
  
  // Chart data
  utilizationChartData: any[] = [];
  utilizationChartLabels: string[] = [];
  trendChartData: any[] = [];
  trendChartLabels: string[] = [];
  
  // Average utilization
  averageUtilization: number = 0;
  
  // Chart options
  barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => value + '%'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };
  
  lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => value + '%'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };
  
  constructor(private store: Store) {
    this.utilizationReport$ = this.store.select(ReportingSelectors.selectUtilizationReport);
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
    this.loadUtilizationReport();
    
    // Subscribe to report data
    this.utilizationReport$.pipe(takeUntil(this.destroy$)).subscribe(report => {
      if (report) {
        this.updateTableData(report.technicians);
        this.updateCharts(report.technicians);
        this.averageUtilization = report.averageUtilization;
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load utilization report with current filters
   */
  loadUtilizationReport(): void {
    if (!this.selectedDateRange) return;
    
    this.store.dispatch(ReportingActions.loadUtilization({
      dateRange: this.selectedDateRange,
      technicianId: this.selectedTechnicianId || undefined,
      role: this.selectedRole || undefined,
      region: this.selectedRegion || undefined
    }));
  }
  
  /**
   * Handle date range change
   */
  onDateRangeChange(dateRange: DateRange): void {
    this.selectedDateRange = dateRange;
    this.loadUtilizationReport();
  }
  
  /**
   * Handle technician filter change
   */
  onTechnicianFilterChange(technicianId: string | null): void {
    this.selectedTechnicianId = technicianId;
    this.loadUtilizationReport();
  }
  
  /**
   * Handle role filter change
   */
  onRoleFilterChange(role: TechnicianRole | null): void {
    this.selectedRole = role;
    this.loadUtilizationReport();
  }
  
  /**
   * Handle region filter change
   */
  onRegionFilterChange(region: string | null): void {
    this.selectedRegion = region;
    this.loadUtilizationReport();
  }
  
  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedTechnicianId = null;
    this.selectedRole = null;
    this.selectedRegion = null;
    this.loadUtilizationReport();
  }
  
  /**
   * Update table data
   */
  private updateTableData(technicians: TechnicianUtilization[]): void {
    this.dataSource.data = technicians;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }
  
  /**
   * Update charts with utilization data
   */
  private updateCharts(technicians: TechnicianUtilization[]): void {
    // Bar chart - utilization by technician
    this.utilizationChartLabels = technicians.map(t => 
      `${t.technician.firstName} ${t.technician.lastName}`
    );
    this.utilizationChartData = [{
      data: technicians.map(t => t.utilizationRate),
      backgroundColor: technicians.map(t => this.getUtilizationColor(t.utilizationRate)),
      label: 'Utilization Rate'
    }];
    
    // Trend line chart (mock data - would come from API in real implementation)
    this.trendChartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    this.trendChartData = [{
      data: [65, 70, 72, 75],
      label: 'Average Utilization',
      borderColor: '#3f51b5',
      fill: false
    }];
  }
  
  /**
   * Get color based on utilization rate
   */
  private getUtilizationColor(rate: number): string {
    if (rate >= 80) return '#4CAF50'; // Green
    if (rate >= 60) return '#2196F3'; // Blue
    if (rate >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }
  
  /**
   * View technician detail
   */
  viewTechnicianDetail(technician: TechnicianUtilization): void {
    // Navigation will be implemented in routing task
    console.log('View technician detail:', technician.technician.id);
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
  
  /**
   * Get utilization status color
   */
  getUtilizationStatusColor(rate: number): string {
    if (rate >= 80) return 'primary';
    if (rate >= 60) return 'accent';
    return 'warn';
  }
}
