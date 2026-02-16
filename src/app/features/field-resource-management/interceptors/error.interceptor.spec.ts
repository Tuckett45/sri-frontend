import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorInterceptor } from './error.interceptor';

describe('ErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const routerMock = jasmine.createSpyObj('Router', ['navigate'], { url: '/test' });
    const snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorInterceptor,
          multi: true
        },
        { provide: Router, useValue: routerMock },
        { provide: MatSnackBar, useValue: snackBarMock }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should handle 401 Unauthorized error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 401 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Your session has expired. Please log in again.',
          'Dismiss',
          jasmine.any(Object)
        );
        expect(routerSpy.navigate).toHaveBeenCalledWith(
          ['/login'],
          jasmine.objectContaining({
            queryParams: { returnUrl: '/test' }
          })
        );
        done();
      }
    });

    const req = httpMock.expectOne(testUrl);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 403 Forbidden error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 403 error'),
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

    const req = httpMock.expectOne(testUrl);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('should handle 404 Not Found error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 404 error'),
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

    const req = httpMock.expectOne(testUrl);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 500 Internal Server Error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 500 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Server error. Please try again later.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    // Expect multiple requests due to retry logic
    const requests = httpMock.match(testUrl);
    requests.forEach(req => {
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  it('should handle 502 Bad Gateway error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 502 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(502);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Bad gateway. The server is temporarily unavailable.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    // Expect multiple requests due to retry logic
    const requests = httpMock.match(testUrl);
    requests.forEach(req => {
      req.flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    });
  });

  it('should handle 503 Service Unavailable error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 503 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(503);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Service unavailable. Please try again later.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    // Expect multiple requests due to retry logic
    const requests = httpMock.match(testUrl);
    requests.forEach(req => {
      req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    });
  });

  it('should handle 504 Gateway Timeout error', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 504 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(504);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Gateway timeout. The server took too long to respond.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    // Expect multiple requests due to retry logic
    const requests = httpMock.match(testUrl);
    requests.forEach(req => {
      req.flush('Gateway Timeout', { status: 504, statusText: 'Gateway Timeout' });
    });
  });

  it('should handle network error (status 0)', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with network error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(0);
        expect(snackBarSpy.open).toHaveBeenCalledWith(
          'Unable to connect to the server. Please check your internet connection.',
          'Dismiss',
          jasmine.any(Object)
        );
        done();
      }
    });

    // Expect multiple requests due to retry logic
    const requests = httpMock.match(testUrl);
    requests.forEach(req => {
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });
  });

  it('should not retry non-retryable errors', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => fail('should have failed with 404 error'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(404);
        done();
      }
    });

    // Should only make one request (no retries for 404)
    const req = httpMock.expectOne(testUrl);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should pass through successful requests', (done) => {
    const testUrl = '/api/test';
    const testData = { message: 'success' };

    httpClient.get(testUrl).subscribe({
      next: (data) => {
        expect(data).toEqual(testData);
        done();
      },
      error: () => fail('should not have failed')
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(testData);
  });
});
