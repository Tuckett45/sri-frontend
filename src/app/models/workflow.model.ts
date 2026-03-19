/**
 * Workflow and approval process models for the Field Operations system.
 * These models support multi-level approval workflows with role-based routing.
 */

/**
 * Type of entity requiring approval
 */
export type ApprovalTaskType = 'street_sheet' | 'daily_report' | 'punch_list' | 'resource_allocation';

/**
 * Current status of an approval task
 */
export type ApprovalTaskStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'changes_requested';

/**
 * Action taken on an approval task
 */
export type ApprovalActionType = 'comment' | 'approve' | 'reject' | 'request_changes' | 'escalate';

/**
 * Comment or action recorded in the approval history
 */
export interface ApprovalComment {
  userId: string;
  userName: string;
  comment: string;
  timestamp: Date;
  action: ApprovalActionType;
}

/**
 * Approval task representing an item awaiting approval
 */
export interface ApprovalTask {
  id: string;
  type: ApprovalTaskType;
  entityId: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: Date;
  currentApprover: string;
  currentApproverName?: string;
  approvalLevel: number;
  status: ApprovalTaskStatus;
  market: string;
  comments: ApprovalComment[];
  metadata?: Record<string, any>;
}

/**
 * Filters for querying approval tasks
 */
export interface ApprovalTaskFilters {
  type?: ApprovalTaskType;
  status?: ApprovalTaskStatus;
  market?: string;
  submittedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Approval level configuration in a workflow
 */
export interface ApprovalLevel {
  level: number;
  requiredRole: string;
  marketScoped: boolean;
  timeoutHours?: number;
  autoEscalate?: boolean;
}

/**
 * Escalation rule for workflow automation
 */
export interface EscalationRule {
  triggerCondition: 'timeout' | 'rejection' | 'manual';
  escalateToRole: string;
  notifyUsers?: string[];
  escalationMessage?: string;
}

/**
 * Notification settings for workflow events
 */
export interface NotificationSettings {
  notifyOnSubmission: boolean;
  notifyOnApproval: boolean;
  notifyOnRejection: boolean;
  notifyOnEscalation: boolean;
  reminderIntervalHours?: number;
}

/**
 * Complete workflow configuration
 */
export interface WorkflowConfiguration {
  id?: string;
  workflowType: string;
  name: string;
  description?: string;
  approvalLevels: ApprovalLevel[];
  escalationRules: EscalationRule[];
  notificationSettings: NotificationSettings;
  isActive: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Request to submit an item for approval
 */
export interface SubmitForApprovalRequest {
  type: ApprovalTaskType;
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * Request to approve a task
 */
export interface ApproveTaskRequest {
  taskId: string;
  comment?: string;
}

/**
 * Request to reject a task
 */
export interface RejectTaskRequest {
  taskId: string;
  reason: string;
}

/**
 * Request to request changes to a task
 */
export interface RequestChangesRequest {
  taskId: string;
  changes: string;
}

/**
 * Request to escalate a task
 */
export interface EscalateTaskRequest {
  taskId: string;
  reason: string;
  escalateToUser?: string;
}
