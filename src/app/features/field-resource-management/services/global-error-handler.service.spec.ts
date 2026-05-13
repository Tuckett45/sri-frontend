import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GlobalErrorHandlerService } from './global-error-handler.service';

describe('GlobalErrorHandlerService', () => {
  let service: GlobalErrorHandlerService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandlerService,
        { provide: MatSnackBar, useValue: snackBarMock }
      ]
    });

    service = TestBed.inject(GlobalErrorHandlerService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should display user-friendly message for 401 error', () => {
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/test'
      });

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Unauthorized. Please log in again.',
        'Dismiss',
        jasmine.objectContaining({
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        })
      );
    });

    it('should display user-friendly message for 403 error', () => {
      const error = new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        url: '/api/test'
      });

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Access denied. You do not have permission to perform this action.',
        'Dismiss',
        jasmine.any(Object)
      );
    });

    it('should display user-friendly message for 404 error', () => {
      const error = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        url: '/api/test'
      });

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Resource not found. The requested item may have been deleted.',
        'Dismiss',
        jasmine.any(Object)
      );
    });

    it('should display user-friendly message for 500 error', () => {
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test'
      });

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Server error. Please try again later.',
        'Dismiss',
        jasmine.any(Object)
      );
    });

    it('should display user-friendly message for network error (status 0)', () => {
      const error = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/test'
      });

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Unable to connect to the server. Please check your internet connection.',
        'Dismiss',
        jasmine.any(Object)
      );
    });

    it('should display generic message for client-side error', () => {
      const error = new Error('Test client error');

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'An unexpected error occurred. Please try again.',
        'Dismiss',
        jasmine.any(Object)
      );
    });

    it('should handle error without message', () => {
      const error = new Error();

      service.handleError(error);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'An unexpected error occurred. Please try again.',
        'Dismiss',
        jasmine.any(Object)
      );
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network error (status 0)', () => {
      const error = new HttpErrorResponse({ status: 0 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 408 Request Timeout', () => {
      const error = new HttpErrorResponse({ status: 408 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 429 Too Many Requests', () => {
      const error = new HttpErrorResponse({ status: 429 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 500 Internal Server Error', () => {
      const error = new HttpErrorResponse({ status: 500 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 502 Bad Gateway', () => {
      const error = new HttpErrorResponse({ status: 502 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = new HttpErrorResponse({ status: 503 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      const error = new HttpErrorResponse({ status: 504 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(true);
    });

    it('should return false for 401 Unauthorized', () => {
      const error = new HttpErrorResponse({ status: 401 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(false);
    });

    it('should return false for 404 Not Found', () => {
      const error = new HttpErrorResponse({ status: 404 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(false);
    });

    it('should return false for 400 Bad Request', () => {
      const error = new HttpErrorResponse({ status: 400 });
      expect(GlobalErrorHandlerService.isRetryableError(error)).toBe(false);
    });
  });
});
