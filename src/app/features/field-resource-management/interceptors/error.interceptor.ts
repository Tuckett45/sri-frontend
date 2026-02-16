import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, mergeMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GlobalErrorHandlerService } from '../services/global-error-handler.service';

/**
 * HTTP Error Interceptor
 * 
 * Intercepts HTTP errors globally and provides:
 * - Automatic retry logic for transient failures
 * - User-friendly error messages
 * - Automatic redirect for authentication errors
 * - Centralized error handling
 * 
 * Features:
 * - Retries network errors and 5xx errors with exponential backoff
 * - Redirects to login on 401 Unauthorized
 * - Displays appropriate error messages for different status codes
 * - Logs errors for debugging
 * 
 * @example
 * // Provide in module:
 * providers: [
 *   { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
 * ]
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Intercepts HTTP requests and handles errors
   * @param request - HTTP request
   * @param next - HTTP handler
   * @returns Observable of HTTP event
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      // Retry logic for transient failures
      retry({
        count: this.MAX_RETRIES,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Only retry if error is retryable
          if (GlobalErrorHandlerService.isRetryableError(error)) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const delayMs = this.RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
            console.log(`Retrying request (attempt ${retryCount}/${this.MAX_RETRIES}) after ${delayMs}ms...`);
            return timer(delayMs);
          }
          
          // Don't retry - throw error immediately
          throw error;
        }
      }),
      
      // Catch and handle errors
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Handles HTTP errors with appropriate actions
   * @param error - HTTP error response
   */
  private handleError(error: HttpErrorResponse): void {
    // Handle specific HTTP status codes
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

  /**
   * Handles 401 Unauthorized errors
   * Redirects to login page
   */
  private handleUnauthorized(): void {
    this.snackBar.open(
      'Your session has expired. Please log in again.',
      'Dismiss',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      }
    );

    // Clear any stored authentication tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');

    // Redirect to login page
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  /**
   * Handles 403 Forbidden errors
   * Displays access denied message
   */
  private handleForbidden(): void {
    this.snackBar.open(
      'Access denied. You do not have permission to perform this action.',
      'Dismiss',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      }
    );
  }

  /**
   * Handles 404 Not Found errors
   * Displays resource not found message
   */
  private handleNotFound(): void {
    this.snackBar.open(
      'Resource not found. The requested item may have been deleted.',
      'Dismiss',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      }
    );
  }

  /**
   * Handles 5xx Server errors
   * Displays server error message
   */
  private handleServerError(error: HttpErrorResponse): void {
    let message = 'Server error. Please try again later.';
    
    if (error.status === 502) {
      message = 'Bad gateway. The server is temporarily unavailable.';
    } else if (error.status === 503) {
      message = 'Service unavailable. Please try again later.';
    } else if (error.status === 504) {
      message = 'Gateway timeout. The server took too long to respond.';
    }

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Handles network errors (status 0)
   * Displays connection error message
   */
  private handleNetworkError(): void {
    this.snackBar.open(
      'Unable to connect to the server. Please check your internet connection.',
      'Dismiss',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      }
    );
  }

  /**
   * Handles generic errors
   * Displays generic error message
   */
  private handleGenericError(error: HttpErrorResponse): void {
    let message = 'An unexpected error occurred. Please try again.';
    
    // Try to extract error message from response
    if (error.error && typeof error.error === 'object') {
      if (error.error.message) {
        message = error.error.message;
      } else if (error.error.error) {
        message = error.error.error;
      }
    } else if (error.error && typeof error.error === 'string') {
      message = error.error;
    }

    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }
}
