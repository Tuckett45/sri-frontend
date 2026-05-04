import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardDataService } from '../../../../services/dashboard-data.service';
import { PendingExpense } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-expenses-widget',
  templateUrl: './expenses-widget.component.html',
  styleUrls: ['./expenses-widget.component.scss']
})
export class ExpensesWidgetComponent implements OnInit, OnDestroy {
  @Output() expenseSelected = new EventEmitter<string>();

  expenses: PendingExpense[] = [];
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private dashboardDataService: DashboardDataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onExpenseClick(id: string): void {
    this.expenseSelected.emit(id);
  }

  retry(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.dashboardDataService.getPendingExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.expenses = data.sort((a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          this.loading = false;
        },
        error: () => { this.error = 'Unable to load data. Please try again.'; this.loading = false; }
      });
  }
}
