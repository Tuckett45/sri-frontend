import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Authorization Interceptor
 * 
 * Adds authorization headers with role information to outgoing HTTP requests
 * and handles authorization failures with user-friendly error messages.
 * 
 * Features:
 * - Adds role information to request headers
 * - Handles 403 Forbidden responses with user-friendly messages
 * - Implements retry logic for token refresh scenarios
 * - Logs authorization failures for audit purposes
 * 
 * Requirements: 16.1, 16.2, 16.5, 16.6
 */
@Injectable()
export class AuthorizationInterceptor implements HttpInterceptor {

  /**
   * Maximum number of retry attempts for failed requests
   */
  private readonly MAX_RETRY_ATTEMPTS = 1;

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

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Intercept HTTP requests to add authorization headers and handle errors
   * 
   * @param req The outgoing HTTP request
   * @param next The next handler in the chain
   * @returns Observable of the HTTP event
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authorization headers with role information
    const modifiedReq = this.addAuthorizationHeaders(req);

    // Handle the request with error handling and retry logic
    return next.handle(modifiedReq).pipe(
      retry({
        count: this.shouldRetry(req.url) ? this.MAX_RETRY_ATTEMPTS : 0,
        delay: (error: HttpErrorResponse) => {
          // Only retry on 401 (token might need refresh)
          if (error.status === 401) {
            return throwError(() => error);
          }
          // Don't retry other errors
          throw error;
        }
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, req))
    );
  }

  /**
   * Add authorization headers with role information to the request
   * 
   * @param req The original HTTP request
   * @returns Modified request with authorization headers
   */
  private addAuthorizationHeaders(req: HttpRequest<any>): HttpRequest<any> {
    const user = this.authService.getUser();
    
    if (!user) {
      return req;
    }

    // Prepare headers to add
    const headers: { [key: string]: string } = {};

    // Add role information if available
    if (user.role) {
      headers['X-User-Role'] = user.role;
    }

    // Add user ID for audit logging
    if (user.id) {
      headers['X-User-ID'] = user.id;
    }

    // Add market information for context
    if (user.market) {
      headers['X-User-Market'] = user.market;
    }

    // Clone request with new headers
    return req.clone({
      setHeaders: headers
    });
  }

  /**
   * Handle HTTP errors with user-friendly messages and logging
   * 
   * @param error The HTTP error response
   * @param req The original request
   * @returns Observable that throws the error
   */
  private handleError(error: HttpErrorResponse, req: HttpRequest<any>): Observable<never> {
    const user = this.authService.getUser();
    const timestamp = new Date().toISOString();

    if (error.status === 403) {
      // Log authorization failure for audit purposes
      this.logAuthorizationFailure(user, req, timestamp);

      // Provide user-friendly error message
      const friendlyMessage = this.getFriendlyErrorMessage(error);
      
      // Create enhanced error with user-friendly message
      const enhancedError = new HttpErrorResponse({
        error: {
          ...error.error,
          userFriendlyMessage: friendlyMessage
        },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined
      });

      // Optionally redirect to unauthorized page for certain scenarios
      if (this.shouldRedirectToUnauthorized(req.url)) {
        this.router.navigate(['/unauthorized'], {
          queryParams: {
            returnUrl: req.url,
            reason: 'insufficient_permissions'
          }
        });
      }

      return throwError(() => enhancedError);
    }

    if (error.status === 401) {
      // Log authentication failure
      console.warn('🚨 Authentication failed', {
        userId: user?.id,
        role: user?.role,
        endpoint: req.url,
        timestamp
      });

      // Token might be expired - let the auth service handle logout
      // The ConfigurationInterceptor already handles 401 errors
    }

    return throwError(() => error);
  }

  /**
   * Log authorization failure for audit purposes
   * 
   * @param user The current user
   * @param req The failed request
   * @param timestamp The timestamp of the failure
   */
  private logAuthorizationFailure(user: any, req: HttpRequest<any>, timestamp: string): void {
    const logEntry = {
      userId: user?.id || 'unknown',
      userName: user?.name || 'unknown',
      role: user?.role || 'unknown',
      market: user?.market || 'unknown',
      endpoint: req.url,
      method: req.method,
      timestamp,
      message: 'Authorization failed - insufficient permissions'
    };

    console.error('🚫 Authorization Failure:', logEntry);

    // In a production environment, this would be sent to a logging service
    // For now, we log to console for debugging purposes
  }

  /**
   * Get user-friendly error message for authorization failures
   * 
   * @param error The HTTP error response
   * @returns User-friendly error message
   */
  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    // Check if backend provided a specific message
    if (error.error?.message) {
      return error.error.message;
    }

    // Default user-friendly messages based on context
    const url = error.url || '';

    if (url.includes('/admin')) {
      return 'You do not have administrator privileges to access this resource. Please contact your system administrator if you believe this is an error.';
    }

    if (url.includes('/user-management') || url.includes('/users')) {
      return 'You do not have permission to manage users. This feature is restricted to administrators.';
    }

    if (url.includes('/system-configuration') || url.includes('/config')) {
      return 'You do not have permission to modify system configuration. This feature is restricted to administrators.';
    }

    if (url.includes('/workflow') || url.includes('/approval')) {
      return 'You do not have permission to access this workflow or approval. You can only access items within your assigned market.';
    }

    // Generic message for other cases
    return 'You do not have permission to access this resource. Please contact your manager or system administrator if you need access.';
  }

  /**
   * Determine if the request should trigger a retry
   * 
   * @param url The request URL
   * @returns true if retry should be attempted, false otherwise
   */
  private shouldRetry(url: string): boolean {
    // Don't retry authentication endpoints
    return !this.NO_RETRY_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  /**
   * Determine if the user should be redirected to unauthorized page
   * 
   * @param url The request URL
   * @returns true if redirect should occur, false otherwise
   */
  private shouldRedirectToUnauthorized(url: string): boolean {
    // Redirect for critical admin-only endpoints
    const criticalEndpoints = [
      '/admin',
      '/user-management',
      '/system-configuration'
    ];

    return criticalEndpoints.some(endpoint => url.includes(endpoint));
  }
}
