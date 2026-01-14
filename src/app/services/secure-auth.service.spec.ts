import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { SecureAuthService } from './secure-auth.service';
import { ConfigurationService } from './configuration.service';
import { LoginModel } from '../models/login-model.model';
import { User } from '../models/user.model';
import { AuthMethod, AuthErrorType } from '../models/auth.model';

describe('SecureAuthService', () => {
  let service: SecureAuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let configServiceSpy: jasmine.SpyObj<ConfigurationService>;

  const mockUser: User = new User(
    '123',
    'Test User',
    'test@example.com',
    '', // password not stored
    'Admin',
    'Test Market',
    'Test Company',
    new Date(),
    true
  );

  const mockLoginResponse = {
    user: mockUser,
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
    sessionId: 'mock-session-id'
  };

  beforeEach(() => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const configSpyObj = jasmine.createSpyObj('ConfigurationService', ['getConfig', 'getCurrentConfig']);
    
    // Mock configuration service
    configSpyObj.getConfig.and.returnValue(of({
      apiBaseUrl: 'https://api.test.com',
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
    }));

    configSpyObj.getCurrentConfig.and.returnValue({
      apiBaseUrl: 'https://api.test.com',
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
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SecureAuthService,
        { provide: Router, useValue: routerSpyObj },
        { provide: ConfigurationService, useValue: configSpyObj }
      ]
    });

    service = TestBed.inject(SecureAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    configServiceSpy = TestBed.inject(ConfigurationService) as jasmine.SpyObj<ConfigurationService>;

    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should perform secure login successfully', async () => {
    const credentials = new LoginModel('test@example.com', 'password');
    
    // Start login process
    const loginPromise = service.secureLogin(credentials);

    // Expect HTTP request
    const req = httpMock.expectOne('https://api.test.com/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    expect(req.request.withCredentials).toBe(true);

    // Respond with mock data
    req.flush(mockLoginResponse);

    // Wait for login to complete
    const result = await loginPromise;

    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(result.token).toBe('mock-jwt-token');
    expect(localStorage.getItem('loggedIn')).toBe('true');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('should handle login failure gracefully', async () => {
    const credentials = new LoginModel('test@example.com', 'wrongpassword');
    
    const loginPromise = service.secureLogin(credentials);

    const req = httpMock.expectOne('https://api.test.com/auth/login');
    req.error(new ErrorEvent('Unauthorized'), { status: 401, statusText: 'Unauthorized' });

    const result = await loginPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(localStorage.getItem('loggedIn')).toBeNull();
  });

  it('should perform secure logout', async () => {
    // Set up authenticated state
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(mockUser));

    await service.logout();

    expect(localStorage.getItem('loggedIn')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should validate token expiration', async () => {
    // Mock authenticated state with valid token
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    service['authState$'].next({
      isAuthenticated: true,
      user: mockUser,
      tokenExpiresAt: futureDate,
      lastValidated: new Date(),
      sessionId: 'test-session',
      authMethod: AuthMethod.MEMORY_ONLY
    });

    const isValid = await service.validateTokenExpiration();
    expect(isValid).toBe(true);
  });

  it('should handle expired tokens', async () => {
    // Mock authenticated state with expired token
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    service['authState$'].next({
      isAuthenticated: true,
      user: mockUser,
      tokenExpiresAt: pastDate,
      lastValidated: new Date(),
      sessionId: 'test-session',
      authMethod: AuthMethod.MEMORY_ONLY
    });

    const isValid = await service.validateTokenExpiration();
    expect(isValid).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should provide authentication headers', (done) => {
    // Set up authenticated state
    service['authState$'].next({
      isAuthenticated: true,
      user: mockUser,
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      lastValidated: new Date(),
      sessionId: 'test-session',
      authMethod: AuthMethod.MEMORY_ONLY
    });

    // Set memory token
    service['memoryOnlyToken'] = 'test-token';

    service.getAuthHeaders().subscribe(headers => {
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('X-Session-ID')).toBe('test-session');
      done();
    });
  });

  it('should determine best authentication method', () => {
    // This is a private method, so we'll test it indirectly through initialization
    expect(service).toBeTruthy();
    
    // The service should initialize with a valid auth method
    service.getAuthState().subscribe(state => {
      expect(Object.values(AuthMethod)).toContain(state.authMethod);
    });
  });

  it('should maintain backward compatibility with parent class', () => {
    const credentials = new LoginModel('test@example.com', 'password');
    
    // Test that the Observable interface still works
    const loginObservable = service.login(credentials);
    expect(loginObservable.subscribe).toBeDefined();

    // Clean up the subscription
    const subscription = loginObservable.subscribe();
    
    // Mock the HTTP request to prevent hanging
    const req = httpMock.expectOne('https://api.test.com/auth/login');
    req.flush(mockLoginResponse);
    
    subscription.unsubscribe();
  });
});