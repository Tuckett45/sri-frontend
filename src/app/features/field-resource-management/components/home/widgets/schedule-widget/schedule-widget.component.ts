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

  readonly pageSize = 3;
  currentPage = 0;
  totalItems = 0;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectJobsLoading);

    this.store.select(selectJobsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    const allJobs$ = this.store.select(selectThisWeeksJobs);

    allJobs$.pipe(takeUntil(this.destroy$))
      .subscribe(jobs => this.totalItems = jobs.length);

    this.scheduledJobs$ = allJobs$.pipe(
      map(jobs => {
        const start = this.currentPage * this.pageSize;
        return jobs.slice(start, start + this.pageSize);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  get hasPrevPage(): boolean {
    return this.currentPage > 0;
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.refreshPage();
    }
  }

  prevPage(): void {
    if (this.hasPrevPage) {
      this.currentPage--;
      this.refreshPage();
    }
  }

  private refreshPage(): void {
    this.scheduledJobs$ = this.store.select(selectThisWeeksJobs).pipe(
      map(jobs => {
        const start = this.currentPage * this.pageSize;
        return jobs.slice(start, start + this.pageSize);
      })
    );
  }

  onViewSchedule(): void {
    this.viewScheduleClicked.emit();
  }

  retry(): void {
    this.error = null;
  }
}
