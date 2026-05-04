import { timecardReducer, initialState, TimecardState } from './timecard.reducer';
import * as TimecardActions from './timecard.actions';
import {
  selectTimecardBadgeCounts,
  selectCurrentPeriodCategoryHours,
  selectCurrentPeriodPayTypeHours,
  selectCurrentPeriodBillableTotal
} from './timecard.selectors';
import { TimecardPeriod, TimecardStatus } from '../../models/time-entry.model';
import { AutoSubmitResult, TimecardBadgeCounts } from '../../../../models/time-payroll.model';

/**
 * Tests for task 12.4: timecards reducer handlers and selectors
 * Validates: Requirements 1.7, 2.4, 3.2, 4.7, 5.5
 */
describe('Timecard Reducer & Selectors (Task 12.4)', () => {

  function createPeriod(overrides: Partial<TimecardPeriod> = {}): TimecardPeriod {
    return {
      id: 'period-1',
      technicianId: 'tech-1',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-21'),
      periodType: 'weekly',
      status: TimecardStatus.Draft,
      isLocked: false,
      totalHours: 40,
      regularHours: 32,
      overtimeHours: 8,
      totalExpenses: 0,
      timeEntries: [],
      expenses: [],
      driveTimeHours: 10,
      onSiteHours: 30,
      holidayHours: 4,
      ptoHours: 8,
      totalBillableAmount: 2500,
      totalLaborCost: 1800,
      isAutoSubmitted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    } as TimecardPeriod;
  }

  describe('autoSubmitSuccess reducer handler', () => {
    it('should update matching periods to Submitted with isAutoSubmitted flag', () => {
      const period = createPeriod({ id: 'period-1' });
      const timestamp = new Date('2024-01-19T17:00:00');
      const state: TimecardState = {
        ...initialState,
        currentPeriod: period,
        periods: [period]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-1', technicianId: 'tech-1', success: true, attempt: 1, timestamp }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.currentPeriod!.status).toBe(TimecardStatus.Submitted);
      expect(newState.currentPeriod!.isAutoSubmitted).toBe(true);
      expect(newState.currentPeriod!.autoSubmittedAt).toEqual(timestamp);
      expect(newState.periods[0].status).toBe(TimecardStatus.Submitted);
      expect(newState.periods[0].isAutoSubmitted).toBe(true);
      expect(newState.periods[0].autoSubmittedAt).toEqual(timestamp);
    });

    it('should not update periods that are not in the success results', () => {
      const period1 = createPeriod({ id: 'period-1' });
      const period2 = createPeriod({ id: 'period-2' });
      const timestamp = new Date('2024-01-19T17:00:00');
      const state: TimecardState = {
        ...initialState,
        currentPeriod: period1,
        periods: [period1, period2]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-1', technicianId: 'tech-1', success: true, attempt: 1, timestamp }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.periods[0].status).toBe(TimecardStatus.Submitted);
      expect(newState.periods[1].status).toBe(TimecardStatus.Draft);
      expect(newState.periods[1].isAutoSubmitted).toBe(false);
    });

    it('should only process successful results, ignoring failed ones', () => {
      const period1 = createPeriod({ id: 'period-1' });
      const period2 = createPeriod({ id: 'period-2' });
      const timestamp = new Date('2024-01-19T17:00:00');
      const state: TimecardState = {
        ...initialState,
        currentPeriod: period1,
        periods: [period1, period2]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-1', technicianId: 'tech-1', success: true, attempt: 1, timestamp },
        { periodId: 'period-2', technicianId: 'tech-2', success: false, attempt: 1, error: 'Network error', timestamp }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.periods[0].status).toBe(TimecardStatus.Submitted);
      expect(newState.periods[0].isAutoSubmitted).toBe(true);
      expect(newState.periods[1].status).toBe(TimecardStatus.Draft);
      expect(newState.periods[1].isAutoSubmitted).toBe(false);
    });

    it('should return unchanged state when all results are failures', () => {
      const period = createPeriod({ id: 'period-1' });
      const state: TimecardState = {
        ...initialState,
        currentPeriod: period,
        periods: [period]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-1', technicianId: 'tech-1', success: false, attempt: 1, error: 'Error', timestamp: new Date() }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.currentPeriod!.status).toBe(TimecardStatus.Draft);
      expect(newState.currentPeriod!.isAutoSubmitted).toBe(false);
    });

    it('should handle multiple successful auto-submits', () => {
      const period1 = createPeriod({ id: 'period-1' });
      const period2 = createPeriod({ id: 'period-2' });
      const timestamp1 = new Date('2024-01-19T17:00:00');
      const timestamp2 = new Date('2024-01-19T17:01:00');
      const state: TimecardState = {
        ...initialState,
        currentPeriod: period1,
        periods: [period1, period2]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-1', technicianId: 'tech-1', success: true, attempt: 1, timestamp: timestamp1 },
        { periodId: 'period-2', technicianId: 'tech-2', success: true, attempt: 1, timestamp: timestamp2 }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.periods[0].status).toBe(TimecardStatus.Submitted);
      expect(newState.periods[0].autoSubmittedAt).toEqual(timestamp1);
      expect(newState.periods[1].status).toBe(TimecardStatus.Submitted);
      expect(newState.periods[1].autoSubmittedAt).toEqual(timestamp2);
    });

    it('should not update currentPeriod when it does not match any result', () => {
      const currentPeriod = createPeriod({ id: 'period-current' });
      const otherPeriod = createPeriod({ id: 'period-other' });
      const state: TimecardState = {
        ...initialState,
        currentPeriod: currentPeriod,
        periods: [currentPeriod, otherPeriod]
      };

      const results: AutoSubmitResult[] = [
        { periodId: 'period-other', technicianId: 'tech-2', success: true, attempt: 1, timestamp: new Date() }
      ];

      const newState = timecardReducer(state, TimecardActions.autoSubmitSuccess({ results }));

      expect(newState.currentPeriod!.status).toBe(TimecardStatus.Draft);
      expect(newState.currentPeriod!.isAutoSubmitted).toBe(false);
      expect(newState.periods[1].status).toBe(TimecardStatus.Submitted);
    });
  });

  describe('updateTimecardBadgeCounts reducer handler', () => {
    it('should store badge counts in state', () => {
      const counts: TimecardBadgeCounts = {
        draft: 3,
        rejected: 1,
        approachingDeadline: 2,
        total: 6
      };

      const newState = timecardReducer(initialState, TimecardActions.updateTimecardBadgeCounts({ counts }));

      expect(newState.badgeCounts).toEqual(counts);
    });

    it('should overwrite previous badge counts', () => {
      const oldCounts: TimecardBadgeCounts = { draft: 5, rejected: 2, approachingDeadline: 1, total: 8 };
      const newCounts: TimecardBadgeCounts = { draft: 3, rejected: 0, approachingDeadline: 0, total: 3 };

      const stateWithCounts: TimecardState = {
        ...initialState,
        badgeCounts: oldCounts
      };

      const newState = timecardReducer(stateWithCounts, TimecardActions.updateTimecardBadgeCounts({ counts: newCounts }));

      expect(newState.badgeCounts).toEqual(newCounts);
    });

    it('should handle zero counts', () => {
      const counts: TimecardBadgeCounts = { draft: 0, rejected: 0, approachingDeadline: 0, total: 0 };

      const newState = timecardReducer(initialState, TimecardActions.updateTimecardBadgeCounts({ counts }));

      expect(newState.badgeCounts).toEqual(counts);
    });
  });

  describe('Selectors', () => {
    function buildState(overrides: Partial<TimecardState> = {}): { timecards: TimecardState } {
      return {
        timecards: { ...initialState, ...overrides }
      };
    }

    describe('selectTimecardBadgeCounts', () => {
      it('should return null when no badge counts are set', () => {
        const result = selectTimecardBadgeCounts.projector({ ...initialState });
        expect(result).toBeNull();
      });

      it('should return badge counts from state', () => {
        const counts: TimecardBadgeCounts = { draft: 2, rejected: 1, approachingDeadline: 3, total: 6 };
        const result = selectTimecardBadgeCounts.projector({ ...initialState, badgeCounts: counts });
        expect(result).toEqual(counts);
      });
    });

    describe('selectCurrentPeriodCategoryHours', () => {
      it('should return null when no current period', () => {
        const result = selectCurrentPeriodCategoryHours.projector(null);
        expect(result).toBeNull();
      });

      it('should return category hours from the current period', () => {
        const period = createPeriod({ driveTimeHours: 12, onSiteHours: 28 });
        const result = selectCurrentPeriodCategoryHours.projector(period);

        expect(result).toEqual({
          driveTimeHours: 12,
          onSiteHours: 28,
          totalHours: 40
        });
      });

      it('should compute totalHours as sum of driveTime and onSite', () => {
        const period = createPeriod({ driveTimeHours: 5.5, onSiteHours: 14.5 });
        const result = selectCurrentPeriodCategoryHours.projector(period);

        expect(result!.totalHours).toBe(20);
      });
    });

    describe('selectCurrentPeriodPayTypeHours', () => {
      it('should return null when no current period', () => {
        const result = selectCurrentPeriodPayTypeHours.projector(null);
        expect(result).toBeNull();
      });

      it('should return pay type hours from the current period', () => {
        const period = createPeriod({
          regularHours: 32,
          overtimeHours: 8,
          holidayHours: 4,
          ptoHours: 8
        });
        const result = selectCurrentPeriodPayTypeHours.projector(period);

        expect(result).toEqual({
          regularHours: 32,
          overtimeHours: 8,
          holidayHours: 4,
          ptoHours: 8,
          totalHours: 52
        });
      });

      it('should compute totalHours as sum of all pay types', () => {
        const period = createPeriod({
          regularHours: 20,
          overtimeHours: 0,
          holidayHours: 8,
          ptoHours: 0
        });
        const result = selectCurrentPeriodPayTypeHours.projector(period);

        expect(result!.totalHours).toBe(28);
      });
    });

    describe('selectCurrentPeriodBillableTotal', () => {
      it('should return null when no current period', () => {
        const result = selectCurrentPeriodBillableTotal.projector(null);
        expect(result).toBeNull();
      });

      it('should return totalBillableAmount from the current period', () => {
        const period = createPeriod({ totalBillableAmount: 3750.50 });
        const result = selectCurrentPeriodBillableTotal.projector(period);
        expect(result).toBe(3750.50);
      });

      it('should return 0 when totalBillableAmount is 0', () => {
        const period = createPeriod({ totalBillableAmount: 0 });
        const result = selectCurrentPeriodBillableTotal.projector(period);
        expect(result).toBe(0);
      });
    });
  });

  describe('initialState', () => {
    it('should have badgeCounts as null', () => {
      expect(initialState.badgeCounts).toBeNull();
    });
  });
});
