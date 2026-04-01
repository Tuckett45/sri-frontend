import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { JobBudget, BudgetStatus, BudgetAdjustment } from '../../../models/budget.model';
import * as BudgetSelectors from '../../../state/budgets/budget.selectors';
import * as BudgetActions from '../../../state/budgets/budget.actions';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';

/**
 * BudgetDashboardComponent
 * 
 * Displays budget health across all active jobs including:
 * - Budget statistics overview
 * - Jobs at risk of going over budget
 * - Budget variance trends
 * - Drill-down to job details
 * 
 * Requirements: 12.1-12.2, 12.9
 */
@Component({
  selector: 'app-budget-dashboard',
  templateUrl: './budget-dashboard.component.html',
  styleUrls: ['./budget-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetDashboardComponent implements OnInit, OnDestroy {
  // Observable streams from NgRx store
  allBudgets$!: Observable<JobBudget[]>;
  budgetStatistics$!: Observable<{
    total: number;
    byStatus: Record<BudgetStatus, number>;
    totalAllocated: number;
    totalConsumed: number;
    totalRemaining: number;
    averageConsumptionRate: number;
    needingAttention: number;
  }>;
  budgetsNeedingAttention$!: Observable<JobBudget[]>;
  warningBudgets$!: Observable<JobBudget[]>;
  overBudgetBudgets$!: Observable<JobBudget[]>;
  onTrackBudgets$!: Observable<JobBudget[]>;
  recentAdjustments$!: Observable<BudgetAdjustment[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  totalAllocatedHours$!: Observable<number>;
  totalConsumedHours$!: Observable<number>;
  totalRemainingHours$!: Observable<number>;

  // Display columns for budget table
  budgetColumns = ['jobId', 'allocated', 'consumed', 'remaining', 'status', 'actions'];

  readonly BudgetStatus = BudgetStatus;
  accessDenied = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService
  ) {}

  ngOnInit(): void {
    // Check budget access permission
    const canViewBudget = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canViewBudget'
    );
    if (!canViewBudget) {
      this.accessDenied = true;
      return;
    }

    // Initialize observables from store
    this.allBudgets$ = this.store.select(BudgetSelectors.selectAllBudgets);
    this.budgetStatistics$ = this.store.select(BudgetSelectors.selectBudgetStatistics);
    this.budgetsNeedingAttention$ = this.store.select(BudgetSelectors.selectBudgetsNeedingAttention);
    this.warningBudgets$ = this.store.select(BudgetSelectors.selectWarningBudgets);
    this.overBudgetBudgets$ = this.store.select(BudgetSelectors.selectOverBudgetBudgets);
    this.onTrackBudgets$ = this.store.select(BudgetSelectors.selectOnTrackBudgets);
    this.recentAdjustments$ = this.store.select(BudgetSelectors.selectRecentAdjustments);
    this.loading$ = this.store.select(BudgetSelectors.selectBudgetsLoading);
    this.error$ = this.store.select(BudgetSelectors.selectBudgetsError);
    this.totalAllocatedHours$ = this.store.select(BudgetSelectors.selectTotalAllocatedHours);
    this.totalConsumedHours$ = this.store.select(BudgetSelectors.selectTotalConsumedHours);
    this.totalRemainingHours$ = this.store.select(BudgetSelectors.selectTotalRemainingHours);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Navigate to job detail for drill-down
   */
  navigateToJob(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  /**
   * Get status color class
   */
  getStatusColor(status: BudgetStatus): string {
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
  getStatusLabel(status: BudgetStatus): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'On Track';
      case BudgetStatus.Warning: return 'Warning';
      case BudgetStatus.OverBudget: return 'Over Budget';
      default: return 'Unknown';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: BudgetStatus): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'check_circle';
      case BudgetStatus.Warning: return 'warning';
      case BudgetStatus.OverBudget: return 'error';
      default: return 'help';
    }
  }

  /**
   * Calculate consumption percentage for a budget
   */
  getConsumptionPercentage(budget: JobBudget): number {
    if (!budget || budget.allocatedHours === 0) return 0;
    return Math.round((budget.consumedHours / budget.allocatedHours) * 100);
  }

  /**
   * Get progress bar color based on status
   */
  getProgressBarColor(status: BudgetStatus): string {
    switch (status) {
      case BudgetStatus.OnTrack: return 'primary';
      case BudgetStatus.Warning: return 'accent';
      case BudgetStatus.OverBudget: return 'warn';
      default: return 'primary';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
