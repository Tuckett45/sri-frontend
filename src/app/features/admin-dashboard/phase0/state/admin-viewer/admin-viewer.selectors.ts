import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AdminViewerState } from './admin-viewer.state';

export const selectAdminViewerState = createFeatureSelector<AdminViewerState>('adminViewer');

export const selectAdminMetrics = createSelector(
  selectAdminViewerState,
  (state) => state.metrics
);

export const selectActiveUsers = createSelector(
  selectAdminViewerState,
  (state) => state.activeUsers
);

export const selectSystemHealth = createSelector(
  selectAdminViewerState,
  (state) => state.systemHealth
);

export const selectAuditLog = createSelector(
  selectAdminViewerState,
  (state) => state.auditLog
);

export const selectAdminViewerLoading = createSelector(
  selectAdminViewerState,
  (state) => state.loading
);

export const selectAdminViewerError = createSelector(
  selectAdminViewerState,
  (state) => state.error
);

export const selectLastUpdated = createSelector(
  selectAdminViewerState,
  (state) => state.lastUpdated
);

export const selectAuditLogFilters = createSelector(
  selectAdminViewerState,
  (state) => state.filters
);

export const selectFilteredAuditLog = createSelector(
  selectAuditLog,
  selectAuditLogFilters,
  (auditLog, filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      return auditLog;
    }
    
    return auditLog.filter(entry => {
      if (filters.userId && entry.userId !== filters.userId) {
        return false;
      }
      if (filters.actionType && entry.action !== filters.actionType) {
        return false;
      }
      if (filters.startDate && new Date(entry.timestamp) < filters.startDate) {
        return false;
      }
      if (filters.endDate && new Date(entry.timestamp) > filters.endDate) {
        return false;
      }
      return true;
    });
  }
);
