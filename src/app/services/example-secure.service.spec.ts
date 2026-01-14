import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExampleSecureService } from './example-secure.service';
import { ConfigurationService } from './configuration.service';
import { of } from 'rxjs';

describe('ExampleSecureService', () => {
  let service: ExampleSecureService;
  let httpMock: HttpTestingController;
  let configServiceSpy: jasmine.SpyObj<ConfigurationService>;

  const mockConfig = {
    apiBaseUrl: 'https://api.test.com',
    apiSubscriptionKey: 'test-subscription-key',
    vapidPublicKey: 'test-key',
    pushSubscriptionEndpoint: 'https://api.test.com/push',
    retryConfiguration: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    },
    notificationSettings: {
      permissionEducationEnabled: true,
      maxNotificationHistory: 50,
      defaultTimeouts: { info: 5000, warning: 8000, error: 0, success: 7000 },
      supportedBrowsers: ['Chrome', 'Firefox']
    },
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };

  beforeEach(() => {
    const configSpy = jasmine.createSpyObj('ConfigurationService', ['getCurrentConfig']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ExampleSecureService,
        { provide: ConfigurationService, useValue: configSpy }
      ]
    });

    service = TestBed.inject(ExampleSecureService);
    httpMock = TestBed.inject(HttpTestingController);
    configServiceSpy = TestBed.inject(ConfigurationService) as jasmine.SpyObj<ConfigurationService>;

    // Default mock setup
    configServiceSpy.getCurrentConfig.and.returnValue(mockConfig);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should make GET request to configured API URL', () => {
    const mockResponse = { data: 'test' };

    service.getData().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('https://api.test.com/data');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse);
  });

  it('should make POST request with data', () => {
    const testData = { name: 'test', value: 123 };
    const mockResponse = { success: true };

    service.postData(testData).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('https://api.test.com/data');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(testData);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse);
  });

  it('should handle file upload without Content-Type header', () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');
    const mockResponse = { uploaded: true };

    service.uploadFile(formData).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('https://api.test.com/upload');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(formData);
    // Should not have Content-Type header for file uploads
    expect(req.request.headers.has('Content-Type')).toBeFalse();
    req.flush(mockResponse);
  });

  it('should use fallback URL when config is not available', () => {
    configServiceSpy.getCurrentConfig.and.returnValue(null);
    const mockResponse = { data: 'fallback' };

    service.getData().subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('https://fallback-api.com/data');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});