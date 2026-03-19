import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import {
  ApprovalTask,
  ApprovalTaskFilters,
  WorkflowConfiguration,
  SubmitForApprovalRequest,
  ApproveTaskRequest,
  RejectTaskRequest,
  RequestChangesRequest,
  EscalateTaskRequest,
  ApprovalTaskType
} from '../models/workflow.model';

/**
 * Service for managing approval workflows and task routing.
 * 
 * This service handles:
 * - Retrieving approval tasks for users based on their role
 * - Submitting items for approval
 * - Approving, rejecting, and requesting changes to tasks
 * - Escalating tasks (Admin only)
 * - Managing workflow configurations (Admin only)
 * 
 * Role-based behavior:
 * - CM users: See only approval tasks from their assigned market
 * - Admin users: See all approval tasks across all markets
 */
@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly apiUrl = `${environment.apiUrl}/workflow`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  /**
   * Trigger notification for approval event.
   * 
   * This is a placeholder for notification integration. In a full implementation,
   * this would integrate with a NotificationService to send notifications via
   * email, in-app, SMS, etc. based on user preferences and workflow configuration.
   * 
   * @param event Type of approval event
   * @param task The approval task
   * @param recipientId User ID to notify
   */
  private triggerNotification(
    event: 'submission' | 'approval' | 'rejection' | 'changes_requested' | 'escalation',
    task: ApprovalTask,
    recipientId?: string
  ): void {
    // Notification logic would be implemented here
    // This could integrate with a NotificationService to send:
    // - Email notifications
    // - In-app notifications
    // - SMS notifications (for high-priority items)
    // - Push notifications
    
    // For now, this is a placeholder that logs the notification event
    console.log(`[Workflow Notification] ${event} for task ${task.id}`, {
      taskType: task.type,
      entityId: task.entityId,
      market: task.market,
      recipientId: recipientId || task.currentApprover
    });
  }

  /**
   * Get approval tasks for the current user.
   * 
   * Returns tasks assigned to the current user based on their role and market.
   * CM users see only tasks from their assigned market.
   * Admin users see all tasks assigned to them.
   * 
   * @returns Observable of approval tasks for the current user
   */
  getMyApprovalTasks(): Observable<ApprovalTask[]> {
    const user = this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Build query parameters with role-based filtering
    const params = this.roleBasedDataService.getRoleBasedQueryParams({
      approverId: user.id
    });

    return this.http.get<ApprovalTask[]>(`${this.apiUrl}/my-tasks`, { params }).pipe(
      map(tasks => this.mapTaskDates(tasks)),
      map(tasks => this.applyMarketFiltering(tasks))
    );
  }

  /**
   * Get all approval tasks in the system (Admin only).
   * 
   * Allows filtering by type, status, market, submitter, and date range.
   * Only accessible to Admin users.
   * 
   * @param filters Optional filters to apply to the task list
   * @returns Observable of all approval tasks matching the filters
   * @throws Error if user is not an Admin
   */
  getAllApprovalTasks(filters?: ApprovalTaskFilters): Observable<ApprovalTask[]> {
    if (!this.authService.isAdmin()) {
      throw new Error('Only Admin users can access all approval tasks');
    }

    let params = new HttpParams();

    if (filters) {
      if (filters.type) {
        params = params.set('type', filters.type);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.market) {
        params = params.set('market', filters.market);
      }
      if (filters.submittedBy) {
        params = params.set('submittedBy', filters.submittedBy);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo.toISOString());
      }
    }

    return this.http.get<ApprovalTask[]>(`${this.apiUrl}/all-tasks`, { params }).pipe(
      map(tasks => this.mapTaskDates(tasks))
    );
  }

  /**
   * Submit an item for approval.
   * 
   * Initiates an approval workflow for the specified entity.
   * The item will be routed to the appropriate approver based on workflow configuration.
   * Triggers a notification to the assigned approver.
   * 
   * @param type Type of entity being submitted
   * @param entityId ID of the entity being submitted
   * @param metadata Optional additional metadata about the submission
   * @returns Observable of the created approval task
   */
  submitForApproval(
    type: ApprovalTaskType,
    entityId: string,
    metadata?: Record<string, any>
  ): Observable<ApprovalTask> {
    const user = this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const request: SubmitForApprovalRequest = {
      type,
      entityId,
      metadata: {
        ...metadata,
        submittedBy: user.id,
        submittedByName: user.name,
        market: user.market
      }
    };

    return this.http.post<ApprovalTask>(`${this.apiUrl}/submit`, request).pipe(
      map(task => this.mapTaskDate(task)),
      tap(task => this.triggerNotification('submission', task))
    );
  }

  /**
   * Approve an approval task.
   * 
   * Marks the task as approved and advances it to the next approval level
   * or completes the workflow if this is the final level.
   * Triggers a notification to the task submitter.
   * 
   * @param taskId ID of the task to approve
   * @param comment Optional comment to include with the approval
   * @returns Observable of the updated approval task
   */
  approveTask(taskId: string, comment?: string): Observable<ApprovalTask> {
    const user = this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const request: ApproveTaskRequest = {
      taskId,
      comment
    };

    return this.http.post<ApprovalTask>(`${this.apiUrl}/approve`, request).pipe(
      map(task => this.mapTaskDate(task)),
      tap(task => this.triggerNotification('approval', task, task.submittedBy))
    );
  }

  /**
   * Reject an approval task.
   * 
   * Marks the task as rejected and returns it to the submitter.
   * A reason must be provided for the rejection.
   * Triggers a notification to the task submitter.
   * 
   * @param taskId ID of the task to reject
   * @param reason Reason for rejection (required)
   * @returns Observable of the updated approval task
   */
  rejectTask(taskId: string, reason: string): Observable<ApprovalTask> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const user = this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const request: RejectTaskRequest = {
      taskId,
      reason
    };

    return this.http.post<ApprovalTask>(`${this.apiUrl}/reject`, request).pipe(
      map(task => this.mapTaskDate(task)),
      tap(task => this.triggerNotification('rejection', task, task.submittedBy))
    );
  }

  /**
   * Request changes to an approval task.
   * 
   * Returns the task to the submitter with requested modifications.
   * The submitter can make changes and resubmit for approval.
   * Triggers a notification to the task submitter.
   * 
   * @param taskId ID of the task requiring changes
   * @param changes Description of requested changes (required)
   * @returns Observable of the updated approval task
   */
  requestChanges(taskId: string, changes: string): Observable<ApprovalTask> {
    if (!changes || changes.trim().length === 0) {
      throw new Error('Change request description is required');
    }

    const user = this.authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const request: RequestChangesRequest = {
      taskId,
      changes
    };

    return this.http.post<ApprovalTask>(`${this.apiUrl}/request-changes`, request).pipe(
      map(task => this.mapTaskDate(task)),
      tap(task => this.triggerNotification('changes_requested', task, task.submittedBy))
    );
  }

  /**
   * Escalate an approval task (Admin only).
   * 
   * Escalates a task to a higher authority or different approver.
   * Only Admin users can escalate tasks.
   * Triggers a notification to the new approver and relevant parties.
   * 
   * @param taskId ID of the task to escalate
   * @param reason Reason for escalation (required)
   * @returns Observable of the updated approval task
   * @throws Error if user is not an Admin
   */
  escalateTask(taskId: string, reason: string): Observable<ApprovalTask> {
    if (!this.authService.isAdmin()) {
      throw new Error('Only Admin users can escalate tasks');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Escalation reason is required');
    }

    const request: EscalateTaskRequest = {
      taskId,
      reason
    };

    return this.http.post<ApprovalTask>(`${this.apiUrl}/escalate`, request).pipe(
      map(task => this.mapTaskDate(task)),
      tap(task => {
        // Notify both the new approver and the original submitter
        this.triggerNotification('escalation', task);
        this.triggerNotification('escalation', task, task.submittedBy);
      })
    );
  }

  /**
   * Get workflow configuration for a specific workflow type (Admin only).
   * 
   * Retrieves the configuration including approval levels, escalation rules,
   * and notification settings for the specified workflow type.
   * 
   * @param workflowType Type of workflow to retrieve configuration for
   * @returns Observable of the workflow configuration
   * @throws Error if user is not an Admin
   */
  getWorkflowConfiguration(workflowType: string): Observable<WorkflowConfiguration> {
    if (!this.authService.isAdmin()) {
      throw new Error('Only Admin users can access workflow configuration');
    }

    return this.http.get<WorkflowConfiguration>(
      `${this.apiUrl}/configuration/${workflowType}`
    ).pipe(
      map(config => this.mapConfigurationDates(config))
    );
  }

  /**
   * Update workflow configuration (Admin only).
   * 
   * Updates the workflow configuration including approval levels,
   * escalation rules, and notification settings.
   * 
   * @param config Updated workflow configuration
   * @returns Observable of the updated workflow configuration
   * @throws Error if user is not an Admin
   */
  updateWorkflowConfiguration(config: WorkflowConfiguration): Observable<WorkflowConfiguration> {
    if (!this.authService.isAdmin()) {
      throw new Error('Only Admin users can update workflow configuration');
    }

    if (!config.workflowType) {
      throw new Error('Workflow type is required');
    }

    return this.http.put<WorkflowConfiguration>(
      `${this.apiUrl}/configuration/${config.workflowType}`,
      config
    ).pipe(
      map(updatedConfig => this.mapConfigurationDates(updatedConfig))
    );
  }

  /**
   * Apply market-based filtering to approval tasks for CM users.
   * Admin users see all tasks without filtering.
   * 
   * @param tasks Array of approval tasks
   * @returns Filtered array based on user role and market
   */
  private applyMarketFiltering(tasks: ApprovalTask[]): ApprovalTask[] {
    // Admin users see all tasks
    if (this.authService.isAdmin()) {
      return tasks;
    }

    // Apply market filtering for non-admin users
    return this.roleBasedDataService.applyMarketFilter(tasks);
  }

  /**
   * Map date strings to Date objects for an array of tasks.
   * 
   * @param tasks Array of approval tasks with date strings
   * @returns Array of approval tasks with Date objects
   */
  private mapTaskDates(tasks: ApprovalTask[]): ApprovalTask[] {
    return tasks.map(task => this.mapTaskDate(task));
  }

  /**
   * Map date strings to Date objects for a single task.
   * 
   * @param task Approval task with date strings
   * @returns Approval task with Date objects
   */
  private mapTaskDate(task: ApprovalTask): ApprovalTask {
    return {
      ...task,
      submittedAt: new Date(task.submittedAt),
      comments: task.comments.map(comment => ({
        ...comment,
        timestamp: new Date(comment.timestamp)
      }))
    };
  }

  /**
   * Map date strings to Date objects for workflow configuration.
   * 
   * @param config Workflow configuration with date strings
   * @returns Workflow configuration with Date objects
   */
  private mapConfigurationDates(config: WorkflowConfiguration): WorkflowConfiguration {
    return {
      ...config,
      createdAt: config.createdAt ? new Date(config.createdAt) : undefined,
      updatedAt: config.updatedAt ? new Date(config.updatedAt) : undefined
    };
  }
}
