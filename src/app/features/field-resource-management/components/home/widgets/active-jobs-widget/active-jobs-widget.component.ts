import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectAllJobs, selectJobsLoading, selectJobsError } from '../../../../state/jobs/job.selectors';
import { Job, JobStatus } from '../../../../models/job.model';

const ACTIVE_STATUSES: JobStatus[] = [
  JobStatus.EnRoute,
  JobStatus.OnSite,
  JobStatus.NotStarted
];

@Component({
  selector: 'app-active-jobs-widget',
  templateUrl: './active-jobs-widget.component.html',
  styleUrls: ['./active-jobs-widget.component.scss']
})
export class ActiveJobsWidgetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() marketFilter: string | null = null;
  @Output() jobSelected = new EventEmitter<string>();

  activeJobs$!: Observable<Job[]>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private marketFilter$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectJobsLoading);

    this.store.select(selectJobsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.activeJobs$ = combineLatest([
      this.store.select(selectAllJobs),
      this.marketFilter$
    ]).pipe(
      map(([jobs, market]) => {
        let filtered = jobs.filter(job => ACTIVE_STATUSES.includes(job.status));
        if (market != null && market !== '') {
          filtered = filtered.filter(job => job.market === market);
        }
        return filtered;
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['marketFilter']) {
      this.marketFilter$.next(this.marketFilter);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onJobClick(jobId: string): void {
    this.jobSelected.emit(jobId);
  }

  retry(): void {
    this.error = null;
    // Re-trigger by pushing the current market filter value again
    this.marketFilter$.next(this.marketFilter);
  }

  getStatusClass(status: JobStatus): string {
    switch (status) {
      case JobStatus.EnRoute: return 'status-en-route';
      case JobStatus.OnSite: return 'status-on-site';
      case JobStatus.NotStarted: return 'status-not-started';
      default: return '';
    }
  }

  getStatusLabel(status: JobStatus): string {
    switch (status) {
      case JobStatus.EnRoute: return 'En Route';
      case JobStatus.OnSite: return 'On Site';
      case JobStatus.NotStarted: return 'Not Started';
      default: return status;
    }
  }
}
