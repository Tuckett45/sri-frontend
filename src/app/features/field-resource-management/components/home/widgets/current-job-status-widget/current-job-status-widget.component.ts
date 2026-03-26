import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectAllAssignments, selectAssignmentsLoading, selectAssignmentsError } from '../../../../state/assignments/assignment.selectors';
import { selectJobEntities } from '../../../../state/jobs/job.selectors';
import { Assignment, AssignmentStatus } from '../../../../models/assignment.model';
import { Job } from '../../../../models/job.model';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-current-job-status-widget',
  templateUrl: './current-job-status-widget.component.html',
  styleUrls: ['./current-job-status-widget.component.scss']
})
export class CurrentJobStatusWidgetComponent implements OnInit, OnDestroy {
  activeJob$!: Observable<{ job: Job; assignment: Assignment } | null>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectAssignmentsLoading);

    this.store.select(selectAssignmentsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.activeJob$ = combineLatest([
      this.store.select(selectAllAssignments),
      this.store.select(selectJobEntities)
    ]).pipe(
      map(([assignments, jobEntities]) => {
        const inProgressAssignment = assignments.find(
          a => a.isActive && a.status === AssignmentStatus.InProgress
        );
        if (!inProgressAssignment) return null;

        const job = jobEntities[inProgressAssignment.jobId];
        if (!job) return null;

        return { job, assignment: inProgressAssignment };
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  retry(): void {
    this.error = null;
  }
}
