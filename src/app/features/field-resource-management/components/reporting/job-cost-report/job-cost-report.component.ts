import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import { 
  JobCostBreakdown, 
  BudgetComparison,
  LaborCosts,
  MaterialCosts,
  TravelCosts
} from '../../../models/reporting.model';
import { BudgetStatus } from '../../../models/budget.model';
import { ReportingService } from '../../../services/reporting.service';
import * as BudgetSelectors from '../../../state/budgets/budget.selectors';

/**
 * JobCostReportComponent
 * 
 * Displays comprehensive job cost breakdown including:
 * - Labor costs by technician
 * - Material costs
 * - Travel costs
 * - Budget vs actual comparison
 * - Variance analysis
 * - Export to PDF/Excel
 * 
 * Requirements: 11.1-11.7, 12.8
 */
@Component({
  selector: 'app-job-cost-report',
  templateUrl: './job-cost-report.component.html',
  styleUrls: ['./job-cost-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobCostReportComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;

  // Observable streams
  costBreakdown$ = new BehaviorSubject<JobCostBreakdown | null>(null);
  budgetComparison$ = new BehaviorSubject<BudgetComparison | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  exporting$ = new BehaviorSubject<boolean>(false);

  // Chart data
  costDistributionData: { name: string; value: number; color: string }[] = [];
  costTrendData: { date: string; labor: number; materials: number; travel: number }[] = [];

  // Display columns for tables
  laborColumns = ['technician', 'hours', 'roundedHours', 'rate', 'total'];
  materialColumns = ['material', 'quantity', 'unitCost', 'total'];
  travelColumns = ['technician', 'distance', 'perDiem'];

  readonly BudgetStatus = BudgetStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private reportingService: ReportingService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load the job cost report data
   */
  loadReport(): void {
    if (!this.jobId) {
      this.error$.next('Job ID is required');
      return;
    }

    this.loading$.next(true);
    this.error$.next(null);

    // Load cost breakdown
    this.reportingService.getJobCostReport(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (breakdown) => {
          this.costBreakdown$.next(breakdown);
          this.updateCostDistributionChart(breakdown);
          this.loading$.next(false);
        },
        error: (err) => {
          this.error$.next(err.message || 'Failed to load cost report');
          this.loading$.next(false);
        }
      });

    // Load budget comparison
    this.reportingService.getBudgetComparison(this.jobId)
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
   * Export report to PDF or Excel
   */
  exportReport(format: 'pdf' | 'excel'): void {
    this.exporting$.next(true);
    
    this.reportingService.exportJobCostReport(this.jobId, format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `job-cost-report-${this.jobId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.exporting$.next(false);
        },
        error: (err) => {
          console.error('Export failed:', err);
          this.exporting$.next(false);
        }
      });
  }

  /**
   * Update cost distribution chart data
   */
  private updateCostDistributionChart(breakdown: JobCostBreakdown): void {
    this.costDistributionData = [
      { name: 'Labor', value: breakdown.laborCosts.totalCost, color: '#1976d2' },
      { name: 'Materials', value: breakdown.materialCosts.totalCost, color: '#ff9800' },
      { name: 'Travel', value: breakdown.travelCosts.totalCost, color: '#4caf50' }
    ].filter(item => item.value > 0);
  }

  /**
   * Get status color class
   */
  getStatusColor(status: BudgetStatus | undefined): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'on-track';
      case BudgetStatus.Warning: return 'warning';
      case BudgetStatus.OverBudget: return 'over-budget';
      default: return 'on-track';
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: BudgetStatus | undefined): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'On Track';
      case BudgetStatus.Warning: return 'Warning';
      case BudgetStatus.OverBudget: return 'Over Budget';
      default: return 'Unknown';
    }
  }

  /**
   * Get variance indicator class
   */
  getVarianceClass(variance: number): string {
    if (variance > 0) return 'positive';
    if (variance < 0) return 'negative';
    return 'neutral';
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
   * Calculate percentage of total
   */
  calculatePercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
