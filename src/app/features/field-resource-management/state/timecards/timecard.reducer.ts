import { createReducer, on } from '@ngrx/store';
import { 
  TimecardPeriod, 
  TimecardLockConfig, 
  Expense,
  UnlockRequest,
  TimeEntry
} from '../../models/time-entry.model';
import * as TimecardActions from './timecard.actions';
import * as TimeEntryActions from '../time-entries/time-entry.actions';

export interface TimecardState {
  currentPeriod: TimecardPeriod | null;
  periods: TimecardPeriod[];
  expenses: Expense[];
  lockConfig: TimecardLockConfig | null;
  unlockRequests: UnlockRequest[];
  viewMode: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  selectedDate: Date;
  loading: boolean;
  error: string | null;
}

export const initialState: TimecardState = {
  currentPeriod: null,
  periods: [],
  expenses: [],
  lockConfig: null,
  unlockRequests: [],
  viewMode: 'weekly',
  selectedDate: new Date(),
  loading: false,
  error: null
};

export const timecardReducer = createReducer(
  initialState,

  // Load Timecard Period
  on(TimecardActions.loadTimecardPeriod, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.loadTimecardPeriodSuccess, (state, { period }) => ({
    ...state,
    currentPeriod: period,
    periods: updatePeriodInList(state.periods, period),
    loading: false
  })),

  on(TimecardActions.loadTimecardPeriodFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Timecard Period
  on(TimecardActions.createTimecardPeriod, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.createTimecardPeriodSuccess, (state, { period }) => ({
    ...state,
    currentPeriod: period,
    periods: [...state.periods, period],
    loading: false
  })),

  on(TimecardActions.createTimecardPeriodFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Timecard Period
  on(TimecardActions.updateTimecardPeriod, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.updateTimecardPeriodSuccess, (state, { period }) => ({
    ...state,
    currentPeriod: state.currentPeriod?.id === period.id ? period : state.currentPeriod,
    periods: updatePeriodInList(state.periods, period),
    loading: false
  })),

  on(TimecardActions.updateTimecardPeriodFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Submit Timecard
  on(TimecardActions.submitTimecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.submitTimecardSuccess, (state, { period }) => ({
    ...state,
    currentPeriod: state.currentPeriod?.id === period.id ? period : state.currentPeriod,
    periods: updatePeriodInList(state.periods, period),
    loading: false
  })),

  on(TimecardActions.submitTimecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Lock Configuration
  on(TimecardActions.loadLockConfig, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.loadLockConfigSuccess, (state, { config }) => ({
    ...state,
    lockConfig: config,
    loading: false
  })),

  on(TimecardActions.loadLockConfigFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(TimecardActions.updateLockConfig, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.updateLockConfigSuccess, (state, { config }) => ({
    ...state,
    lockConfig: config,
    loading: false
  })),

  on(TimecardActions.updateLockConfigFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Expenses
  on(TimecardActions.addExpense, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.addExpenseSuccess, (state, { expense }) => ({
    ...state,
    expenses: [...state.expenses, expense],
    loading: false
  })),

  on(TimecardActions.addExpenseFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(TimecardActions.updateExpense, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.updateExpenseSuccess, (state, { expense }) => ({
    ...state,
    expenses: state.expenses.map(e => e.id === expense.id ? expense : e),
    loading: false
  })),

  on(TimecardActions.updateExpenseFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(TimecardActions.deleteExpense, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.deleteExpenseSuccess, (state, { id }) => ({
    ...state,
    expenses: state.expenses.filter(e => e.id !== id),
    loading: false
  })),

  on(TimecardActions.deleteExpenseFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(TimecardActions.uploadReceipt, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.uploadReceiptSuccess, (state, { expenseId, receiptUrl, thumbnailUrl }) => ({
    ...state,
    expenses: state.expenses.map(e => 
      e.id === expenseId 
        ? { ...e, receiptUrl, receiptThumbnailUrl: thumbnailUrl }
        : e
    ),
    loading: false
  })),

  on(TimecardActions.uploadReceiptFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Unlock Requests
  on(TimecardActions.requestUnlock, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.requestUnlockSuccess, (state, { request }) => ({
    ...state,
    unlockRequests: [...state.unlockRequests, request],
    loading: false
  })),

  on(TimecardActions.requestUnlockFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // View Mode
  on(TimecardActions.setViewMode, (state, { mode }) => ({
    ...state,
    viewMode: mode
  })),

  on(TimecardActions.setSelectedDate, (state, { date }) => ({
    ...state,
    selectedDate: date
  })),

  // Approve Timecard
  on(TimecardActions.approveTimecard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimecardActions.approveTimecardSuccess, (state, { period }) => ({
    ...state,
    currentPeriod: state.currentPeriod?.id === period.id ? period : state.currentPeriod,
    periods: updatePeriodInList(state.periods, period),
    loading: false
  })),

  on(TimecardActions.approveTimecardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Budget Deduction Triggered (confirmation)
  on(TimecardActions.budgetDeductionTriggered, (state) => ({
    ...state
  })),

  // Clear State
  on(TimecardActions.clearTimecardState, () => initialState),

  // ── Cross-store sync: time-entry clock-in/out updates the current period ──

  on(TimeEntryActions.clockInSuccess, (state, { timeEntry }) => {
    // Only sync active (open) entries — skip completed mock data
    if (timeEntry.clockOutTime) return state;

    const period = state.currentPeriod;
    if (period) {
      return {
        ...state,
        currentPeriod: {
          ...period,
          timeEntries: [...period.timeEntries, timeEntry],
          updatedAt: new Date()
        }
      };
    }
    // Auto-create a draft period for the current week
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return {
      ...state,
      currentPeriod: {
        id: `period-auto-${Date.now()}`,
        technicianId: timeEntry.technicianId,
        startDate: weekStart,
        endDate: weekEnd,
        periodType: 'weekly' as const,
        status: 'draft' as any,
        isLocked: false,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalExpenses: 0,
        timeEntries: [timeEntry],
        expenses: [],
        createdAt: now,
        updatedAt: now,
        driveTimeHours: 0,
        onSiteHours: 0,
        holidayHours: 0,
        ptoHours: 0,
        totalBillableAmount: 0,
        totalLaborCost: 0,
        isAutoSubmitted: false
      }
    };
  }),

  on(TimeEntryActions.clockOutSuccess, (state, { timeEntry }) => {
    if (!state.currentPeriod) return state;
    const updatedEntries = state.currentPeriod.timeEntries.map(e =>
      e.id === timeEntry.id ? { ...e, ...timeEntry } : e
    );
    const totalHours = updatedEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const regularHours = updatedEntries.reduce((sum, e) => sum + (e.regularHours || 0), 0);
    const overtimeHours = updatedEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
    return {
      ...state,
      currentPeriod: {
        ...state.currentPeriod,
        timeEntries: updatedEntries,
        totalHours,
        regularHours,
        overtimeHours,
        updatedAt: new Date()
      }
    };
  })
);

/**
 * Helper function to update a period in the list
 */
function updatePeriodInList(periods: TimecardPeriod[], updatedPeriod: TimecardPeriod): TimecardPeriod[] {
  const index = periods.findIndex(p => p.id === updatedPeriod.id);
  if (index >= 0) {
    const newPeriods = [...periods];
    newPeriods[index] = updatedPeriod;
    return newPeriods;
  }
  return periods;
}
