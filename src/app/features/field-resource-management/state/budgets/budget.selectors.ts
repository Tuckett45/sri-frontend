/**
 * Budget Selectors
 * Provides memoized selectors for accessing budget state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BudgetState } from './budget.state';
import { budgetAdapter } from './budget.reducer';
import { JobBudget, BudgetStatus } from '../../models/budget.model';

// Feature selector
export const selectBudgetState = createFeatureSelector<BudgetState>('budgets');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = budgetAdapter.getSelectors();

// Select all budgets
export const selectAllBudgets = createSelector(
  selectBudgetState,
  selectAll
);

// Select budget entities
export const selectBudgetEntities = createSelector(
  selectBudgetState,
  selectEntities
);

// Select budget by job ID
export const selectBudgetByJobId = (jobId: string) => createSelector(
  selectBudgetEntities,
  (entities) => entities[jobId] || null
);

// Select selected job ID
export const selectSelectedJobId = createSelector(
  selectBudgetState,
  (state) => state.selectedJobId
);

// Select selected budget
export const selectSelectedBudget = createSelector(
  selectBudgetEntities,
  selectSelectedJobId,
  (entities, selectedJobId) => selectedJobId ? entities[selectedJobId] || null : null
);

// Select loading state
export const selectBudgetsLoading = createSelector(
  selectBudgetState,
  (state) => state.loading
);

// Select error state
export const selectBudgetsError = createSelector(
  selectBudgetState,
  (state) => state.error
);

// Select alert thresholds
export const selectAlertThresholds = createSelector(
  selectBudgetState,
  (state) => state.alertThresholds
);

// Select total count
export const selectBudgetsTotal = createSelector(
  selectBudgetState,
  selectTotal
);

// Select adjustment history for a job
export const selectAdjustmentHistory = (jobId: string) => createSelector(
  selectBudgetState,
  (state) => state.adjustmentHistory[jobId] || []
);

// Select deduction history for a job
export const selectDeductionHistory = (jobId: string) => createSelector(
  selectBudgetState,
  (state) => state.deductionHistory[jobId] || []
);

// Select budget status for a job
export const selectBudgetStatus = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  (budget) => budget?.status || null
);

// Select budgets by status
export const selectBudgetsByStatus = (status: BudgetStatus) => createSelector(
  selectAllBudgets,
  (budgets) => budgets.filter(budget => budget.status === status)
);

// Select on-track budgets
export const selectOnTrackBudgets = createSelector(
  selectAllBudgets,
  (budgets) => budgets.filter(budget => budget.status === BudgetStatus.OnTrack)
);

// Select warning budgets (80%+ consumed)
export const selectWarningBudgets = createSelector(
  selectAllBudgets,
  (budgets) => budgets.filter(budget => budget.status === BudgetStatus.Warning)
);

// Select over-budget budgets (100%+ consumed)
export const selectOverBudgetBudgets = createSelector(
  selectAllBudgets,
  (budgets) => budgets.filter(budget => budget.status === BudgetStatus.OverBudget)
);

// Select budgets needing attention (warning or over-budget)
export const selectBudgetsNeedingAttention = createSelector(
  selectAllBudgets,
  (budgets) => budgets.filter(budget => 
    budget.status === BudgetStatus.Warning || 
    budget.status === BudgetStatus.OverBudget
  )
);

// Select budget statistics
export const selectBudgetStatistics = createSelector(
  selectAllBudgets,
  (budgets) => {
    const total = budgets.length;
    
    const byStatus: Record<BudgetStatus, number> = {
      [BudgetStatus.OnTrack]: 0,
      [BudgetStatus.Warning]: 0,
      [BudgetStatus.OverBudget]: 0
    };
    
    let totalAllocated = 0;
    let totalConsumed = 0;
    let totalRemaining = 0;
    
    budgets.forEach(budget => {
      byStatus[budget.status] = (byStatus[budget.status] || 0) + 1;
      totalAllocated += budget.allocatedHours;
      totalConsumed += budget.consumedHours;
      totalRemaining += budget.remainingHours;
    });
    
    const averageConsumptionRate = totalAllocated > 0
      ? (totalConsumed / totalAllocated) * 100
      : 0;
    
    return {
      total,
      byStatus,
      totalAllocated,
      totalConsumed,
      totalRemaining,
      averageConsumptionRate: Math.round(averageConsumptionRate * 100) / 100,
      needingAttention: byStatus[BudgetStatus.Warning] + byStatus[BudgetStatus.OverBudget]
    };
  }
);

// Select budget health percentage for a job
export const selectBudgetHealthPercentage = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  (budget) => {
    if (!budget || budget.allocatedHours === 0) {
      return 100;
    }
    const consumed = (budget.consumedHours / budget.allocatedHours) * 100;
    return Math.max(0, 100 - consumed);
  }
);

// Select budget consumption percentage for a job
export const selectBudgetConsumptionPercentage = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  (budget) => {
    if (!budget || budget.allocatedHours === 0) {
      return 0;
    }
    return Math.round((budget.consumedHours / budget.allocatedHours) * 100 * 100) / 100;
  }
);

// Select if budget is at warning threshold
export const selectIsBudgetAtWarning = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  selectAlertThresholds,
  (budget, thresholds) => {
    if (!budget || budget.allocatedHours === 0) {
      return false;
    }
    const percentConsumed = (budget.consumedHours / budget.allocatedHours) * 100;
    return percentConsumed >= thresholds.warning && percentConsumed < thresholds.critical;
  }
);

// Select if budget is over budget
export const selectIsBudgetOverBudget = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  selectAlertThresholds,
  (budget, thresholds) => {
    if (!budget || budget.allocatedHours === 0) {
      return false;
    }
    const percentConsumed = (budget.consumedHours / budget.allocatedHours) * 100;
    return percentConsumed >= thresholds.critical;
  }
);

// Select budget view model for a job
export const selectBudgetViewModel = (jobId: string) => createSelector(
  selectBudgetByJobId(jobId),
  selectAdjustmentHistory(jobId),
  selectDeductionHistory(jobId),
  selectBudgetsLoading,
  selectBudgetsError,
  selectBudgetConsumptionPercentage(jobId),
  (budget, adjustments, deductions, loading, error, consumptionPercentage) => ({
    budget,
    adjustments,
    deductions,
    loading,
    error,
    consumptionPercentage,
    hasAdjustments: adjustments.length > 0,
    hasDeductions: deductions.length > 0
  })
);

// Select budgets grouped by status
export const selectBudgetsGroupedByStatus = createSelector(
  selectAllBudgets,
  (budgets) => {
    const grouped: Record<BudgetStatus, JobBudget[]> = {
      [BudgetStatus.OnTrack]: [],
      [BudgetStatus.Warning]: [],
      [BudgetStatus.OverBudget]: []
    };
    
    budgets.forEach(budget => {
      if (!grouped[budget.status]) {
        grouped[budget.status] = [];
      }
      grouped[budget.status].push(budget);
    });
    
    return grouped;
  }
);

// Select budget count by status
export const selectBudgetCountByStatus = createSelector(
  selectAllBudgets,
  (budgets) => {
    const counts: Record<BudgetStatus, number> = {
      [BudgetStatus.OnTrack]: 0,
      [BudgetStatus.Warning]: 0,
      [BudgetStatus.OverBudget]: 0
    };
    
    budgets.forEach(budget => {
      counts[budget.status] = (counts[budget.status] || 0) + 1;
    });
    
    return counts;
  }
);

// Select if any budgets are loading
export const selectHasBudgetsLoading = createSelector(
  selectBudgetsLoading,
  (loading) => loading
);

// Select if budgets have error
export const selectHasBudgetsError = createSelector(
  selectBudgetsError,
  (error) => error !== null
);

// Select budget IDs only (useful for performance)
export const selectBudgetIds = createSelector(
  selectBudgetState,
  selectIds
);

// Select recent adjustments across all budgets (last 10)
export const selectRecentAdjustments = createSelector(
  selectBudgetState,
  (state) => {
    const allAdjustments = Object.values(state.adjustmentHistory)
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return allAdjustments.slice(0, 10);
  }
);

// Select recent deductions across all budgets (last 10)
export const selectRecentDeductions = createSelector(
  selectBudgetState,
  (state) => {
    const allDeductions = Object.values(state.deductionHistory)
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return allDeductions.slice(0, 10);
  }
);

// Select total hours allocated across all budgets
export const selectTotalAllocatedHours = createSelector(
  selectAllBudgets,
  (budgets) => budgets.reduce((sum, budget) => sum + budget.allocatedHours, 0)
);

// Select total hours consumed across all budgets
export const selectTotalConsumedHours = createSelector(
  selectAllBudgets,
  (budgets) => budgets.reduce((sum, budget) => sum + budget.consumedHours, 0)
);

// Select total hours remaining across all budgets
export const selectTotalRemainingHours = createSelector(
  selectAllBudgets,
  (budgets) => budgets.reduce((sum, budget) => sum + budget.remainingHours, 0)
);

// Select budgets dashboard view model
export const selectBudgetsDashboardViewModel = createSelector(
  selectBudgetStatistics,
  selectBudgetsNeedingAttention,
  selectRecentAdjustments,
  selectRecentDeductions,
  selectBudgetsLoading,
  selectBudgetsError,
  (statistics, needingAttention, recentAdjustments, recentDeductions, loading, error) => ({
    statistics,
    needingAttention,
    recentAdjustments,
    recentDeductions,
    loading,
    error
  })
);
