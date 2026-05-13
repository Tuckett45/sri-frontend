/**
 * Budget Actions
 * Defines all actions for budget state management
 */

import { createAction, props } from '@ngrx/store';
import { JobBudget, BudgetAdjustment, BudgetDeduction } from '../../models/budget.model';
import { CreateBudgetDto, AdjustBudgetDto } from '../../models/dtos/budget.dto';

// Load Budget
export const loadBudget = createAction(
  '[Budget] Load Budget',
  props<{ jobId: string }>()
);

export const loadBudgetSuccess = createAction(
  '[Budget] Load Budget Success',
  props<{ budget: JobBudget }>()
);

export const loadBudgetFailure = createAction(
  '[Budget] Load Budget Failure',
  props<{ error: string }>()
);

// Load Multiple Budgets
export const loadBudgets = createAction(
  '[Budget] Load Budgets',
  props<{ jobIds: string[] }>()
);

export const loadBudgetsSuccess = createAction(
  '[Budget] Load Budgets Success',
  props<{ budgets: JobBudget[] }>()
);

export const loadBudgetsFailure = createAction(
  '[Budget] Load Budgets Failure',
  props<{ error: string }>()
);

// Create Budget
export const createBudget = createAction(
  '[Budget] Create Budget',
  props<{ budget: CreateBudgetDto }>()
);

export const createBudgetSuccess = createAction(
  '[Budget] Create Budget Success',
  props<{ budget: JobBudget }>()
);

export const createBudgetFailure = createAction(
  '[Budget] Create Budget Failure',
  props<{ error: string }>()
);

// Adjust Budget
export const adjustBudget = createAction(
  '[Budget] Adjust Budget',
  props<{ jobId: string; adjustment: AdjustBudgetDto }>()
);

export const adjustBudgetSuccess = createAction(
  '[Budget] Adjust Budget Success',
  props<{ budget: JobBudget; adjustment: BudgetAdjustment }>()
);

export const adjustBudgetFailure = createAction(
  '[Budget] Adjust Budget Failure',
  props<{ error: string }>()
);

// Deduct Hours
export const deductHours = createAction(
  '[Budget] Deduct Hours',
  props<{ jobId: string; hours: number; timecardEntryId: string }>()
);

export const deductHoursSuccess = createAction(
  '[Budget] Deduct Hours Success',
  props<{ budget: JobBudget; deduction: BudgetDeduction }>()
);

export const deductHoursFailure = createAction(
  '[Budget] Deduct Hours Failure',
  props<{ error: string }>()
);

// Load Adjustment History
export const loadAdjustmentHistory = createAction(
  '[Budget] Load Adjustment History',
  props<{ jobId: string }>()
);

export const loadAdjustmentHistorySuccess = createAction(
  '[Budget] Load Adjustment History Success',
  props<{ jobId: string; adjustments: BudgetAdjustment[] }>()
);

export const loadAdjustmentHistoryFailure = createAction(
  '[Budget] Load Adjustment History Failure',
  props<{ error: string }>()
);

// Load Deduction History
export const loadDeductionHistory = createAction(
  '[Budget] Load Deduction History',
  props<{ jobId: string }>()
);

export const loadDeductionHistorySuccess = createAction(
  '[Budget] Load Deduction History Success',
  props<{ jobId: string; deductions: BudgetDeduction[] }>()
);

export const loadDeductionHistoryFailure = createAction(
  '[Budget] Load Deduction History Failure',
  props<{ error: string }>()
);

// Select Budget
export const selectBudget = createAction(
  '[Budget] Select Budget',
  props<{ jobId: string | null }>()
);

// Budget Alert
export const budgetAlert = createAction(
  '[Budget] Budget Alert',
  props<{ jobId: string; budget: JobBudget; threshold: 'warning' | 'critical' }>()
);

// Clear Budget Error
export const clearBudgetError = createAction(
  '[Budget] Clear Budget Error'
);

// Optimistic Update Actions
export const adjustBudgetOptimistic = createAction(
  '[Budget] Adjust Budget Optimistic',
  props<{ jobId: string; adjustment: AdjustBudgetDto; originalBudget: JobBudget }>()
);

export const rollbackBudgetAdjustment = createAction(
  '[Budget] Rollback Budget Adjustment',
  props<{ originalBudget: JobBudget }>()
);

export const deductHoursOptimistic = createAction(
  '[Budget] Deduct Hours Optimistic',
  props<{ jobId: string; hours: number; timecardEntryId: string; originalBudget: JobBudget }>()
);

export const rollbackHoursDeduction = createAction(
  '[Budget] Rollback Hours Deduction',
  props<{ originalBudget: JobBudget }>()
);
