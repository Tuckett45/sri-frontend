export interface SystemConfiguration {
  // Session settings
  sessionTimeoutMinutes: number;
  
  // Notification settings
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  
  // Backup settings
  backupRetentionDays: number;
  autoBackupEnabled: boolean;
  
  // KPI settings
  targetUtilizationRate: number;
  targetScheduleAdherence: number;
  targetTimeEntryCompletion: number;
  
  // Job status settings
  jobStatusValues: string[];
  delayReasonCodes: string[];
}

export interface UpdateSystemConfigurationDto {
  sessionTimeoutMinutes?: number;
  notificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  backupRetentionDays?: number;
  autoBackupEnabled?: boolean;
  targetUtilizationRate?: number;
  targetScheduleAdherence?: number;
  targetTimeEntryCompletion?: number;
  jobStatusValues?: string[];
  delayReasonCodes?: string[];
}
