import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorInterceptor } from './error.interceptor';
import { ErrorContextService } from '../services/error-context.service';
import { PIIProtectionService } from '../services/pii-protection.service';

describe('ErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let errorContextSpy: jasmine.SpyObj<ErrorContextService>;
  let piiSpy: jasmine.SpyObj<PIIProtectionService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/test' });
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    errorContextSpy = jasmine.createSpyObj('ErrorContextService', ['createHttpContext', 'logError']);
    errorContextSpy.createHttpContext.and.returnValue({
      correlationId: 'test-id',
      userId: null,
      sessionId: 'test-session',
      featureArea: 'general',
      operation: 'GET',
      timestamp: new Date()
    } as any);
    piiSpy = jasmine.createSpyObj('PIIProtectionService', ['maskObjectPII']);
    piiSpy.maskObjectPII.and.callFake((obj: any) => obj);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ErrorContextService, useValue: errorContextSpy },
        { provide: PIIProtectionService, useValue: piiSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Non-retryable error tests (no retry delay to worry about) ---

  it('should handle 400 Bad Request with invalid input message', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 400'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(400);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Invalid request. Please check your input and try again.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
  });

  it('should handle 401 Unauthorized and redirect to login with returnUrl', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 401'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Your session has expired. Please log in again.',
          'Dismiss',
          jasmine.any(Object)
        );
        expect(routerSpy.navigate).toHaveBeenCalledWith(
          ['/login'],
          jasmine.objectContaining({ queryParams: { returnUrl: '/test' } })
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 403 Forbidden with access-denied message', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 403'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(403);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Access denied. You do not have permission to perform this action.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('should handle 404 Not Found with resource-not-found message', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 404'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(404);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Resource not found. The requested item may have been deleted.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 409 Conflict with conflict-detected message and resolution guidance', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 409'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(409);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          jasmine.stringMatching(/conflict/i),
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'A conflict occurred. The resource may have been modified by another user. Please refresh and try again.' },
      { status: 409, statusText: 'Conflict' });
  });

  it('should handle 409 Conflict with server-provided message', (done) => {
    httpClient.get('/api/scheduling/assign').subscribe({
      next: () => fail('should have failed with 409'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(409);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Scheduling conflict: technician already assigned to another job at this time.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    const req = httpMock.expectOne('/api/scheduling/assign');
    req.flush({ message: 'Scheduling conflict: technician already assigned to another job at this time.' },
      { status: 409, statusText: 'Conflict' });
  });

  it('should not retry non-retryable errors (e.g. 404)', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 404'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(404);
        done();
      }
    });

    // Should only make one request (no retries for 404)
    const req = httpMock.expectOne('/api/test');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should pass through successful requests', (done) => {
    const testData = { message: 'success' };

    httpClient.get('/api/test').subscribe({
      next: (data) => {
        expect(data).toEqual(testData);
        done();
      },
      error: () => fail('should not have failed')
    });

    const req = httpMock.expectOne('/api/test');
    req.flush(testData);
  });

  // --- Retryable error tests (use fakeAsync to handle retry delays) ---

  it('should handle 500 Internal Server Error with retry suggestion', fakeAsync(() => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 500'),
      error: (error: HttpErrorResponse) => { receivedError = error; }
    });

    // Initial request
    httpMock.expectOne('/api/test').flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    // Retry 1 (delay: 1000ms)
    tick(1000);
    httpMock.expectOne('/api/test').flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    // Retry 2 (delay: 2000ms)
    tick(2000);
    httpMock.expectOne('/api/test').flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(receivedError).toBeTruthy();
    expect(receivedError!.status).toBe(500);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Server error. Please try again later.',
      'Dismiss',
      jasmine.any(Object)
    );
  }));

  it('should handle 502 Bad Gateway error', fakeAsync(() => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 502'),
      error: (error: HttpErrorResponse) => { receivedError = error; }
    });

    httpMock.expectOne('/api/test').flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    tick(1000);
    httpMock.expectOne('/api/test').flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    tick(2000);
    httpMock.expectOne('/api/test').flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(receivedError).toBeTruthy();
    expect(receivedError!.status).toBe(502);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Bad gateway. The server is temporarily unavailable.',
      'Dismiss',
      jasmine.any(Object)
    );
  }));

  it('should handle 503 Service Unavailable error', fakeAsync(() => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 503'),
      error: (error: HttpErrorResponse) => { receivedError = error; }
    });

    httpMock.expectOne('/api/test').flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    tick(1000);
    httpMock.expectOne('/api/test').flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    tick(2000);
    httpMock.expectOne('/api/test').flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError).toBeTruthy();
    expect(receivedError!.status).toBe(503);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Service unavailable. Please try again later.',
      'Dismiss',
      jasmine.any(Object)
    );
  }));

  it('should handle 504 Gateway Timeout error', fakeAsync(() => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with 504'),
      error: (error: HttpErrorResponse) => { receivedError = error; }
    });

    httpMock.expectOne('/api/test').flush('Gateway Timeout', { status: 504, statusText: 'Gateway Timeout' });
    tick(1000);
    httpMock.expectOne('/api/test').flush('Gateway Timeout', { status: 504, statusText: 'Gateway Timeout' });
    tick(2000);
    httpMock.expectOne('/api/test').flush('Gateway Timeout', { status: 504, statusText: 'Gateway Timeout' });

    expect(receivedError).toBeTruthy();
    expect(receivedError!.status).toBe(504);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Gateway timeout. The server took too long to respond.',
      'Dismiss',
      jasmine.any(Object)
    );
  }));

  it('should handle network error (status 0)', fakeAsync(() => {
    let receivedError: HttpErrorResponse | null = null;

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed with network error'),
      error: (error: HttpErrorResponse) => { receivedError = error; }
    });

    httpMock.expectOne('/api/test').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    tick(1000);
    httpMock.expectOne('/api/test').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    tick(2000);
    httpMock.expectOne('/api/test').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(receivedError).toBeTruthy();
    expect(receivedError!.status).toBe(0);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Unable to connect to the server. Please check your internet connection.',
      'Dismiss',
      jasmine.any(Object)
    );
  }));

  it('should succeed on retry if server recovers', fakeAsync(() => {
    let result: any = null;

    httpClient.get('/api/test').subscribe({
      next: (data) => { result = data; },
      error: () => fail('should have succeeded on retry')
    });

    // First request fails with 500
    httpMock.expectOne('/api/test').flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    // Retry 1 succeeds
    tick(1000);
    httpMock.expectOne('/api/test').flush({ message: 'recovered' });

    expect(result).toEqual({ message: 'recovered' });
  }));
});
