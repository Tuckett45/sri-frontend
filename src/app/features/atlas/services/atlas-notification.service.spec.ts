import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AtlasNotificationService } from './atlas-notification.service';
import { AtlasSignalRService } from './atlas-signalr.service';
import { AtlasAuthService } from './atlas-auth.service';
import { AtlasConfigService } from './atlas-config.service';
import {
  AtlasNotificationType,
  AtlasNotificationPriority,
  AtlasNotificationStatus,
  AtlasConnectivityAlertType,
  AtlasHealthSeverity
} from '../models/atlas-notification.model';
import { DeploymentDto, DeploymentType, LifecycleState } from '../models/deployment.model';
import { of } from 'rxjs';

describe('AtlasNotificationService', () => {
  let service: AtlasNotificationService;
  let httpMock: HttpTestingController;
  let mockSignalRService: jasmine.SpyObj<AtlasSignalRService>;
  let mockAuthService: jasmine.SpyObj<AtlasAuthService>;
  let mockConfigService: jasmine.SpyObj<AtlasConfigService>;
  let store: MockStore;

  const mockBaseUrl = 'https://api.atlas.test';

  beforeEach(() => {
    // Create mock services
    const mockStatus$ = of({
      state: 'Connected' as any,
      isConnected: true,
      lastConnected: new Date(),
      lastDisconnected: null,
      reconnectAttempts: 0,
      error: null
    });

    const mockConnectivityNotifications$ = of({
      type: 'info' as const,
      message: 'Connected to server'
    });

    mockSignalRService = jasmine.createSpyObj('AtlasSignalRService', [
      'isConnected',
      'subscribe',
      'unsubscribe'
    ], {
      status$: mockStatus$,
      connectivityNotifications$: mockConnectivityNotifications$
    });

    mockAuthService = jasmine.createSpyObj('AtlasAuthService', ['getAccessToken']);
    mockAuthService.getAccessToken.and.returnValue(Promise.resolve('mock-token'));

    mockConfigService = jasmine.createSpyObj('AtlasConfigService', ['getBaseUrl', 'isEnabled']);
    mockConfigService.getBaseUrl.and.returnValue(mockBaseUrl);
    mockConfigService.isEnabled.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AtlasNotificationService,
        { provide: AtlasSignalRService, useValue: mockSignalRService },
        { provide: AtlasAuthService, useValue: mockAuthService },
        { provide: AtlasConfigService, useValue: mockConfigService },
        provideMockStore()
      ]
    });

    service = TestBed.inject(AtlasNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateNotificationType', () => {
    it('should validate valid ATLAS notification types', () => {
      expect(service.validateNotificationType(AtlasNotificationType.DeploymentCreated)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.DeploymentUpdated)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.DeploymentStatusChanged)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.ConnectivityAlert)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.SystemHealthAlert)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.EvidenceSubmitted)).toBe(true);
      expect(service.validateNotificationType(AtlasNotificationType.ApprovalRequested)).toBe(true);
    });

    it('should throw error for invalid ATLAS notification type', () => {
      expect(() => service.validateNotificationType('invalid_type')).toThrowError(
        'Invalid ATLAS notification type: invalid_type. Type does not match ATLAS domain.'
      );
    });

    it('should throw error for ARK notification types', () => {
      expect(() => service.validateNotificationType('approval_reminder')).toThrowError(
        'Invalid ATLAS notification type: approval_reminder. Type does not match ATLAS domain.'
      );
      expect(() => service.validateNotificationType('job_assigned')).toThrowError(
        'Invalid ATLAS notification type: job_assigned. Type does not match ATLAS domain.'
      );
      expect(() => service.validateNotificationType('critical_issue')).toThrowError(
        'Invalid ATLAS notification type: critical_issue. Type does not match ATLAS domain.'
      );
    });
  });

  describe('sendDeploymentCreatedNotification', () => {
    it('should send deployment created notification', (done) => {
      const mockDeployment: DeploymentDto = {
        id: 'dep-123',
        title: 'Test Deployment',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSignalRService.isConnected.and.returnValue(false);

      service.sendDeploymentCreatedNotification(mockDeployment).subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.DeploymentCreated);
        expect(notification.title).toBe('Deployment Created');
        expect(notification.deploymentId).toBe('dep-123');
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.type).toBe(AtlasNotificationType.DeploymentCreated);

      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentCreated,
        title: 'Deployment Created',
        message: 'Deployment "Test Deployment" has been created',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        deploymentId: 'dep-123'
      });
    });
  });

  describe('sendDeploymentUpdatedNotification', () => {
    it('should send deployment updated notification', (done) => {
      const mockDeployment: DeploymentDto = {
        id: 'dep-123',
        title: 'Test Deployment',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSignalRService.isConnected.and.returnValue(false);

      service.sendDeploymentUpdatedNotification(mockDeployment).subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.DeploymentUpdated);
        expect(notification.title).toBe('Deployment Updated');
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      expect(req.request.method).toBe('POST');

      req.flush({
        id: 'notif-2',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentUpdated,
        title: 'Deployment Updated',
        message: 'Deployment "Test Deployment" has been updated',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        deploymentId: 'dep-123'
      });
    });
  });

  describe('sendDeploymentStatusChangedNotification', () => {
    it('should send deployment status changed notification with correct priority', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      service.sendDeploymentStatusChangedNotification('dep-123', 'DRAFT', 'FAILED').subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.DeploymentStatusChanged);
        expect(notification.priority).toBe(AtlasNotificationPriority.Critical);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.flush({
        id: 'notif-3',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentStatusChanged,
        title: 'Deployment Status Changed',
        message: 'Deployment status changed from DRAFT to FAILED',
        priority: AtlasNotificationPriority.Critical,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        deploymentId: 'dep-123'
      });
    });
  });

  describe('sendConnectivityAlert', () => {
    it('should send connectivity alert with correct priority', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      service.sendConnectivityAlert(
        AtlasConnectivityAlertType.ConnectionLost,
        'Connection to server lost'
      ).subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.ConnectivityAlert);
        expect(notification.priority).toBe(AtlasNotificationPriority.Critical);
        expect(notification.title).toBe('Connection Lost');
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.flush({
        id: 'notif-4',
        userId: 'user-1',
        type: AtlasNotificationType.ConnectivityAlert,
        title: 'Connection Lost',
        message: 'Connection to server lost',
        priority: AtlasNotificationPriority.Critical,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });
  });

  describe('sendSystemHealthAlert', () => {
    it('should send system health alert with correct priority', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      service.sendSystemHealthAlert(
        AtlasHealthSeverity.Critical,
        'System memory usage critical',
        { memoryUsage: 95 }
      ).subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.SystemHealthAlert);
        expect(notification.priority).toBe(AtlasNotificationPriority.Critical);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.flush({
        id: 'notif-5',
        userId: 'user-1',
        type: AtlasNotificationType.SystemHealthAlert,
        title: 'System Health Alert: Critical',
        message: 'System memory usage critical',
        priority: AtlasNotificationPriority.Critical,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });
  });

  describe('sendEvidenceSubmittedNotification', () => {
    it('should send evidence submitted notification', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      service.sendEvidenceSubmittedNotification('dep-123', 'TEST_RESULT').subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.EvidenceSubmitted);
        expect(notification.deploymentId).toBe('dep-123');
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.flush({
        id: 'notif-6',
        userId: 'user-1',
        type: AtlasNotificationType.EvidenceSubmitted,
        title: 'Evidence Submitted',
        message: 'New TEST_RESULT evidence has been submitted',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        deploymentId: 'dep-123'
      });
    });
  });

  describe('sendApprovalRequestedNotification', () => {
    it('should send approval requested notification with high priority', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      service.sendApprovalRequestedNotification('dep-123', ['user-2', 'user-3']).subscribe(notification => {
        expect(notification.type).toBe(AtlasNotificationType.ApprovalRequested);
        expect(notification.priority).toBe(AtlasNotificationPriority.High);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.flush({
        id: 'notif-7',
        userId: 'user-1',
        type: AtlasNotificationType.ApprovalRequested,
        title: 'Approval Requested',
        message: 'Your approval is requested for a deployment',
        priority: AtlasNotificationPriority.High,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString(),
        deploymentId: 'dep-123'
      });
    });
  });

  describe('getNotificationsForUser', () => {
    it('should get notifications with filters', (done) => {
      const filters = {
        type: AtlasNotificationType.DeploymentCreated,
        unreadOnly: true
      };

      service.getNotificationsForUser(filters).subscribe(notifications => {
        expect(notifications.length).toBe(2);
        expect(notifications[0].type).toBe(AtlasNotificationType.DeploymentCreated);
        done();
      });

      const req = httpMock.expectOne(
        req => req.url === `${mockBaseUrl}/api/atlas/notifications` && 
               req.params.has('type') && 
               req.params.has('unreadOnly')
      );
      expect(req.request.method).toBe('GET');

      req.flush([
        {
          id: 'notif-1',
          userId: 'user-1',
          type: AtlasNotificationType.DeploymentCreated,
          title: 'Test 1',
          message: 'Message 1',
          priority: AtlasNotificationPriority.Normal,
          status: AtlasNotificationStatus.Pending,
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: AtlasNotificationType.DeploymentCreated,
          title: 'Test 2',
          message: 'Message 2',
          priority: AtlasNotificationPriority.Normal,
          status: AtlasNotificationStatus.Pending,
          createdAt: new Date().toISOString()
        }
      ]);
    });

    it('should return empty array on error', (done) => {
      service.getNotificationsForUser().subscribe(notifications => {
        expect(notifications).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', (done) => {
      service.markAsRead('notif-1').subscribe(notification => {
        expect(notification.status).toBe(AtlasNotificationStatus.Read);
        expect(notification.readAt).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/notif-1/read`);
      expect(req.request.method).toBe('PUT');

      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentCreated,
        title: 'Test',
        message: 'Message',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Read,
        createdAt: new Date().toISOString(),
        readAt: new Date().toISOString()
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', (done) => {
      service.markAllAsRead().subscribe(result => {
        expect(result.count).toBe(5);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/read-all`);
      expect(req.request.method).toBe('PUT');

      req.flush({ count: 5 });
    });

    it('should return count 0 on error', (done) => {
      service.markAllAsRead().subscribe(result => {
        expect(result.count).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/read-all`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getNotificationPreferences', () => {
    it('should get notification preferences for current user', (done) => {
      service.getNotificationPreferences().subscribe(preferences => {
        expect(preferences.enabled).toBe(true);
        expect(preferences.deploymentNotifications).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/preferences`);
      expect(req.request.method).toBe('GET');

      req.flush({
        userId: 'user-1',
        enabled: true,
        deploymentNotifications: true,
        connectivityAlerts: true,
        systemHealthAlerts: true,
        evidenceNotifications: true,
        approvalNotifications: true,
        analysisNotifications: true,
        minimumPriority: AtlasNotificationPriority.Normal
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', (done) => {
      const preferences = {
        userId: 'user-1',
        enabled: true,
        deploymentNotifications: false,
        connectivityAlerts: true,
        systemHealthAlerts: true,
        evidenceNotifications: true,
        approvalNotifications: true,
        analysisNotifications: false,
        minimumPriority: AtlasNotificationPriority.High
      };

      service.updateNotificationPreferences(preferences).subscribe(updated => {
        expect(updated.deploymentNotifications).toBe(false);
        expect(updated.minimumPriority).toBe(AtlasNotificationPriority.High);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/preferences`);
      expect(req.request.method).toBe('PUT');

      req.flush(preferences);
    });
  });

  describe('subscribeToNotifications', () => {
    it('should subscribe to user notifications via SignalR', () => {
      mockSignalRService.subscribe.and.returnValue('sub-123');

      const subscriptionId = service.subscribeToNotifications('user-1');

      expect(subscriptionId).toBe('sub-123');
      expect(mockSignalRService.subscribe).toHaveBeenCalledWith(
        'UserNotifications_user-1',
        jasmine.any(Function)
      );
    });
  });

  describe('unsubscribeFromNotifications', () => {
    it('should unsubscribe from notifications', () => {
      mockSignalRService.subscribe.and.returnValue('sub-123');
      const subscriptionId = service.subscribeToNotifications('user-1');

      service.unsubscribeFromNotifications(subscriptionId);

      expect(mockSignalRService.unsubscribe).toHaveBeenCalledWith('sub-123');
    });
  });

  describe('SignalR integration', () => {
    it('should send notification via SignalR when connected', (done) => {
      mockSignalRService.isConnected.and.returnValue(true);

      const mockDeployment: DeploymentDto = {
        id: 'dep-123',
        title: 'Test',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.sendDeploymentCreatedNotification(mockDeployment).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/signalr`);
      expect(req.request.method).toBe('POST');

      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentCreated,
        title: 'Deployment Created',
        message: 'Test',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Delivered,
        createdAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString()
      });
    });

    it('should fallback to HTTP when SignalR fails', (done) => {
      mockSignalRService.isConnected.and.returnValue(true);

      const mockDeployment: DeploymentDto = {
        id: 'dep-123',
        title: 'Test',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.sendDeploymentCreatedNotification(mockDeployment).subscribe(() => {
        done();
      });

      // First request to SignalR endpoint fails
      const signalRReq = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications/signalr`);
      signalRReq.error(new ProgressEvent('error'));

      // Should fallback to HTTP endpoint
      const httpReq = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      httpReq.flush({
        id: 'notif-1',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentCreated,
        title: 'Deployment Created',
        message: 'Test',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });

    it('should send notification via HTTP when SignalR is disconnected', (done) => {
      mockSignalRService.isConnected.and.returnValue(false);

      const mockDeployment: DeploymentDto = {
        id: 'dep-123',
        title: 'Test',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.sendDeploymentCreatedNotification(mockDeployment).subscribe(() => {
        done();
      });

      // Should use HTTP endpoint directly when SignalR is disconnected
      const req = httpMock.expectOne(`${mockBaseUrl}/api/atlas/notifications`);
      expect(req.request.method).toBe('POST');

      req.flush({
        id: 'notif-1',
        userId: 'user-1',
        type: AtlasNotificationType.DeploymentCreated,
        title: 'Deployment Created',
        message: 'Test',
        priority: AtlasNotificationPriority.Normal,
        status: AtlasNotificationStatus.Pending,
        createdAt: new Date().toISOString()
      });
    });
  });

  describe('Connectivity event handling', () => {
    it('should handle connection lost events', (done) => {
      // Simulate connectivity notification from SignalR service
      const connectivityNotification$ = of({
        type: 'error' as const,
        message: 'Connection lost to server'
      });

      // Update the mock to emit the connectivity notification
      Object.defineProperty(mockSignalRService, 'connectivityNotifications$', {
        get: () => connectivityNotification$
      });

      // Create a new service instance to trigger the subscription
      const newService = new AtlasNotificationService(
        TestBed.inject(HttpClient),
        mockSignalRService,
        mockAuthService,
        mockConfigService,
        store
      );

      // The service should automatically send a connectivity alert
      setTimeout(() => {
        const req = httpMock.match(`${mockBaseUrl}/api/atlas/notifications`);
        if (req.length > 0) {
          expect(req[0].request.body.type).toBe(AtlasNotificationType.ConnectivityAlert);
          req[0].flush({
            id: 'notif-1',
            userId: 'user-1',
            type: AtlasNotificationType.ConnectivityAlert,
            title: 'Connection Lost',
            message: 'Connection lost to server',
            priority: AtlasNotificationPriority.Critical,
            status: AtlasNotificationStatus.Pending,
            createdAt: new Date().toISOString()
          });
        }
        done();
      }, 100);
    });

    it('should handle connection restored events', (done) => {
      const connectivityNotification$ = of({
        type: 'info' as const,
        message: 'Successfully connected to server'
      });

      Object.defineProperty(mockSignalRService, 'connectivityNotifications$', {
        get: () => connectivityNotification$
      });

      const newService = new AtlasNotificationService(
        TestBed.inject(HttpClient),
        mockSignalRService,
        mockAuthService,
        mockConfigService,
        store
      );

      setTimeout(() => {
        const req = httpMock.match(`${mockBaseUrl}/api/atlas/notifications`);
        if (req.length > 0) {
          expect(req[0].request.body.type).toBe(AtlasNotificationType.ConnectivityAlert);
          req[0].flush({
            id: 'notif-1',
            userId: 'user-1',
            type: AtlasNotificationType.ConnectivityAlert,
            title: 'Connection Restored',
            message: 'Successfully connected to server',
            priority: AtlasNotificationPriority.Normal,
            status: AtlasNotificationStatus.Pending,
            createdAt: new Date().toISOString()
          });
        }
        done();
      }, 100);
    });
  });
});
