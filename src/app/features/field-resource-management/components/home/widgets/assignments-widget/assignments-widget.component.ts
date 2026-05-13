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

  readonly pageSize = 3;
  currentPage = 0;
  totalItems = 0;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectAssignmentsLoading);

    this.store.select(selectAssignmentsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    const activeAssignments$ = this.store.select(selectAllAssignments).pipe(
      map(assignments => assignments.filter(a => a.isActive))
    );

    activeAssignments$.pipe(takeUntil(this.destroy$))
      .subscribe(a => this.totalItems = a.length);

    this.assignments$ = activeAssignments$.pipe(
      map(assignments => {
        const start = this.currentPage * this.pageSize;
        return assignments.slice(start, start + this.pageSize);
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
    const activeAssignments$ = this.store.select(selectAllAssignments).pipe(
      map(assignments => assignments.filter(a => a.isActive))
    );
    this.assignments$ = activeAssignments$.pipe(
      map(assignments => {
        const start = this.currentPage * this.pageSize;
        return assignments.slice(start, start + this.pageSize);
      })
    );
  }

  onAssignmentClick(id: string): void {
    this.assignmentSelected.emit(id);
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

  retry(): void {
    this.error = null;
  }
}
