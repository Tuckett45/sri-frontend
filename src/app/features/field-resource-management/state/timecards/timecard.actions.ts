import { createAction, props } from '@ngrx/store';
import { 
  TimecardPeriod, 
  TimecardLockConfig, 
  Expense,
  UnlockRequest 
} from '../../models/time-entry.model';
import { AutoSubmitResult, TimecardBadgeCounts } from '../../../../models/time-payroll.model';

// Load Timecard Period
export const loadTimecardPeriod = createAction(
  '[Timecard] Load Timecard Period',
  props<{ technicianId: string; startDate: Date; endDate: Date }>()
);

export const loadTimecardPeriodSuccess = createAction(
  '[Timecard] Load Timecard Period Success',
  props<{ period: TimecardPeriod }>()
);

export const loadTimecardPeriodFailure = createAction(
  '[Timecard] Load Timecard Period Failure',
  props<{ error: string }>()
);

// Create Timecard Period
export const createTimecardPeriod = createAction(
  '[Timecard] Create Timecard Period',
  props<{ period: Partial<TimecardPeriod> }>()
);

export const createTimecardPeriodSuccess = createAction(
  '[Timecard] Create Timecard Period Success',
  props<{ period: TimecardPeriod }>()
);

export const createTimecardPeriodFailure = createAction(
  '[Timecard] Create Timecard Period Failure',
  props<{ error: string }>()
);

// Update Timecard Period
export const updateTimecardPeriod = createAction(
  '[Timecard] Update Timecard Period',
  props<{ id: string; changes: Partial<TimecardPeriod> }>()
);

export const updateTimecardPeriodSuccess = createAction(
  '[Timecard] Update Timecard Period Success',
  props<{ period: TimecardPeriod }>()
);

export const updateTimecardPeriodFailure = createAction(
  '[Timecard] Update Timecard Period Failure',
  props<{ error: string }>()
);

// Submit Timecard
export const submitTimecard = createAction(
  '[Timecard] Submit Timecard',
  props<{ periodId: string }>()
);

export const submitTimecardSuccess = createAction(
  '[Timecard] Submit Timecard Success',
  props<{ period: TimecardPeriod }>()
);

export const submitTimecardFailure = createAction(
  '[Timecard] Submit Timecard Failure',
  props<{ error: string }>()
);

// Lock Configuration
export const loadLockConfig = createAction(
  '[Timecard] Load Lock Config'
);

export const loadLockConfigSuccess = createAction(
  '[Timecard] Load Lock Config Success',
  props<{ config: TimecardLockConfig }>()
);

export const loadLockConfigFailure = createAction(
  '[Timecard] Load Lock Config Failure',
  props<{ error: string }>()
);

export const updateLockConfig = createAction(
  '[Timecard] Update Lock Config',
  props<{ config: TimecardLockConfig }>()
);

export const updateLockConfigSuccess = createAction(
  '[Timecard] Update Lock Config Success',
  props<{ config: TimecardLockConfig }>()
);

export const updateLockConfigFailure = createAction(
  '[Timecard] Update Lock Config Failure',
  props<{ error: string }>()
);

// Expenses
export const addExpense = createAction(
  '[Timecard] Add Expense',
  props<{ expense: Partial<Expense> }>()
);

export const addExpenseSuccess = createAction(
  '[Timecard] Add Expense Success',
  props<{ expense: Expense }>()
);

export const addExpenseFailure = createAction(
  '[Timecard] Add Expense Failure',
  props<{ error: string }>()
);

export const updateExpense = createAction(
  '[Timecard] Update Expense',
  props<{ id: string; changes: Partial<Expense> }>()
);

export const updateExpenseSuccess = createAction(
  '[Timecard] Update Expense Success',
  props<{ expense: Expense }>()
);

export const updateExpenseFailure = createAction(
  '[Timecard] Update Expense Failure',
  props<{ error: string }>()
);

export const deleteExpense = createAction(
  '[Timecard] Delete Expense',
  props<{ id: string }>()
);

export const deleteExpenseSuccess = createAction(
  '[Timecard] Delete Expense Success',
  props<{ id: string }>()
);

export const deleteExpenseFailure = createAction(
  '[Timecard] Delete Expense Failure',
  props<{ error: string }>()
);

export const uploadReceipt = createAction(
  '[Timecard] Upload Receipt',
  props<{ expenseId: string; file: File }>()
);

export const uploadReceiptSuccess = createAction(
  '[Timecard] Upload Receipt Success',
  props<{ expenseId: string; receiptUrl: string; thumbnailUrl: string }>()
);

export const uploadReceiptFailure = createAction(
  '[Timecard] Upload Receipt Failure',
  props<{ error: string }>()
);

// Unlock Requests
export const requestUnlock = createAction(
  '[Timecard] Request Unlock',
  props<{ periodId: string; reason: string }>()
);

export const requestUnlockSuccess = createAction(
  '[Timecard] Request Unlock Success',
  props<{ request: UnlockRequest }>()
);

export const requestUnlockFailure = createAction(
  '[Timecard] Request Unlock Failure',
  props<{ error: string }>()
);

// View Mode
export const setViewMode = createAction(
  '[Timecard] Set View Mode',
  props<{ mode: 'daily' | 'weekly' | 'biweekly' | 'monthly' }>()
);

export const setSelectedDate = createAction(
  '[Timecard] Set Selected Date',
  props<{ date: Date }>()
);

// Clear State
export const clearTimecardState = createAction(
  '[Timecard] Clear State'
);

// Budget Integration Actions
export const triggerBudgetDeduction = createAction(
  '[Timecard] Trigger Budget Deduction',
  props<{ jobId: string; roundedHours: number; timecardEntryId: string }>()
);

export const budgetDeductionTriggered = createAction(
  '[Timecard] Budget Deduction Triggered',
  props<{ jobId: string; roundedHours: number; timecardEntryId: string }>()
);

// Approve Timecard (Manager action)
export const approveTimecard = createAction(
  '[Timecard] Approve Timecard',
  props<{ periodId: string }>()
);

export const approveTimecardSuccess = createAction(
  '[Timecard] Approve Timecard Success',
  props<{ period: TimecardPeriod }>()
);

export const approveTimecardFailure = createAction(
  '[Timecard] Approve Timecard Failure',
  props<{ error: string }>()
);

// Auto-Submit Actions
export const triggerAutoSubmit = createAction(
  '[Timecard] Trigger Auto Submit'
);

export const autoSubmitSuccess = createAction(
  '[Timecard] Auto Submit Success',
  props<{ results: AutoSubmitResult[] }>()
);

export const autoSubmitFailure = createAction(
  '[Timecard] Auto Submit Failure',
  props<{ periodId: string; error: string; attempt: number }>()
);

// Timecard Badge Count Actions
export const loadTimecardBadgeCounts = createAction(
  '[Timecard] Load Badge Counts'
);

export const updateTimecardBadgeCounts = createAction(
  '[Timecard] Update Badge Counts',
  props<{ counts: TimecardBadgeCounts }>()
);
