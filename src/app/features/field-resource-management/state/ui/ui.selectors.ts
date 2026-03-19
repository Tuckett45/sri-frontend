/**
 * UI Selectors
 * Provides memoized selectors for accessing UI state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UIState, CalendarViewType, MapViewState, FilterState } from './ui.state';
import { Notification, NotificationType } from '../../models/notification.model';

// Feature selector
export const selectUIState = createFeatureSelector<UIState>('ui');

// ============================================================================
// CALENDAR SELECTORS
// ============================================================================

// Select calendar view type
export const selectCalendarView = createSelector(
  selectUIState,
  (state) => state.calendarView
);

// Select selected date
export const selectSelectedDate = createSelector(
  selectUIState,
  (state) => state.selectedDate
);

// Select if calendar is in day view
export const selectIsCalendarDayView = createSelector(
  selectCalendarView,
  (view) => view === CalendarViewType.Day
);

// Select if calendar is in week view
export const selectIsCalendarWeekView = createSelector(
  selectCalendarView,
  (view) => view === CalendarViewType.Week
);

// ============================================================================
// SIDEBAR SELECTORS
// ============================================================================

// Select sidebar open state
export const selectSidebarOpen = createSelector(
  selectUIState,
  (state) => state.sidebarOpen
);

// Select mobile menu open state
export const selectMobileMenuOpen = createSelector(
  selectUIState,
  (state) => state.mobileMenuOpen
);

// ============================================================================
// MAP VIEW SELECTORS
// ============================================================================

// Select map view state
export const selectMapView = createSelector(
  selectUIState,
  (state) => state.mapView
);

// Select map center coordinates
export const selectMapCenter = createSelector(
  selectMapView,
  (mapView) => mapView.center
);

// Select map zoom level
export const selectMapZoom = createSelector(
  selectMapView,
  (mapView) => mapView.zoom
);

// Select if technicians are shown on map
export const selectShowTechniciansOnMap = createSelector(
  selectMapView,
  (mapView) => mapView.showTechnicians
);

// Select if crews are shown on map
export const selectShowCrewsOnMap = createSelector(
  selectMapView,
  (mapView) => mapView.showCrews
);

// Select if jobs are shown on map
export const selectShowJobsOnMap = createSelector(
  selectMapView,
  (mapView) => mapView.showJobs
);

// Select if map clustering is enabled
export const selectMapClusteringEnabled = createSelector(
  selectMapView,
  (mapView) => mapView.clusteringEnabled
);

// Select map visibility settings (what's shown on map)
export const selectMapVisibilitySettings = createSelector(
  selectMapView,
  (mapView) => ({
    showTechnicians: mapView.showTechnicians,
    showCrews: mapView.showCrews,
    showJobs: mapView.showJobs,
    clusteringEnabled: mapView.clusteringEnabled
  })
);

// ============================================================================
// FILTER SELECTORS
// ============================================================================

// Select all filters
export const selectSelectedFilters = createSelector(
  selectUIState,
  (state) => state.selectedFilters
);

// Select technician filters
export const selectTechnicianFilters = createSelector(
  selectSelectedFilters,
  (filters) => filters.technicians
);

// Select job filters
export const selectJobFilters = createSelector(
  selectSelectedFilters,
  (filters) => filters.jobs
);

// Select assignment filters
export const selectAssignmentFilters = createSelector(
  selectSelectedFilters,
  (filters) => filters.assignments
);

// Select crew filters
export const selectCrewFilters = createSelector(
  selectSelectedFilters,
  (filters) => filters.crews
);

// Select if any filters are active
export const selectHasActiveFilters = createSelector(
  selectSelectedFilters,
  (filters) => {
    return Object.keys(filters).length > 0 &&
      Object.values(filters).some(filter => filter !== undefined && filter !== null);
  }
);

// Select count of active filter categories
export const selectActiveFilterCount = createSelector(
  selectSelectedFilters,
  (filters) => {
    return Object.values(filters).filter(filter => filter !== undefined && filter !== null).length;
  }
);

// ============================================================================
// NOTIFICATION SELECTORS
// ============================================================================

// Select all notifications
export const selectAllNotifications = createSelector(
  selectUIState,
  (state) => state.notifications
);

// Select unread notifications
export const selectUnreadNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => !n.isRead)
);

// Select read notifications
export const selectReadNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.isRead)
);

// Select unread notification count
export const selectUnreadNotificationCount = createSelector(
  selectUnreadNotifications,
  (notifications) => notifications.length
);

// Select total notification count
export const selectTotalNotificationCount = createSelector(
  selectAllNotifications,
  (notifications) => notifications.length
);

// Select if there are unread notifications
export const selectHasUnreadNotifications = createSelector(
  selectUnreadNotificationCount,
  (count) => count > 0
);

// Select notification by ID
export const selectNotificationById = (id: string) => createSelector(
  selectAllNotifications,
  (notifications) => notifications.find(n => n.id === id)
);

// Select notifications by type
export const selectNotificationsByType = (type: NotificationType | string) => createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === type)
);

// Select unread notifications by type
export const selectUnreadNotificationsByType = (type: NotificationType | string) => createSelector(
  selectUnreadNotifications,
  (notifications) => notifications.filter(n => n.type === type)
);

// Select recent notifications (last 10)
export const selectRecentNotifications = createSelector(
  selectAllNotifications,
  (notifications) => {
    return [...notifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }
);

// Select recent unread notifications (last 5)
export const selectRecentUnreadNotifications = createSelector(
  selectUnreadNotifications,
  (notifications) => {
    return [...notifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }
);

// Select notifications grouped by type
export const selectNotificationsGroupedByType = createSelector(
  selectAllNotifications,
  (notifications) => {
    const grouped: Record<string, Notification[]> = {};
    notifications.forEach(notification => {
      if (!grouped[notification.type]) {
        grouped[notification.type] = [];
      }
      grouped[notification.type].push(notification);
    });
    return grouped;
  }
);

// Select notification count by type
// Select unread notification count by type
// Optimized: Combined into single pass
const selectNotificationCountsByType = createSelector(
  selectAllNotifications,
  (notifications) => {
    const counts: Record<string, number> = {};
    const unreadCounts: Record<string, number> = {};
    
    for (const notification of notifications) {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
      if (!notification.isRead) {
        unreadCounts[notification.type] = (unreadCounts[notification.type] || 0) + 1;
      }
    }
    
    return { counts, unreadCounts };
  }
);

// Select notification count by type
export const selectNotificationCountByType = createSelector(
  selectNotificationCountsByType,
  (result) => result.counts
);

// Select unread notification count by type
export const selectUnreadNotificationCountByType = createSelector(
  selectNotificationCountsByType,
  (result) => result.unreadCounts
);

// Select notifications for specific entity
export const selectNotificationsForEntity = (entityType: string, entityId: string) => createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n =>
    n.relatedEntityType === entityType && n.relatedEntityId === entityId
  )
);

// Select job assignment notifications
export const selectJobAssignmentNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === NotificationType.JobAssignment)
);

// Select job status change notifications
export const selectJobStatusChangeNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === NotificationType.JobStatusChange)
);

// Select certification expiring notifications
export const selectCertificationExpiringNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === NotificationType.CertificationExpiring)
);

// Select conflict detected notifications
export const selectConflictDetectedNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === NotificationType.ConflictDetected)
);

// Select system alert notifications
export const selectSystemAlertNotifications = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter(n => n.type === NotificationType.SystemAlert)
);

// Select notification statistics
// Optimized: Single pass through notifications
export const selectNotificationStatistics = createSelector(
  selectAllNotifications,
  (all) => {
    const byType: Record<string, number> = {};
    const unreadByType: Record<string, number> = {};
    let unreadCount = 0;
    
    for (const notification of all) {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      
      if (!notification.isRead) {
        unreadCount++;
        unreadByType[notification.type] = (unreadByType[notification.type] || 0) + 1;
      }
    }

    return {
      total: all.length,
      unread: unreadCount,
      read: all.length - unreadCount,
      byType,
      unreadByType
    };
  }
);

// ============================================================================
// COMPOSITE SELECTORS
// ============================================================================

// Select UI view model (combines multiple UI state pieces)
export const selectUIViewModel = createSelector(
  selectSidebarOpen,
  selectMobileMenuOpen,
  selectCalendarView,
  selectSelectedDate,
  selectMapView,
  selectHasActiveFilters,
  selectUnreadNotificationCount,
  (sidebarOpen, mobileMenuOpen, calendarView, selectedDate, mapView, hasActiveFilters, unreadCount) => ({
    sidebarOpen,
    mobileMenuOpen,
    calendarView,
    selectedDate,
    mapView,
    hasActiveFilters,
    unreadNotificationCount: unreadCount
  })
);

// Select notification panel view model
export const selectNotificationPanelViewModel = createSelector(
  selectRecentUnreadNotifications,
  selectUnreadNotificationCount,
  selectTotalNotificationCount,
  (recentUnread, unreadCount, totalCount) => ({
    recentUnread,
    unreadCount,
    totalCount,
    hasUnread: unreadCount > 0
  })
);

// Select map configuration view model
export const selectMapConfigViewModel = createSelector(
  selectMapCenter,
  selectMapZoom,
  selectMapVisibilitySettings,
  (center, zoom, visibility) => ({
    center,
    zoom,
    ...visibility
  })
);

// Select filter summary view model
export const selectFilterSummaryViewModel = createSelector(
  selectSelectedFilters,
  selectHasActiveFilters,
  selectActiveFilterCount,
  (filters, hasActiveFilters, activeCount) => ({
    filters,
    hasActiveFilters,
    activeFilterCount: activeCount
  })
);

// ============================================================================
// UTILITY SELECTORS
// ============================================================================

// Select if sidebar should be shown (based on screen size and state)
// Note: This would typically combine with a responsive service or media query
export const selectShouldShowSidebar = createSelector(
  selectSidebarOpen,
  (sidebarOpen) => sidebarOpen
);

// Select if mobile menu should be shown
export const selectShouldShowMobileMenu = createSelector(
  selectMobileMenuOpen,
  (mobileMenuOpen) => mobileMenuOpen
);

// Select if any UI loading indicators should be shown
// Note: This is a placeholder that can be extended when loading states are added to UI state
export const selectIsUILoading = createSelector(
  selectUIState,
  (state) => false // Placeholder - extend when loading states are added
);

// Select if UI is in mobile mode
// Note: This would typically be determined by a responsive service
// For now, it's based on mobile menu state as a proxy
export const selectIsMobileMode = createSelector(
  selectMobileMenuOpen,
  (mobileMenuOpen) => mobileMenuOpen !== undefined
);

// ============================================================================
// CONNECTION STATUS SELECTORS
// ============================================================================

// Select connection state
export const selectConnectionState = createSelector(
  selectUIState,
  (state) => state.connectionState
);

// Select connection status
export const selectConnectionStatus = createSelector(
  selectConnectionState,
  (connectionState) => connectionState.status
);

// Select if connected
export const selectIsConnected = createSelector(
  selectConnectionStatus,
  (status) => status === 'connected'
);

// Select if disconnected
export const selectIsDisconnected = createSelector(
  selectConnectionStatus,
  (status) => status === 'disconnected'
);

// Select if reconnecting
export const selectIsReconnecting = createSelector(
  selectConnectionStatus,
  (status) => status === 'reconnecting'
);

// Select reconnect attempts
export const selectReconnectAttempts = createSelector(
  selectConnectionState,
  (connectionState) => connectionState.reconnectAttempts
);

// Select last connected time
export const selectLastConnected = createSelector(
  selectConnectionState,
  (connectionState) => connectionState.lastConnected
);

// Select last disconnected time
export const selectLastDisconnected = createSelector(
  selectConnectionState,
  (connectionState) => connectionState.lastDisconnected
);

// Select last connection error
export const selectLastConnectionError = createSelector(
  selectConnectionState,
  (connectionState) => connectionState.lastError
);

// Select if connection is healthy (connected with no recent errors)
export const selectIsConnectionHealthy = createSelector(
  selectIsConnected,
  selectLastConnectionError,
  (isConnected, lastError) => isConnected && !lastError
);

// Select connection status display info
export const selectConnectionStatusDisplay = createSelector(
  selectConnectionState,
  (connectionState) => {
    const { status, reconnectAttempts, lastError, lastConnected, lastDisconnected } = connectionState;
    
    let message = '';
    let severity: 'success' | 'warning' | 'error' = 'success';
    
    switch (status) {
      case 'connected':
        message = 'Connected';
        severity = 'success';
        break;
      case 'reconnecting':
        message = `Reconnecting... (Attempt ${reconnectAttempts})`;
        severity = 'warning';
        break;
      case 'disconnected':
        message = lastError ? `Disconnected: ${lastError}` : 'Disconnected';
        severity = 'error';
        break;
    }
    
    return {
      status,
      message,
      severity,
      reconnectAttempts,
      lastError,
      lastConnected,
      lastDisconnected
    };
  }
);

// Select if should show offline indicator
export const selectShouldShowOfflineIndicator = createSelector(
  selectIsConnected,
  (isConnected) => !isConnected
);

// Select connection uptime (time since last connected)
export const selectConnectionUptime = createSelector(
  selectLastConnected,
  selectIsConnected,
  (lastConnected, isConnected) => {
    if (!isConnected || !lastConnected) {
      return null;
    }
    return Date.now() - new Date(lastConnected).getTime();
  }
);

// Select connection downtime (time since last disconnected)
export const selectConnectionDowntime = createSelector(
  selectLastDisconnected,
  selectIsDisconnected,
  (lastDisconnected, isDisconnected) => {
    if (!isDisconnected || !lastDisconnected) {
      return null;
    }
    return Date.now() - new Date(lastDisconnected).getTime();
  }
);
