import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-budget-view',
  templateUrl: './budget-view.component.html',
  styleUrls: ['./budget-view.component.scss']
})
export class BudgetViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() jobId = '';

  displayedColumns = ['category', 'budgeted', 'actual', 'variance', 'percent'];

  budgetCategories: any[] = [
    { category: 'Labor', budgeted: 50000, actual: 0 },
    { category: 'Materials', budgeted: 20000, actual: 0 },
    { category: 'Travel', budgeted: 5000, actual: 0 },
    { category: 'Misc', budgeted: 2000, actual: 0 }
  ];

  get totalBudgeted(): number {
    return this.budgetCategories.reduce((sum, c) => sum + c.budgeted, 0);
  }

  get totalActual(): number {
    return this.budgetCategories.reduce((sum, c) => sum + c.actual, 0);
  }

  get totalVariance(): number {
    return this.totalBudgeted - this.totalActual;
  }

  getVariance(item: any): number {
    return item.budgeted - item.actual;
  }

  getPercent(item: any): number {
    if (item.budgeted === 0) return 0;
    return Math.round((item.actual / item.budgeted) * 100);
  }

  getProgressColor(item: any): string {
    const pct = this.getPercent(item);
    if (pct <= 75) return 'primary';
    if (pct <= 95) return 'accent';
    return 'warn';
  }

  adjustBudget(): void {
    // Open adjust budget dialog
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
