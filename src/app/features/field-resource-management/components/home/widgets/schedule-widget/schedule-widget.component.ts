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
import { selectThisWeeksJobs, selectJobsLoading, selectJobsError } from '../../../../state/jobs/job.selectors';
import { Job } from '../../../../models/job.model';

@Component({
  selector: 'app-schedule-widget',
  templateUrl: './schedule-widget.component.html',
  styleUrls: ['./schedule-widget.component.scss']
})
export class ScheduleWidgetComponent implements OnInit, OnDestroy {
  @Output() viewScheduleClicked = new EventEmitter<void>();

  scheduledJobs$!: Observable<Job[]>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectJobsLoading);

    this.store.select(selectJobsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.scheduledJobs$ = this.store.select(selectThisWeeksJobs);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onViewSchedule(): void {
    this.viewScheduleClicked.emit();
  }

  retry(): void {
    this.error = null;
  }
}
