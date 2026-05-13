/**
 * UI Actions Unit Tests
 * Tests all actions for UI state management
 */

import * as UIActions from './ui.actions';
import { CalendarViewType, MapViewState, FilterState } from './ui.state';
import { Notification, NotificationType } from '../../models/notification.model';
import { JobStatus } from '../../models/job.model';
import { TechnicianRole } from '../../models/technician.model';

describe('UI Actions', () => {
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

  const mockNotifications: Notification[] = [
    mockNotification,
    {
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
    }
  ];

  const mockMapView: Partial<MapViewState> = {
    center: { lat: 32.7767, lng: -96.7970 },
    zoom: 12,
    showTechnicians: true,
    showCrews: false
  };

  const mockFilters: FilterState = {
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

  describe('Calendar View Actions', () => {
    it('should create setCalendarView action', () => {
      const action = UIActions.setCalendarView({ view: CalendarViewType.Day });
      expect(action.type).toBe('[UI] Set Calendar View');
      expect(action.view).toBe(CalendarViewType.Day);
    });

    it('should create setSelectedDate action', () => {
      const date = new Date('2024-01-15');
      const action = UIActions.setSelectedDate({ date });
      expect(action.type).toBe('[UI] Set Selected Date');
      expect(action.date).toEqual(date);
    });
  });

  describe('Sidebar Actions', () => {
    it('should create toggleSidebar action', () => {
      const action = UIActions.toggleSidebar();
      expect(action.type).toBe('[UI] Toggle Sidebar');
    });

    it('should create openSidebar action', () => {
      const action = UIActions.openSidebar();
      expect(action.type).toBe('[UI] Open Sidebar');
    });

    it('should create closeSidebar action', () => {
      const action = UIActions.closeSidebar();
      expect(action.type).toBe('[UI] Close Sidebar');
    });
  });

  describe('Mobile Menu Actions', () => {
    it('should create toggleMobileMenu action', () => {
      const action = UIActions.toggleMobileMenu();
      expect(action.type).toBe('[UI] Toggle Mobile Menu');
    });

    it('should create openMobileMenu action', () => {
      const action = UIActions.openMobileMenu();
      expect(action.type).toBe('[UI] Open Mobile Menu');
    });

    it('should create closeMobileMenu action', () => {
      const action = UIActions.closeMobileMenu();
      expect(action.type).toBe('[UI] Close Mobile Menu');
    });
  });

  describe('Filter Actions', () => {
    it('should create setFilters action with complete filters', () => {
      const action = UIActions.setFilters({ filters: mockFilters });
      expect(action.type).toBe('[UI] Set Filters');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create setFilters action with partial filters', () => {
      const partialFilters: FilterState = {
        jobs: {
          status: JobStatus.NotStarted
        }
      };
      const action = UIActions.setFilters({ filters: partialFilters });
      expect(action.type).toBe('[UI] Set Filters');
      expect(action.filters).toEqual(partialFilters);
    });

    it('should create setFilters action with empty filters', () => {
      const emptyFilters: FilterState = {};
      const action = UIActions.setFilters({ filters: emptyFilters });
      expect(action.type).toBe('[UI] Set Filters');
      expect(action.filters).toEqual(emptyFilters);
    });

    it('should create clearFilters action', () => {
      const action = UIActions.clearFilters();
      expect(action.type).toBe('[UI] Clear Filters');
    });
  });

  describe('Map View Actions', () => {
    it('should create setMapView action with complete map view', () => {
      const fullMapView: MapViewState = {
        center: { lat: 32.7767, lng: -96.7970 },
        zoom: 12,
        showTechnicians: true,
        showCrews: true,
        showJobs: true,
        clusteringEnabled: true
      };
      const action = UIActions.setMapView({ mapView: fullMapView });
      expect(action.type).toBe('[UI] Set Map View');
      expect(action.mapView).toEqual(fullMapView);
    });

    it('should create setMapView action with partial map view', () => {
      const action = UIActions.setMapView({ mapView: mockMapView });
      expect(action.type).toBe('[UI] Set Map View');
      expect(action.mapView).toEqual(mockMapView);
    });

    it('should create setMapView action with only center', () => {
      const centerOnly: Partial<MapViewState> = {
        center: { lat: 30.2672, lng: -97.7431 }
      };
      const action = UIActions.setMapView({ mapView: centerOnly });
      expect(action.type).toBe('[UI] Set Map View');
      expect(action.mapView).toEqual(centerOnly);
    });

    it('should create setMapView action with only zoom', () => {
      const zoomOnly: Partial<MapViewState> = {
        zoom: 15
      };
      const action = UIActions.setMapView({ mapView: zoomOnly });
      expect(action.type).toBe('[UI] Set Map View');
      expect(action.mapView).toEqual(zoomOnly);
    });
  });

  describe('Notification Actions', () => {
    it('should create showNotification action', () => {
      const action = UIActions.showNotification({ notification: mockNotification });
      expect(action.type).toBe('[UI] Show Notification');
      expect(action.notification).toEqual(mockNotification);
    });

    it('should create showNotifications action with multiple notifications', () => {
      const action = UIActions.showNotifications({ notifications: mockNotifications });
      expect(action.type).toBe('[UI] Show Notifications');
      expect(action.notifications).toEqual(mockNotifications);
      expect(action.notifications.length).toBe(2);
    });

    it('should create showNotifications action with empty array', () => {
      const action = UIActions.showNotifications({ notifications: [] });
      expect(action.type).toBe('[UI] Show Notifications');
      expect(action.notifications).toEqual([]);
    });

    it('should create dismissNotification action', () => {
      const action = UIActions.dismissNotification({ notificationId: 'notif-123' });
      expect(action.type).toBe('[UI] Dismiss Notification');
      expect(action.notificationId).toBe('notif-123');
    });

    it('should create clearAllNotifications action', () => {
      const action = UIActions.clearAllNotifications();
      expect(action.type).toBe('[UI] Clear All Notifications');
    });

    it('should create markNotificationAsRead action', () => {
      const action = UIActions.markNotificationAsRead({ notificationId: 'notif-123' });
      expect(action.type).toBe('[UI] Mark Notification as Read');
      expect(action.notificationId).toBe('notif-123');
    });
  });

  describe('Reset Action', () => {
    it('should create resetUIState action', () => {
      const action = UIActions.resetUIState();
      expect(action.type).toBe('[UI] Reset UI State');
    });
  });

  describe('Action Type Uniqueness', () => {
    it('should have unique action types', () => {
      const actionTypes = [
        UIActions.setCalendarView({ view: CalendarViewType.Day }).type,
        UIActions.setSelectedDate({ date: new Date() }).type,
        UIActions.toggleSidebar().type,
        UIActions.openSidebar().type,
        UIActions.closeSidebar().type,
        UIActions.toggleMobileMenu().type,
        UIActions.openMobileMenu().type,
        UIActions.closeMobileMenu().type,
        UIActions.setFilters({ filters: {} }).type,
        UIActions.clearFilters().type,
        UIActions.setMapView({ mapView: {} }).type,
        UIActions.showNotification({ notification: mockNotification }).type,
        UIActions.showNotifications({ notifications: [] }).type,
        UIActions.dismissNotification({ notificationId: 'test' }).type,
        UIActions.clearAllNotifications().type,
        UIActions.markNotificationAsRead({ notificationId: 'test' }).type,
        UIActions.resetUIState().type
      ];

      const uniqueTypes = new Set(actionTypes);
      expect(uniqueTypes.size).toBe(actionTypes.length);
    });
  });

  describe('Action Payload Immutability', () => {
    it('should not mutate notification object', () => {
      const originalNotification = { ...mockNotification };
      const action = UIActions.showNotification({ notification: mockNotification });
      
      expect(action.notification).toEqual(originalNotification);
      expect(mockNotification).toEqual(originalNotification);
    });

    it('should not mutate notifications array', () => {
      const originalNotifications = [...mockNotifications];
      const action = UIActions.showNotifications({ notifications: mockNotifications });
      
      expect(action.notifications).toEqual(originalNotifications);
      expect(mockNotifications).toEqual(originalNotifications);
    });

    it('should not mutate filters object', () => {
      const originalFilters = { ...mockFilters };
      const action = UIActions.setFilters({ filters: mockFilters });
      
      expect(action.filters).toEqual(originalFilters);
      expect(mockFilters).toEqual(originalFilters);
    });

    it('should not mutate map view object', () => {
      const originalMapView = { ...mockMapView };
      const action = UIActions.setMapView({ mapView: mockMapView });
      
      expect(action.mapView).toEqual(originalMapView);
      expect(mockMapView).toEqual(originalMapView);
    });
  });
});

  describe('Connection Status Actions', () => {
    describe('updateConnectionStatus', () => {
      it('should create action with status and reconnect attempts', () => {
        const action = UIActions.updateConnectionStatus({
          status: 'connected' as any,
          reconnectAttempts: 0
        });

        expect(action.type).toBe('[UI] Update Connection Status');
        expect(action.status).toBe('connected');
        expect(action.reconnectAttempts).toBe(0);
      });

      it('should create action with error', () => {
        const action = UIActions.updateConnectionStatus({
          status: 'disconnected' as any,
          error: 'Connection lost'
        });

        expect(action.type).toBe('[UI] Update Connection Status');
        expect(action.status).toBe('disconnected');
        expect(action.error).toBe('Connection lost');
      });

      it('should create action with reconnecting status', () => {
        const action = UIActions.updateConnectionStatus({
          status: 'reconnecting' as any,
          reconnectAttempts: 3
        });

        expect(action.type).toBe('[UI] Update Connection Status');
        expect(action.status).toBe('reconnecting');
        expect(action.reconnectAttempts).toBe(3);
      });
    });

    describe('connectionEstablished', () => {
      it('should create action', () => {
        const action = UIActions.connectionEstablished();

        expect(action.type).toBe('[UI] Connection Established');
      });
    });

    describe('connectionLost', () => {
      it('should create action without error', () => {
        const action = UIActions.connectionLost({});

        expect(action.type).toBe('[UI] Connection Lost');
        expect(action.error).toBeUndefined();
      });

      it('should create action with error', () => {
        const action = UIActions.connectionLost({ error: 'Network timeout' });

        expect(action.type).toBe('[UI] Connection Lost');
        expect(action.error).toBe('Network timeout');
      });
    });

    describe('reconnecting', () => {
      it('should create action with attempt number', () => {
        const action = UIActions.reconnecting({ attempt: 2 });

        expect(action.type).toBe('[UI] Reconnecting');
        expect(action.attempt).toBe(2);
      });

      it('should create action with first attempt', () => {
        const action = UIActions.reconnecting({ attempt: 1 });

        expect(action.type).toBe('[UI] Reconnecting');
        expect(action.attempt).toBe(1);
      });
    });
  });
