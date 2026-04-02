/**
 * UI Selectors Unit Tests
 * Tests all selectors for UI state management
 */

import { UIState, CalendarViewType, ScheduleViewMode, MapViewState, FilterState, ConnectionStatus } from './ui.state';
import * as UISelectors from './ui.selectors';
import { Notification, NotificationType } from '../../models/notification.model';
import { JobStatus } from '../../models/job.model';
import { TechnicianRole } from '../../models/technician.model';

describe('UI Selectors', () => {
  const mockNotification1: Notification = {
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
    isRead: true,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    timestamp: new Date('2024-01-15T11:00:00Z'),
    userId: 'user-123',
    link: '/jobs/job-457',
    relatedEntityType: 'job',
    relatedEntityId: 'job-457'
  };

  const mockNotification3: Notification = {
    id: 'notif-125',
    type: NotificationType.SystemAlert,
    message: 'System maintenance scheduled',
    isRead: false,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    timestamp: new Date('2024-01-15T12:00:00Z'),
    userId: 'user-123'
  };

  const mockUIState: UIState = {
    calendarView: CalendarViewType.Week,
    scheduleViewMode: ScheduleViewMode.Technicians,
    selectedDate: new Date('2024-01-15T00:00:00Z'),
    sidebarOpen: true,
    mobileMenuOpen: false,
    mapView: {
      center: { lat: 32.7767, lng: -96.7970 },
      zoom: 12,
      showTechnicians: true,
      showCrews: true,
      showJobs: true,
      clusteringEnabled: true
    },
    selectedFilters: {
      technicians: {
        searchTerm: 'John',
        role: TechnicianRole.Installer,
        isAvailable: true
      },
      jobs: {
        status: JobStatus.OnSite,
        searchTerm: 'Installation'
      }
    },
    notifications: [mockNotification1, mockNotification2, mockNotification3],
    connectionState: {
      status: ConnectionStatus.Connected,
      reconnectAttempts: 0,
      lastConnected: new Date('2024-01-15T10:00:00Z')
    }
  };

  describe('selectUIState', () => {
    it('should select the entire UI state', () => {
      const result = UISelectors.selectUIState.projector(mockUIState);
      expect(result).toEqual(mockUIState);
    });

    it('should return state with all properties', () => {
      const result = UISelectors.selectUIState.projector(mockUIState);
      expect(result.calendarView).toBeDefined();
      expect(result.selectedDate).toBeDefined();
      expect(result.sidebarOpen).toBeDefined();
      expect(result.mobileMenuOpen).toBeDefined();
      expect(result.mapView).toBeDefined();
      expect(result.selectedFilters).toBeDefined();
      expect(result.notifications).toBeDefined();
    });
  });

  describe('selectCalendarView', () => {
    it('should select calendar view', () => {
      const result = UISelectors.selectCalendarView.projector(mockUIState);
      expect(result).toBe(CalendarViewType.Week);
    });

    it('should select Day view', () => {
      const state: UIState = {
        ...mockUIState,
        calendarView: CalendarViewType.Day
      };
      const result = UISelectors.selectCalendarView.projector(state);
      expect(result).toBe(CalendarViewType.Day);
    });
  });

  describe('selectSelectedDate', () => {
    it('should select selected date', () => {
      const result = UISelectors.selectSelectedDate.projector(mockUIState);
      expect(result).toEqual(new Date('2024-01-15T00:00:00Z'));
    });

    it('should return Date object', () => {
      const result = UISelectors.selectSelectedDate.projector(mockUIState);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('selectSidebarOpen', () => {
    it('should select sidebar open state as true', () => {
      const result = UISelectors.selectSidebarOpen.projector(mockUIState);
      expect(result).toBe(true);
    });

    it('should select sidebar open state as false', () => {
      const state: UIState = {
        ...mockUIState,
        sidebarOpen: false
      };
      const result = UISelectors.selectSidebarOpen.projector(state);
      expect(result).toBe(false);
    });
  });

  describe('selectMobileMenuOpen', () => {
    it('should select mobile menu open state as false', () => {
      const result = UISelectors.selectMobileMenuOpen.projector(mockUIState);
      expect(result).toBe(false);
    });

    it('should select mobile menu open state as true', () => {
      const state: UIState = {
        ...mockUIState,
        mobileMenuOpen: true
      };
      const result = UISelectors.selectMobileMenuOpen.projector(state);
      expect(result).toBe(true);
    });
  });

  describe('selectMapView', () => {
    it('should select map view state', () => {
      const result = UISelectors.selectMapView.projector(mockUIState);
      expect(result).toEqual(mockUIState.mapView);
    });

    it('should select map view with all properties', () => {
      const result = UISelectors.selectMapView.projector(mockUIState);
      expect(result.center).toEqual({ lat: 32.7767, lng: -96.7970 });
      expect(result.zoom).toBe(12);
      expect(result.showTechnicians).toBe(true);
      expect(result.showCrews).toBe(true);
      expect(result.showJobs).toBe(true);
      expect(result.clusteringEnabled).toBe(true);
    });

    it('should select map view with different settings', () => {
      const state: UIState = {
        ...mockUIState,
        mapView: {
          center: { lat: 30.2672, lng: -97.7431 },
          zoom: 15,
          showTechnicians: false,
          showCrews: false,
          showJobs: true,
          clusteringEnabled: false
        }
      };
      const result = UISelectors.selectMapView.projector(state);
      expect(result.center).toEqual({ lat: 30.2672, lng: -97.7431 });
      expect(result.zoom).toBe(15);
      expect(result.showTechnicians).toBe(false);
      expect(result.showCrews).toBe(false);
    });
  });

  describe('selectMapCenter', () => {
    it('should select map center coordinates', () => {
      const result = UISelectors.selectMapCenter.projector(mockUIState.mapView);
      expect(result).toEqual({ lat: 32.7767, lng: -96.7970 });
    });

    it('should select different map center', () => {
      const mapView: MapViewState = {
        ...mockUIState.mapView,
        center: { lat: 40.7128, lng: -74.0060 }
      };
      const result = UISelectors.selectMapCenter.projector(mapView);
      expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
    });
  });

  describe('selectMapZoom', () => {
    it('should select map zoom level', () => {
      const result = UISelectors.selectMapZoom.projector(mockUIState.mapView);
      expect(result).toBe(12);
    });

    it('should select different zoom level', () => {
      const mapView: MapViewState = {
        ...mockUIState.mapView,
        zoom: 8
      };
      const result = UISelectors.selectMapZoom.projector(mapView);
      expect(result).toBe(8);
    });
  });

  describe('selectSelectedFilters', () => {
    it('should select all filters', () => {
      const result = UISelectors.selectSelectedFilters.projector(mockUIState);
      expect(result).toEqual(mockUIState.selectedFilters);
    });

    it('should select filters with technician and job filters', () => {
      const result = UISelectors.selectSelectedFilters.projector(mockUIState);
      expect(result.technicians).toBeDefined();
      expect(result.jobs).toBeDefined();
    });

    it('should select empty filters', () => {
      const state: UIState = {
        ...mockUIState,
        selectedFilters: {}
      };
      const result = UISelectors.selectSelectedFilters.projector(state);
      expect(result).toEqual({});
    });
  });

  describe('selectTechnicianFilters', () => {
    it('should select technician filters', () => {
      const result = UISelectors.selectTechnicianFilters.projector(mockUIState.selectedFilters);
      expect(result).toEqual({
        searchTerm: 'John',
        role: TechnicianRole.Installer,
        isAvailable: true
      });
    });

    it('should return undefined when no technician filters', () => {
      const filters: FilterState = {
        jobs: {
          status: JobStatus.OnSite
        }
      };
      const result = UISelectors.selectTechnicianFilters.projector(filters);
      expect(result).toBeUndefined();
    });

    it('should return empty object when technician filters is empty', () => {
      const filters: FilterState = {
        technicians: {}
      };
      const result = UISelectors.selectTechnicianFilters.projector(filters);
      expect(result).toEqual({});
    });
  });

  describe('selectJobFilters', () => {
    it('should select job filters', () => {
      const result = UISelectors.selectJobFilters.projector(mockUIState.selectedFilters);
      expect(result).toEqual({
        status: JobStatus.OnSite,
        searchTerm: 'Installation'
      });
    });

    it('should return undefined when no job filters', () => {
      const filters: FilterState = {
        technicians: {
          searchTerm: 'John'
        }
      };
      const result = UISelectors.selectJobFilters.projector(filters);
      expect(result).toBeUndefined();
    });

    it('should return empty object when job filters is empty', () => {
      const filters: FilterState = {
        jobs: {}
      };
      const result = UISelectors.selectJobFilters.projector(filters);
      expect(result).toEqual({});
    });
  });

  describe('selectAllNotifications', () => {
    it('should select all notifications', () => {
      const result = UISelectors.selectAllNotifications.projector(mockUIState);
      expect(result).toEqual(mockUIState.notifications);
      expect(result.length).toBe(3);
    });

    it('should select empty notifications array', () => {
      const state: UIState = {
        ...mockUIState,
        notifications: []
      };
      const result = UISelectors.selectAllNotifications.projector(state);
      expect(result).toEqual([]);
    });

    it('should preserve notification order', () => {
      const result = UISelectors.selectAllNotifications.projector(mockUIState);
      expect(result[0].id).toBe('notif-123');
      expect(result[1].id).toBe('notif-124');
      expect(result[2].id).toBe('notif-125');
    });
  });

  describe('selectUnreadNotifications', () => {
    it('should select only unread notifications', () => {
      const result = UISelectors.selectUnreadNotifications.projector(mockUIState.notifications);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('notif-123');
      expect(result[1].id).toBe('notif-125');
    });

    it('should return empty array when all notifications are read', () => {
      const notifications: Notification[] = [
        { ...mockNotification1, isRead: true },
        { ...mockNotification2, isRead: true },
        { ...mockNotification3, isRead: true }
      ];
      const result = UISelectors.selectUnreadNotifications.projector(notifications);
      expect(result).toEqual([]);
    });

    it('should return all notifications when none are read', () => {
      const notifications: Notification[] = [
        { ...mockNotification1, isRead: false },
        { ...mockNotification2, isRead: false },
        { ...mockNotification3, isRead: false }
      ];
      const result = UISelectors.selectUnreadNotifications.projector(notifications);
      expect(result.length).toBe(3);
    });

    it('should return empty array when no notifications', () => {
      const result = UISelectors.selectUnreadNotifications.projector([]);
      expect(result).toEqual([]);
    });
  });

  describe('selectUnreadNotificationCount', () => {
    it('should count unread notifications', () => {
      const unreadNotifications = [mockNotification1, mockNotification3];
      const result = UISelectors.selectUnreadNotificationCount.projector(unreadNotifications);
      expect(result).toBe(2);
    });

    it('should return 0 when no unread notifications', () => {
      const result = UISelectors.selectUnreadNotificationCount.projector([]);
      expect(result).toBe(0);
    });

    it('should return correct count for single unread notification', () => {
      const result = UISelectors.selectUnreadNotificationCount.projector([mockNotification1]);
      expect(result).toBe(1);
    });

    it('should return correct count for multiple unread notifications', () => {
      const unreadNotifications = [
        mockNotification1,
        mockNotification3,
        { ...mockNotification2, isRead: false }
      ];
      const result = UISelectors.selectUnreadNotificationCount.projector(unreadNotifications);
      expect(result).toBe(3);
    });
  });

  describe('selectHasUnreadNotifications', () => {
    it('should return true when there are unread notifications', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(2);
      expect(result).toBe(true);
    });

    it('should return false when there are no unread notifications', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(0);
      expect(result).toBe(false);
    });

    it('should return true for single unread notification', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(1);
      expect(result).toBe(true);
    });

    it('should return true for many unread notifications', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(100);
      expect(result).toBe(true);
    });
  });

  describe('Selector Memoization', () => {
    it('should return same reference for unchanged state', () => {
      const result1 = UISelectors.selectUIState.projector(mockUIState);
      const result2 = UISelectors.selectUIState.projector(mockUIState);
      expect(result1).toBe(result2);
    });

    it('should return same reference for unchanged notifications', () => {
      const result1 = UISelectors.selectAllNotifications.projector(mockUIState);
      const result2 = UISelectors.selectAllNotifications.projector(mockUIState);
      expect(result1).toBe(result2);
    });

    it('should return same reference for unchanged map view', () => {
      const result1 = UISelectors.selectMapView.projector(mockUIState);
      const result2 = UISelectors.selectMapView.projector(mockUIState);
      expect(result1).toBe(result2);
    });

    it('should return same reference for unchanged filters', () => {
      const result1 = UISelectors.selectSelectedFilters.projector(mockUIState);
      const result2 = UISelectors.selectSelectedFilters.projector(mockUIState);
      expect(result1).toBe(result2);
    });
  });

  describe('Selector Composition', () => {
    it('should compose selectUnreadNotifications from selectAllNotifications', () => {
      const notifications = UISelectors.selectAllNotifications.projector(mockUIState);
      const unreadNotifications = UISelectors.selectUnreadNotifications.projector(notifications);
      expect(unreadNotifications.length).toBe(2);
    });

    it('should compose selectUnreadNotificationCount from selectUnreadNotifications', () => {
      const notifications = UISelectors.selectAllNotifications.projector(mockUIState);
      const unreadNotifications = UISelectors.selectUnreadNotifications.projector(notifications);
      const count = UISelectors.selectUnreadNotificationCount.projector(unreadNotifications);
      expect(count).toBe(2);
    });

    it('should compose selectHasUnreadNotifications from selectUnreadNotificationCount', () => {
      const notifications = UISelectors.selectAllNotifications.projector(mockUIState);
      const unreadNotifications = UISelectors.selectUnreadNotifications.projector(notifications);
      const count = UISelectors.selectUnreadNotificationCount.projector(unreadNotifications);
      const hasUnread = UISelectors.selectHasUnreadNotifications.projector(count);
      expect(hasUnread).toBe(true);
    });

    it('should compose selectMapCenter from selectMapView', () => {
      const mapView = UISelectors.selectMapView.projector(mockUIState);
      const center = UISelectors.selectMapCenter.projector(mapView);
      expect(center).toEqual({ lat: 32.7767, lng: -96.7970 });
    });

    it('should compose selectMapZoom from selectMapView', () => {
      const mapView = UISelectors.selectMapView.projector(mockUIState);
      const zoom = UISelectors.selectMapZoom.projector(mapView);
      expect(zoom).toBe(12);
    });

    it('should compose selectTechnicianFilters from selectSelectedFilters', () => {
      const filters = UISelectors.selectSelectedFilters.projector(mockUIState);
      const techFilters = UISelectors.selectTechnicianFilters.projector(filters);
      expect(techFilters).toEqual({
        searchTerm: 'John',
        role: TechnicianRole.Installer,
        isAvailable: true
      });
    });

    it('should compose selectJobFilters from selectSelectedFilters', () => {
      const filters = UISelectors.selectSelectedFilters.projector(mockUIState);
      const jobFilters = UISelectors.selectJobFilters.projector(filters);
      expect(jobFilters).toEqual({
        status: JobStatus.OnSite,
        searchTerm: 'Installation'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle state with null notifications', () => {
      const state: UIState = {
        ...mockUIState,
        notifications: null as any
      };
      expect(() => UISelectors.selectAllNotifications.projector(state)).not.toThrow();
    });

    it('should handle state with undefined filters', () => {
      const state: UIState = {
        ...mockUIState,
        selectedFilters: undefined as any
      };
      expect(() => UISelectors.selectSelectedFilters.projector(state)).not.toThrow();
    });

    it('should handle state with null mapView', () => {
      const state: UIState = {
        ...mockUIState,
        mapView: null as any
      };
      expect(() => UISelectors.selectMapView.projector(state)).not.toThrow();
    });

    it('should handle negative unread count', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(-1);
      expect(result).toBe(false);
    });

    it('should handle very large unread count', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(999999);
      expect(result).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should return correct type for selectCalendarView', () => {
      const result = UISelectors.selectCalendarView.projector(mockUIState);
      expect(typeof result).toBe('string');
      expect([CalendarViewType.Day, CalendarViewType.Week]).toContain(result);
    });

    it('should return correct type for selectSidebarOpen', () => {
      const result = UISelectors.selectSidebarOpen.projector(mockUIState);
      expect(typeof result).toBe('boolean');
    });

    it('should return correct type for selectMobileMenuOpen', () => {
      const result = UISelectors.selectMobileMenuOpen.projector(mockUIState);
      expect(typeof result).toBe('boolean');
    });

    it('should return correct type for selectMapZoom', () => {
      const result = UISelectors.selectMapZoom.projector(mockUIState.mapView);
      expect(typeof result).toBe('number');
    });

    it('should return correct type for selectUnreadNotificationCount', () => {
      const result = UISelectors.selectUnreadNotificationCount.projector([mockNotification1]);
      expect(typeof result).toBe('number');
    });

    it('should return correct type for selectHasUnreadNotifications', () => {
      const result = UISelectors.selectHasUnreadNotifications.projector(1);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('UI Connection Status Selectors', () => {
  const mockState: UIState = {
    calendarView: CalendarViewType.Week,
    scheduleViewMode: ScheduleViewMode.Technicians,
    selectedDate: new Date('2024-01-15T00:00:00Z'),
    sidebarOpen: true,
    mobileMenuOpen: false,
    mapView: {
      center: { lat: 32.7767, lng: -96.7970 },
      zoom: 12,
      showTechnicians: true,
      showCrews: true,
      showJobs: true,
      clusteringEnabled: true
    },
    selectedFilters: {},
    notifications: [],
    connectionState: {
      status: ConnectionStatus.Connected,
      reconnectAttempts: 0
    }
  };

  describe('Connection Status Selectors', () => {
    const connectedState: UIState = {
      ...mockState,
      connectionState: {
        status: 'connected' as any,
        reconnectAttempts: 0,
        lastConnected: new Date('2024-01-15T10:00:00Z')
      }
    };

    const disconnectedState: UIState = {
      ...mockState,
      connectionState: {
        status: 'disconnected' as any,
        reconnectAttempts: 0,
        lastDisconnected: new Date('2024-01-15T10:05:00Z'),
        lastError: 'Connection lost'
      }
    };

    const reconnectingState: UIState = {
      ...mockState,
      connectionState: {
        status: 'reconnecting' as any,
        reconnectAttempts: 3,
        lastDisconnected: new Date('2024-01-15T10:05:00Z'),
        lastError: 'Connection lost'
      }
    };

    describe('selectConnectionState', () => {
      it('should select connection state', () => {
        const result = UISelectors.selectConnectionState.projector(connectedState);
        expect(result).toEqual(connectedState.connectionState);
      });
    });

    describe('selectConnectionStatus', () => {
      it('should select connected status', () => {
        const result = UISelectors.selectConnectionStatus.projector(connectedState.connectionState);
        expect(result).toBe('connected');
      });

      it('should select disconnected status', () => {
        const result = UISelectors.selectConnectionStatus.projector(disconnectedState.connectionState);
        expect(result).toBe('disconnected');
      });

      it('should select reconnecting status', () => {
        const result = UISelectors.selectConnectionStatus.projector(reconnectingState.connectionState);
        expect(result).toBe('reconnecting');
      });
    });

    describe('selectIsConnected', () => {
      it('should return true when connected', () => {
        const result = UISelectors.selectIsConnected.projector(ConnectionStatus.Connected);
        expect(result).toBe(true);
      });

      it('should return false when disconnected', () => {
        const result = UISelectors.selectIsConnected.projector(ConnectionStatus.Disconnected);
        expect(result).toBe(false);
      });

      it('should return false when reconnecting', () => {
        const result = UISelectors.selectIsConnected.projector(ConnectionStatus.Reconnecting);
        expect(result).toBe(false);
      });
    });

    describe('selectIsDisconnected', () => {
      it('should return true when disconnected', () => {
        const result = UISelectors.selectIsDisconnected.projector(ConnectionStatus.Disconnected);
        expect(result).toBe(true);
      });

      it('should return false when connected', () => {
        const result = UISelectors.selectIsDisconnected.projector(ConnectionStatus.Connected);
        expect(result).toBe(false);
      });
    });

    describe('selectIsReconnecting', () => {
      it('should return true when reconnecting', () => {
        const result = UISelectors.selectIsReconnecting.projector(ConnectionStatus.Reconnecting);
        expect(result).toBe(true);
      });

      it('should return false when connected', () => {
        const result = UISelectors.selectIsReconnecting.projector(ConnectionStatus.Connected);
        expect(result).toBe(false);
      });
    });

    describe('selectReconnectAttempts', () => {
      it('should select reconnect attempts', () => {
        const result = UISelectors.selectReconnectAttempts.projector(reconnectingState.connectionState);
        expect(result).toBe(3);
      });

      it('should return 0 when connected', () => {
        const result = UISelectors.selectReconnectAttempts.projector(connectedState.connectionState);
        expect(result).toBe(0);
      });
    });

    describe('selectLastConnected', () => {
      it('should select last connected time', () => {
        const result = UISelectors.selectLastConnected.projector(connectedState.connectionState);
        expect(result).toEqual(new Date('2024-01-15T10:00:00Z'));
      });

      it('should return undefined when never connected', () => {
        const result = UISelectors.selectLastConnected.projector(disconnectedState.connectionState);
        expect(result).toBeUndefined();
      });
    });

    describe('selectLastDisconnected', () => {
      it('should select last disconnected time', () => {
        const result = UISelectors.selectLastDisconnected.projector(disconnectedState.connectionState);
        expect(result).toEqual(new Date('2024-01-15T10:05:00Z'));
      });
    });

    describe('selectLastConnectionError', () => {
      it('should select last error', () => {
        const result = UISelectors.selectLastConnectionError.projector(disconnectedState.connectionState);
        expect(result).toBe('Connection lost');
      });

      it('should return undefined when no error', () => {
        const result = UISelectors.selectLastConnectionError.projector(connectedState.connectionState);
        expect(result).toBeUndefined();
      });
    });

    describe('selectIsConnectionHealthy', () => {
      it('should return true when connected with no error', () => {
        const result = UISelectors.selectIsConnectionHealthy.projector(true, undefined);
        expect(result).toBe(true);
      });

      it('should return false when connected with error', () => {
        const result = UISelectors.selectIsConnectionHealthy.projector(true, 'Previous error');
        expect(result).toBe(false);
      });

      it('should return false when disconnected', () => {
        const result = UISelectors.selectIsConnectionHealthy.projector(false, undefined);
        expect(result).toBe(false);
      });
    });

    describe('selectConnectionStatusDisplay', () => {
      it('should format connected status', () => {
        const result = UISelectors.selectConnectionStatusDisplay.projector(connectedState.connectionState);
        expect(result.status).toBe('connected');
        expect(result.message).toBe('Connected');
        expect(result.severity).toBe('success');
        expect(result.reconnectAttempts).toBe(0);
      });

      it('should format disconnected status without error', () => {
        const state = {
          ...disconnectedState.connectionState,
          lastError: undefined
        };
        const result = UISelectors.selectConnectionStatusDisplay.projector(state);
        expect(result.status).toBe('disconnected');
        expect(result.message).toBe('Disconnected');
        expect(result.severity).toBe('error');
      });

      it('should format disconnected status with error', () => {
        const result = UISelectors.selectConnectionStatusDisplay.projector(disconnectedState.connectionState);
        expect(result.status).toBe('disconnected');
        expect(result.message).toBe('Disconnected: Connection lost');
        expect(result.severity).toBe('error');
        expect(result.lastError).toBe('Connection lost');
      });

      it('should format reconnecting status', () => {
        const result = UISelectors.selectConnectionStatusDisplay.projector(reconnectingState.connectionState);
        expect(result.status).toBe('reconnecting');
        expect(result.message).toBe('Reconnecting... (Attempt 3)');
        expect(result.severity).toBe('warning');
        expect(result.reconnectAttempts).toBe(3);
      });
    });

    describe('selectShouldShowOfflineIndicator', () => {
      it('should return false when connected', () => {
        const result = UISelectors.selectShouldShowOfflineIndicator.projector(true);
        expect(result).toBe(false);
      });

      it('should return true when disconnected', () => {
        const result = UISelectors.selectShouldShowOfflineIndicator.projector(false);
        expect(result).toBe(true);
      });
    });

    describe('selectConnectionUptime', () => {
      it('should calculate uptime when connected', () => {
        const lastConnected = new Date(Date.now() - 60000); // 1 minute ago
        const result = UISelectors.selectConnectionUptime.projector(lastConnected, true);
        expect(result).toBeGreaterThan(59000);
        expect(result).toBeLessThan(61000);
      });

      it('should return null when disconnected', () => {
        const result = UISelectors.selectConnectionUptime.projector(new Date(), false);
        expect(result).toBeNull();
      });

      it('should return null when never connected', () => {
        const result = UISelectors.selectConnectionUptime.projector(undefined, true);
        expect(result).toBeNull();
      });
    });

    describe('selectConnectionDowntime', () => {
      it('should calculate downtime when disconnected', () => {
        const lastDisconnected = new Date(Date.now() - 30000); // 30 seconds ago
        const result = UISelectors.selectConnectionDowntime.projector(lastDisconnected, true);
        expect(result).toBeGreaterThan(29000);
        expect(result).toBeLessThan(31000);
      });

      it('should return null when connected', () => {
        const result = UISelectors.selectConnectionDowntime.projector(new Date(), false);
        expect(result).toBeNull();
      });

      it('should return null when never disconnected', () => {
        const result = UISelectors.selectConnectionDowntime.projector(undefined, true);
        expect(result).toBeNull();
      });
    });
  });
});
