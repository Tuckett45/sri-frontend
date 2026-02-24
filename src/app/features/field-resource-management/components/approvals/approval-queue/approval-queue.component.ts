import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WorkflowService } from '../../../../../services/workflow.service';
import { AuthService } from '../../../../../services/auth.service';
import {
  ApprovalTask,
  ApprovalTaskType,
  ApprovalTaskStatus
} from '../../../../../models/workflow.model';

/**
 * Component for displaying and managing the approval queue.
 * 
 * Features:
 * - Display pending approvals for current user
 * - Filter by type, date, market
 * - Sort by submission date, priority
 * - Approve/reject/request changes actions
 * - Comment input for approval actions
 * - Required reason input for rejection
 * - Notification badge for pending count
 */
@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-queue.component.html',
  styleUrls: ['./approval-queue.component.scss']
})
export class ApprovalQueueComponent implements OnInit, OnDestroy {
  tasks: ApprovalTask[] = [];
  filteredTasks: ApprovalTask[] = [];
  loading = false;
  error: string | null = null;
  
  // Filter options
  selectedType: ApprovalTaskType | 'all' = 'all';
  selectedMarket: string | 'all' = 'all';
  dateFrom: string = '';
  dateTo: string = '';
  
  // Sort options
  sortBy: 'date' | 'priority' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Available markets for filtering
  availableMarkets: string[] = [];
  
  // Task type options
  taskTypes: { value: ApprovalTaskType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'street_sheet', label: 'Street Sheet' },
    { value: 'daily_report', label: 'Daily Report' },
    { value: 'punch_list', label: 'Punch List' },
    { value: 'resource_allocation', label: 'Resource Allocation' }
  ];
  
  // Action state
  selectedTask: ApprovalTask | null = null;
  actionType: 'approve' | 'reject' | 'request_changes' | null = null;
  actionComment = '';
  actionReason = '';
  processingAction = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private workflowService: WorkflowService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadApprovalTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load approval tasks for the current user
   */
  loadApprovalTasks(): void {
    this.loading = true;
    this.error = null;

    this.workflowService.getMyApprovalTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks;
          this.extractAvailableMarkets();
          this.applyFiltersAndSort();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load approval tasks. Please try again.';
          console.error('Error loading approval tasks:', err);
          this.loading = false;
        }
      });
  }

  /**
   * Extract unique markets from tasks for filter dropdown
   */
  private extractAvailableMarkets(): void {
    const markets = new Set(this.tasks.map(task => task.market));
    this.availableMarkets = Array.from(markets).sort();
  }

  /**
   * Apply filters and sorting to the task list
   */
  applyFiltersAndSort(): void {
    let filtered = [...this.tasks];

    // Filter by type
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(task => task.type === this.selectedType);
    }

    // Filter by market
    if (this.selectedMarket !== 'all') {
      filtered = filtered.filter(task => task.market === this.selectedMarket);
    }

    // Filter by date range
    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      filtered = filtered.filter(task => task.submittedAt >= fromDate);
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(task => task.submittedAt <= toDate);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (this.sortBy === 'date') {
        comparison = a.submittedAt.getTime() - b.submittedAt.getTime();
      } else if (this.sortBy === 'priority') {
        // Priority based on approval level (higher level = higher priority)
        comparison = b.approvalLevel - a.approvalLevel;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredTasks = filtered;
  }

  /**
   * Get pending task count for notification badge
   */
  get pendingCount(): number {
    return this.tasks.filter(task => task.status === 'pending').length;
  }

  /**
   * Open action dialog for a task
   */
  openActionDialog(task: ApprovalTask, action: 'approve' | 'reject' | 'request_changes'): void {
    this.selectedTask = task;
    this.actionType = action;
    this.actionComment = '';
    this.actionReason = '';
  }

  /**
   * Close action dialog
   */
  closeActionDialog(): void {
    this.selectedTask = null;
    this.actionType = null;
    this.actionComment = '';
    this.actionReason = '';
  }

  /**
   * Execute the selected action
   */
  executeAction(): void {
    if (!this.selectedTask || !this.actionType) {
      return;
    }

    // Validate required fields
    if (this.actionType === 'reject' && !this.actionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    if (this.actionType === 'request_changes' && !this.actionComment.trim()) {
      alert('Change request description is required');
      return;
    }

    this.processingAction = true;

    let action$;

    switch (this.actionType) {
      case 'approve':
        action$ = this.workflowService.approveTask(
          this.selectedTask.id,
          this.actionComment || undefined
        );
        break;
      case 'reject':
        action$ = this.workflowService.rejectTask(
          this.selectedTask.id,
          this.actionReason
        );
        break;
      case 'request_changes':
        action$ = this.workflowService.requestChanges(
          this.selectedTask.id,
          this.actionComment
        );
        break;
    }

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.processingAction = false;
        this.closeActionDialog();
        this.loadApprovalTasks(); // Reload to get updated list
      },
      error: (err) => {
        this.processingAction = false;
        alert('Failed to process action. Please try again.');
        console.error('Error processing action:', err);
      }
    });
  }

  /**
   * View task details
   */
  viewTaskDetails(task: ApprovalTask): void {
    this.router.navigate(['/field-resource-management/approvals', task.id]);
  }

  /**
   * Get display label for task type
   */
  getTaskTypeLabel(type: ApprovalTaskType): string {
    const typeMap: Record<ApprovalTaskType, string> = {
      street_sheet: 'Street Sheet',
      daily_report: 'Daily Report',
      punch_list: 'Punch List',
      resource_allocation: 'Resource Allocation'
    };
    return typeMap[type] || type;
  }

  /**
   * Get CSS class for task status
   */
  getStatusClass(status: ApprovalTaskStatus): string {
    const statusMap: Record<ApprovalTaskStatus, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      escalated: 'status-escalated',
      changes_requested: 'status-changes-requested'
    };
    return statusMap[status] || '';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Check if user is admin
   */
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
