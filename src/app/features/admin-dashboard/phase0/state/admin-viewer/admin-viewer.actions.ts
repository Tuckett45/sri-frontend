import { createAction, props } from '@ngrx/store';
import { AdminMetrics, AuditLogEntry, SystemHealth, UserActivity } from '../../models/admin-viewer.models';

// Load Admin Metrics
export const loadAdminMetrics = createAction(
  '[Admin Viewer] Load Admin Metrics',
  props<{ timeRange?: string }>()
);

export const loadAdminMetricsSuccess = createAction(
  '[Admin Viewer] Load Admin Metrics Success',
  props<{ metrics: AdminMetrics; systemHealth: SystemHealth; activeUsers: UserActivity[] }>()
);

export const loadAdminMetricsFailure = createAction(
  '[Admin Viewer] Load Admin Metrics Failure',
  props<{ error: string }>()
);

// Load Audit Log
export const loadAuditLog = createAction(
  '[Admin Viewer] Load Audit Log',
  props<{ filters?: { userId?: string; actionType?: string; startDate?: Date; endDate?: Date } }>()
);

export const loadAuditLogSuccess = createAction(
  '[Admin Viewer] Load Audit Log Success',
  props<{ auditLog: AuditLogEntry[] }>()
);

export const loadAuditLogFailure = createAction(
  '[Admin Viewer] Load Audit Log Failure',
  props<{ error: string }>()
);

// Filter Audit Log
export const filterAuditLog = createAction(
  '[Admin Viewer] Filter Audit Log',
  props<{ filters: { userId?: string; actionType?: string; startDate?: Date; endDate?: Date } }>()
);

// Export Audit Log
export const exportAuditLog = createAction(
  '[Admin Viewer] Export Audit Log',
  props<{ format: 'csv' | 'pdf' }>()
);

export const exportAuditLogSuccess = createAction(
  '[Admin Viewer] Export Audit Log Success'
);

export const exportAuditLogFailure = createAction(
  '[Admin Viewer] Export Audit Log Failure',
  props<{ error: string }>()
);

// Refresh Metrics
export const refreshMetrics = createAction(
  '[Admin Viewer] Refresh Metrics'
);
