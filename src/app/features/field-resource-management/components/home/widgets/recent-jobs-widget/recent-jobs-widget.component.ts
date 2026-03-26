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
import { Job } from '../../../../models/job.model';

@Component({
  selector: 'app-recent-jobs-widget',
  templateUrl: './recent-jobs-widget.component.html',
  styleUrls: ['./recent-jobs-widget.component.scss']
})
export class RecentJobsWidgetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() marketFilter: string | null = null;
  @Input() limit: number = 10;
  @Output() jobSelected = new EventEmitter<string>();

  recentJobs$!: Observable<Job[]>;
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

    this.recentJobs$ = combineLatest([
      this.store.select(selectAllJobs),
      this.marketFilter$
    ]).pipe(
      map(([jobs, market]) => {
        let filtered = [...jobs];
        if (market != null && market !== '') {
          filtered = filtered.filter(job => job.market === market);
        }
        filtered.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        return filtered.slice(0, this.limit);
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
    this.marketFilter$.next(this.marketFilter);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'EnRoute': return 'status-en-route';
      case 'OnSite': return 'status-on-site';
      case 'NotStarted': return 'status-not-started';
      case 'Completed': return 'status-completed';
      case 'Issue': return 'status-issue';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EnRoute': return 'En Route';
      case 'OnSite': return 'On Site';
      case 'NotStarted': return 'Not Started';
      case 'Completed': return 'Completed';
      case 'Issue': return 'Issue';
      case 'Cancelled': return 'Cancelled';
      default: return status;
    }
  }
}
