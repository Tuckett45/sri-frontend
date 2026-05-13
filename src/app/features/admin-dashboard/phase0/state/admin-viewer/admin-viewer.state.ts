import { AdminMetrics, AuditLogEntry, SystemHealth, UserActivity } from '../../models/admin-viewer.models';

export interface AdminViewerState {
  metrics: AdminMetrics | null;
  activeUsers: UserActivity[];
  systemHealth: SystemHealth | null;
  auditLog: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  filters: {
    userId?: string;
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

export const initialAdminViewerState: AdminViewerState = {
  metrics: null,
  activeUsers: [],
  systemHealth: null,
  auditLog: [],
  loading: false,
  error: null,
  lastUpdated: null,
  filters: {}
};
