// Admin Metrics
export interface AdminMetrics {
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  activeDeployments: number;
  systemHealth: SystemHealthStatus;
  resourceUtilization: ResourceUtilization;
  timestamp: Date;
}

export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface SystemHealth {
  status: SystemHealthStatus;
  services: ServiceHealth[];
  uptime: number;
  lastCheck: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  errorRate: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  role: string;
  lastAction: string;
  lastActionTime: Date;
  sessionDuration: number;
  actionsCount: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}
