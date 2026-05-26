import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProjectFinancialService } from '../../../../services/project-financial.service';
import { CostAnalysisReport } from '../../../../models/atlas-lifecycle.models';

@Component({
  selector: 'app-project-financial-widget',
  templateUrl: './project-financial-widget.component.html',
  styleUrls: ['./project-financial-widget.component.scss']
})
export class ProjectFinancialWidgetComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;

  report: CostAnalysisReport | null = null;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private financialService: ProjectFinancialService) {}

  ngOnInit(): void {
    if (this.projectId) {
      this.loadData();
    }
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

    this.financialService.getCostAnalysis(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load financial data.';
          this.loading = false;
        }
      });
  }

  // Template helpers
  get budgetUtilization(): number {
    if (!this.report || this.report.budgetAmount === 0) return 0;
    return (this.report.actualCost / this.report.budgetAmount) * 100;
  }

  get utilizationClass(): string {
    const pct = this.budgetUtilization;
    if (pct >= 100) return 'utilization-over';
    if (pct >= 80) return 'utilization-warning';
    return 'utilization-healthy';
  }

  get varianceClass(): string {
    if (!this.report) return '';
    return this.report.budgetVariance > 0 ? 'variance-over' : 'variance-under';
  }

  get topCategories(): { name: string; amount: number }[] {
    if (!this.report?.expensesByCategory) return [];
    return Object.entries(this.report.expensesByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
