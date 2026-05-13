/**
 * UI Actions
 * Defines all actions for UI state management
 */

import { createAction, props } from '@ngrx/store';
import { CalendarViewType, MapViewState, FilterState, ScheduleViewMode } from './ui.state';
import { Notification } from '../../models/notification.model';

// Set Calendar View
export const setCalendarView = createAction(
  '[UI] Set Calendar View',
  props<{ view: CalendarViewType }>()
);

// Set Schedule View Mode
export const setScheduleViewMode = createAction(
  '[UI] Set Schedule View Mode',
  props<{ mode: ScheduleViewMode }>()
);

// Set Selected Date
export const setSelectedDate = createAction(
  '[UI] Set Selected Date',
  props<{ date: Date }>()
);

// Toggle Sidebar
export const toggleSidebar = createAction(
  '[UI] Toggle Sidebar'
);

// Open Sidebar
export const openSidebar = createAction(
  '[UI] Open Sidebar'
);

// Close Sidebar
export const closeSidebar = createAction(
  '[UI] Close Sidebar'
);

// Toggle Mobile Menu
export const toggleMobileMenu = createAction(
  '[UI] Toggle Mobile Menu'
);

// Open Mobile Menu
export const openMobileMenu = createAction(
  '[UI] Open Mobile Menu'
);

// Close Mobile Menu
export const closeMobileMenu = createAction(
  '[UI] Close Mobile Menu'
);

// Set Filters
export const setFilters = createAction(
  '[UI] Set Filters',
  props<{ filters: FilterState }>()
);

// Clear Filters
export const clearFilters = createAction(
  '[UI] Clear Filters'
);

// Set Map View
export const setMapView = createAction(
  '[UI] Set Map View',
  props<{ mapView: Partial<MapViewState> }>()
);

// Show Notification
export const showNotification = createAction(
  '[UI] Show Notification',
  props<{ notification: Notification }>()
);

// Show Notifications (multiple)
export const showNotifications = createAction(
  '[UI] Show Notifications',
  props<{ notifications: Notification[] }>()
);

// Dismiss Notification
export const dismissNotification = createAction(
  '[UI] Dismiss Notification',
  props<{ notificationId: string }>()
);

// Clear All Notifications
export const clearAllNotifications = createAction(
  '[UI] Clear All Notifications'
);

// Mark Notification as Read
export const markNotificationAsRead = createAction(
  '[UI] Mark Notification as Read',
  props<{ notificationId: string }>()
);

// Update Connection Status
export const updateConnectionStatus = createAction(
  '[UI] Update Connection Status',
  props<{ 
    status: import('./ui.state').ConnectionStatus;
    reconnectAttempts?: number;
    error?: string;
  }>()
);

// Connection Established
export const connectionEstablished = createAction(
  '[UI] Connection Established'
);

// Connection Lost
export const connectionLost = createAction(
  '[UI] Connection Lost',
  props<{ error?: string }>()
);

// Reconnecting
export const reconnecting = createAction(
  '[UI] Reconnecting',
  props<{ attempt: number }>()
);

// Reset UI State
export const resetUIState = createAction(
  '[UI] Reset UI State'
);
