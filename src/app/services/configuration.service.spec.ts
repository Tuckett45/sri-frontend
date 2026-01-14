import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigurationService } from './configuration.service';
import { RuntimeConfiguration, ConfigurationErrorType } from '../models/configuration.model';
import { environment } from 'src/environments/environments';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let httpMock: HttpTestingController;

  const mockConfiguration: RuntimeConfiguration = {
    vapidPublicKey: 'BEl62iUVgUvxIlhRWpHrYI_2000_test_key_example_12345678901234567890',
    apiBaseUrl: 'https://api.example.com',
    apiSubscriptionKey: 'test-subscription-key',
    pushSubscriptionEndpoint: 'https://api.example.com/push-subscriptions',
    retryConfiguration: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    },
    notificationSettings: {
      permissionEducationEnabled: true,
      maxNotificationHistory: 50,
      defaultTimeouts: {
        'info': 5000,
        'warning': 8000,
        'error': 0,
        'success': 7000
      },
      supportedBrowsers: ['Chrome', 'Firefox', 'Edge']
    },
    version: '1.0.0',
    lastUpdated: '2024-01-09T12:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConfigurationService]
    });
    service = TestBed.inject(ConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with configuration from backend', async () => {
    const initPromise = service.initialize();

    // Expect request to primary endpoint
    const req = httpMock.expectOne(`${environment.apiUrl}/config/runtime`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConfiguration);

    await initPromise;

    expect(service.isConfigured()).toBe(true);
    expect(service.getCurrentConfig()).toEqual(mockConfiguration);
  });

  it('should use fallback configuration when backend fails', async () => {
    const initPromise = service.initialize();

    // Mock all endpoints to fail
    const endpoints = [
      `${environment.apiUrl}/config/runtime`,
      `${environment.apiUrl}/configuration/runtime`,
      `${environment.apiUrl}/app/config`
    ];

    endpoints.forEach(endpoint => {
      const req = httpMock.expectOne(endpoint);
      req.error(new ErrorEvent('Network error'));
    });

    await initPromise;

    expect(service.isConfigured()).toBe(true);
    const config = service.getCurrentConfig();
    expect(config?.version).toBe('1.0.0-fallback');
    expect(config?.vapidPublicKey).toBe(''); // Empty in fallback
  });

  it('should validate configuration schema', async () => {
    const invalidConfig = {
      vapidPublicKey: 'test',
      // Missing required fields
    };

    const initPromise = service.initialize();

    const req = httpMock.expectOne(`${environment.apiUrl}/config/runtime`);
    req.flush(invalidConfig);

    // After validation fails, it will try other endpoints
    const req2 = httpMock.expectOne(`${environment.apiUrl}/configuration/runtime`);
    req2.error(new ErrorEvent('Network error'));
    
    const req3 = httpMock.expectOne(`${environment.apiUrl}/app/config`);
    req3.error(new ErrorEvent('Network error'));

    await initPromise;

    // Should fall back to default config due to validation failure
    expect(service.getCurrentConfig()?.version).toBe('1.0.0-fallback');
  });

  it('should cache configuration and reuse it', async () => {
    // First initialization
    let initPromise = service.initialize();
    let req = httpMock.expectOne(`${environment.apiUrl}/config/runtime`);
    req.flush(mockConfiguration);
    await initPromise;

    // Second call should use cache (no HTTP request)
    const config = service.getCurrentConfig();
    expect(config).toEqual(mockConfiguration);

    // No additional HTTP requests should be made
    httpMock.expectNone(`${environment.apiUrl}/config/runtime`);
  });

  it('should handle network errors gracefully', async () => {
    const initPromise = service.initialize();

    // Simulate network error on all endpoints
    const endpoints = [
      `${environment.apiUrl}/config/runtime`,
      `${environment.apiUrl}/configuration/runtime`, 
      `${environment.apiUrl}/app/config`
    ];

    endpoints.forEach(endpoint => {
      const req = httpMock.expectOne(endpoint);
      req.error(new ErrorEvent('Network error'));
    });

    await initPromise;

    service.getError().subscribe(error => {
      expect(error?.type).toBe(ConfigurationErrorType.NETWORK_ERROR);
      expect(error?.retryable).toBe(true);
    });
  });

  it('should refresh configuration when requested', async () => {
    // Initial setup
    let initPromise = service.initialize();
    let req = httpMock.expectOne(`${environment.apiUrl}/config/runtime`);
    req.flush(mockConfiguration);
    await initPromise;

    // Refresh should make new request
    const refreshPromise = service.refreshConfiguration();
    req = httpMock.expectOne(`${environment.apiUrl}/config/runtime`);
    
    const updatedConfig = { ...mockConfiguration, version: '1.1.0' };
    req.flush(updatedConfig);
    
    await refreshPromise;

    expect(service.getCurrentConfig()?.version).toBe('1.1.0');
  });
});