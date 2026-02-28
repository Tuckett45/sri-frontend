import { createReducer, on } from '@ngrx/store';
import { AdminViewerState, initialAdminViewerState } from './admin-viewer.state';
import * as AdminViewerActions from './admin-viewer.actions';

export const adminViewerReducer = createReducer(
  initialAdminViewerState,
  
  // Load Admin Metrics
  on(AdminViewerActions.loadAdminMetrics, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AdminViewerActions.loadAdminMetricsSuccess, (state, { metrics, systemHealth, activeUsers }) => ({
    ...state,
    metrics,
    systemHealth,
    activeUsers,
    loading: false,
    error: null,
    lastUpdated: new Date()
  })),
  
  on(AdminViewerActions.loadAdminMetricsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Load Audit Log
  on(AdminViewerActions.loadAuditLog, (state, { filters }) => ({
    ...state,
    loading: true,
    error: null,
    filters: filters || state.filters
  })),
  
  on(AdminViewerActions.loadAuditLogSuccess, (state, { auditLog }) => ({
    ...state,
    auditLog,
    loading: false,
    error: null
  })),
  
  on(AdminViewerActions.loadAuditLogFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Filter Audit Log
  on(AdminViewerActions.filterAuditLog, (state, { filters }) => ({
    ...state,
    filters
  })),
  
  // Export Audit Log
  on(AdminViewerActions.exportAuditLog, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AdminViewerActions.exportAuditLogSuccess, (state) => ({
    ...state,
    loading: false
  })),
  
  on(AdminViewerActions.exportAuditLogFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Refresh Metrics
  on(AdminViewerActions.refreshMetrics, (state) => ({
    ...state,
    loading: true,
    error: null
  }))
);
