import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectAllAssignments, selectAssignmentsLoading, selectAssignmentsError } from '../../../../state/assignments/assignment.selectors';
import { selectJobEntities } from '../../../../state/jobs/job.selectors';
import { selectActiveTimeEntry, selectHasActiveEntry } from '../../../../state/time-entries/time-entry.selectors';
import { Assignment, AssignmentStatus } from '../../../../models/assignment.model';
import { Job } from '../../../../models/job.model';
import { TimeEntry } from '../../../../models/time-entry.model';

@Component({
  selector: 'app-current-job-status-widget',
  templateUrl: './current-job-status-widget.component.html',
  styleUrls: ['./current-job-status-widget.component.scss']
})
export class CurrentJobStatusWidgetComponent implements OnInit, OnDestroy {
  activeJob$!: Observable<{ job: Job; assignment: Assignment } | null>;
  activeTimeEntry$!: Observable<TimeEntry | null>;
  isClockedIn$!: Observable<boolean>;
  loading$!: Observable<boolean>;
  error: string | null = null;
  elapsedTime = '';

  private destroy$ = new Subject<void>();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectAssignmentsLoading);
    this.activeTimeEntry$ = this.store.select(selectActiveTimeEntry);
    this.isClockedIn$ = this.store.select(selectHasActiveEntry);

    this.store.select(selectAssignmentsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    // Derive the active job from either:
    // 1. The active time entry's jobId (clocked in = current job), or
    // 2. An InProgress/Accepted assignment (fallback when not clocked in)
    this.activeJob$ = combineLatest([
      this.store.select(selectAllAssignments),
      this.store.select(selectJobEntities),
      this.activeTimeEntry$
    ]).pipe(
      map(([assignments, jobEntities, activeEntry]) => {
        // If clocked in, the time entry's job is the current job
        if (activeEntry && !activeEntry.clockOutTime) {
          const job = jobEntities[activeEntry.jobId];
          if (job) {
            const assignment = assignments.find(a => a.jobId === activeEntry.jobId && a.isActive);
            return { job, assignment: assignment || { status: AssignmentStatus.InProgress } as Assignment };
          }
        }

        // Fallback: find an InProgress or Accepted assignment
        const active = assignments.find(
          a => a.isActive && (a.status === AssignmentStatus.InProgress || a.status === AssignmentStatus.Accepted)
        );
        if (!active) return null;

        const job = jobEntities[active.jobId];
        if (!job) return null;

        return { job, assignment: active };
      })
    );

    // Sync elapsed timer with active time entry
    this.activeTimeEntry$.pipe(takeUntil(this.destroy$)).subscribe(entry => {
      if (entry && !entry.clockOutTime) {
        this.startTimer(new Date(entry.clockInTime));
      } else {
        this.stopTimer();
        this.elapsedTime = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
  }

  retry(): void {
    this.error = null;
  }

  private startTimer(clockInTime: Date): void {
    this.stopTimer();
    const update = () => {
      const diff = Date.now() - clockInTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.elapsedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    update();
    this.timerInterval = setInterval(update, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
