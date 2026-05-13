/**
 * ATLAS Notification Models
 * 
 * Defines notification types, enums, and interfaces for the ATLAS domain.
 * These models are separate from ARK notifications to maintain domain boundaries.
 * 
 * Requirements: 2.2, 8.2
 */

/**
 * ATLAS notification types for deployment management and system events
 */
export enum AtlasNotificationType {
  DeploymentCreated = 'deployment_created',
  DeploymentUpdated = 'deployment_updated',
  DeploymentStatusChanged = 'deployment_status_changed',
  ConnectivityAlert = 'connectivity_alert',
  SystemHealthAlert = 'system_health_alert',
  EvidenceSubmitted = 'evidence_submitted',
  ApprovalRequested = 'approval_requested',
  ApprovalDecisionRecorded = 'approval_decision_recorded',
  ExceptionCreated = 'exception_created',
  AnalysisCompleted = 'analysis_completed',
  RiskAssessmentCompleted = 'risk_assessment_completed'
}

/**
 * Priority levels for ATLAS notifications
 */
export enum AtlasNotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

/**
 * Status of ATLAS notification delivery
 */
export enum AtlasNotificationStatus {
  Pending = 'pending',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed'
}

/**
 * Types of connectivity alerts for ATLAS real-time communication
 */
export enum AtlasConnectivityAlertType {
  ConnectionLost = 'connection_lost',
  ConnectionRestored = 'connection_restored',
  ConnectionDegraded = 'connection_degraded',
  ReconnectionFailed = 'reconnection_failed'
}

/**
 * Severity levels for system health alerts
 */
export enum AtlasHealthSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

/**
 * ATLAS notification interface
 * Represents a notification in the ATLAS domain
 */
export interface AtlasNotification {
  id: string;
  userId: string;
  type: AtlasNotificationType;
  title: string;
  message: string;
  priority: AtlasNotificationPriority;
  status: AtlasNotificationStatus;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  deploymentId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

/**
 * ATLAS notification preferences
 * Controls which types of ATLAS notifications a user receives
 */
export interface AtlasNotificationPreferences {
  userId: string;
  enabled: boolean;
  deploymentNotifications: boolean;
  connectivityAlerts: boolean;
  systemHealthAlerts: boolean;
  evidenceNotifications: boolean;
  approvalNotifications: boolean;
  analysisNotifications: boolean;
  minimumPriority: AtlasNotificationPriority;
}

/**
 * Filters for querying ATLAS notifications
 */
export interface AtlasNotificationFilters {
  userId?: string;
  type?: AtlasNotificationType;
  priority?: AtlasNotificationPriority;
  status?: AtlasNotificationStatus;
  deploymentId?: string;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}
