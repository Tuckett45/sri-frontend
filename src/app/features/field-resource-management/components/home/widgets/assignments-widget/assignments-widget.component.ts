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
import { selectAllAssignments } from '../../../../state/assignments/assignment.selectors';
import { selectAssignmentsLoading, selectAssignmentsError } from '../../../../state/assignments/assignment.selectors';
import { Assignment, AssignmentStatus } from '../../../../models/assignment.model';

@Component({
  selector: 'app-assignments-widget',
  templateUrl: './assignments-widget.component.html',
  styleUrls: ['./assignments-widget.component.scss']
})
export class AssignmentsWidgetComponent implements OnInit, OnDestroy {
  @Output() assignmentSelected = new EventEmitter<string>();
  @Output() viewAllClicked = new EventEmitter<void>();

  assignments$!: Observable<Assignment[]>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectAssignmentsLoading);

    this.store.select(selectAssignmentsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.assignments$ = this.store.select(selectAllAssignments).pipe(
      map(assignments => assignments.filter(a => a.isActive))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAssignmentClick(id: string): void {
    this.assignmentSelected.emit(id);
  }

  retry(): void {
    this.error = null;
  }

  getStatusClass(status: AssignmentStatus): string {
    switch (status) {
      case AssignmentStatus.Assigned: return 'status-assigned';
      case AssignmentStatus.Accepted: return 'status-accepted';
      case AssignmentStatus.InProgress: return 'status-in-progress';
      case AssignmentStatus.Completed: return 'status-completed';
      case AssignmentStatus.Rejected: return 'status-rejected';
      default: return '';
    }
  }
}
