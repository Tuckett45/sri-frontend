import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TimecardState } from './timecard.reducer';
import { CategoryHoursSummary, PayTypeHoursSummary } from '../../../../models/time-payroll.model';

export const selectTimecardState = createFeatureSelector<TimecardState>('timecards');

// Basic selectors
export const selectCurrentPeriod = createSelector(
  selectTimecardState,
  (state) => state.currentPeriod
);

export const selectAllPeriods = createSelector(
  selectTimecardState,
  (state) => state.periods
);

export const selectAllExpenses = createSelector(
  selectTimecardState,
  (state) => state.expenses
);

export const selectLockConfig = createSelector(
  selectTimecardState,
  (state) => state.lockConfig
);

export const selectUnlockRequests = createSelector(
  selectTimecardState,
  (state) => state.unlockRequests
);

export const selectViewMode = createSelector(
  selectTimecardState,
  (state) => state.viewMode
);

export const selectSelectedDate = createSelector(
  selectTimecardState,
  (state) => state.selectedDate
);

export const selectTimecardLoading = createSelector(
  selectTimecardState,
  (state) => state.loading
);

export const selectTimecardError = createSelector(
  selectTimecardState,
  (state) => state.error
);

// Computed selectors
export const selectCurrentPeriodExpenses = createSelector(
  selectCurrentPeriod,
  selectAllExpenses,
  (period, expenses) => {
    if (!period) return [];
    return expenses.filter(exp => 
      new Date(exp.date) >= period.startDate && 
      new Date(exp.date) <= period.endDate
    );
  }
);

export const selectCurrentPeriodTotalExpenses = createSelector(
  selectCurrentPeriodExpenses,
  (expenses) => expenses.reduce((sum, exp) => sum + exp.amount, 0)
);

export const selectExpensesByType = createSelector(
  selectCurrentPeriodExpenses,
  (expenses) => {
    const grouped = new Map<string, typeof expenses>();
    expenses.forEach(exp => {
      if (!grouped.has(exp.type)) {
        grouped.set(exp.type, []);
      }
      grouped.get(exp.type)!.push(exp);
    });
    return grouped;
  }
);

export const selectPendingUnlockRequests = createSelector(
  selectUnlockRequests,
  (requests) => requests.filter(r => r.status === 'pending')
);

export const selectIsCurrentPeriodLocked = createSelector(
  selectCurrentPeriod,
  (period) => period?.isLocked || false
);

export const selectCanEditCurrentPeriod = createSelector(
  selectCurrentPeriod,
  selectLockConfig,
  (period, config) => {
    if (!period || !config) return true;
    if (!config.enabled) return true;
    return !period.isLocked;
  }
);


// Badge counts selector
export const selectTimecardBadgeCounts = createSelector(
  selectTimecardState,
  (state) => state.badgeCounts
);

// Category hours breakdown for the current period
export const selectCurrentPeriodCategoryHours = createSelector(
  selectCurrentPeriod,
  (period): CategoryHoursSummary | null => {
    if (!period) return null;
    return {
      driveTimeHours: period.driveTimeHours,
      onSiteHours: period.onSiteHours,
      totalHours: period.driveTimeHours + period.onSiteHours
    };
  }
);

// Pay type hours breakdown for the current period
export const selectCurrentPeriodPayTypeHours = createSelector(
  selectCurrentPeriod,
  (period): PayTypeHoursSummary | null => {
    if (!period) return null;
    return {
      regularHours: period.regularHours,
      overtimeHours: period.overtimeHours,
      holidayHours: period.holidayHours,
      ptoHours: period.ptoHours,
      totalHours: period.regularHours + period.overtimeHours + period.holidayHours + period.ptoHours
    };
  }
);

// Billable total for the current period
export const selectCurrentPeriodBillableTotal = createSelector(
  selectCurrentPeriod,
  (period): number | null => {
    if (!period) return null;
    return period.totalBillableAmount;
  }
);
