import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthorizationInterceptor } from './authorization.interceptor';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

describe('AuthorizationInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthorizationInterceptor,
          multi: true
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authorization headers', () => {
    it('should add role header when user has role', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.CM);
      req.flush({});
    });

    it('should add user ID header when user has ID', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.Admin,
        market: 'TestMarket'
      });

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-ID')).toBe('user-123');
      req.flush({});
    });

    it('should add market header when user has market', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'NorthMarket'
      });

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Market')).toBe('NorthMarket');
      req.flush({});
    });

    it('should add all authorization headers when user is complete', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.Admin,
        market: 'AllMarkets'
      });

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.Admin);
      expect(req.request.headers.get('X-User-ID')).toBe('admin-1');
      expect(req.request.headers.get('X-User-Market')).toBe('AllMarkets');
      req.flush({});
    });

    it('should not add headers when user is null', () => {
      // Arrange
      authService.getUser.and.returnValue(null);

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.has('X-User-Role')).toBeFalse();
      expect(req.request.headers.has('X-User-ID')).toBeFalse();
      expect(req.request.headers.has('X-User-Market')).toBeFalse();
      req.flush({});
    });

    it('should handle user with missing properties gracefully', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com'
      } as any);

      // Act
      httpClient.get('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-ID')).toBe('user-1');
      expect(req.request.headers.has('X-User-Role')).toBeFalse();
      expect(req.request.headers.has('X-User-Market')).toBeFalse();
      req.flush({});
    });
  });

  describe('403 Forbidden error handling', () => {
    beforeEach(() => {
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should handle 403 error and add user-friendly message', (done) => {
      // Act
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.status).toBe(403);
          expect(error.error.userFriendlyMessage).toBeDefined();
          expect(error.error.userFriendlyMessage).toContain('permission');
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/test');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should provide admin-specific message for admin endpoints', (done) => {
      // Act
      httpClient.get('/api/admin/users').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error.userFriendlyMessage).toContain('administrator privileges');
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/admin/users');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should provide user management message for user endpoints', (done) => {
      // Act
      httpClient.get('/api/user-management/create').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error.userFriendlyMessage).toContain('manage users');
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/user-management/create');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should provide config message for system configuration endpoints', (done) => {
      // Act
      httpClient.get('/api/system-configuration/update').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error.userFriendlyMessage).toContain('system configuration');
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/system-configuration/update');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should provide workflow message for workflow endpoints', (done) => {
      // Act
      httpClient.get('/api/workflow/approve').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error.userFriendlyMessage).toContain('workflow');
          expect(error.error.userFriendlyMessage).toContain('assigned market');
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/workflow/approve');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should use backend message when provided', (done) => {
      // Act
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed with 403'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.error.userFriendlyMessage).toBe('Custom backend message');
          done();
        }
      });

      // Trigger 403 error with custom message
      const req = httpMock.expectOne('/api/test');
      req.flush(
        { message: 'Custom backend message' },
        { status: 403, statusText: 'Forbidden' }
      );
    });

    it('should redirect to unauthorized page for admin endpoints', (done) => {
      // Act
      httpClient.get('/api/admin/config').subscribe({
        next: () => fail('Should have failed with 403'),
        error: () => {
          // Assert
          expect(router.navigate).toHaveBeenCalledWith(
            ['/unauthorized'],
            jasmine.objectContaining({
              queryParams: jasmine.objectContaining({
                returnUrl: '/api/admin/config',
                reason: 'insufficient_permissions'
              })
            })
          );
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/admin/config');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should redirect to unauthorized page for user management endpoints', (done) => {
      // Act
      httpClient.get('/api/user-management/list').subscribe({
        next: () => fail('Should have failed with 403'),
        error: () => {
          // Assert
          expect(router.navigate).toHaveBeenCalledWith(
            ['/unauthorized'],
            jasmine.objectContaining({
              queryParams: jasmine.objectContaining({
                returnUrl: '/api/user-management/list',
                reason: 'insufficient_permissions'
              })
            })
          );
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/user-management/list');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should not redirect for non-critical endpoints', (done) => {
      // Act
      httpClient.get('/api/workflow/list').subscribe({
        next: () => fail('Should have failed with 403'),
        error: () => {
          // Assert
          expect(router.navigate).not.toHaveBeenCalled();
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/workflow/list');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('401 Unauthorized error handling', () => {
    beforeEach(() => {
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should handle 401 error without modification', (done) => {
      // Arrange
      spyOn(console, 'warn');

      // Act
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed with 401'),
        error: (error: HttpErrorResponse) => {
          // Assert
          expect(error.status).toBe(401);
          expect(console.warn).toHaveBeenCalledWith(
            '🚨 Authentication failed',
            jasmine.any(Object)
          );
          done();
        }
      });

      // Trigger 401 error
      const req = httpMock.expectOne('/api/test');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Retry logic', () => {
    beforeEach(() => {
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should not retry authentication endpoints', (done) => {
      // Act
      httpClient.post('/api/auth/login', {}).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          done();
        }
      });

      // Should only make one request (no retry)
      const req = httpMock.expectOne('/api/auth/login');
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });

    it('should not retry register endpoint', (done) => {
      // Act
      httpClient.post('/api/auth/register', {}).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          done();
        }
      });

      // Should only make one request (no retry)
      const req = httpMock.expectOne('/api/auth/register');
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });

    it('should not retry logout endpoint', (done) => {
      // Act
      httpClient.post('/api/auth/logout', {}).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          done();
        }
      });

      // Should only make one request (no retry)
      const req = httpMock.expectOne('/api/auth/logout');
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });

    it('should not retry forgot-password endpoint', (done) => {
      // Act
      httpClient.post('/api/auth/forgot-password', {}).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          done();
        }
      });

      // Should only make one request (no retry)
      const req = httpMock.expectOne('/api/auth/forgot-password');
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });

    it('should not retry reset-password endpoint', (done) => {
      // Act
      httpClient.post('/api/auth/reset-password', {}).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          done();
        }
      });

      // Should only make one request (no retry)
      const req = httpMock.expectOne('/api/auth/reset-password');
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('Error logging', () => {
    beforeEach(() => {
      authService.getUser.and.returnValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should log authorization failure with user details', (done) => {
      // Arrange
      spyOn(console, 'error');

      // Act
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed with 403'),
        error: () => {
          // Assert
          expect(console.error).toHaveBeenCalledWith(
            '🚫 Authorization Failure:',
            jasmine.objectContaining({
              userId: 'user-123',
              userName: 'Test User',
              role: UserRole.CM,
              market: 'TestMarket',
              endpoint: '/api/test',
              method: 'GET',
              timestamp: jasmine.any(String),
              message: 'Authorization failed - insufficient permissions'
            })
          );
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/test');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle logging when user is null', (done) => {
      // Arrange
      authService.getUser.and.returnValue(null);
      spyOn(console, 'error');

      // Act
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed with 403'),
        error: () => {
          // Assert
          expect(console.error).toHaveBeenCalledWith(
            '🚫 Authorization Failure:',
            jasmine.objectContaining({
              userId: 'unknown',
              userName: 'unknown',
              role: 'unknown',
              market: 'unknown'
            })
          );
          done();
        }
      });

      // Trigger 403 error
      const req = httpMock.expectOne('/api/test');
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Different HTTP methods', () => {
    beforeEach(() => {
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should add headers to POST requests', () => {
      // Act
      httpClient.post('/api/test', { data: 'test' }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.CM);
      expect(req.request.headers.get('X-User-ID')).toBe('user-1');
      req.flush({});
    });

    it('should add headers to PUT requests', () => {
      // Act
      httpClient.put('/api/test', { data: 'test' }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.CM);
      expect(req.request.headers.get('X-User-ID')).toBe('user-1');
      req.flush({});
    });

    it('should add headers to DELETE requests', () => {
      // Act
      httpClient.delete('/api/test').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.CM);
      expect(req.request.headers.get('X-User-ID')).toBe('user-1');
      req.flush({});
    });

    it('should add headers to PATCH requests', () => {
      // Act
      httpClient.patch('/api/test', { data: 'test' }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('X-User-Role')).toBe(UserRole.CM);
      expect(req.request.headers.get('X-User-ID')).toBe('user-1');
      req.flush({});
    });
  });
});
