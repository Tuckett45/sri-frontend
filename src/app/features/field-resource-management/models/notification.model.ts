export enum NotificationType {
  JobAssignment = 'job_assignment',
  JobStatusChange = 'job_status_change',
  CertificationExpiring = 'certification_expiring',
  ConflictDetected = 'conflict_detected',
  TimeEntryReminder = 'time_entry_reminder',
  SystemAlert = 'system_alert'
}

export interface Notification {
  id: string;
  type: NotificationType | string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  timestamp: Date;
  userId: string;
  link?: string;
  metadata?: any;
  data?: any;
  relatedEntityType?: 'job' | 'technician' | 'assignment' | 'timeEntry';
  relatedEntityId?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  jobAssignmentEnabled: boolean;
  jobStatusChangeEnabled: boolean;
  certificationExpiringEnabled: boolean;
  conflictDetectedEnabled: boolean;
}
