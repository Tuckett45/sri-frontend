/**
 * Admin Viewer Models
 * Models for admin dashboard metrics, audit logs, and system health
 */

export interface AdminMetrics {
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  failedJobs: number;
  activeDeployments?: number;
  systemHealth?: SystemHealth;
  resourceUtilization: { cpu: number; memory: number; storage: number; } | number;
  averageResponseTime: number;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  result: 'success' | 'failure';
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  lastChecked: Date;
  uptime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  lastActive: Date;
  currentPage: string;
  sessionDuration: number;
  actionsCount: number;
}

export enum TimeRange {
  Last24Hours = 'last24hours',
  Last7Days = 'last7days',
  Last30Days = 'last30days',
  Custom = 'custom'
}

export interface AuditLogFilter {
  userId?: string;
  actionType?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}
