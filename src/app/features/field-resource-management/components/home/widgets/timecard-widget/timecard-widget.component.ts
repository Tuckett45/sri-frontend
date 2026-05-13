import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectCurrentPeriod } from '../../../../state/timecards/timecard.selectors';
import { selectTimecardLoading, selectTimecardError } from '../../../../state/timecards/timecard.selectors';
import {
  selectActiveTimeEntry,
  selectHasActiveEntry,
  selectTodayTimeEntries,
  selectCompletedTimeEntries
} from '../../../../state/time-entries/time-entry.selectors';
import { TimeEntry, TimecardPeriod } from '../../../../models/time-entry.model';

@Component({
  selector: 'app-timecard-widget',
  templateUrl: './timecard-widget.component.html',
  styleUrls: ['./timecard-widget.component.scss']
})
export class TimecardWidgetComponent implements OnInit, OnDestroy {
  @Output() viewTimecardClicked = new EventEmitter<void>();

  currentPeriod$!: Observable<TimecardPeriod | null>;
  loading$!: Observable<boolean>;
  activeEntry$!: Observable<TimeEntry | null>;
  isClockedIn$!: Observable<boolean>;
  todayEntries$!: Observable<TimeEntry[]>;
  todayHours$!: Observable<number>;
  todayEntryCount$!: Observable<number>;
  lastCompletedEntry$!: Observable<TimeEntry | null>;
  lastEntryDuration$!: Observable<string>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTimecardLoading);

    this.store.select(selectTimecardError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.currentPeriod$ = this.store.select(selectCurrentPeriod);
    this.activeEntry$ = this.store.select(selectActiveTimeEntry);
    this.isClockedIn$ = this.store.select(selectHasActiveEntry);
    this.todayEntries$ = this.store.select(selectTodayTimeEntries);

    this.todayEntryCount$ = this.todayEntries$.pipe(
      map(entries => entries.length)
    );

    this.todayHours$ = this.todayEntries$.pipe(
      map(entries => entries.reduce((sum, e) => {
        if (!e.clockInTime) return sum;
        const clockIn = new Date(e.clockInTime).getTime();
        const clockOut = e.clockOutTime ? new Date(e.clockOutTime).getTime() : Date.now();
        return sum + (clockOut - clockIn) / 3600000;
      }, 0))
    );

    this.lastCompletedEntry$ = this.todayEntries$.pipe(
      map(entries => {
        const completed = entries
          .filter(e => e.clockOutTime)
          .sort((a, b) => new Date(b.clockOutTime!).getTime() - new Date(a.clockOutTime!).getTime());
        return completed.length > 0 ? completed[0] : null;
      })
    );

    this.lastEntryDuration$ = this.lastCompletedEntry$.pipe(
      map(entry => {
        if (!entry || !entry.clockInTime || !entry.clockOutTime) return '';
        const diff = new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  onViewTimecard(): void {
    this.viewTimecardClicked.emit();
  }

  retry(): void {
    this.error = null;
  }
}
