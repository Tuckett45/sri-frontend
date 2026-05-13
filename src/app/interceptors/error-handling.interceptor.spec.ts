import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlingInterceptor } from './error-handling.interceptor';

describe('ErrorHandlingInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorHandlingInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Retry Logic', () => {
    it('should retry GET requests up to 3 times on network errors', fakeAsync(() => {
      const testUrl = '/api/test';
      let attemptCount = 0;
      let errorReceived = false;

      httpClient.get(testUrl).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(attemptCount).toBe(4); // Initial + 3 retries
          expect(error.error.errorType).toBe('network');
          expect(error.error.canRetry).toBe(true);
          errorReceived = true;
        }
      });

      // Simulate 4 failed attempts (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne(testUrl);
        attemptCount++;
        req.flush(null, { status: 0, statusText: 'Network Error' });
        
        // Advance time for exponential backoff (1000ms, 2000ms, 4000ms)
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick(); // Flush any remaining async operations
      expect(errorReceived).toBe(true);
    }));

    it('should retry GET requests on 5xx server errors', fakeAsync(() => {
      const testUrl = '/api/test';
      let attemptCount = 0;
      let errorReceived = false;

      httpClient.get(testUrl).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(attemptCount).toBe(4); // Initial + 3 retries
          expect(error.error.errorType).toBe('server');
          errorReceived = true;
        }
      });

      // Simulate 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne(testUrl);
        attemptCount++;
        req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should not retry POST requests', (done) => {
      const testUrl = '/api/test';
      let attemptCount = 0;

      httpClient.post(testUrl, { data: 'test' }).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(attemptCount).toBe(1); // Only initial attempt, no retries
          done();
        }
      });

      const req = httpMock.expectOne(testUrl);
      attemptCount++;
      req.flush(null, { status: 0, statusText: 'Network Error' });
    });

    it('should not retry authentication endpoints', (done) => {
      const testUrl = '/auth/login';
      let attemptCount = 0;

      httpClient.get(testUrl).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(attemptCount).toBe(1); // Only initial attempt, no retries
          done();
        }
      });

      const req = httpMock.expectOne(testUrl);
      attemptCount++;
      req.flush(null, { status: 0, statusText: 'Network Error' });
    });

    it('should not retry on 400 validation errors', (done) => {
      const testUrl = '/api/test';
      let attemptCount = 0;

      httpClient.get(testUrl).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(attemptCount).toBe(1); // Only initial attempt, no retries
          expect(error.error.errorType).toBe('validation');
          done();
        }
      });

      const req = httpMock.expectOne(testUrl);
      attemptCount++;
      req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should succeed after retry', fakeAsync(() => {
      const testUrl = '/api/test';
      const testData = { result: 'success' };
      let attemptCount = 0;
      let dataReceived = false;

      httpClient.get(testUrl).subscribe({
        next: (data) => {
          expect(attemptCount).toBe(2); // Initial + 1 retry
          expect(data).toEqual(testData);
          dataReceived = true;
        },
        error: () => fail('Should have succeeded')
      });

      // First attempt fails
      const req1 = httpMock.expectOne(testUrl);
      attemptCount++;
      req1.flush(null, { status: 500, statusText: 'Internal Server Error' });
      
      // Wait for retry delay
      tick(1000);

      // Second attempt succeeds
      const req2 = httpMock.expectOne(testUrl);
      attemptCount++;
      req2.flush(testData);

      tick();
      expect(dataReceived).toBe(true);
    }));
  });

  describe('Error Messages', () => {
    it('should provide user-friendly message for network errors', fakeAsync(() => {
      let errorReceived = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('Unable to connect to the server');
          expect(error.error.errorType).toBe('network');
          errorReceived = true;
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/test');
        req.flush(null, { status: 0, statusText: 'Network Error' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should provide user-friendly message for validation errors', (done) => {
      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage.toLowerCase()).toContain('invalid');
          expect(error.error.errorType).toBe('validation');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ message: 'Invalid data' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should provide user-friendly message for 404 errors', (done) => {
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('not found');
          expect(error.error.errorType).toBe('not_found');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('should provide user-friendly message for server errors', fakeAsync(() => {
      let errorReceived = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('server encountered an error');
          expect(error.error.errorType).toBe('server');
          errorReceived = true;
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/test');
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should provide specific message for AI service unavailability', fakeAsync(() => {
      let errorReceived = false;

      httpClient.get('/api/ai/recommendations').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('AI recommendation service');
          expect(error.error.userFriendlyMessage).toContain('Cached recommendations');
          expect(error.error.errorType).toBe('service_unavailable');
          errorReceived = true;
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/ai/recommendations');
        req.flush(null, { status: 503, statusText: 'Service Unavailable' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should provide specific message for forecast service unavailability', fakeAsync(() => {
      let errorReceived = false;

      httpClient.get('/api/analytics/forecasts').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('forecasting service');
          expect(error.error.errorType).toBe('service_unavailable');
          errorReceived = true;
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/analytics/forecasts');
        req.flush(null, { status: 503, statusText: 'Service Unavailable' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should handle validation errors with multiple fields', (done) => {
      const validationErrors = {
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Email is invalid' }
        ]
      };

      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('2 validation errors');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(validationErrors, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle validation errors with single field', (done) => {
      const validationErrors = {
        errors: [
          { field: 'name', message: 'Name is required' }
        ]
      };

      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.userFriendlyMessage).toContain('Name is required');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(validationErrors, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Error Metadata', () => {
    it('should include canRetry flag for retryable errors', fakeAsync(() => {
      let errorReceived = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.canRetry).toBe(true);
          errorReceived = true;
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/test');
        req.flush(null, { status: 0, statusText: 'Network Error' });
        
        if (i < 3) {
          tick(1000 * Math.pow(2, i));
        }
      }

      tick();
      expect(errorReceived).toBe(true);
    }));

    it('should include canRetry flag as false for non-retryable errors', (done) => {
      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.canRetry).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(null, { status: 0, statusText: 'Network Error' });
    });

    it('should preserve original error data', (done) => {
      const originalError = { code: 'VALIDATION_ERROR', details: 'Invalid input' };

      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error: HttpErrorResponse) => {
          expect(error.error.code).toBe('VALIDATION_ERROR');
          expect(error.error.details).toBe('Invalid input');
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(originalError, { status: 400, statusText: 'Bad Request' });
    });
  });
});
