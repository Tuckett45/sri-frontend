import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { TimecardEffects } from './timecard.effects';
import * as TimecardActions from './timecard.actions';
import * as BudgetActions from '../budgets/budget.actions';
import { TimecardService } from '../../services/timecard.service';
import { TimecardRoundingService } from '../../services/timecard-rounding.service';
import { TimecardPeriod, TimecardStatus, TimeEntry } from '../../models/time-entry.model';

/**
 * Integration tests for timecard-budget integration (Task 23.2)
 * Validates: Requirements 3.1-3.7, 8.1-8.6
 */
describe('Timecard-Budget Integration', () => {
  let effects: TimecardEffects;
  let actions$: Observable<Action>;
  let store: MockStore;
  let roundingService: TimecardRoundingService;

  const mockTimecardService = {
    getDefaultLockConfig: () => ({
      enabled: true,
      lockDay: 'Friday',
      lockTime: '17:00',
      gracePeriodHours: 0,
      allowManagerUnlock: true,
      requireUnlockReason: true,
      autoRelockAfterHours: 24
    })
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TimecardEffects,
        TimecardRoundingService,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: TimecardService, useValue: mockTimecardService }
      ]
    });

    effects = TestBed.inject(TimecardEffects);
    store = TestBed.inject(MockStore);
    roundingService = TestBed.inject(TimecardRoundingService);
  });

  function createTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id: 'entry-1',
      jobId: 'job-1',
      technicianId: 'tech-1',
      clockInTime: new Date('2024-01-15T08:00:00'),
      clockOutTime: new Date('2024-01-15T16:22:00'), // 8h 22m -> rounds to 8.5h
      isManuallyAdjusted: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  function createPeriod(entries: TimeEntry[]): TimecardPeriod {
    return {
      id: 'period-1',
      technicianId: 'tech-1',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-21'),
      periodType: 'weekly',
      status: TimecardStatus.Submitted,
      isLocked: false,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      totalExpenses: 0,
      timeEntries: entries,
      expenses: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  describe('submitTimecardBudgetDeduction$', () => {
    it('should dispatch deductHours with rounded hours on timecard submission', (done) => {
      const entry = createTimeEntry();
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      const { roundedHours } = roundingService.processTimecardEntry(
        new Date(entry.clockInTime),
        new Date(entry.clockOutTime!)
      );

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        expect(action.type).toBe(BudgetActions.deductHours.type);
        expect((action as any).jobId).toBe('job-1');
        expect((action as any).hours).toBe(roundedHours);
        expect((action as any).timecardEntryId).toBe('entry-1');
        done();
      });
    });

    it('should use rounded hours (not actual hours) for budget deduction', (done) => {
      // 2h 7m actual -> should round up to 2.25h (2h 15m)
      const entry = createTimeEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T10:07:00')
      });
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        // 2h 7m = 127 minutes -> ceil(127/15)*15 = 135 minutes = 2.25 hours
        expect((action as any).hours).toBe(2.25);
        done();
      });
    });

    it('should dispatch deductions for multiple time entries across different jobs', (done) => {
      const entry1 = createTimeEntry({
        id: 'entry-1',
        jobId: 'job-1',
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T12:00:00') // exactly 4h
      });
      const entry2 = createTimeEntry({
        id: 'entry-2',
        jobId: 'job-2',
        clockInTime: new Date('2024-01-15T13:00:00'),
        clockOutTime: new Date('2024-01-15T17:00:00') // exactly 4h
      });
      const period = createPeriod([entry1, entry2]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      const emitted: Action[] = [];
      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        emitted.push(action);
        if (emitted.length === 2) {
          expect(emitted[0].type).toBe(BudgetActions.deductHours.type);
          expect((emitted[0] as any).jobId).toBe('job-1');
          expect(emitted[1].type).toBe(BudgetActions.deductHours.type);
          expect((emitted[1] as any).jobId).toBe('job-2');
          done();
        }
      });
    });

    it('should handle period with no time entries gracefully', (done) => {
      const period = createPeriod([]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        expect(action.type).toBe(TimecardActions.budgetDeductionTriggered.type);
        done();
      });
    });

    it('should skip entries without clockOutTime', (done) => {
      const entry = createTimeEntry({
        clockOutTime: undefined
      });
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        // Should emit the no-op confirmation since no valid entries
        expect(action.type).toBe(TimecardActions.budgetDeductionTriggered.type);
        done();
      });
    });

    it('should preserve exact 15-minute intervals without additional rounding', (done) => {
      // Exactly 2h 15m = 135 minutes, divisible by 15
      const entry = createTimeEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T10:15:00')
      });
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        expect((action as any).hours).toBe(2.25);
        done();
      });
    });
  });

  describe('approveTimecardBudgetDeduction$', () => {
    it('should dispatch deductHours on timecard approval', (done) => {
      const entry = createTimeEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T12:30:00') // 4h 30m -> 4.5h
      });
      const period = createPeriod([entry]);
      period.status = TimecardStatus.Approved;

      actions$ = of(TimecardActions.approveTimecardSuccess({ period }));

      effects.approveTimecardBudgetDeduction$.subscribe(action => {
        expect(action.type).toBe(BudgetActions.deductHours.type);
        expect((action as any).jobId).toBe('job-1');
        expect((action as any).hours).toBe(4.5);
        done();
      });
    });
  });

  describe('Rounding integration', () => {
    it('should round 1 minute to 15 minutes (0.25 hours)', (done) => {
      const entry = createTimeEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T08:01:00')
      });
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        expect((action as any).hours).toBe(0.25);
        done();
      });
    });

    it('should round 16 minutes to 30 minutes (0.5 hours)', (done) => {
      const entry = createTimeEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T08:16:00')
      });
      const period = createPeriod([entry]);

      actions$ = of(TimecardActions.submitTimecardSuccess({ period }));

      effects.submitTimecardBudgetDeduction$.subscribe(action => {
        expect((action as any).hours).toBe(0.5);
        done();
      });
    });
  });
});
