/**
 * UI Reducer Unit Tests
 * Tests all reducer logic for UI state management
 */

import { uiReducer, initialState } from './ui.reducer';
import * as UIActions from './ui.actions';
import { UIState, CalendarViewType, ScheduleViewMode, MapViewState, FilterState } from './ui.state';
import { Notification, NotificationType } from '../../models/notification.model';
import { JobStatus } from '../../models/job.model';
import { TechnicianRole } from '../../models/technician.model';

describe('UI Reducer', () => {
  const mockNotification: Notification = {
    id: 'notif-123',
    type: NotificationType.JobAssignment,
    message: 'You have been assigned to a new job',
    isRead: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    timestamp: new Date('2024-01-15T10:00:00Z'),
    userId: 'user-123',
    link: '/jobs/job-456',
    relatedEntityType: 'job',
    relatedEntityId: 'job-456'
  };

  const mockNotification2: Notification = {
    id: 'notif-124',
    type: NotificationType.JobStatusChange,
    message: 'Job status changed to In Progress',
    isRead: false,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    timestamp: new Date('2024-01-15T11:00:00Z'),
    userId: 'user-123',
    link: '/jobs/job-457',
    relatedEntityType: 'job',
    relatedEntityId: 'job-457'
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' } as any;
      const result = uiReducer(undefined, action);

      expect(result).toEqual(initialState);
    });

    it('should have correct initial state structure', () => {
      expect(initialState.calendarView).toBe(CalendarViewType.Week);
      expect(initialState.selectedDate).toBeInstanceOf(Date);
      expect(initialState.sidebarOpen).toBe(true);
      expect(initialState.mobileMenuOpen).toBe(false);
      expect(initialState.mapView).toBeDefined();
      expect(initialState.selectedFilters).toEqual({});
      expect(initialState.notifications).toEqual([]);
    });

    it('should have correct initial map view state', () => {
      expect(initialState.mapView.center).toEqual({ lat: 39.8283, lng: -98.5795 });
      expect(initialState.mapView.zoom).toBe(4);
      expect(initialState.mapView.showTechnicians).toBe(true);
      expect(initialState.mapView.showCrews).toBe(true);
      expect(initialState.mapView.showJobs).toBe(true);
      expect(initialState.mapView.clusteringEnabled).toBe(true);
    });
  });

  describe('Calendar View Actions', () => {
    it('should set calendar view to Day', () => {
      const action = UIActions.setCalendarView({ view: CalendarViewType.Day });
      const result = uiReducer(initialState, action);

      expect(result.calendarView).toBe(CalendarViewType.Day);
      expect(result).not.toBe(initialState);
    });

    it('should set calendar view to Week', () => {
      const state: UIState = {
        ...initialState,
        calendarView: CalendarViewType.Day
      };
      const action = UIActions.setCalendarView({ view: CalendarViewType.Week });
      const result = uiReducer(state, action);

      expect(result.calendarView).toBe(CalendarViewType.Week);
    });

    it('should set selected date', () => {
      const date = new Date('2024-01-15');
      const action = UIActions.setSelectedDate({ date });
      const result = uiReducer(initialState, action);

      expect(result.selectedDate).toEqual(date);
      expect(result).not.toBe(initialState);
    });

    it('should preserve other state when setting calendar view', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: false,
        notifications: [mockNotification]
      };
      const action = UIActions.setCalendarView({ view: CalendarViewType.Day });
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(false);
      expect(result.notifications).toEqual([mockNotification]);
    });
  });

  describe('Sidebar Actions', () => {
    it('should toggle sidebar from open to closed', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: true
      };
      const action = UIActions.toggleSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: false
      };
      const action = UIActions.toggleSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(true);
    });

    it('should open sidebar', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: false
      };
      const action = UIActions.openSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(true);
    });

    it('should keep sidebar open when already open', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: true
      };
      const action = UIActions.openSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(true);
    });

    it('should close sidebar', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: true
      };
      const action = UIActions.closeSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(false);
    });

    it('should keep sidebar closed when already closed', () => {
      const state: UIState = {
        ...initialState,
        sidebarOpen: false
      };
      const action = UIActions.closeSidebar();
      const result = uiReducer(state, action);

      expect(result.sidebarOpen).toBe(false);
    });
  });

  describe('Mobile Menu Actions', () => {
    it('should toggle mobile menu from closed to open', () => {
      const state: UIState = {
        ...initialState,
        mobileMenuOpen: false
      };
      const action = UIActions.toggleMobileMenu();
      const result = uiReducer(state, action);

      expect(result.mobileMenuOpen).toBe(true);
    });

    it('should toggle mobile menu from open to closed', () => {
      const state: UIState = {
        ...initialState,
        mobileMenuOpen: true
      };
      const action = UIActions.toggleMobileMenu();
      const result = uiReducer(state, action);

      expect(result.mobileMenuOpen).toBe(false);
    });

    it('should open mobile menu', () => {
      const state: UIState = {
        ...initialState,
        mobileMenuOpen: false
      };
      const action = UIActions.openMobileMenu();
      const result = uiReducer(state, action);

      expect(result.mobileMenuOpen).toBe(true);
    });

    it('should close mobile menu', () => {
      const state: UIState = {
        ...initialState,
        mobileMenuOpen: true
      };
      const action = UIActions.closeMobileMenu();
      const result = uiReducer(state, action);

      expect(result.mobileMenuOpen).toBe(false);
    });
  });

  describe('Filter Actions', () => {
    it('should set filters with complete filter state', () => {
      const filters: FilterState = {
        technicians: {
          searchTerm: 'John',
          role: TechnicianRole.Installer,
          isAvailable: true
        },
        jobs: {
          status: JobStatus.OnSite,
          searchTerm: 'Installation'
        }
      };
      const action = UIActions.setFilters({ filters });
      const result = uiReducer(initialState, action);

      expect(result.selectedFilters).toEqual(filters);
    });

    it('should merge new filters with existing filters', () => {
      const existingFilters: FilterState = {
        technicians: {
          searchTerm: 'John',
          role: TechnicianRole.Installer
        }
      };
      const state: UIState = {
        ...initialState,
        selectedFilters: existingFilters
      };

      const newFilters: FilterState = {
        jobs: {
          status: JobStatus.OnSite
        }
      };
      const action = UIActions.setFilters({ filters: newFilters });
      const result = uiReducer(state, action);

      expect(result.selectedFilters).toEqual({
        technicians: {
          searchTerm: 'John',
          role: TechnicianRole.Installer
        },
        jobs: {
          status: JobStatus.OnSite
        }
      });
    });

    it('should override existing filter category', () => {
      const existingFilters: FilterState = {
        technicians: {
          searchTerm: 'John',
          role: TechnicianRole.Installer
        }
      };
      const state: UIState = {
        ...initialState,
        selectedFilters: existingFilters
      };

      const newFilters: FilterState = {
        technicians: {
          searchTerm: 'Jane'
        }
      };
      const action = UIActions.setFilters({ filters: newFilters });
      const result = uiReducer(state, action);

      expect(result.selectedFilters.technicians).toEqual({
        searchTerm: 'Jane'
      });
    });

    it('should clear all filters', () => {
      const state: UIState = {
        ...initialState,
        selectedFilters: {
          technicians: {
            searchTerm: 'John'
          },
          jobs: {
            status: JobStatus.OnSite
          }
        }
      };
      const action = UIActions.clearFilters();
      const result = uiReducer(state, action);

      expect(result.selectedFilters).toEqual({});
    });

    it('should handle empty filters object', () => {
      const action = UIActions.setFilters({ filters: {} });
      const result = uiReducer(initialState, action);

      expect(result.selectedFilters).toEqual({});
    });
  });

  describe('Map View Actions', () => {
    it('should set complete map view', () => {
      const mapView: MapViewState = {
        center: { lat: 32.7767, lng: -96.7970 },
        zoom: 12,
        showTechnicians: true,
        showCrews: false,
        showJobs: true,
        clusteringEnabled: false
      };
      const action = UIActions.setMapView({ mapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView).toEqual(mapView);
    });

    it('should merge partial map view with existing state', () => {
      const partialMapView: Partial<MapViewState> = {
        center: { lat: 32.7767, lng: -96.7970 },
        zoom: 12
      };
      const action = UIActions.setMapView({ mapView: partialMapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView.center).toEqual({ lat: 32.7767, lng: -96.7970 });
      expect(result.mapView.zoom).toBe(12);
      expect(result.mapView.showTechnicians).toBe(true); // Preserved from initial state
      expect(result.mapView.showCrews).toBe(true); // Preserved from initial state
    });

    it('should update only center coordinates', () => {
      const partialMapView: Partial<MapViewState> = {
        center: { lat: 30.2672, lng: -97.7431 }
      };
      const action = UIActions.setMapView({ mapView: partialMapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView.center).toEqual({ lat: 30.2672, lng: -97.7431 });
      expect(result.mapView.zoom).toBe(initialState.mapView.zoom);
    });

    it('should update only zoom level', () => {
      const partialMapView: Partial<MapViewState> = {
        zoom: 15
      };
      const action = UIActions.setMapView({ mapView: partialMapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView.zoom).toBe(15);
      expect(result.mapView.center).toEqual(initialState.mapView.center);
    });

    it('should update visibility settings', () => {
      const partialMapView: Partial<MapViewState> = {
        showTechnicians: false,
        showCrews: false,
        showJobs: false
      };
      const action = UIActions.setMapView({ mapView: partialMapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView.showTechnicians).toBe(false);
      expect(result.mapView.showCrews).toBe(false);
      expect(result.mapView.showJobs).toBe(false);
    });

    it('should update clustering setting', () => {
      const partialMapView: Partial<MapViewState> = {
        clusteringEnabled: false
      };
      const action = UIActions.setMapView({ mapView: partialMapView });
      const result = uiReducer(initialState, action);

      expect(result.mapView.clusteringEnabled).toBe(false);
    });
  });

  describe('Notification Actions', () => {
    it('should add single notification', () => {
      const action = UIActions.showNotification({ notification: mockNotification });
      const result = uiReducer(initialState, action);

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0]).toEqual(mockNotification);
    });

    it('should add notification to existing notifications', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification]
      };
      const action = UIActions.showNotification({ notification: mockNotification2 });
      const result = uiReducer(state, action);

      expect(result.notifications.length).toBe(2);
      expect(result.notifications[0]).toEqual(mockNotification);
      expect(result.notifications[1]).toEqual(mockNotification2);
    });

    it('should add multiple notifications', () => {
      const notifications = [mockNotification, mockNotification2];
      const action = UIActions.showNotifications({ notifications });
      const result = uiReducer(initialState, action);

      expect(result.notifications.length).toBe(2);
      expect(result.notifications).toEqual(notifications);
    });

    it('should add multiple notifications to existing notifications', () => {
      const existingNotification: Notification = {
        id: 'notif-100',
        type: NotificationType.SystemAlert,
        message: 'System maintenance scheduled',
        isRead: true,
        createdAt: new Date('2024-01-14T10:00:00Z'),
        timestamp: new Date('2024-01-14T10:00:00Z'),
        userId: 'user-123'
      };
      const state: UIState = {
        ...initialState,
        notifications: [existingNotification]
      };

      const newNotifications = [mockNotification, mockNotification2];
      const action = UIActions.showNotifications({ notifications: newNotifications });
      const result = uiReducer(state, action);

      expect(result.notifications.length).toBe(3);
      expect(result.notifications[0]).toEqual(existingNotification);
      expect(result.notifications[1]).toEqual(mockNotification);
      expect(result.notifications[2]).toEqual(mockNotification2);
    });

    it('should dismiss notification by id', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification, mockNotification2]
      };
      const action = UIActions.dismissNotification({ notificationId: 'notif-123' });
      const result = uiReducer(state, action);

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].id).toBe('notif-124');
    });

    it('should not modify state when dismissing non-existent notification', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification]
      };
      const action = UIActions.dismissNotification({ notificationId: 'non-existent' });
      const result = uiReducer(state, action);

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0]).toEqual(mockNotification);
    });

    it('should clear all notifications', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification, mockNotification2]
      };
      const action = UIActions.clearAllNotifications();
      const result = uiReducer(state, action);

      expect(result.notifications).toEqual([]);
    });

    it('should mark notification as read', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification, mockNotification2]
      };
      const action = UIActions.markNotificationAsRead({ notificationId: 'notif-123' });
      const result = uiReducer(state, action);

      expect(result.notifications[0].isRead).toBe(true);
      expect(result.notifications[1].isRead).toBe(false);
    });

    it('should not modify other notifications when marking one as read', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification, mockNotification2]
      };
      const action = UIActions.markNotificationAsRead({ notificationId: 'notif-123' });
      const result = uiReducer(state, action);

      expect(result.notifications[0].id).toBe('notif-123');
      expect(result.notifications[0].isRead).toBe(true);
      expect(result.notifications[1].id).toBe('notif-124');
      expect(result.notifications[1].isRead).toBe(false);
    });

    it('should handle marking non-existent notification as read', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification]
      };
      const action = UIActions.markNotificationAsRead({ notificationId: 'non-existent' });
      const result = uiReducer(state, action);

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].isRead).toBe(false);
    });
  });

  describe('Reset Action', () => {
    it('should reset to initial state', () => {
      const modifiedState: UIState = {
        calendarView: CalendarViewType.Day,
        scheduleViewMode: ScheduleViewMode.Technicians,
        selectedDate: new Date('2024-01-15'),
        sidebarOpen: false,
        mobileMenuOpen: true,
        mapView: {
          center: { lat: 32.7767, lng: -96.7970 },
          zoom: 12,
          showTechnicians: false,
          showCrews: false,
          showJobs: false,
          clusteringEnabled: false
        },
        selectedFilters: {
          technicians: {
            searchTerm: 'John'
          }
        },
        notifications: [mockNotification, mockNotification2],
        connectionState: {
          status: 'connected' as any,
          reconnectAttempts: 0
        }
      };

      const action = UIActions.resetUIState();
      const result = uiReducer(modifiedState, action);

      expect(result).toEqual(initialState);
    });

    it('should reset from empty state', () => {
      const action = UIActions.resetUIState();
      const result = uiReducer(initialState, action);

      expect(result).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state when setting calendar view', () => {
      const originalState = { ...initialState };
      const action = UIActions.setCalendarView({ view: CalendarViewType.Day });
      uiReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should not mutate original state when adding notification', () => {
      const originalState = { ...initialState };
      const action = UIActions.showNotification({ notification: mockNotification });
      uiReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should not mutate original notifications array', () => {
      const state: UIState = {
        ...initialState,
        notifications: [mockNotification]
      };
      const originalNotifications = [...state.notifications];
      const action = UIActions.showNotification({ notification: mockNotification2 });
      uiReducer(state, action);

      expect(state.notifications).toEqual(originalNotifications);
    });

    it('should not mutate original map view object', () => {
      const originalMapView = { ...initialState.mapView };
      const action = UIActions.setMapView({ mapView: { zoom: 15 } });
      uiReducer(initialState, action);

      expect(initialState.mapView).toEqual(originalMapView);
    });

    it('should not mutate original filters object', () => {
      const filters: FilterState = {
        technicians: {
          searchTerm: 'John'
        }
      };
      const state: UIState = {
        ...initialState,
        selectedFilters: filters
      };
      const originalFilters = { ...state.selectedFilters };
      const action = UIActions.setFilters({ filters: { jobs: { status: JobStatus.OnSite } } });
      uiReducer(state, action);

      expect(state.selectedFilters).toEqual(originalFilters);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined action', () => {
      const result = uiReducer(initialState, undefined as any);
      expect(result).toEqual(initialState);
    });

    it('should handle null state with unknown action', () => {
      const action = { type: 'UNKNOWN' } as any;
      const result = uiReducer(undefined, action);
      expect(result).toEqual(initialState);
    });

    it('should handle empty notifications array', () => {
      const action = UIActions.showNotifications({ notifications: [] });
      const result = uiReducer(initialState, action);

      expect(result.notifications).toEqual([]);
    });

    it('should handle dismissing from empty notifications', () => {
      const action = UIActions.dismissNotification({ notificationId: 'notif-123' });
      const result = uiReducer(initialState, action);

      expect(result.notifications).toEqual([]);
    });

    it('should handle clearing already empty notifications', () => {
      const action = UIActions.clearAllNotifications();
      const result = uiReducer(initialState, action);

      expect(result.notifications).toEqual([]);
    });
  });
});

  describe('Connection Status Actions', () => {
    it('should update connection status to connected', () => {
      const action = UIActions.updateConnectionStatus({ 
        status: 'connected' as any,
        reconnectAttempts: 0
      });
      const result = uiReducer(initialState, action);

      expect(result.connectionState.status).toBe('connected');
      expect(result.connectionState.reconnectAttempts).toBe(0);
      expect(result.connectionState.lastConnected).toBeInstanceOf(Date);
      expect(result.connectionState.lastError).toBeUndefined();
    });

    it('should update connection status to disconnected', () => {
      const action = UIActions.updateConnectionStatus({ 
        status: 'disconnected' as any,
        error: 'Connection lost'
      });
      const result = uiReducer(initialState, action);

      expect(result.connectionState.status).toBe('disconnected');
      expect(result.connectionState.lastDisconnected).toBeInstanceOf(Date);
      expect(result.connectionState.lastError).toBe('Connection lost');
    });

    it('should update connection status to reconnecting', () => {
      const action = UIActions.updateConnectionStatus({ 
        status: 'reconnecting' as any,
        reconnectAttempts: 3
      });
      const result = uiReducer(initialState, action);

      expect(result.connectionState.status).toBe('reconnecting');
      expect(result.connectionState.reconnectAttempts).toBe(3);
    });

    it('should handle connectionEstablished action', () => {
      const state: UIState = {
        ...initialState,
        connectionState: {
          status: 'reconnecting' as any,
          reconnectAttempts: 5,
          lastError: 'Previous error'
        }
      };
      const action = UIActions.connectionEstablished();
      const result = uiReducer(state, action);

      expect(result.connectionState.status).toBe('connected');
      expect(result.connectionState.reconnectAttempts).toBe(0);
      expect(result.connectionState.lastConnected).toBeInstanceOf(Date);
      expect(result.connectionState.lastError).toBeUndefined();
    });

    it('should handle connectionLost action without error', () => {
      const state: UIState = {
        ...initialState,
        connectionState: {
          status: 'connected' as any,
          reconnectAttempts: 0,
          lastConnected: new Date('2024-01-15T10:00:00Z')
        }
      };
      const action = UIActions.connectionLost({});
      const result = uiReducer(state, action);

      expect(result.connectionState.status).toBe('disconnected');
      expect(result.connectionState.lastDisconnected).toBeInstanceOf(Date);
      expect(result.connectionState.lastError).toBeUndefined();
    });

    it('should handle connectionLost action with error', () => {
      const action = UIActions.connectionLost({ error: 'Network timeout' });
      const result = uiReducer(initialState, action);

      expect(result.connectionState.status).toBe('disconnected');
      expect(result.connectionState.lastDisconnected).toBeInstanceOf(Date);
      expect(result.connectionState.lastError).toBe('Network timeout');
    });

    it('should handle reconnecting action', () => {
      const action = UIActions.reconnecting({ attempt: 2 });
      const result = uiReducer(initialState, action);

      expect(result.connectionState.status).toBe('reconnecting');
      expect(result.connectionState.reconnectAttempts).toBe(2);
    });

    it('should preserve other connection state when reconnecting', () => {
      const state: UIState = {
        ...initialState,
        connectionState: {
          status: 'disconnected' as any,
          reconnectAttempts: 1,
          lastDisconnected: new Date('2024-01-15T10:00:00Z'),
          lastError: 'Connection lost'
        }
      };
      const action = UIActions.reconnecting({ attempt: 2 });
      const result = uiReducer(state, action);

      expect(result.connectionState.status).toBe('reconnecting');
      expect(result.connectionState.reconnectAttempts).toBe(2);
      expect(result.connectionState.lastDisconnected).toEqual(state.connectionState.lastDisconnected);
      expect(result.connectionState.lastError).toBe('Connection lost');
    });

    it('should track connection state transitions', () => {
      let state = initialState;

      // Connect
      state = uiReducer(state, UIActions.connectionEstablished());
      expect(state.connectionState.status).toBe('connected');
      expect(state.connectionState.reconnectAttempts).toBe(0);

      // Lose connection
      state = uiReducer(state, UIActions.connectionLost({ error: 'Network error' }));
      expect(state.connectionState.status).toBe('disconnected');
      expect(state.connectionState.lastError).toBe('Network error');

      // Start reconnecting
      state = uiReducer(state, UIActions.reconnecting({ attempt: 1 }));
      expect(state.connectionState.status).toBe('reconnecting');
      expect(state.connectionState.reconnectAttempts).toBe(1);

      // Reconnect successfully
      state = uiReducer(state, UIActions.connectionEstablished());
      expect(state.connectionState.status).toBe('connected');
      expect(state.connectionState.reconnectAttempts).toBe(0);
      expect(state.connectionState.lastError).toBeUndefined();
    });
  });
