/**
 * Notification Service Unit Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationPreferences } from '../models/notification.model';
import { environment } from '../../../../environments/environments';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getNotifications', () => {
    it('should get notifications for a user', () => {
      const userId = 'user-123';
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          type: NotificationType.JobAssignment,
          message: 'New job assigned',
          isRead: false,
          createdAt: new Date('2024-01-01'),
          timestamp: new Date('2024-01-01'),
          userId: userId
        }
      ];

      service.getNotifications(userId).subscribe(notifications => {
        expect(notifications).toEqual(mockNotifications);
        expect(notifications[0].createdAt instanceof Date).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNotifications);
    });

    it('should get only unread notifications when flag is set', () => {
      const userId = 'user-123';

      service.getNotifications(userId, true).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}?unreadOnly=true`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getNotificationById', () => {
    it('should get a single notification by ID', () => {
      const notificationId = 'notif-1';
      const mockNotification: Notification = {
        id: notificationId,
        type: NotificationType.JobAssignment,
        message: 'New job assigned',
        isRead: false,
        createdAt: new Date('2024-01-01'),
        timestamp: new Date('2024-01-01'),
        userId: 'user-123'
      };

      service.getNotificationById(notificationId).subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      const req = httpMock.expectOne(`${apiUrl}/${notificationId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockNotification);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      const notificationId = 'notif-1';

      service.markAsRead(notificationId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${notificationId}/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', () => {
      const userId = 'user-123';

      service.markAllAsRead(userId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}/read-all`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', () => {
      const notificationId = 'notif-1';

      service.deleteNotification(notificationId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${notificationId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for a user', () => {
      const userId = 'user-123';

      service.deleteAllNotifications(userId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}/all`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', () => {
      const userId = 'user-123';
      const mockResponse = { count: 5 };

      service.getUnreadCount(userId).subscribe(count => {
        expect(count).toBe(5);
      });

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getPreferences', () => {
    it('should get notification preferences', () => {
      const userId = 'user-123';
      const mockPreferences: NotificationPreferences = {
        userId: userId,
        emailEnabled: true,
        inAppEnabled: true,
        jobAssignmentEnabled: true,
        jobStatusChangeEnabled: true,
        certificationExpiringEnabled: true,
        conflictDetectedEnabled: true
      };

      service.getPreferences(userId).subscribe(preferences => {
        expect(preferences).toEqual(mockPreferences);
      });

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}/preferences`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', () => {
      const userId = 'user-123';
      const updates: Partial<NotificationPreferences> = {
        emailEnabled: false
      };
      const mockResponse: NotificationPreferences = {
        userId: userId,
        emailEnabled: false,
        inAppEnabled: true,
        jobAssignmentEnabled: true,
        jobStatusChangeEnabled: true,
        certificationExpiringEnabled: true,
        conflictDetectedEnabled: true
      };

      service.updatePreferences(userId, updates).subscribe(preferences => {
        expect(preferences).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/user/${userId}/preferences`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(mockResponse);
    });
  });

  describe('sendTestNotification', () => {
    it('should send a test notification', () => {
      const userId = 'user-123';
      const type = NotificationType.JobAssignment;
      const mockNotification: Notification = {
        id: 'notif-test',
        type: type,
        message: 'Test notification',
        isRead: false,
        createdAt: new Date('2024-01-01'),
        timestamp: new Date('2024-01-01'),
        userId: userId
      };

      service.sendTestNotification(userId, type).subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      const req = httpMock.expectOne(`${apiUrl}/test`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId, type });
      req.flush(mockNotification);
    });
  });
});
