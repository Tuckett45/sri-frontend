import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService, NotificationPreferences } from './notification.service';
import { FrmNotificationAdapterService } from './frm-notification-adapter.service';
import { Notification } from '../models/notification.model';
import { ArkNotification, ArkNotificationType, ArkNotificationPriority } from '../../../models/ark/notification.model';
import { of } from 'rxjs';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let adapterSpy: jasmine.SpyObj<FrmNotificationAdapterService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('FrmNotificationAdapterService', [
      'sendJobAssignedNotification',
      'sendJobReassignedNotification',
      'sendJobStatusChangedNotification',
      'sendJobCancelledNotification',
      'sendCertificationExpiringNotification',
      'sendConflictDetectedNotification',
      'getFrmNotificationPreferences',
      'updateFrmNotificationPreferences'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: FrmNotificationAdapterService, useValue: spy }
      ]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    adapterSpy = TestBed.inject(FrmNotificationAdapterService) as jasmine.SpyObj<FrmNotificationAdapterService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('should retrieve notifications with default parameters', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'job_assignment',
          message: 'Test notification',
          isRead: false,
          createdAt: new Date(),
          timestamp: new Date(),
          userId: 'user1'
        }
      ];

      service.getNotifications().subscribe(notifications => {
        expect(notifications).toEqual(mockNotifications);
      });

      const req = httpMock.expectOne(req => req.url === '/api/notifications');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('includeRead')).toBe('true');
      req.flush(mockNotifications);
    });

    it('should retrieve notifications with pagination', () => {
      const mockNotifications: Notification[] = [];

      service.getNotifications(false, 1, 10).subscribe(notifications => {
        expect(notifications).toEqual(mockNotifications);
      });

      const req = httpMock.expectOne(req => req.url === '/api/notifications');
      expect(req.request.params.get('includeRead')).toBe('false');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      const notificationId = '123';

      service.markAsRead(notificationId).subscribe();

      const req = httpMock.expectOne(`/api/notifications/${notificationId}/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      service.markAllAsRead().subscribe();

      const req = httpMock.expectOne('/api/notifications/read-all');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });

  describe('getUnreadCount', () => {
    it('should retrieve unread count', () => {
      const mockCount = 5;

      service.getUnreadCount().subscribe(count => {
        expect(count).toBe(mockCount);
      });

      const req = httpMock.expectOne('/api/notifications/unread-count');
      expect(req.request.method).toBe('GET');
      req.flush(mockCount);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', () => {
      const notificationId = '123';

      service.deleteNotification(notificationId).subscribe();

      const req = httpMock.expectOne(`/api/notifications/${notificationId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Adapter delegation methods', () => {
    it('should delegate sendJobAssignedNotification to adapter', () => {
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'tech1',
        title: 'Job Assigned',
        message: 'Test',
        type: ArkNotificationType.JobAssigned,
        priority: ArkNotificationPriority.Normal,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendJobAssignedNotification.and.returnValue(of(mockNotification));

      service.sendJobAssignedNotification('job1', 'tech1').subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendJobAssignedNotification).toHaveBeenCalledWith('job1', 'tech1');
    });

    it('should delegate sendJobReassignedNotification to adapter', () => {
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'tech2',
        title: 'Job Reassigned',
        message: 'Test',
        type: ArkNotificationType.JobReassigned,
        priority: ArkNotificationPriority.High,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendJobReassignedNotification.and.returnValue(of(mockNotification));

      service.sendJobReassignedNotification('job1', 'tech1', 'tech2').subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendJobReassignedNotification).toHaveBeenCalledWith('job1', 'tech1', 'tech2');
    });

    it('should delegate sendJobStatusChangedNotification to adapter', () => {
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'user1',
        title: 'Job Status Changed',
        message: 'Test',
        type: ArkNotificationType.JobStatusChanged,
        priority: ArkNotificationPriority.Normal,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendJobStatusChangedNotification.and.returnValue(of(mockNotification));

      service.sendJobStatusChangedNotification('job1', 'pending', 'in_progress').subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendJobStatusChangedNotification).toHaveBeenCalledWith('job1', 'pending', 'in_progress');
    });

    it('should delegate sendJobCancelledNotification to adapter', () => {
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'user1',
        title: 'Job Cancelled',
        message: 'Test',
        type: ArkNotificationType.JobCancelled,
        priority: ArkNotificationPriority.High,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendJobCancelledNotification.and.returnValue(of(mockNotification));

      service.sendJobCancelledNotification('job1', 'Customer request').subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendJobCancelledNotification).toHaveBeenCalledWith('job1', 'Customer request');
    });

    it('should delegate sendCertificationExpiringNotification to adapter', () => {
      const expiryDate = new Date('2024-12-31');
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'tech1',
        title: 'Certification Expiring',
        message: 'Test',
        type: ArkNotificationType.CertificationExpiring,
        priority: ArkNotificationPriority.Normal,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendCertificationExpiringNotification.and.returnValue(of(mockNotification));

      service.sendCertificationExpiringNotification('tech1', 'Safety Cert', expiryDate).subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendCertificationExpiringNotification).toHaveBeenCalledWith('tech1', 'Safety Cert', expiryDate);
    });

    it('should delegate sendConflictDetectedNotification to adapter', () => {
      const mockNotification: ArkNotification = {
        id: '1',
        userId: 'user1',
        title: 'Conflict Detected',
        message: 'Test',
        type: ArkNotificationType.ConflictDetected,
        priority: ArkNotificationPriority.High,
        channels: [],
        status: 'pending' as any,
        createdAt: new Date()
      };

      adapterSpy.sendConflictDetectedNotification.and.returnValue(of(mockNotification));

      service.sendConflictDetectedNotification('schedule', 'Double booking detected').subscribe(notification => {
        expect(notification).toEqual(mockNotification);
      });

      expect(adapterSpy.sendConflictDetectedNotification).toHaveBeenCalledWith('schedule', 'Double booking detected');
    });
  });

  describe('Error handling', () => {
    it('should handle 404 error', () => {
      service.getNotifications().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Notification not found');
        }
      });

      // Handle retry attempts (retryCount = 2, so 3 total requests)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(req => req.url === '/api/notifications');
        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });

    it('should handle 403 error', () => {
      service.getNotifications().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Access denied');
        }
      });

      // Handle retry attempts (retryCount = 2, so 3 total requests)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(req => req.url === '/api/notifications');
        req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      }
    });

    it('should handle 500 error', () => {
      service.getNotifications().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      // Handle retry attempts (retryCount = 2, so 3 total requests)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(req => req.url === '/api/notifications');
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });
});
