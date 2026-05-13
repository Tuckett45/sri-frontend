import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ArkNotificationService } from './ark-notification.service';
import { AuthService } from '../auth.service';
import { RoleBasedDataService } from '../role-based-data.service';
import {
  ArkNotificationType,
  ArkNotificationPriority,
  ArkNotificationStatus,
  ArkNotificationChannel
} from '../../models/ark/notification.model';
import { environment } from '../../../environments/environments';

describe('ArkNotificationService', () => {
  let service: ArkNotificationService;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRoleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;

  const apiUrl = `${environment.apiUrl}/api/ark/notifications`;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'isCM',
      'getUser'
    ]);

    mockRoleBasedDataService = jasmine.createSpyObj('RoleBasedDataService', [
      'filterByMarket'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ArkNotificationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoleBasedDataService, useValue: mockRoleBasedDataService }
      ]
    });

    service = TestBed.inject(ArkNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateNotificationType', () => {
    it('should validate valid ARK notification types', () => {
      expect(service.validateNotificationType(ArkNotificationType.ApprovalReminder)).toBe(true);
      expect(service.validateNotificationType(ArkNotificationType.CriticalIssue)).toBe(true);
      expect(service.validateNotificationType(ArkNotificationType.Broadcast)).toBe(true);
      expect(service.validateNotificationType(ArkNotificationType.WorkflowUpdate)).toBe(true);
      expect(service.validateNotificationType(ArkNotificationType.JobAssigned)).toBe(true);
      expect(service.validateNotificationType(ArkNotificationType.JobReassigned)).toBe(true);
    });

    it('should throw error for invalid ARK notification type', () => {
      expect(() => service.validateNotificationType('invalid_type')).toThrowError(
        'Invalid ARK notification type: invalid_type. Type does not match ARK domain.'
      );
    });

    it('should throw error for ATLAS notification types', () => {
      expect(() => service.validateNotificationType('deployment_created')).toThrowError(
        'Invalid ARK notification type: deployment_created. Type does not match ARK domain.'
      );
      expect(() => service.validateNotificationType('connectivity_alert')).toThrowError(
        'Invalid ARK notification type: connectivity_alert. Type does not match ARK domain.'
      );
    });
  });

  describe('sendNotification', () => {
    it('should send notification for Admin user', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      const notification = {
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        type: ArkNotificationType.WorkflowUpdate,
        priority: ArkNotificationPriority.Normal
      };

      service.sendNotification(notification).subscribe(result => {
        expect(result.id).toBe('notif-1');
        expect(result.title).toBe('Test Notification');
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 'notif-1',
        ...notification,
        status: ArkNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });

    it('should send notification for CM user with auto-assigned market', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      const notification = {
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        type: ArkNotificationType.JobAssigned
      };

      service.sendNotification(notification).subscribe(result => {
        expect(result.market).toBe('WEST');
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body.market).toBe('WEST');
      req.flush({
        id: 'notif-1',
        ...notification,
        market: 'WEST',
        status: ArkNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });

    it('should reject CM user sending notification to different market', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      const notification = {
        userId: 'user-1',
        market: 'EAST',
        title: 'Test Notification',
        message: 'Test message',
        type: ArkNotificationType.JobAssigned
      };

      service.sendNotification(notification).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('CM users can only send notifications within their market');
          done();
        }
      });
    });

    it('should reject notification with invalid type', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      const notification = {
        userId: 'user-1',
        title: 'Test Notification',
        message: 'Test message',
        type: 'deployment_created' as any // ATLAS type
      };

      service.sendNotification(notification).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Invalid ARK notification type');
          expect(error.message).toContain('deployment_created');
          done();
        }
      });
    });
  });

  describe('getNotificationsForUser', () => {
    it('should get all notifications for Admin user', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);

      service.getNotificationsForUser().subscribe(notifications => {
        expect(notifications.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 'notif-1',
          userId: 'user-1',
          market: 'WEST',
          title: 'Test 1',
          message: 'Message 1',
          type: ArkNotificationType.WorkflowUpdate,
          priority: ArkNotificationPriority.Normal,
          status: ArkNotificationStatus.Pending,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          market: 'EAST',
          title: 'Test 2',
          message: 'Message 2',
          type: ArkNotificationType.JobAssigned,
          priority: ArkNotificationPriority.Normal,
          status: ArkNotificationStatus.Pending,
          createdAt: new Date().toISOString()
        }
      ]);
    });

    it('should filter notifications by market for CM user', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      service.getNotificationsForUser().subscribe(notifications => {
        expect(notifications.length).toBe(1);
        expect(notifications[0].market).toBe('WEST');
        done();
      });

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('market'));
      expect(req.request.params.get('market')).toBe('WEST');
      req.flush([
        {
          id: 'notif-1',
          userId: 'cm-1',
          market: 'WEST',
          title: 'Test 1',
          message: 'Message 1',
          type: ArkNotificationType.JobAssigned,
          priority: ArkNotificationPriority.Normal,
          status: ArkNotificationStatus.Pending,
          createdAt: new Date().toISOString()
        }
      ]);
    });
  });

  describe('getNotificationById', () => {
    it('should get notification by ID for Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);

      service.getNotificationById('notif-1').subscribe(notification => {
        expect(notification.id).toBe('notif-1');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/notif-1`);
      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        market: 'WEST',
        title: 'Test',
        message: 'Message',
        type: ArkNotificationType.WorkflowUpdate,
        priority: ArkNotificationPriority.Normal,
        status: ArkNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });

    it('should reject CM user accessing notification from different market', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      service.getNotificationById('notif-1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Access denied to notification from different market');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/notif-1`);
      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        market: 'EAST',
        title: 'Test',
        message: 'Message',
        type: ArkNotificationType.WorkflowUpdate,
        priority: ArkNotificationPriority.Normal,
        status: ArkNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', (done) => {
      service.markAsRead('notif-1').subscribe(notification => {
        expect(notification.status).toBe(ArkNotificationStatus.Read);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/notif-1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test',
        message: 'Message',
        type: ArkNotificationType.WorkflowUpdate,
        priority: ArkNotificationPriority.Normal,
        status: ArkNotificationStatus.Read,
        createdAt: new Date().toISOString(),
        readAt: new Date().toISOString()
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for CM user with market filter', (done) => {
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      service.markAllAsRead().subscribe(result => {
        expect(result.count).toBe(5);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url === `${apiUrl}/mark-all-read` && 
        req.params.has('market')
      );
      expect(req.request.params.get('market')).toBe('WEST');
      req.flush({ count: 5 });
    });
  });

  describe('sendBroadcast', () => {
    it('should send broadcast notification for Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      const broadcast = {
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        type: ArkNotificationType.Broadcast,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp]
      };

      service.sendBroadcast(broadcast).subscribe(result => {
        expect(result.id).toBe('broadcast-1');
        expect(result.createdBy).toBe('admin-1');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/broadcast`);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 'broadcast-1',
        ...broadcast,
        createdBy: 'admin-1',
        createdAt: new Date().toISOString()
      });
    });

    it('should reject broadcast for non-Admin user', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);

      const broadcast = {
        title: 'Test',
        message: 'Test',
        type: ArkNotificationType.Broadcast
      };

      service.sendBroadcast(broadcast).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can send broadcast notifications');
          done();
        }
      });
    });
  });

  describe('getNotificationLogs', () => {
    it('should get notification logs for Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);

      service.getNotificationLogs().subscribe(logs => {
        expect(logs.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/logs`);
      req.flush([
        {
          id: 'log-1',
          notificationId: 'notif-1',
          userId: 'user-1',
          channel: ArkNotificationChannel.Email,
          status: ArkNotificationStatus.Sent,
          sentAt: new Date().toISOString()
        },
        {
          id: 'log-2',
          notificationId: 'notif-2',
          userId: 'user-2',
          channel: ArkNotificationChannel.InApp,
          status: ArkNotificationStatus.Delivered,
          sentAt: new Date().toISOString()
        }
      ]);
    });

    it('should reject logs access for non-Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);

      service.getNotificationLogs().subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can access notification logs');
          done();
        }
      });
    });
  });

  describe('configureNotificationTemplates', () => {
    it('should create new template for Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      const template = {
        name: 'Job Assigned Template',
        type: ArkNotificationType.JobAssigned,
        subject: 'New Job Assigned',
        bodyTemplate: 'You have been assigned job {{jobId}}',
        channels: [ArkNotificationChannel.Email],
        priority: ArkNotificationPriority.Normal,
        variables: ['jobId'],
        isActive: true
      };

      service.configureNotificationTemplates(template as any).subscribe(result => {
        expect(result.id).toBe('template-1');
        expect(result.createdBy).toBe('admin-1');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/templates`);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 'template-1',
        ...template,
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    it('should reject template configuration for non-Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);

      const template = {
        name: 'Test Template',
        type: ArkNotificationType.WorkflowUpdate
      };

      service.configureNotificationTemplates(template as any).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Only Admin users can configure notification templates');
          done();
        }
      });
    });
  });

  describe('sendApprovalReminders', () => {
    it('should send approval reminders for Admin', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      service.sendApprovalReminders().subscribe(result => {
        expect(result.count).toBe(3);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/approval-reminders`);
      expect(req.request.method).toBe('POST');
      req.flush({ count: 3 });
    });

    it('should send approval reminders for CM user with market filter', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.isCM.and.returnValue(true);
      mockAuthService.getUser.and.returnValue({ 
        id: 'cm-1', 
        role: 'CM', 
        market: 'WEST' 
      });

      service.sendApprovalReminders().subscribe(result => {
        expect(result.count).toBe(2);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url === `${apiUrl}/approval-reminders` && 
        req.params.has('market')
      );
      expect(req.request.params.get('market')).toBe('WEST');
      req.flush({ count: 2 });
    });
  });

  describe('sendCriticalIssueNotification', () => {
    it('should send critical issue notification with all channels', (done) => {
      mockAuthService.isAdmin.and.returnValue(true);
      mockAuthService.isCM.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'admin-1', role: 'Admin' });

      service.sendCriticalIssueNotification(
        'Critical System Error',
        'Database connection lost',
        undefined,
        { errorCode: 'DB_001' }
      ).subscribe(notification => {
        expect(notification.type).toBe(ArkNotificationType.CriticalIssue);
        expect(notification.priority).toBe(ArkNotificationPriority.Critical);
        expect(notification.channels).toContain(ArkNotificationChannel.Email);
        expect(notification.channels).toContain(ArkNotificationChannel.InApp);
        expect(notification.channels).toContain(ArkNotificationChannel.SMS);
        done();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body.type).toBe(ArkNotificationType.CriticalIssue);
      expect(req.request.body.priority).toBe(ArkNotificationPriority.Critical);
      req.flush({
        id: 'notif-1',
        userId: 'admin-1',
        title: 'Critical System Error',
        message: 'Database connection lost',
        type: ArkNotificationType.CriticalIssue,
        priority: ArkNotificationPriority.Critical,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp, ArkNotificationChannel.SMS],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        metadata: { errorCode: 'DB_001' }
      });
    });
  });

  describe('getNotificationPreferences', () => {
    it('should get preferences for current user', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'user-1', role: 'User' });

      service.getNotificationPreferences().subscribe(preferences => {
        expect(preferences.userId).toBe('user-1');
        expect(preferences.email).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/preferences/user-1`);
      req.flush({
        userId: 'user-1',
        email: true,
        inApp: true,
        sms: false,
        approvalReminders: true,
        escalationAlerts: true,
        dailyDigest: false
      });
    });

    it('should reject non-Admin user getting other user preferences', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'user-1', role: 'User' });

      service.getNotificationPreferences('user-2').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Users can only view their own notification preferences');
          done();
        }
      });
    });
  });

  describe('configureNotificationPreferences', () => {
    it('should update preferences for current user', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'user-1', role: 'User' });

      const preferences = {
        userId: 'user-1',
        email: true,
        inApp: true,
        sms: false,
        approvalReminders: true,
        escalationAlerts: false,
        dailyDigest: true
      };

      service.configureNotificationPreferences(preferences).subscribe(result => {
        expect(result.userId).toBe('user-1');
        expect(result.dailyDigest).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/preferences`);
      expect(req.request.method).toBe('PUT');
      req.flush(preferences);
    });

    it('should reject non-Admin user updating other user preferences', (done) => {
      mockAuthService.isAdmin.and.returnValue(false);
      mockAuthService.getUser.and.returnValue({ id: 'user-1', role: 'User' });

      const preferences = {
        userId: 'user-2',
        email: true,
        inApp: true,
        sms: false
      };

      service.configureNotificationPreferences(preferences as any).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Users can only update their own notification preferences');
          done();
        }
      });
    });
  });
});
