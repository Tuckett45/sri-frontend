import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';

/**
 * Error Handling Interceptor
 * 
 * Implements comprehensive error handling with retry logic for network errors.
 * 
 * Features:
 * - Exponential backoff retry for GET requests (up to 3 retries)
 * - User-friendly error messages for different error types
 * - Network error detection and handling
 * - Validation error handling
 * - Permission error handling
 * - Service unavailability handling
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
 */
@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
  /**
   * Maximum number of retry attempts for GET requests
   */
  private readonly MAX_RETRIES = 3;

  /**
   * Base delay for exponential backoff (in milliseconds)
   */
  private readonly BASE_DELAY = 1000;

  /**
   * Endpoints that should not trigger retry logic
   */
  private readonly NO_RETRY_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, retryCount: number) => {
            // Only retry on network errors or 5xx server errors for GET requests
            if (this.isRetryableError(error) && this.shouldRetry(req) && retryCount < this.MAX_RETRIES) {
              const delay = this.calculateExponentialBackoff(retryCount);
              console.log(`🔄 Retrying request (attempt ${retryCount + 1}/${this.MAX_RETRIES}) after ${delay}ms: ${req.method} ${req.url}`);
              return timer(delay);
            }
            // Don't retry - throw the error
            return throwError(() => error);
          })
        )
      ),
      catchError((error: HttpErrorResponse) => this.handleError(error, req))
    );
  }

  /**
   * Determine if the request should be retried
   * 
   * @param req The HTTP request
   * @returns true if retry should be attempted, false otherwise
   */
  private shouldRetry(req: HttpRequest<any>): boolean {
    // Only retry GET requests
    if (req.method !== 'GET') {
      return false;
    }

    // Don't retry authentication endpoints
    if (this.NO_RETRY_ENDPOINTS.some(endpoint => req.url.includes(endpoint))) {
      return false;
    }

    return true;
  }

  /**
   * Determine if the error is retryable
   * 
   * @param error The HTTP error response
   * @returns true if error is retryable, false otherwise
   */
  private isRetryableError(error: HttpErrorResponse): boolean {
    // Network errors (status 0)
    if (error.status === 0) {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Service unavailable
    if (error.status === 503) {
      return true;
    }

    // Gateway timeout
    if (error.status === 504) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   * 
   * @param retryCount The current retry attempt (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateExponentialBackoff(retryCount: number): number {
    // Exponential backoff: baseDelay * 2^retryCount
    // Retry 1: 1000ms, Retry 2: 2000ms, Retry 3: 4000ms
    return this.BASE_DELAY * Math.pow(2, retryCount);
  }

  /**
   * Handle HTTP errors with user-friendly messages
   * 
   * @param error The HTTP error response
   * @param req The original request
   * @returns Observable that throws the enhanced error
   */
  private handleError(error: HttpErrorResponse, req: HttpRequest<any>): Observable<never> {
    let userFriendlyMessage: string;
    let errorType: string;

    // Network errors
    if (error.status === 0) {
      errorType = 'network';
      userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    // Validation errors (400)
    else if (error.status === 400) {
      errorType = 'validation';
      userFriendlyMessage = this.getValidationErrorMessage(error);
    }
    // Permission errors (403) - handled by AuthorizationInterceptor
    else if (error.status === 403) {
      errorType = 'permission';
      userFriendlyMessage = error.error?.userFriendlyMessage || 'You do not have permission to access this resource.';
    }
    // Not found errors (404)
    else if (error.status === 404) {
      errorType = 'not_found';
      userFriendlyMessage = 'The requested resource was not found.';
    }
    // Service unavailable (503)
    else if (error.status === 503) {
      errorType = 'service_unavailable';
      userFriendlyMessage = this.getServiceUnavailableMessage(req.url);
    }
    // Server errors (5xx)
    else if (error.status >= 500 && error.status < 600) {
      errorType = 'server';
      userFriendlyMessage = 'The server encountered an error. Please try again later';
    }
    // Other errors
    else {
      errorType = 'unknown';
      userFriendlyMessage = 'An unexpected error occurred. Please try again.';
    }

    // Log the error for debugging
    console.error(`❌ HTTP Error [${errorType}]:`, {
      status: error.status,
      statusText: error.statusText,
      url: req.url,
      method: req.method,
      message: userFriendlyMessage,
      originalError: error.error
    });

    // Create enhanced error with user-friendly message
    const enhancedError = new HttpErrorResponse({
      error: {
        ...error.error,
        userFriendlyMessage,
        errorType,
        canRetry: this.isRetryableError(error) && this.shouldRetry(req)
      },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    });

    return throwError(() => enhancedError);
  }

  /**
   * Get validation error message from error response
   * 
   * @param error The HTTP error response
   * @returns User-friendly validation error message
   */
  private getValidationErrorMessage(error: HttpErrorResponse): string {
    // Check if backend provided validation errors
    if (error.error?.errors && Array.isArray(error.error.errors)) {
      const errorCount = error.error.errors.length;
      if (errorCount === 1) {
        return `Validation error: ${error.error.errors[0].message}`;
      }
      return `${errorCount} validation errors occurred. Please check the form and try again.`;
    }

    // Check for single validation message
    if (error.error?.message) {
      return error.error.message;
    }

    // Generic validation error
    return 'The submitted data is invalid. Please check your input and try again.';
  }

  /**
   * Get service unavailable message based on the endpoint
   * 
   * @param url The request URL
   * @returns User-friendly service unavailable message
   */
  private getServiceUnavailableMessage(url: string): string {
    // AI service endpoints
    if (url.includes('/ai/') || url.includes('/recommendations')) {
      return 'The AI recommendation service is temporarily unavailable. Cached recommendations will be displayed if available.';
    }

    // Forecast service endpoints
    if (url.includes('/analytics/forecasts') || url.includes('/predictions')) {
      return 'The forecasting service is temporarily unavailable. Please try again later.';
    }

    // Generic service unavailable
    return 'The service is temporarily unavailable. Please try again in a few moments.';
  }
}
