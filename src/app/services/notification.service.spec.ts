import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import { UserRole } from '../models/role.enum';
import {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  NotificationLog,
  BroadcastNotification,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
} from '../models/notification.model';
import { environment } from '../../environments/environments';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;

  const mockCMUser = {
    id: 'cm-user-1',
    name: 'CM User',
    email: 'cm@test.com',
    role: UserRole.CM,
    market: 'Market-A',
    company: 'Test Company'
  };

  const mockAdminUser = {
    id: 'admin-user-1',
    name: 'Admin User',
    email: 'admin@test.com',
    role: UserRole.Admin,
    market: 'Market-A',
    company: 'Test Company'
  };

  const mockNotification: Notification = {
    id: 'notif-1',
    userId: 'cm-user-1',
    market: 'Market-A',
    title: 'Test Notification',
    message: 'Test message',
    type: 'approval',
    priority: NotificationPriority.Normal,
    channels: [NotificationChannel.Email, NotificationChannel.InApp],
    status: NotificationStatus.Sent,
    createdAt: new Date(),
    sentAt: new Date()
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'isCM',
      'isAdmin'
    ]);

    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', [
      'applyMarketFilter',
      'canAccessMarket'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy }
      ]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('sendNotification', () => {
    it('should send notification for CM user within their market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const notification: Partial<Notification> = {
        userId: 'user-1',
        market: 'Market-A',
        title: 'Test',
        message: 'Test message',
        type: 'approval',
        priority: NotificationPriority.Normal,
        channels: [NotificationChannel.Email]
      };

      service.sendNotification(notification).subscribe(result => {
        expect(result).toEqual(mockNotification);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(notification);
      req.flush(mockNotification);
    });

    it('should auto-assign market for CM user if not specified', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const notification: Partial<Notification> = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'approval',
        priority: NotificationPriority.Normal,
        channels: [NotificationChannel.Email]
      };

      service.sendNotification(notification).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications`);
      expect(req.request.body.market).toBe('Market-A');
      req.flush(mockNotification);
    });

    it('should reject CM user sending notification to different market', (done) => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const notification: Partial<Notification> = {
        userId: 'user-1',
        market: 'Market-B',
        title: 'Test',
        message: 'Test message'
      };

      service.sendNotification(notification).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('CM users can only send notifications within their market');
          done();
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/notifications`);
    });

    it('should allow Admin to send notification to any market', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      const notification: Partial<Notification> = {
        userId: 'user-1',
        market: 'Market-B',
        title: 'Test',
        message: 'Test message',
        type: 'system',
        priority: NotificationPriority.High,
        channels: [NotificationChannel.Email]
      };

      service.sendNotification(notification).subscribe(result => {
        expect(result).toEqual(mockNotification);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications`);
      expect(req.request.method).toBe('POST');
      req.flush(mockNotification);
    });
  });

  describe('getNotificationsForUser', () => {
    it('should get notifications with market filter for CM user', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const notifications = [mockNotification];

      service.getNotificationsForUser().subscribe(result => {
        expect(result).toEqual(notifications);
      });

      const req = httpMock.expectOne(req => 
        req.url === `${environment.apiUrl}/notifications` &&
        req.params.get('market') === 'Market-A' &&
        req.params.get('userId') === 'cm-user-1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(notifications);
    });

    it('should get all notifications for Admin user', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      const notifications = [mockNotification];

      service.getNotificationsForUser().subscribe(result => {
        expect(result).toEqual(notifications);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush(notifications);
    });

    it('should apply filters to notification query', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const filters = {
        type: 'approval',
        priority: NotificationPriority.High,
        unreadOnly: true
      };

      service.getNotificationsForUser(filters).subscribe();

      const req = httpMock.expectOne(req => 
        req.url === `${environment.apiUrl}/notifications` &&
        req.params.get('type') === 'approval' &&
        req.params.get('priority') === NotificationPriority.High &&
        req.params.get('unreadOnly') === 'true'
      );
      req.flush([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      service.markAsRead('notif-1').subscribe(result => {
        expect(result.status).toBe(NotificationStatus.Read);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/notif-1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockNotification, status: NotificationStatus.Read });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for CM user', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      service.markAllAsRead().subscribe(result => {
        expect(result.count).toBe(5);
      });

      const req = httpMock.expectOne(req => 
        req.url === `${environment.apiUrl}/notifications/mark-all-read` &&
        req.params.get('userId') === 'cm-user-1' &&
        req.params.get('market') === 'Market-A'
      );
      expect(req.request.method).toBe('PATCH');
      req.flush({ count: 5 });
    });
  });

  describe('configureNotificationPreferences', () => {
    it('should update user notification preferences', () => {
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const preferences: NotificationPreferences = {
        userId: 'cm-user-1',
        email: true,
        inApp: true,
        sms: false,
        approvalReminders: true,
        escalationAlerts: true,
        dailyDigest: false
      };

      service.configureNotificationPreferences(preferences).subscribe(result => {
        expect(result).toEqual(preferences);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/preferences`);
      expect(req.request.method).toBe('PUT');
      req.flush(preferences);
    });

    it('should reject non-admin user updating other user preferences', (done) => {
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      const preferences: NotificationPreferences = {
        userId: 'other-user',
        email: true,
        inApp: true,
        sms: false,
        approvalReminders: true,
        escalationAlerts: true,
        dailyDigest: false
      };

      service.configureNotificationPreferences(preferences).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Users can only update their own notification preferences');
          done();
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/notifications/preferences`);
    });
  });

  describe('sendBroadcast', () => {
    it('should send broadcast notification for Admin', () => {
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      const broadcast: Partial<BroadcastNotification> = {
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        type: 'system',
        priority: NotificationPriority.High,
        channels: [NotificationChannel.Email, NotificationChannel.InApp],
        targetRoles: [UserRole.CM, UserRole.PM]
      };

      service.sendBroadcast(broadcast).subscribe(result => {
        expect(result.createdBy).toBe('admin-user-1');
        expect(result.createdAt).toBeDefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/broadcast`);
      expect(req.request.method).toBe('POST');
      req.flush({ ...broadcast, id: 'broadcast-1', createdBy: 'admin-user-1', createdAt: new Date() });
    });

    it('should reject non-admin user sending broadcast', (done) => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);

      const broadcast: Partial<BroadcastNotification> = {
        title: 'Test',
        message: 'Test message'
      };

      service.sendBroadcast(broadcast).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can send broadcast notifications');
          done();
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/notifications/broadcast`);
    });
  });

  describe('getNotificationLogs', () => {
    it('should get notification logs for Admin', () => {
      authService.isAdmin.and.returnValue(true);

      const logs: NotificationLog[] = [{
        id: 'log-1',
        notificationId: 'notif-1',
        userId: 'user-1',
        market: 'Market-A',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Delivered,
        sentAt: new Date()
      }];

      service.getNotificationLogs().subscribe(result => {
        expect(result).toEqual(logs);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/logs`);
      expect(req.request.method).toBe('GET');
      req.flush(logs);
    });

    it('should reject non-admin user accessing logs', (done) => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);

      service.getNotificationLogs().subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can access notification logs');
          done();
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/notifications/logs`);
    });
  });

  describe('configureNotificationTemplates', () => {
    it('should create notification template for Admin', () => {
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      const template: NotificationTemplate = {
        id: '',
        name: 'Approval Reminder',
        type: 'approval_reminder',
        subject: 'Approval Required',
        bodyTemplate: 'You have {{count}} pending approvals',
        channels: [NotificationChannel.Email],
        priority: NotificationPriority.Normal,
        variables: ['count'],
        isActive: true,
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.configureNotificationTemplates(template).subscribe(result => {
        expect(result.createdBy).toBe('admin-user-1');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/templates`);
      expect(req.request.method).toBe('POST');
      req.flush({ ...template, id: 'template-1', createdBy: 'admin-user-1' });
    });

    it('should update existing notification template for Admin', () => {
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      const template: NotificationTemplate = {
        id: 'template-1',
        name: 'Approval Reminder',
        type: 'approval_reminder',
        subject: 'Approval Required',
        bodyTemplate: 'You have {{count}} pending approvals',
        channels: [NotificationChannel.Email],
        priority: NotificationPriority.Normal,
        variables: ['count'],
        isActive: true,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.configureNotificationTemplates(template).subscribe(result => {
        expect(result.id).toBe('template-1');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/templates/template-1`);
      expect(req.request.method).toBe('PUT');
      req.flush(template);
    });

    it('should reject non-admin user configuring templates', (done) => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);

      const template: NotificationTemplate = {
        id: '',
        name: 'Test',
        type: 'test',
        subject: 'Test',
        bodyTemplate: 'Test',
        channels: [NotificationChannel.Email],
        priority: NotificationPriority.Normal,
        variables: [],
        isActive: true,
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.configureNotificationTemplates(template).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can configure notification templates');
          done();
        }
      });

      httpMock.expectNone(`${environment.apiUrl}/notifications/templates`);
    });
  });

  describe('sendApprovalReminders', () => {
    it('should send approval reminders for CM user within their market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      service.sendApprovalReminders().subscribe(result => {
        expect(result.count).toBe(3);
      });

      const req = httpMock.expectOne(req => 
        req.url === `${environment.apiUrl}/notifications/approval-reminders` &&
        req.params.get('market') === 'Market-A'
      );
      expect(req.request.method).toBe('POST');
      req.flush({ count: 3 });
    });

    it('should send approval reminders for all markets for Admin', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockAdminUser);

      service.sendApprovalReminders().subscribe(result => {
        expect(result.count).toBe(10);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/approval-reminders`);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({ count: 10 });
    });
  });

  describe('sendCriticalIssueNotification', () => {
    it('should send critical issue notification with high priority', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue(mockCMUser);

      service.sendCriticalIssueNotification(
        'Critical Issue',
        'System failure detected',
        'Market-A',
        { severity: 'high' }
      ).subscribe(result => {
        expect(result.priority).toBe(NotificationPriority.Critical);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.priority).toBe(NotificationPriority.Critical);
      expect(req.request.body.channels).toContain(NotificationChannel.Email);
      expect(req.request.body.channels).toContain(NotificationChannel.SMS);
      req.flush({ ...mockNotification, priority: NotificationPriority.Critical });
    });
  });
});
