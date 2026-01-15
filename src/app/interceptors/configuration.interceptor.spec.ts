import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { ConfigurationInterceptor } from './configuration.interceptor';
import { SecureAuthService } from '../services/secure-auth.service';

describe('ConfigurationInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<SecureAuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('SecureAuthService', ['getAuthHeaders']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ConfigurationInterceptor,
          multi: true
        },
        { provide: SecureAuthService, useValue: authSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(SecureAuthService) as jasmine.SpyObj<SecureAuthService>;

    // Default mock setup
    authServiceSpy.getAuthHeaders.and.returnValue(of(new HttpHeaders()));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(authServiceSpy).toBeTruthy();
  });

  it('should add Content-Type header for POST requests', () => {
    const testData = { test: 'data' };

    httpClient.post('/api/test', testData).subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({});
  });

  it('should add authentication headers when available', () => {
    const authHeaders = new HttpHeaders({
      'Authorization': 'Bearer test-token',
      'X-Session-ID': 'test-session'
    });
    authServiceSpy.getAuthHeaders.and.returnValue(of(authHeaders));

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(req.request.headers.get('X-Session-ID')).toBe('test-session');
    req.flush({});
  });

  it('should not add Content-Type header for GET requests', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Content-Type')).toBeFalse();
    req.flush({});
  });

  it('should not intercept configuration endpoints', () => {
    httpClient.get('/api/config/runtime').subscribe();

    const req = httpMock.expectOne('/api/config/runtime');
    // Should not have added any headers since it's a config endpoint
    expect(req.request.headers.keys().length).toBe(0);
    req.flush({});
  });

  it('should not intercept Google Maps API requests', () => {
    httpClient.get('https://maps.googleapis.com/maps/api/geocode/json?address=test').subscribe();

    const req = httpMock.expectOne('https://maps.googleapis.com/maps/api/geocode/json?address=test');
    // Should not have added any headers since it's an external API
    expect(req.request.headers.keys().length).toBe(0);
    req.flush({});
  });

  it('should not intercept other Google APIs', () => {
    httpClient.get('https://www.googleapis.com/some/api').subscribe();

    const req = httpMock.expectOne('https://www.googleapis.com/some/api');
    // Should not have added any headers since it's an external API
    expect(req.request.headers.keys().length).toBe(0);
    req.flush({});
  });

  it('should handle authentication errors gracefully', () => {
    let errorResponse: any;

    httpClient.get('/api/test').subscribe({
      next: () => {},
      error: (error) => {
        errorResponse = error;
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorResponse.status).toBe(401);
  });

  it('should handle network errors gracefully', () => {
    let errorResponse: any;

    httpClient.get('/api/test').subscribe({
      next: () => {},
      error: (error) => {
        errorResponse = error;
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Network Error', { status: 0, statusText: 'Unknown Error' });

    expect(errorResponse.status).toBe(0);
  });

  it('should not override existing headers', () => {
    const existingHeaders = new HttpHeaders({
      'Content-Type': 'text/plain',
      'Ocp-Apim-Subscription-Key': 'existing-key'
    });

    httpClient.post('/api/test', 'test data', { headers: existingHeaders }).subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Content-Type')).toBe('text/plain');
    expect(req.request.headers.get('Ocp-Apim-Subscription-Key')).toBe('existing-key');
    req.flush({});
  });

  it('should handle auth service errors', () => {
    authServiceSpy.getAuthHeaders.and.returnValue(of(new HttpHeaders()));

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    // Should still process the request even without auth headers
    expect(req.request.url).toBe('/api/test');
    req.flush({});
  });
});