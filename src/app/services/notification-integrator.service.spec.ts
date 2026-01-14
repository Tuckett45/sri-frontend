import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, BehaviorSubject } from 'rxjs';
import { signal, Signal } from '@angular/core';
import { 
  NotificationIntegratorService,
  NotificationPayload,
  NotificationDeliveryOptions
} from './notification-integrator.service';
import { DeploymentPushNotificationService } from '../features/deployment/services/deployment-push-notification.service';
import { FeatureFlagService } from './feature-flag.service';
import { ConfigurationService } from './configuration.service';
import { RuntimeConfiguration } from '../models/configuration.model';

describe('NotificationIntegratorService', () => {
  let service: NotificationIntegratorService;
  let mockToastr: jasmine.SpyObj<ToastrService>;
  let mockPushService: jasmine.SpyObj<DeploymentPushNotificationService>;
  let mockFeatureFlags: jasmine.SpyObj<FeatureFlagService>;
  let mockConfigService: jasmine.SpyObj<ConfigurationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockConfig: RuntimeConfiguration = {
    vapidPublicKey: 'test-vapid-key',
    apiBaseUrl: 'https://api.test.com',
    apiSubscriptionKey: 'test-subscription-key',
    pushSubscriptionEndpoint: 'https://api.test.com/push-subscriptions',
    retryConfiguration: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    },
    notificationSettings: {
      permissionEducationEnabled: true,
      maxNotificationHistory: 50,
      defaultTimeouts: {
        info: 5000,
        success: 3000,
        warning: 7000,
        error: 10000
      },
      supportedBrowsers: ['Chrome', 'Firefox', 'Edge', 'Safari']
    },
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };

  beforeEach(() => {
    // Create mock services
    mockToastr = jasmine.createSpyObj('ToastrService', ['info', 'success', 'warning', 'error']);
    mockPushService = jasmine.createSpyObj('DeploymentPushNotificationService', [
      'showLocalNotification',
      'requestPermission',
      'isSupported'
    ]);
    mockFeatureFlags = jasmine.createSpyObj('FeatureFlagService', ['flagEnabled']);
    mockConfigService = jasmine.createSpyObj('ConfigurationService', ['getConfig']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Setup default mock behaviors
    mockPushService.isSupported.and.returnValue(true);
    Object.defineProperty(mockPushService, 'permission', {
      get: () => 'granted',
      configurable: true
    });
    mockConfigService.getConfig.and.returnValue(of(mockConfig));

    TestBed.configureTestingModule({
      providers: [
        NotificationIntegratorService,
        { provide: ToastrService, useValue: mockToastr },
        { provide: DeploymentPushNotificationService, useValue: mockPushService },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ConfigurationService, useValue: mockConfigService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(NotificationIntegratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('areNotificationsEnabled', () => {
    it('should return true when notifications feature flag is enabled', () => {
      const flagSignal = signal(true);
      mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);

      const result = service.areNotificationsEnabled();

      expect(result).toBe(true);
      expect(mockFeatureFlags.flagEnabled).toHaveBeenCalledWith('notifications');
    });

    it('should return false when notifications feature flag is disabled', () => {
      const flagSignal = signal(false);
      mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);

      const result = service.areNotificationsEnabled();

      expect(result).toBe(false);
    });
  });

  describe('sendNotification with feature flag disabled', () => {
    beforeEach(() => {
      const flagSignal = signal(false);
      mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);
    });

    it('should not send toast notification when feature flag is disabled', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(false);
      expect(result.pushDelivered).toBe(false);
      expect(result.success).toBe(true);
      expect(mockToastr.info).not.toHaveBeenCalled();
    });

    it('should not send push notification when feature flag is disabled', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(false);
      expect(result.pushDelivered).toBe(false);
      expect(result.success).toBe(true);
      expect(mockPushService.showLocalNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification with feature flag enabled', () => {
    beforeEach(() => {
      const flagSignal = signal(true);
      mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);
    });

    it('should send toast notification when showToast is true', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test Title',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false,
        toastType: 'info'
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(true);
      expect(result.pushDelivered).toBe(false);
      expect(result.success).toBe(true);
      expect(mockToastr.info).toHaveBeenCalledWith(
        'Test message',
        'Test Title',
        jasmine.objectContaining({
          closeButton: true,
          progressBar: true,
          positionClass: 'toast-top-right'
        })
      );
    });

    it('should send success toast when toastType is success', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Success',
        message: 'Success message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false,
        toastType: 'success'
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.success).toHaveBeenCalled();
    });

    it('should send warning toast when toastType is warning', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Warning',
        message: 'Warning message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false,
        toastType: 'warning'
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.warning).toHaveBeenCalled();
    });

    it('should send error toast when toastType is error', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Error',
        message: 'Error message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false,
        toastType: 'error'
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.error).toHaveBeenCalled();
    });

    it('should use category-based timeout for positive category', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message',
        category: 'positive'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.info).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.objectContaining({ timeOut: 6000 })
      );
    });

    it('should use category-based timeout for negative category', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message',
        category: 'negative'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.info).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.objectContaining({ timeOut: 8000 })
      );
    });

    it('should use category-based timeout for neutral category', async () => {
      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message',
        category: 'neutral'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false
      };

      await service.sendNotification(payload, options);

      expect(mockToastr.info).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.objectContaining({ timeOut: 5000 })
      );
    });

    it('should send push notification when sendPush is true', async () => {
      mockPushService.showLocalNotification.and.returnValue(Promise.resolve());

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test Title',
        message: 'Test message',
        metadata: { question: 'Test?', answer: 'Yes' }
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(false);
      expect(result.pushDelivered).toBe(true);
      expect(result.success).toBe(true);
      expect(mockPushService.showLocalNotification).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Test Title',
          body: 'Test message',
          tag: 'magic-8-ball'
        })
      );
    });

    it('should send both toast and push when both are enabled', async () => {
      mockPushService.showLocalNotification.and.returnValue(Promise.resolve());

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(true);
      expect(result.pushDelivered).toBe(true);
      expect(result.success).toBe(true);
      expect(mockToastr.info).toHaveBeenCalled();
      expect(mockPushService.showLocalNotification).toHaveBeenCalled();
    });

    it('should include icons, badges, and actions in push notification payload', async () => {
      mockPushService.showLocalNotification.and.returnValue(Promise.resolve());

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Magic 8 Ball',
        message: 'Your answer awaits',
        metadata: {
          question: 'Will this work?',
          answer: 'Yes',
          category: 'positive',
          timestamp: '2026-01-14T12:00:00Z'
        },
        actions: [
          {
            action: 'ask-again',
            title: 'Ask Again',
            icon: '/assets/icons/refresh.png'
          }
        ]
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true,
        pushIcon: '/assets/icons/magic-8-ball.png',
        pushBadge: '/assets/icons/magic-8-ball-badge.png',
        pushTag: 'magic-8-ball'
      };

      const result = await service.sendNotification(payload, options);

      expect(result.pushDelivered).toBe(true);
      expect(result.success).toBe(true);
      expect(mockPushService.showLocalNotification).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Magic 8 Ball',
          body: 'Your answer awaits',
          icon: '/assets/icons/magic-8-ball.png',
          badge: '/assets/icons/magic-8-ball-badge.png',
          tag: 'magic-8-ball',
          requireInteraction: false,
          data: jasmine.objectContaining({
            type: 'magic-8-ball',
            question: 'Will this work?',
            answer: 'Yes',
            category: 'positive',
            timestamp: '2026-01-14T12:00:00Z'
          }),
          actions: [
            {
              action: 'ask-again',
              title: 'Ask Again',
              icon: '/assets/icons/refresh.png'
            }
          ]
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      const flagSignal = signal(true);
      mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);
    });

    it('should handle toast notification failure gracefully', async () => {
      mockToastr.info.and.throwError('Toast failed');

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: false
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(false);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].channel).toBe('toast');
      expect(result.errors[0].recoverable).toBe(true);
    });

    it('should handle push notification failure gracefully', async () => {
      mockPushService.showLocalNotification.and.returnValue(
        Promise.reject(new Error('Push failed'))
      );

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.pushDelivered).toBe(false);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].channel).toBe('push');
      expect(result.errors[0].recoverable).toBe(true);
    });

    it('should continue with push if toast fails', async () => {
      mockToastr.info.and.throwError('Toast failed');
      mockPushService.showLocalNotification.and.returnValue(Promise.resolve());

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(false);
      expect(result.pushDelivered).toBe(true);
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(1);
    });

    it('should continue with toast if push fails', async () => {
      mockPushService.showLocalNotification.and.returnValue(
        Promise.reject(new Error('Push failed'))
      );

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: true,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.toastDelivered).toBe(true);
      expect(result.pushDelivered).toBe(false);
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(1);
    });

    it('should handle push notification when not supported', async () => {
      mockPushService.isSupported.and.returnValue(false);

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.pushDelivered).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error.message).toContain('not supported');
    });

    it('should handle push notification when permission not granted', async () => {
      Object.defineProperty(mockPushService, 'permission', {
        get: () => 'denied',
        configurable: true
      });

      const payload: NotificationPayload = {
        type: 'magic-8-ball',
        title: 'Test',
        message: 'Test message'
      };
      const options: NotificationDeliveryOptions = {
        showToast: false,
        sendPush: true
      };

      const result = await service.sendNotification(payload, options);

      expect(result.pushDelivered).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error.message).toContain('permission not granted');
    });
  });

  describe('getNotificationConfig', () => {
    it('should return configuration from ConfigurationService', (done) => {
      service.getNotificationConfig().subscribe(config => {
        expect(config).toEqual(mockConfig);
        expect(mockConfigService.getConfig).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('requestPermissions', () => {
    it('should request permissions from push service', async () => {
      mockPushService.requestPermission.and.returnValue(Promise.resolve('granted'));

      const result = await service.requestPermissions();

      expect(result).toBe('granted');
      expect(mockPushService.requestPermission).toHaveBeenCalled();
    });

    it('should handle permission request failure', async () => {
      mockPushService.requestPermission.and.returnValue(
        Promise.reject(new Error('Permission denied'))
      );

      await expectAsync(service.requestPermissions()).toBeRejectedWithError('Permission denied');
    });
  });
});
