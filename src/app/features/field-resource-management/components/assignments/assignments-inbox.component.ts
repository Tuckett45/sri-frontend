import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AssignmentsApiService,
  UserAssignment,
  AssignmentFilters,
  AssignmentSummary,
  PaginatedAssignments
} from '../../services/assignments-api.service';

@Component({
  selector: 'app-assignments-inbox',
  templateUrl: './assignments-inbox.component.html',
  styleUrls: ['./assignments-inbox.component.scss']
})
export class AssignmentsInboxComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  assignments: UserAssignment[] = [];
  summary: AssignmentSummary | null = null;
  totalCount = 0;
  totalPages = 0;
  loading = true;
  error: string | null = null;

  activeFilter = '';
  filters: AssignmentFilters = { page: 1, pageSize: 20, sortBy: 'createdAt', sortDir: 'desc' };

  typeFilters = [
    { value: '', label: 'All' },
    { value: 'pto_approval', label: 'PTO' },
    { value: 'overtime_approval', label: 'Overtime' },
    { value: 'job_assignment', label: 'Jobs' },
    { value: 'rfp_assignment', label: 'RFPs' },
    { value: 'expense_approval', label: 'Expenses' },
    { value: 'timecard_approval', label: 'Timecards' },
    { value: 'hr_approval', label: 'HR' }
  ];

  constructor(
    private assignmentsApi: AssignmentsApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAssignments();
    this.loadSummary();

    // Auto-refresh every 60 seconds
    interval(60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadAssignments();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAssignments(): void {
    this.loading = true;
    this.error = null;
    this.assignmentsApi.getMyAssignments(this.filters).subscribe({
      next: (result: PaginatedAssignments) => {
        this.assignments = result.items;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load assignments.';
        this.loading = false;
      }
    });
  }

  loadSummary(): void {
    this.assignmentsApi.getSummary().subscribe({
      next: (summary: AssignmentSummary) => this.summary = summary,
      error: () => {}
    });
  }

  setTypeFilter(type: string): void {
    this.activeFilter = type;
    this.filters = { ...this.filters, type: type || undefined, page: 1 };
    this.loadAssignments();
  }

  onView(assignment: UserAssignment): void {
    if (assignment.link) {
      this.router.navigateByUrl(assignment.link);
    }
  }

  onComplete(assignment: UserAssignment): void {
    this.assignmentsApi.complete(assignment.id).subscribe({
      next: () => {
        this.assignments = this.assignments.filter(a => a.id !== assignment.id);
        this.totalCount--;
        this.loadSummary();
      }
    });
  }

  onDismiss(assignment: UserAssignment): void {
    this.assignmentsApi.dismiss(assignment.id).subscribe({
      next: () => {
        this.assignments = this.assignments.filter(a => a.id !== assignment.id);
        this.totalCount--;
        this.loadSummary();
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.filters = { ...this.filters, page };
    this.loadAssignments();
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'pto_approval': return 'event_busy';
      case 'overtime_approval': return 'more_time';
      case 'job_assignment': return 'work';
      case 'rfp_assignment': return 'description';
      case 'expense_approval': return 'receipt_long';
      case 'timecard_approval': return 'schedule';
      case 'schedule_change': return 'calendar_today';
      case 'inventory_request': return 'inventory';
      case 'hr_approval': return 'badge';
      default: return 'assignment';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'pto_approval': return 'PTO Approval';
      case 'overtime_approval': return 'Overtime Approval';
      case 'job_assignment': return 'Job Assignment';
      case 'rfp_assignment': return 'RFP/Quote';
      case 'expense_approval': return 'Expense Approval';
      case 'timecard_approval': return 'Timecard Approval';
      case 'schedule_change': return 'Schedule Change';
      case 'inventory_request': return 'Inventory Request';
      case 'hr_approval': return 'HR Action';
      default: return type;
    }
  }

  getTimeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
