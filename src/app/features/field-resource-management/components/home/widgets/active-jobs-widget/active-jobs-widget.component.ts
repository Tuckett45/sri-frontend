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
import { selectActiveAssignments } from '../../../../state/assignments/assignment.selectors';
import { selectTechnicianEntities } from '../../../../state/technicians/technician.selectors';
import { selectCrewEntities } from '../../../../state/crews/crew.selectors';
import { Job, JobStatus } from '../../../../models/job.model';
import { Technician } from '../../../../models/technician.model';
import { Crew } from '../../../../models/crew.model';

export interface JobWithTechnicians extends Job {
  assignedTechnicians: Technician[];
  crew: Crew | null;
}

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

  activeJobs$!: Observable<JobWithTechnicians[]>;
  pagedJobs$!: Observable<JobWithTechnicians[]>;
  totalJobs$!: Observable<number>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  currentPage = 0;
  pageSize = 5;

  private marketFilter$ = new BehaviorSubject<string | null>(null);
  private page$ = new BehaviorSubject<number>(0);
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  get totalPages$(): Observable<number> {
    return this.totalJobs$.pipe(
      map(total => Math.ceil(total / this.pageSize))
    );
  }

  ngOnInit(): void {
    this.loading$ = this.store.select(selectJobsLoading);

    this.store.select(selectJobsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.activeJobs$ = combineLatest([
      this.store.select(selectAllJobs),
      this.store.select(selectActiveAssignments),
      this.store.select(selectTechnicianEntities),
      this.store.select(selectCrewEntities),
      this.marketFilter$
    ]).pipe(
      map(([jobs, activeAssignments, techEntities, crewEntities, market]) => {
        let filtered = jobs.filter(job => ACTIVE_STATUSES.includes(job.status));
        if (market != null && market !== '') {
          filtered = filtered.filter(job => job.market === market);
        }
        return filtered.map(job => {
          const jobAssignments = activeAssignments.filter(a => a.jobId === job.id);
          const assignedTechnicians = jobAssignments
            .map(a => techEntities[a.technicianId])
            .filter((t): t is Technician => t != null);
          const crew = job.crewId ? (crewEntities[job.crewId] ?? null) : null;
          return { ...job, assignedTechnicians, crew };
        });
      })
    );

    this.totalJobs$ = this.activeJobs$.pipe(map(jobs => jobs.length));

    this.pagedJobs$ = combineLatest([this.activeJobs$, this.page$]).pipe(
      map(([jobs, page]) => {
        const start = page * this.pageSize;
        return jobs.slice(start, start + this.pageSize);
      })
    );

    // Reset to first page when the underlying data changes
    this.activeJobs$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 0;
      this.page$.next(0);
    });
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

  nextPage(): void {
    this.currentPage++;
    this.page$.next(this.currentPage);
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.page$.next(this.currentPage);
    }
  }
}
