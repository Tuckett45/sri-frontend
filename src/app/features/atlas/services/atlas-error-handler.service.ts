import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { retry, catchError, timeout, mergeMap } from 'rxjs/operators';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Error severity levels for classification
 */
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Error context for logging and tracking
 */
export interface ErrorContext {
  endpoint: string;
  method: string;
  timestamp: Date;
  attemptNumber?: number;
  statusCode?: number;
  errorMessage?: string;
  requestId?: string;
}

/**
 * Circuit breaker state for an endpoint
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttemptTime: Date | null;
}

/**
 * Error rate tracking for monitoring
 */
interface ErrorRateTracker {
  totalRequests: number;
  failedRequests: number;
  windowStart: Date;
}

/**
 * Fallback response configuration
 */
export interface FallbackConfig<T> {
  enabled: boolean;
  response: T;
  condition?: (error: HttpErrorResponse) => boolean;
}

/**
 * AtlasErrorHandlerService
 * 
 * Provides centralized error handling for ATLAS API errors with:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for failing endpoints
 * - Timeout handling
 * - Error logging and tracking
 * - Fallback response support
 * - User-friendly error message mapping
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasErrorHandlerService {
  private readonly MAX_RETRY_ATTEMPTS = 3; // Requirement 5.2
  private readonly INITIAL_RETRY_DELAY_MS = 1000; // 1 second
  private readonly MAX_RETRY_DELAY_MS = 10000; // 10 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening circuit
  private readonly CIRCUIT_BREAKER_COOLDOWN_MS = 60000; // 1 minute cooldown (Requirement 5.6)
  private readonly ERROR_RATE_WINDOW_MS = 60000; // 1 minute window for error rate tracking
  private readonly ERROR_RATE_THRESHOLD = 0.5; // 50% error rate threshold (Requirement 5.11)

  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private errorRateTrackers = new Map<string, ErrorRateTracker>();
  private errorLog: ErrorContext[] = [];

  constructor(private configService: AtlasConfigService) {}

  /**
   * Handle HTTP errors with retry, circuit breaker, and fallback logic
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
   * 
   * @param error - HTTP error response
   * @param context - Error context for logging
   * @param fallbackConfig - Optional fallback configuration
   * @returns Observable that either retries or throws error
   */
  handleError<T>(
    error: HttpErrorResponse,
    context?: Partial<ErrorContext>,
    fallbackConfig?: FallbackConfig<T>
  ): Observable<T> {
    const errorContext: ErrorContext = {
      endpoint: context?.endpoint || 'unknown',
      method: context?.method || 'unknown',
      timestamp: new Date(),
      attemptNumber: context?.attemptNumber || 1,
      statusCode: error.status,
      errorMessage: this.extractErrorMessage(error),
      requestId: context?.requestId
    };

    // Log error with context (Requirement 5.7)
    this.logError(errorContext, error);

    // Track error rate (Requirement 5.11)
    this.trackErrorRate(errorContext.endpoint);

    // Check if fallback should be used (Requirement 5.9)
    if (fallbackConfig?.enabled) {
      if (!fallbackConfig.condition || fallbackConfig.condition(error)) {
        console.warn(`Using fallback response for ${errorContext.endpoint}`);
        return of(fallbackConfig.response);
      }
    }

    // Return appropriate error observable
    return throwError(() => ({
      error,
      context: errorContext,
      userMessage: this.getUserFriendlyMessage(error)
    }));
  }

  /**
   * Apply retry logic with exponential backoff to an observable
   * Requirements: 5.1, 5.2
   * 
   * @param source$ - Source observable
   * @param endpoint - Endpoint identifier for circuit breaker
   * @param maxAttempts - Maximum retry attempts (default: 3)
   * @returns Observable with retry logic applied
   */
  withRetry<T>(
    source$: Observable<T>,
    endpoint: string,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Observable<T> {
    return source$.pipe(
      retry({
        count: maxAttempts,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Check if error is retryable (Requirement 5.1)
          if (!this.isRetryableError(error)) {
            console.log(`Error is not retryable for ${endpoint}, skipping retry`);
            throw error;
          }

          // Check circuit breaker before retrying (Requirement 5.5, 5.6)
          if (!this.canAttemptRequest(endpoint)) {
            console.warn(`Circuit breaker open for ${endpoint}, skipping retry`);
            throw error;
          }

          // Calculate exponential backoff delay (Requirement 5.1)
          const delay = this.calculateBackoffDelay(retryCount);
          console.log(`Retrying ${endpoint} in ${delay}ms (attempt ${retryCount + 1}/${maxAttempts})`);

          return timer(delay);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Record failure in circuit breaker (Requirement 5.5)
        this.recordFailure(endpoint);
        return throwError(() => error);
      })
    );
  }

  /**
   * Apply timeout to an observable
   * Requirements: 5.8
   * 
   * @param source$ - Source observable
   * @param timeoutMs - Timeout in milliseconds (uses config default if not provided)
   * @returns Observable with timeout applied
   */
  withTimeout<T>(
    source$: Observable<T>,
    timeoutMs?: number
  ): Observable<T> {
    const timeoutValue = timeoutMs || this.configService.getTimeout();
    
    return source$.pipe(
      timeout(timeoutValue),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          console.error(`Request timed out after ${timeoutValue}ms`);
          return throwError(() => new HttpErrorResponse({
            error: 'Request timeout',
            status: 408,
            statusText: 'Request Timeout',
            url: undefined
          }));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if a request can be attempted based on circuit breaker state
   * Requirements: 5.5, 5.6
   * 
   * @param endpoint - Endpoint identifier
   * @returns True if request can be attempted
   */
  canAttemptRequest(endpoint: string): boolean {
    const breaker = this.getCircuitBreaker(endpoint);

    if (breaker.state === 'CLOSED') {
      return true;
    }

    if (breaker.state === 'OPEN') {
      // Check if cooldown period has passed (Requirement 5.6)
      if (breaker.nextAttemptTime && new Date() >= breaker.nextAttemptTime) {
        // Transition to HALF_OPEN state
        breaker.state = 'HALF_OPEN';
        console.log(`Circuit breaker for ${endpoint} transitioning to HALF_OPEN`);
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow one attempt
    return true;
  }

  /**
   * Record a successful request for circuit breaker
   * Requirements: 5.5
   * 
   * @param endpoint - Endpoint identifier
   */
  recordSuccess(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint);

    if (breaker.state === 'HALF_OPEN') {
      // Success in HALF_OPEN state closes the circuit
      breaker.state = 'CLOSED';
      breaker.failures = 0;
      breaker.lastFailureTime = null;
      breaker.nextAttemptTime = null;
      console.log(`Circuit breaker for ${endpoint} closed after successful request`);
    } else if (breaker.state === 'CLOSED') {
      // Reset failure count on success
      breaker.failures = Math.max(0, breaker.failures - 1);
    }

    // Track successful request for error rate
    this.trackSuccessRate(endpoint);
  }

  /**
   * Record a failed request for circuit breaker
   * Requirements: 5.5, 5.6
   * 
   * @param endpoint - Endpoint identifier
   */
  recordFailure(endpoint: string): void {
    const breaker = this.getCircuitBreaker(endpoint);
    breaker.failures++;
    breaker.lastFailureTime = new Date();

    if (breaker.state === 'HALF_OPEN') {
      // Failure in HALF_OPEN state reopens the circuit
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = new Date(Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS);
      console.warn(`Circuit breaker for ${endpoint} reopened after failed attempt`);
    } else if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      // Open circuit after threshold failures (Requirement 5.5)
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = new Date(Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS);
      console.warn(`Circuit breaker for ${endpoint} opened after ${breaker.failures} failures`);
    }
  }

  /**
   * Get or create circuit breaker state for an endpoint
   * 
   * @param endpoint - Endpoint identifier
   * @returns Circuit breaker state
   */
  private getCircuitBreaker(endpoint: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, {
        failures: 0,
        lastFailureTime: null,
        state: 'CLOSED',
        nextAttemptTime: null
      });
    }
    return this.circuitBreakers.get(endpoint)!;
  }

  /**
   * Calculate exponential backoff delay
   * Requirements: 5.1
   * 
   * @param retryCount - Current retry attempt number (0-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: delay = initialDelay * 2^retryCount
    const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay; // ±30% jitter
    
    // Cap at maximum delay
    return Math.min(delay + jitter, this.MAX_RETRY_DELAY_MS);
  }

  /**
   * Check if an error is retryable
   * Requirements: 5.1
   * 
   * @param error - HTTP error response
   * @returns True if error should be retried
   */
  private isRetryableError(error: HttpErrorResponse): boolean {
    // Network errors (status 0) are retryable (Requirement 5.1)
    if (error.status === 0) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 408 Request Timeout is retryable
    if (error.status === 408) {
      return true;
    }

    // 429 Too Many Requests is retryable (with backoff)
    if (error.status === 429) {
      return true;
    }

    // 4xx client errors are generally not retryable
    // except for specific cases handled above
    return false;
  }

  /**
   * Extract error message from HTTP error response
   * 
   * @param error - HTTP error response
   * @returns Error message string
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.title) {
      return error.error.title;
    }

    if (error.error?.detail) {
      return error.error.detail;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.message) {
      return error.message;
    }

    return `HTTP ${error.status}: ${error.statusText}`;
  }

  /**
   * Map HTTP error to user-friendly message
   * Requirements: 5.3, 5.4
   * 
   * @param error - HTTP error response
   * @returns User-friendly error message
   */
  getUserFriendlyMessage(error: HttpErrorResponse): string {
    // Network errors (Requirement 5.1)
    if (error.status === 0) {
      return 'Unable to connect to ATLAS services. Please check your network connection and try again.';
    }

    // 4xx client errors (Requirement 5.4)
    if (error.status >= 400 && error.status < 500) {
      switch (error.status) {
        case 400:
          return error.error?.message || 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Your session has expired. Please log in again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 408:
          return 'The request timed out. Please try again.';
        case 409:
          return error.error?.message || 'A conflict occurred. The resource may have been modified by another user.';
        case 422:
          return error.error?.message || 'Validation failed. Please check your input.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        default:
          return error.error?.message || `Request failed with error ${error.status}. Please try again.`;
      }
    }

    // 5xx server errors (Requirement 5.3)
    if (error.status >= 500 && error.status < 600) {
      switch (error.status) {
        case 500:
          return 'An internal server error occurred. Our team has been notified. Please try again later.';
        case 502:
          return 'The ATLAS service is temporarily unavailable. Please try again in a few moments.';
        case 503:
          return 'The ATLAS service is currently undergoing maintenance. Please try again later.';
        case 504:
          return 'The request timed out while waiting for the server. Please try again.';
        default:
          return 'A server error occurred. Please try again later.';
      }
    }

    // Unknown errors
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Log error with context
   * Requirements: 5.7
   * 
   * @param context - Error context
   * @param error - HTTP error response
   */
  private logError(context: ErrorContext, error: HttpErrorResponse): void {
    // Add to error log
    this.errorLog.push(context);

    // Keep only last 1000 errors to prevent memory issues
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }

    // Log to console with full context (Requirement 5.7)
    console.error('ATLAS API Error:', {
      context,
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
      headers: error.headers
    });

    // In production, this would also send to error tracking service
    // e.g., Sentry, Application Insights, etc.
  }

  /**
   * Track error rate for an endpoint
   * Requirements: 5.11
   * 
   * @param endpoint - Endpoint identifier
   */
  private trackErrorRate(endpoint: string): void {
    const tracker = this.getOrCreateErrorRateTracker(endpoint);
    tracker.failedRequests++;
    tracker.totalRequests++;

    this.checkErrorRateThreshold(endpoint, tracker);
  }

  /**
   * Track successful request for error rate calculation
   * 
   * @param endpoint - Endpoint identifier
   */
  private trackSuccessRate(endpoint: string): void {
    const tracker = this.getOrCreateErrorRateTracker(endpoint);
    tracker.totalRequests++;
  }

  /**
   * Get or create error rate tracker for an endpoint
   * 
   * @param endpoint - Endpoint identifier
   * @returns Error rate tracker
   */
  private getOrCreateErrorRateTracker(endpoint: string): ErrorRateTracker {
    const now = new Date();
    
    if (!this.errorRateTrackers.has(endpoint)) {
      this.errorRateTrackers.set(endpoint, {
        totalRequests: 0,
        failedRequests: 0,
        windowStart: now
      });
    }

    const tracker = this.errorRateTrackers.get(endpoint)!;

    // Reset tracker if window has expired
    if (now.getTime() - tracker.windowStart.getTime() > this.ERROR_RATE_WINDOW_MS) {
      tracker.totalRequests = 0;
      tracker.failedRequests = 0;
      tracker.windowStart = now;
    }

    return tracker;
  }

  /**
   * Check if error rate exceeds threshold and trigger alert
   * Requirements: 5.11
   * 
   * @param endpoint - Endpoint identifier
   * @param tracker - Error rate tracker
   */
  private checkErrorRateThreshold(endpoint: string, tracker: ErrorRateTracker): void {
    if (tracker.totalRequests < 10) {
      // Need minimum sample size before checking threshold
      return;
    }

    const errorRate = tracker.failedRequests / tracker.totalRequests;

    if (errorRate >= this.ERROR_RATE_THRESHOLD) {
      console.error(
        `ALERT: Error rate for ${endpoint} exceeded threshold: ` +
        `${(errorRate * 100).toFixed(1)}% (${tracker.failedRequests}/${tracker.totalRequests})`
      );

      // In production, this would trigger alerts to monitoring systems
      // e.g., PagerDuty, CloudWatch Alarms, etc.
    }
  }

  /**
   * Get error log for debugging
   * 
   * @param limit - Maximum number of recent errors to return
   * @returns Array of error contexts
   */
  getErrorLog(limit: number = 100): ErrorContext[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Get circuit breaker status for all endpoints
   * 
   * @returns Map of endpoint to circuit breaker state
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get error rate statistics for all endpoints
   * 
   * @returns Map of endpoint to error rate statistics
   */
  getErrorRateStatistics(): Map<string, { errorRate: number; total: number; failed: number }> {
    const stats = new Map<string, { errorRate: number; total: number; failed: number }>();

    this.errorRateTrackers.forEach((tracker, endpoint) => {
      const errorRate = tracker.totalRequests > 0 
        ? tracker.failedRequests / tracker.totalRequests 
        : 0;

      stats.set(endpoint, {
        errorRate,
        total: tracker.totalRequests,
        failed: tracker.failedRequests
      });
    });

    return stats;
  }

  /**
   * Reset circuit breaker for an endpoint (for testing/admin purposes)
   * 
   * @param endpoint - Endpoint identifier
   */
  resetCircuitBreaker(endpoint: string): void {
    this.circuitBreakers.delete(endpoint);
    console.log(`Circuit breaker reset for ${endpoint}`);
  }

  /**
   * Clear all error tracking data (for testing purposes)
   */
  clearErrorTracking(): void {
    this.errorLog = [];
    this.circuitBreakers.clear();
    this.errorRateTrackers.clear();
    console.log('All error tracking data cleared');
  }
}
