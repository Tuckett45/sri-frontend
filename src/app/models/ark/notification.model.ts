/**
 * ARK notification models for role-based notification management
 * Includes legacy ARK notifications and FRM (Field Resource Management) notifications
 */

export enum ArkNotificationChannel {
  Email = 'email',
  InApp = 'in-app',
  SMS = 'sms'
}

export enum ArkNotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

export enum ArkNotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Read = 'read'
}

export enum ArkNotificationType {
  ApprovalReminder = 'approval_reminder',
  CriticalIssue = 'critical_issue',
  Broadcast = 'broadcast',
  WorkflowUpdate = 'workflow_update',
  UserManagement = 'user_management',
  ResourceAllocation = 'resource_allocation',
  Reporting = 'reporting',
  // FRM notification types
  JobAssigned = 'job_assigned',
  JobReassigned = 'job_reassigned',
  JobStatusChanged = 'job_status_changed',
  JobCancelled = 'job_cancelled',
  JobCreated = 'job_created',
  JobUpdated = 'job_updated',
  CertificationExpiring = 'certification_expiring',
  ConflictDetected = 'conflict_detected',
  CrewMemberAdded = 'crew_member_added',
  TimecardSubmitted = 'timecard_submitted',
  TimecardApproved = 'timecard_approved',
  ExpenseSubmitted = 'expense_submitted'
}

export interface ArkNotification {
  id: string;
  userId: string;
  market?: string;
  title: string;
  message: string;
  type: ArkNotificationType;
  priority: ArkNotificationPriority;
  channels: ArkNotificationChannel[];
  status: ArkNotificationStatus;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface ArkNotificationPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  sms: boolean;
  approvalReminders: boolean;
  escalationAlerts: boolean;
  dailyDigest: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  notificationTypes?: Record<ArkNotificationType, boolean>;
}

export interface ArkNotificationTemplate {
  id: string;
  name: string;
  type: ArkNotificationType;
  subject: string;
  bodyTemplate: string;
  channels: ArkNotificationChannel[];
  priority: ArkNotificationPriority;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArkNotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  market?: string;
  channel: ArkNotificationChannel;
  status: ArkNotificationStatus;
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface ArkBroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: ArkNotificationType;
  priority: ArkNotificationPriority;
  channels: ArkNotificationChannel[];
  targetRoles?: string[];
  targetMarkets?: string[];
  targetUserIds?: string[];
  createdBy: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount?: number;
}

export interface ArkNotificationFilters {
  userId?: string;
  market?: string;
  type?: ArkNotificationType;
  priority?: ArkNotificationPriority;
  status?: ArkNotificationStatus;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}

export interface ArkNotificationSummary {
  totalCount: number;
  unreadCount: number;
  byPriority: Record<ArkNotificationPriority, number>;
  byType: Record<ArkNotificationType, number>;
  byStatus: Record<ArkNotificationStatus, number>;
}
