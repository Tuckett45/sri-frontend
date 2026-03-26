import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { selectCurrentPeriod } from '../../../../state/timecards/timecard.selectors';
import { selectTimecardLoading, selectTimecardError } from '../../../../state/timecards/timecard.selectors';

@Component({
  selector: 'app-timecard-widget',
  templateUrl: './timecard-widget.component.html',
  styleUrls: ['./timecard-widget.component.scss']
})
export class TimecardWidgetComponent implements OnInit, OnDestroy {
  @Output() viewTimecardClicked = new EventEmitter<void>();

  currentPeriod$!: Observable<any>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTimecardLoading);

    this.store.select(selectTimecardError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.currentPeriod$ = this.store.select(selectCurrentPeriod);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onViewTimecard(): void {
    this.viewTimecardClicked.emit();
  }

  retry(): void {
    this.error = null;
  }
}
