/**
 * Notification models for role-based notification management
 */

export enum NotificationChannel {
  Email = 'email',
  InApp = 'in-app',
  SMS = 'sms'
}

export enum NotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Read = 'read'
}

export interface Notification {
  id: string;
  userId: string;
  market?: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: NotificationStatus;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  sms: boolean;
  approvalReminders: boolean;
  escalationAlerts: boolean;
  dailyDigest: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  notificationTypes?: Record<string, boolean>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  bodyTemplate: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  market?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  targetRoles?: string[];
  targetMarkets?: string[];
  targetUserIds?: string[];
  createdBy: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount?: number;
}

export interface NotificationFilters {
  userId?: string;
  market?: string;
  type?: string;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}

export interface NotificationSummary {
  totalCount: number;
  unreadCount: number;
  byPriority: Record<NotificationPriority, number>;
  byType: Record<string, number>;
  byStatus: Record<NotificationStatus, number>;
}
