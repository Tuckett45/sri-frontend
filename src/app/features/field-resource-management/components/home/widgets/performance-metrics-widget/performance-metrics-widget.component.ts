import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PerformanceMetricsService,
  PerformanceHealth
} from '../../../../services/performance-metrics.service';
import {
  PerformanceMetrics,
  ProjectStatusReport
} from '../../../../models/atlas-lifecycle.models';

@Component({
  selector: 'app-performance-metrics-widget',
  templateUrl: './performance-metrics-widget.component.html',
  styleUrls: ['./performance-metrics-widget.component.scss']
})
export class PerformanceMetricsWidgetComponent implements OnInit, OnDestroy {
  @Input() projectId: string | null = null;

  // Portfolio-level data
  portfolioStatus: ProjectStatusReport | null = null;

  // Project-level data (when projectId is provided)
  projectMetrics: PerformanceMetrics | null = null;
  projectHealth: PerformanceHealth | null = null;

  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private performanceService: PerformanceMetricsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  retry(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    if (this.projectId) {
      this.loadProjectMetrics();
    } else {
      this.loadPortfolioStatus();
    }
  }

  private loadProjectMetrics(): void {
    this.performanceService.getProjectPerformance(this.projectId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.projectMetrics = metrics;
          this.projectHealth = this.performanceService.computeHealth(metrics);
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load performance metrics.';
          this.loading = false;
        }
      });
  }

  private loadPortfolioStatus(): void {
    this.performanceService.getPortfolioStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.portfolioStatus = status;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load portfolio status.';
          this.loading = false;
        }
      });
  }

  // Template helpers
  get spiClass(): string {
    if (!this.projectMetrics) return '';
    const spi = this.projectMetrics.schedulePerformanceIndex;
    if (spi >= 0.9) return 'metric-healthy';
    if (spi >= 0.75) return 'metric-warning';
    return 'metric-critical';
  }

  get cpiClass(): string {
    if (!this.projectMetrics) return '';
    const cpi = this.projectMetrics.costPerformanceIndex;
    if (cpi >= 0.9) return 'metric-healthy';
    if (cpi >= 0.75) return 'metric-warning';
    return 'metric-critical';
  }

  get healthIcon(): string {
    if (!this.projectHealth) return 'info';
    switch (this.projectHealth.overall) {
      case 'healthy': return 'check_circle';
      case 'at-risk': return 'warning';
      case 'critical': return 'error';
    }
  }

  get healthClass(): string {
    if (!this.projectHealth) return '';
    return `health-${this.projectHealth.overall}`;
  }

  formatIndex(value: number): string {
    return value.toFixed(2);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(0)}%`;
  }
}
