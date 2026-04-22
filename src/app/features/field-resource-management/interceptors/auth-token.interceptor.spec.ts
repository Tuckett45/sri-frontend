import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthTokenInterceptor } from './auth-token.interceptor';
import { AuthTokenService } from '../services/auth-token.service';

describe('AuthTokenInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authTokenService: AuthTokenService;
  let router: Router;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/test' });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthTokenService,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthTokenInterceptor,
          multi: true
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authTokenService = TestBed.inject(AuthTokenService);
    router = TestBed.inject(Router);

    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token, undefined, 3600);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('should not add Authorization header when no token', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip token for login endpoint', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token);

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip token for public endpoints', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token);

    httpClient.get('/api/public/data').subscribe();

    const req = httpMock.expectOne('/api/public/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should redirect to login on 401 error', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token, undefined, 3600);

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed'),
      error: () => {
        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: '/test' }
        });
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should clear tokens on 401 error', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token, undefined, 3600);

    expect(authTokenService.hasToken()).toBe(true);

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed'),
      error: () => {
        expect(authTokenService.hasToken()).toBe(false);
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should not add token for expired token', () => {
    const token = 'test-token-123';
    authTokenService.setToken(token, undefined, -1); // Expired

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
