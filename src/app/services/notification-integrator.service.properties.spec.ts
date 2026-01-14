import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import * as fc from 'fast-check';
import { 
  NotificationIntegratorService,
  NotificationPayload,
  NotificationDeliveryOptions
} from './notification-integrator.service';
import { DeploymentPushNotificationService } from '../features/deployment/services/deployment-push-notification.service';
import { FeatureFlagService } from './feature-flag.service';
import { ConfigurationService } from './configuration.service';
import { RuntimeConfiguration } from '../models/configuration.model';

/**
 * Property-based tests for NotificationIntegratorService
 * Feature: magic-8-ball-notification-integration
 * 
 * These tests verify universal correctness properties across many generated inputs
 */
describe('NotificationIntegratorService - Property-Based Tests', () => {
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

  // Property test configuration - minimum 100 iterations
  const propertyTestConfig = { numRuns: 100 };

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
    mockPushService.showLocalNotification.and.returnValue(Promise.resolve());

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

  /**
   * Property 1: Feature Flag Enforcement
   * Feature: magic-8-ball-notification-integration, Property 1: Feature Flag Enforcement
   * 
   * For any Magic 8 Ball question asked when the 'notifications' feature flag is disabled,
   * no toast or push notifications should be sent regardless of user preferences.
   * 
   * Validates: Requirements 1.1
   */
  it('Property 1: Feature Flag Enforcement - no notifications when flag disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random notification payloads
        fc.record({
          type: fc.constantFrom('deployment', 'magic-8-ball', 'system'),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          message: fc.string({ minLength: 1, maxLength: 500 }),
          category: fc.option(fc.constantFrom('positive', 'negative', 'neutral', 'info', 'warning', 'error'), { nil: undefined })
        }),
        // Generate random notification options
        fc.record({
          showToast: fc.boolean(),
          sendPush: fc.boolean(),
          toastType: fc.option(fc.constantFrom('info', 'success', 'warning', 'error'), { nil: undefined }),
          toastTimeout: fc.option(fc.integer({ min: 0, max: 30000 }), { nil: undefined })
        }),
        async (payload: NotificationPayload, options: NotificationDeliveryOptions) => {
          // Setup: Disable feature flag
          const flagSignal = signal(false);
          mockFeatureFlags.flagEnabled.and.returnValue(flagSignal);
          
          // Reset mock call counts
          mockToastr.info.calls.reset();
          mockToastr.success.calls.reset();
          mockToastr.warning.calls.reset();
          mockToastr.error.calls.reset();
          mockPushService.showLocalNotification.calls.reset();

          // Act: Send notification
          const result = await service.sendNotification(payload, options);

          // Assert: No notifications should be sent
          expect(result.toastDelivered).toBe(false, 
            'Toast should not be delivered when feature flag is disabled');
          expect(result.pushDelivered).toBe(false, 
            'Push should not be delivered when feature flag is disabled');
          expect(result.success).toBe(true, 
            'Operation should succeed even when notifications are disabled');
          
          // Verify no toast methods were called
          expect(mockToastr.info).not.toHaveBeenCalled();
          expect(mockToastr.success).not.toHaveBeenCalled();
          expect(mockToastr.warning).not.toHaveBeenCalled();
          expect(mockToastr.error).not.toHaveBeenCalled();
          
          // Verify push notification was not called
          expect(mockPushService.showLocalNotification).not.toHaveBeenCalled();
        }
      ),
      propertyTestConfig
    );
  }, 30000); // 30 second timeout for property tests
});
