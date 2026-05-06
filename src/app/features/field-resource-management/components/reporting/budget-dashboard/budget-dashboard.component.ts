import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-budget-dashboard',
  templateUrl: './budget-dashboard.component.html',
  styleUrls: ['./budget-dashboard.component.scss']
})
export class BudgetDashboardComponent implements OnInit, OnDestroy {
  displayedColumns = ['jobName', 'budget', 'actual', 'variance', 'percentUsed'];
  dataSource = new MatTableDataSource<any>([]);
  totalBudget = 0;
  totalActual = 0;
  totalVariance = 0;
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
