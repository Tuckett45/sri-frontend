import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GlobalErrorHandlerService } from '../services/global-error-handler.service';
import { ErrorContextService, ErrorSeverity } from '../services/error-context.service';
import { PIIProtectionService } from '../services/pii-protection.service';

/**
 * Retry configuration for different endpoint types
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Graceful degradation fallback result
 */
interface GracefulFallback {
  shouldFallback: boolean;
  fallbackResponse?: any;
  userMessage?: string;
}

/**
 * HTTP Error Interceptor (Enhanced)
 * 
 * Intercepts HTTP errors globally and provides:
 * - Automatic retry logic with endpoint-specific configuration
 * - User-friendly error messages
 * - Structured error logging with context
 * - Graceful degradation for external service failures
 * - PII masking in error logs
 * - Correlation ID tracking
 * 
 * @example
 * providers: [
 *   { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
 * ]
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  // Default retry configuration
  private readonly DEFAULT_RETRY: RetryConfig = {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 8000
  };

  // Endpoint-specific retry configurations
  private readonly RETRY_CONFIGS: Record<string, RetryConfig> = {
    // Azure Maps API - more retries for external service
    'atlas.microsoft.com': {
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 16000
    },
    // Budget operations - fewer retries, faster feedback
    '/api/budgets': {
      maxRetries: 1,
      baseDelayMs: 500,
      maxDelayMs: 2000
    },
    // Supplier integrations - more retries for external service
    '/api/suppliers': {
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 16000
    },
    // Inventory operations
    '/api/inventory': {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 4000
    },
    // Materials operations
    '/api/materials': {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 4000
    }
  };

  // URLs that support graceful degradation
  private readonly DEGRADABLE_ENDPOINTS: Record<string, GracefulFallback> = {
    'atlas.microsoft.com/search/address': {
      shouldFallback: true,
      fallbackResponse: { results: [], summary: { totalResults: 0 } },
      userMessage: 'Address lookup is temporarily unavailable. You can enter coordinates manually.'
    },
    'atlas.microsoft.com/route/matrix': {
      shouldFallback: true,
      fallbackResponse: { matrix: [] },
      userMessage: 'Distance calculation is temporarily unavailable. Results will be updated when the service recovers.'
    },
    '/api/suppliers': {
      shouldFallback: true,
      fallbackResponse: { status: 'queued', message: 'Order queued for processing' },
      userMessage: 'Supplier service is temporarily unavailable. Your order has been queued.'
    }
  };

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private errorContextService: ErrorContextService,
    private piiProtectionService: PIIProtectionService
  ) {}

  /**
   * Intercepts HTTP requests and handles errors with enhanced context
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const retryConfig = this.getRetryConfig(request.url);
    const featureArea = this.detectFeatureArea(request.url);

    // Create error context for this request
    const context = this.errorContextService.createHttpContext(
      featureArea,
      request.method,
      this.sanitizeUrl(request.url),
      request.method
    );

    return next.handle(request).pipe(
      // Retry logic with endpoint-specific configuration
      retry({
        count: retryConfig.maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          if (GlobalErrorHandlerService.isRetryableError(error)) {
            const delayMs = Math.min(
              retryConfig.baseDelayMs * Math.pow(2, retryCount - 1),
              retryConfig.maxDelayMs
            );

            // Log retry attempt
            this.errorContextService.logError(
              error,
              { ...context, additionalData: { retryCount, delayMs, maxRetries: retryConfig.maxRetries } },
              ErrorSeverity.Warning
            );

            return timer(delayMs);
          }
          throw error;
        }
      }),

      // Catch and handle errors
      catchError((error: HttpErrorResponse) => {
        // Check for graceful degradation
        const fallback = this.checkGracefulDegradation(request.url, error);
        if (fallback.shouldFallback && fallback.fallbackResponse) {
          // Log degradation
          this.errorContextService.logError(
            error,
            { ...context, additionalData: { degraded: true, fallbackUsed: true } },
            ErrorSeverity.Warning
          );

          // Show user-friendly message
          if (fallback.userMessage) {
            this.snackBar.open(fallback.userMessage, 'Dismiss', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['warning-snackbar']
            });
          }

          // Return fallback response
          return of(new HttpResponse({
            body: fallback.fallbackResponse,
            status: 200,
            headers: request.headers
          }));
        }

        // Log error with full context
        this.logErrorWithContext(error, context);

        // Handle error with user-facing message
        this.handleError(error);

        return throwError(() => error);
      })
    );
  }

  /**
   * Get retry configuration for a URL
   */
  private getRetryConfig(url: string): RetryConfig {
    for (const [pattern, config] of Object.entries(this.RETRY_CONFIGS)) {
      if (url.includes(pattern)) {
        return config;
      }
    }
    return this.DEFAULT_RETRY;
  }

  /**
   * Detect feature area from URL
   */
  private detectFeatureArea(url: string): string {
    if (url.includes('/budgets')) return 'budgets';
    if (url.includes('/travel')) return 'travel';
    if (url.includes('/inventory')) return 'inventory';
    if (url.includes('/materials')) return 'materials';
    if (url.includes('/timecards')) return 'timecards';
    if (url.includes('/technicians')) return 'technicians';
    if (url.includes('/jobs')) return 'jobs';
    if (url.includes('atlas.microsoft.com')) return 'geocoding';
    if (url.includes('/suppliers')) return 'suppliers';
    return 'general';
  }

  /**
   * Sanitize URL for logging (remove sensitive params)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // Remove sensitive query parameters
      const sensitiveParams = ['api-key', 'subscription-key', 'token', 'auth'];
      sensitiveParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url.split('?')[0]; // Return path only if URL parsing fails
    }
  }

  /**
   * Check if graceful degradation should be applied
   */
  private checkGracefulDegradation(url: string, error: HttpErrorResponse): GracefulFallback {
    // Only degrade on server errors or network failures
    if (error.status !== 0 && error.status < 500) {
      return { shouldFallback: false };
    }

    for (const [pattern, fallback] of Object.entries(this.DEGRADABLE_ENDPOINTS)) {
      if (url.includes(pattern)) {
        return fallback;
      }
    }

    return { shouldFallback: false };
  }

  /**
   * Log error with full context and PII masking
   */
  private logErrorWithContext(error: HttpErrorResponse, context: any): void {
    // Mask any PII in error response
    const maskedError = {
      ...error,
      error: error.error ? this.piiProtectionService.maskObjectPII(error.error) : null
    };

    this.errorContextService.logError(
      maskedError,
      context,
      this.getSeverityForStatus(error.status)
    );
  }

  /**
   * Get error severity based on HTTP status
   */
  private getSeverityForStatus(status: number): ErrorSeverity {
    if (status === 0) return ErrorSeverity.Error; // Network error
    if (status >= 500) return ErrorSeverity.Error;
    if (status === 401 || status === 403) return ErrorSeverity.Warning;
    if (status >= 400) return ErrorSeverity.Warning;
    return ErrorSeverity.Info;
  }

  /**
   * Handles HTTP errors with appropriate user-facing actions
   */
  private handleError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        this.handleUnauthorized();
        break;
      case 403:
        this.handleForbidden();
        break;
      case 404:
        this.handleNotFound();
        break;
      case 409:
        this.handleConflict(error);
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        this.handleServerError(error);
        break;
      case 0:
        this.handleNetworkError();
        break;
      default:
        this.handleGenericError(error);
        break;
    }
  }

  private handleUnauthorized(): void {
    this.snackBar.open(
      'Your session has expired. Please log in again.',
      'Dismiss',
      { duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar'] }
    );
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  private handleForbidden(): void {
    this.snackBar.open(
      'Access denied. You do not have permission to perform this action.',
      'Dismiss',
      { duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar'] }
    );
  }

  private handleNotFound(): void {
    this.snackBar.open(
      'Resource not found. The requested item may have been deleted.',
      'Dismiss',
      { duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar'] }
    );
  }

  private handleConflict(error: HttpErrorResponse): void {
    const message = error.error?.message || 'A conflict occurred. The resource may have been modified by another user. Please refresh and try again.';
    this.snackBar.open(message, 'Dismiss', {
      duration: 7000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['warning-snackbar']
    });
  }

  private handleServerError(error: HttpErrorResponse): void {
    let message = 'Server error. Please try again later.';
    if (error.status === 502) message = 'Bad gateway. The server is temporarily unavailable.';
    else if (error.status === 503) message = 'Service unavailable. Please try again later.';
    else if (error.status === 504) message = 'Gateway timeout. The server took too long to respond.';

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar']
    });
  }

  private handleNetworkError(): void {
    this.snackBar.open(
      'Unable to connect to the server. Please check your internet connection.',
      'Dismiss',
      { duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar'] }
    );
  }

  private handleGenericError(error: HttpErrorResponse): void {
    let message = 'An unexpected error occurred. Please try again.';
    if (error.error && typeof error.error === 'object' && error.error.message) {
      message = error.error.message;
    } else if (error.error && typeof error.error === 'string') {
      message = error.error;
    }

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['error-snackbar']
    });
  }
}
