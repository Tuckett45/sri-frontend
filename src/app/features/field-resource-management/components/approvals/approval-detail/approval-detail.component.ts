import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { WorkflowService } from '../../../../../services/workflow.service';
import { AuthService } from '../../../../../services/auth.service';
import {
  ApprovalTask,
  ApprovalComment,
  ApprovalTaskType,
  ApprovalTaskStatus
} from '../../../../../models/workflow.model';

/**
 * Component for displaying detailed approval task information.
 * 
 * Features:
 * - Display full approval task details
 * - Show approval history and comments
 * - Show related entity information
 * - Implement approval action buttons
 * - Add comment/reason input with validation
 * - Add escalation button (Admin only)
 * - Show approval workflow progress
 */
@Component({
  selector: 'app-approval-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-detail.component.html',
  styleUrls: ['./approval-detail.component.scss']
})
export class ApprovalDetailComponent implements OnInit, OnDestroy {
  task: ApprovalTask | null = null;
  loading = false;
  error: string | null = null;
  
  // Action state
  actionType: 'approve' | 'reject' | 'request_changes' | 'escalate' | null = null;
  actionComment = '';
  actionReason = '';
  processingAction = false;
  
  // Related entity data (placeholder - would be loaded from respective services)
  relatedEntityData: any = null;
  loadingRelatedEntity = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const taskId = params['id'];
          if (!taskId) {
            throw new Error('Task ID is required');
          }
          return this.loadTaskDetails(taskId);
        })
      )
      .subscribe({
        error: (err) => {
          this.error = 'Failed to load task details. Please try again.';
          console.error('Error loading task:', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load task details by ID
   */
  private loadTaskDetails(taskId: string): Promise<void> {
    this.loading = true;
    this.error = null;

    return new Promise((resolve, reject) => {
      // In a real implementation, we would have a method to get a single task by ID
      // For now, we'll get all tasks and filter
      this.workflowService.getMyApprovalTasks()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (tasks) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              this.task = task;
              this.loadRelatedEntityData();
            } else {
              this.error = 'Task not found or you do not have permission to view it.';
            }
            this.loading = false;
            resolve();
          },
          error: (err) => {
            this.loading = false;
            reject(err);
          }
        });
    });
  }

  /**
   * Load related entity data based on task type
   */
  private loadRelatedEntityData(): void {
    if (!this.task) {
      return;
    }

    this.loadingRelatedEntity = true;

    // In a real implementation, this would call the appropriate service
    // based on task.type to load the related entity (street sheet, daily report, etc.)
    // For now, we'll use placeholder data
    setTimeout(() => {
      this.relatedEntityData = {
        id: this.task!.entityId,
        type: this.task!.type,
        // Additional entity-specific data would be loaded here
        summary: `${this.getTaskTypeLabel(this.task!.type)} #${this.task!.entityId}`
      };
      this.loadingRelatedEntity = false;
    }, 500);
  }

  /**
   * Open action dialog
   */
  openActionDialog(action: 'approve' | 'reject' | 'request_changes' | 'escalate'): void {
    this.actionType = action;
    this.actionComment = '';
    this.actionReason = '';
  }

  /**
   * Close action dialog
   */
  closeActionDialog(): void {
    this.actionType = null;
    this.actionComment = '';
    this.actionReason = '';
  }

  /**
   * Execute the selected action
   */
  executeAction(): void {
    if (!this.task || !this.actionType) {
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

    if (this.actionType === 'escalate' && !this.actionReason.trim()) {
      alert('Escalation reason is required');
      return;
    }

    this.processingAction = true;

    let action$;

    switch (this.actionType) {
      case 'approve':
        action$ = this.workflowService.approveTask(
          this.task.id,
          this.actionComment || undefined
        );
        break;
      case 'reject':
        action$ = this.workflowService.rejectTask(
          this.task.id,
          this.actionReason
        );
        break;
      case 'request_changes':
        action$ = this.workflowService.requestChanges(
          this.task.id,
          this.actionComment
        );
        break;
      case 'escalate':
        action$ = this.workflowService.escalateTask(
          this.task.id,
          this.actionReason
        );
        break;
    }

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.processingAction = false;
        this.closeActionDialog();
      },
      error: (err) => {
        this.processingAction = false;
        alert('Failed to process action. Please try again.');
        console.error('Error processing action:', err);
      }
    });
  }

  /**
   * Navigate back to approval queue
   */
  goBack(): void {
    this.router.navigate(['/field-resource-management/approvals']);
  }

  /**
   * Navigate to related entity
   */
  viewRelatedEntity(): void {
    if (!this.task) {
      return;
    }

    // Navigate to the appropriate detail page based on task type
    const routes: Record<ApprovalTaskType, string> = {
      street_sheet: '/atlas/street-sheets',
      daily_report: '/field-resource-management/daily-reports',
      punch_list: '/atlas/punch-lists',
      resource_allocation: '/field-resource-management/resource-allocation'
    };

    const basePath = routes[this.task.type];
    if (basePath) {
      this.router.navigate([basePath, this.task.entityId]);
    }
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
   * Get CSS class for comment action
   */
  getActionClass(action: string): string {
    const actionMap: Record<string, string> = {
      comment: 'action-comment',
      approve: 'action-approve',
      reject: 'action-reject',
      request_changes: 'action-changes',
      escalate: 'action-escalate'
    };
    return actionMap[action] || '';
  }

  /**
   * Get icon for comment action
   */
  getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      comment: '💬',
      approve: '✓',
      reject: '✗',
      request_changes: '↻',
      escalate: '⚠'
    };
    return iconMap[action] || '•';
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
   * Format date for timeline (relative)
   */
  formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(date);
    }
  }

  /**
   * Get workflow progress percentage
   */
  get workflowProgress(): number {
    if (!this.task) {
      return 0;
    }

    // Assuming max 3 approval levels
    const maxLevels = 3;
    const currentLevel = this.task.approvalLevel;
    
    if (this.task.status === 'approved') {
      return 100;
    } else if (this.task.status === 'rejected' || this.task.status === 'changes_requested') {
      return 0;
    }

    return (currentLevel / maxLevels) * 100;
  }

  /**
   * Check if current user can take action on this task
   */
  get canTakeAction(): boolean {
    if (!this.task) {
      return false;
    }

    const user = this.authService.getUser();
    return this.task.status === 'pending' && 
           this.task.currentApprover === user?.id;
  }

  /**
   * Check if user is admin
   */
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Get sorted comments (oldest first for timeline display)
   */
  get sortedComments(): ApprovalComment[] {
    if (!this.task) {
      return [];
    }

    return [...this.task.comments].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }
}
