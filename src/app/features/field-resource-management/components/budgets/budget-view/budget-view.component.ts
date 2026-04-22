import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { JobBudget, BudgetAdjustment, BudgetDeduction, BudgetStatus } from '../../../models/budget.model';
import * as BudgetActions from '../../../state/budgets/budget.actions';
import {
  selectBudgetViewModel,
  selectBudgetConsumptionPercentage,
  selectBudgetStatus
} from '../../../state/budgets/budget.selectors';
import { PermissionService } from '../../../../../services/permission.service';
import { BudgetAdjustmentDialogComponent } from '../budget-adjustment-dialog/budget-adjustment-dialog.component';

@Component({
  selector: 'app-budget-view',
  templateUrl: './budget-view.component.html',
  styleUrls: ['./budget-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetViewComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;

  viewModel$!: Observable<{
    budget: JobBudget | null;
    adjustments: BudgetAdjustment[];
    deductions: BudgetDeduction[];
    loading: boolean;
    error: string | null;
    consumptionPercentage: number;
    hasAdjustments: boolean;
    hasDeductions: boolean;
  }>;

  consumptionPercentage$!: Observable<number>;
  budgetStatus$!: Observable<BudgetStatus | null>;
  canAdjustBudget = false;

  readonly BudgetStatus = BudgetStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Load budget and history data
    this.store.dispatch(BudgetActions.loadBudget({ jobId: this.jobId }));
    this.store.dispatch(BudgetActions.loadAdjustmentHistory({ jobId: this.jobId }));
    this.store.dispatch(BudgetActions.loadDeductionHistory({ jobId: this.jobId }));

    // Set up observables
    this.viewModel$ = this.store.select(selectBudgetViewModel(this.jobId));
    this.consumptionPercentage$ = this.store.select(selectBudgetConsumptionPercentage(this.jobId));
    this.budgetStatus$ = this.store.select(selectBudgetStatus(this.jobId));

    // Check permissions
    this.permissionService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.canAdjustBudget = this.permissionService.checkPermission(user, 'jobs', 'update');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusColor(status: BudgetStatus | null | undefined): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'on-track';
      case BudgetStatus.Warning: return 'warning';
      case BudgetStatus.OverBudget: return 'over-budget';
      default: return 'on-track';
    }
  }

  getStatusLabel(status: BudgetStatus | null | undefined): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'On Track';
      case BudgetStatus.Warning: return 'Warning';
      case BudgetStatus.OverBudget: return 'Over Budget';
      default: return 'Unknown';
    }
  }

  getProgressBarColor(status: BudgetStatus | null | undefined): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'primary';
      case BudgetStatus.Warning: return 'accent';
      case BudgetStatus.OverBudget: return 'warn';
      default: return 'primary';
    }
  }

  openAdjustmentDialog(currentBudget: JobBudget): void {
    const dialogRef = this.dialog.open(BudgetAdjustmentDialogComponent, {
      width: '500px',
      data: {
        currentBudget: currentBudget.allocatedHours,
        consumedHours: currentBudget.consumedHours,
        remainingHours: currentBudget.remainingHours
      }
    });

    dialogRef.afterClosed().pipe(
      take(1)
    ).subscribe(result => {
      if (result) {
        this.store.dispatch(BudgetActions.adjustBudget({
          jobId: this.jobId,
          adjustment: { amount: result.amount, reason: result.reason }
        }));
      }
    });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
