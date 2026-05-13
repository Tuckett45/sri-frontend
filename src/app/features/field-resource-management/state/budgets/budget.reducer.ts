/**
 * Budget Reducer
 * Manages budget state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { JobBudget, BudgetStatus } from '../../models/budget.model';
import { BudgetState } from './budget.state';
import * as BudgetActions from './budget.actions';

// Entity adapter for normalized state management
export const budgetAdapter: EntityAdapter<JobBudget> = createEntityAdapter<JobBudget>({
  selectId: (budget: JobBudget) => budget.jobId,
  sortComparer: (a: JobBudget, b: JobBudget) => {
    // Sort by status priority (over-budget > warning > on-track), then by remaining hours
    const statusOrder = { 
      [BudgetStatus.OverBudget]: 0, 
      [BudgetStatus.Warning]: 1, 
      [BudgetStatus.OnTrack]: 2 
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.remainingHours - b.remainingHours;
  }
});

// Initial state
export const initialState: BudgetState = budgetAdapter.getInitialState({
  selectedJobId: null,
  loading: false,
  error: null,
  adjustmentHistory: {},
  deductionHistory: {},
  alertThresholds: {
    warning: 80,   // 80% consumed
    critical: 100  // 100% consumed
  }
});

// Helper function to calculate budget status
function calculateBudgetStatus(allocatedHours: number, consumedHours: number): BudgetStatus {
  if (allocatedHours === 0) {
    return BudgetStatus.OnTrack;
  }
  
  const percentConsumed = (consumedHours / allocatedHours) * 100;
  
  if (percentConsumed >= 100) {
    return BudgetStatus.OverBudget;
  } else if (percentConsumed >= 80) {
    return BudgetStatus.Warning;
  } else {
    return BudgetStatus.OnTrack;
  }
}

// Reducer
export const budgetReducer = createReducer(
  initialState,

  // Load Budget
  on(BudgetActions.loadBudget, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BudgetActions.loadBudgetSuccess, (state, { budget }) =>
    budgetAdapter.upsertOne(budget, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BudgetActions.loadBudgetFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Multiple Budgets
  on(BudgetActions.loadBudgets, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BudgetActions.loadBudgetsSuccess, (state, { budgets }) =>
    budgetAdapter.upsertMany(budgets, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BudgetActions.loadBudgetsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Budget
  on(BudgetActions.createBudget, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BudgetActions.createBudgetSuccess, (state, { budget }) =>
    budgetAdapter.addOne(budget, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BudgetActions.createBudgetFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Adjust Budget
  on(BudgetActions.adjustBudget, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BudgetActions.adjustBudgetSuccess, (state, { budget, adjustment }) => {
    const updatedState = budgetAdapter.updateOne(
      { id: budget.jobId, changes: budget },
      {
        ...state,
        loading: false,
        error: null
      }
    );

    // Add adjustment to history
    const existingHistory = state.adjustmentHistory[budget.jobId] || [];
    return {
      ...updatedState,
      adjustmentHistory: {
        ...state.adjustmentHistory,
        [budget.jobId]: [...existingHistory, adjustment]
      }
    };
  }),

  on(BudgetActions.adjustBudgetFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Deduct Hours
  on(BudgetActions.deductHours, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BudgetActions.deductHoursSuccess, (state, { budget, deduction }) => {
    const updatedState = budgetAdapter.updateOne(
      { id: budget.jobId, changes: budget },
      {
        ...state,
        loading: false,
        error: null
      }
    );

    // Add deduction to history
    const existingHistory = state.deductionHistory[budget.jobId] || [];
    return {
      ...updatedState,
      deductionHistory: {
        ...state.deductionHistory,
        [budget.jobId]: [...existingHistory, deduction]
      }
    };
  }),

  on(BudgetActions.deductHoursFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Adjustment History
  on(BudgetActions.loadAdjustmentHistory, (state) => ({
    ...state,
    error: null
  })),

  on(BudgetActions.loadAdjustmentHistorySuccess, (state, { jobId, adjustments }) => ({
    ...state,
    adjustmentHistory: {
      ...state.adjustmentHistory,
      [jobId]: adjustments
    },
    error: null
  })),

  on(BudgetActions.loadAdjustmentHistoryFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Deduction History
  on(BudgetActions.loadDeductionHistory, (state) => ({
    ...state,
    error: null
  })),

  on(BudgetActions.loadDeductionHistorySuccess, (state, { jobId, deductions }) => ({
    ...state,
    deductionHistory: {
      ...state.deductionHistory,
      [jobId]: deductions
    },
    error: null
  })),

  on(BudgetActions.loadDeductionHistoryFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Select Budget
  on(BudgetActions.selectBudget, (state, { jobId }) => ({
    ...state,
    selectedJobId: jobId
  })),

  // Clear Budget Error
  on(BudgetActions.clearBudgetError, (state) => ({
    ...state,
    error: null
  })),

  // Optimistic Update Handlers
  on(BudgetActions.adjustBudgetOptimistic, (state, { jobId, adjustment }) => {
    const budget = state.entities[jobId];
    if (!budget) {
      return state;
    }

    const newAllocatedHours = budget.allocatedHours + adjustment.amount;
    const newRemainingHours = newAllocatedHours - budget.consumedHours;
    const newStatus = calculateBudgetStatus(newAllocatedHours, budget.consumedHours);

    return budgetAdapter.updateOne(
      {
        id: jobId,
        changes: {
          allocatedHours: newAllocatedHours,
          remainingHours: newRemainingHours,
          status: newStatus,
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(BudgetActions.rollbackBudgetAdjustment, (state, { originalBudget }) =>
    budgetAdapter.updateOne(
      { id: originalBudget.jobId, changes: originalBudget },
      {
        ...state,
        error: 'Budget adjustment failed - changes reverted'
      }
    )
  ),

  on(BudgetActions.deductHoursOptimistic, (state, { jobId, hours }) => {
    const budget = state.entities[jobId];
    if (!budget) {
      return state;
    }

    const newConsumedHours = budget.consumedHours + hours;
    const newRemainingHours = budget.allocatedHours - newConsumedHours;
    const newStatus = calculateBudgetStatus(budget.allocatedHours, newConsumedHours);

    return budgetAdapter.updateOne(
      {
        id: jobId,
        changes: {
          consumedHours: newConsumedHours,
          remainingHours: newRemainingHours,
          status: newStatus,
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(BudgetActions.rollbackHoursDeduction, (state, { originalBudget }) =>
    budgetAdapter.updateOne(
      { id: originalBudget.jobId, changes: originalBudget },
      {
        ...state,
        error: 'Hours deduction failed - changes reverted'
      }
    )
  )
);
