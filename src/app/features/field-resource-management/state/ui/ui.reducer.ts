/**
 * UI Reducer
 * Manages UI state updates for sidebar, filters, notifications, and view settings
 */

import { createReducer, on } from '@ngrx/store';
import { UIState, CalendarViewType, ConnectionStatus } from './ui.state';
import * as UIActions from './ui.actions';

// Initial state
export const initialState: UIState = {
  calendarView: CalendarViewType.Week,
  selectedDate: new Date(),
  sidebarOpen: true,
  mobileMenuOpen: false,
  mapView: {
    center: { lat: 39.8283, lng: -98.5795 }, // Center of US
    zoom: 4,
    showTechnicians: true,
    showCrews: true,
    showJobs: true,
    clusteringEnabled: true
  },
  selectedFilters: {},
  notifications: [],
  connectionState: {
    status: ConnectionStatus.Disconnected,
    reconnectAttempts: 0
  }
};

// Reducer
export const uiReducer = createReducer(
  initialState,

  // Calendar View
  on(UIActions.setCalendarView, (state, { view }) => ({
    ...state,
    calendarView: view
  })),

  // Selected Date
  on(UIActions.setSelectedDate, (state, { date }) => ({
    ...state,
    selectedDate: date
  })),

  // Sidebar
  on(UIActions.toggleSidebar, (state) => ({
    ...state,
    sidebarOpen: !state.sidebarOpen
  })),

  on(UIActions.openSidebar, (state) => ({
    ...state,
    sidebarOpen: true
  })),

  on(UIActions.closeSidebar, (state) => ({
    ...state,
    sidebarOpen: false
  })),

  // Mobile Menu
  on(UIActions.toggleMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: !state.mobileMenuOpen
  })),

  on(UIActions.openMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: true
  })),

  on(UIActions.closeMobileMenu, (state) => ({
    ...state,
    mobileMenuOpen: false
  })),

  // Filters
  on(UIActions.setFilters, (state, { filters }) => ({
    ...state,
    selectedFilters: {
      ...state.selectedFilters,
      ...filters
    }
  })),

  on(UIActions.clearFilters, (state) => ({
    ...state,
    selectedFilters: {}
  })),

  // Map View
  on(UIActions.setMapView, (state, { mapView }) => ({
    ...state,
    mapView: {
      ...state.mapView,
      ...mapView
    }
  })),

  // Notifications
  on(UIActions.showNotification, (state, { notification }) => ({
    ...state,
    notifications: [...state.notifications, notification]
  })),

  on(UIActions.showNotifications, (state, { notifications }) => ({
    ...state,
    notifications: [...state.notifications, ...notifications]
  })),

  on(UIActions.dismissNotification, (state, { notificationId }) => ({
    ...state,
    notifications: state.notifications.filter(n => n.id !== notificationId)
  })),

  on(UIActions.clearAllNotifications, (state) => ({
    ...state,
    notifications: []
  })),

  on(UIActions.markNotificationAsRead, (state, { notificationId }) => ({
    ...state,
    notifications: state.notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    )
  })),

  // Connection Status
  on(UIActions.updateConnectionStatus, (state, { status, reconnectAttempts, error }) => ({
    ...state,
    connectionState: {
      ...state.connectionState,
      status,
      reconnectAttempts: reconnectAttempts ?? state.connectionState.reconnectAttempts,
      lastError: error,
      ...(status === ConnectionStatus.Connected && { lastConnected: new Date() }),
      ...(status === ConnectionStatus.Disconnected && { lastDisconnected: new Date() })
    }
  })),

  on(UIActions.connectionEstablished, (state) => ({
    ...state,
    connectionState: {
      status: ConnectionStatus.Connected,
      lastConnected: new Date(),
      reconnectAttempts: 0,
      lastError: undefined
    }
  })),

  on(UIActions.connectionLost, (state, { error }) => ({
    ...state,
    connectionState: {
      ...state.connectionState,
      status: ConnectionStatus.Disconnected,
      lastDisconnected: new Date(),
      lastError: error
    }
  })),

  on(UIActions.reconnecting, (state, { attempt }) => ({
    ...state,
    connectionState: {
      ...state.connectionState,
      status: ConnectionStatus.Reconnecting,
      reconnectAttempts: attempt
    }
  })),

  // Reset
  on(UIActions.resetUIState, () => initialState)
);
