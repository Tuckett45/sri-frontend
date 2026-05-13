import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environments';

/**
 * Global Error Handler Service
 * 
 * Provides centralized error handling for the Field Resource Management module.
 * Handles both client-side errors and HTTP errors with user-friendly messages.
 * 
 * Features:
 * - Logs errors to console in development
 * - Logs errors to Application Insights in production (if available)
 * - Displays user-friendly error messages using MatSnackBar
 * - Maps HTTP status codes to appropriate messages
 * - Provides retry logic for transient failures
 * 
 * @example
 * // Provide in module:
 * providers: [
 *   { provide: ErrorHandler, useClass: GlobalErrorHandlerService }
 * ]
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  
  constructor(private injector: Injector) {}

  /**
   * Handles errors globally
   * @param error - The error to handle
   */
  handleError(error: Error | HttpErrorResponse): void {
    // Get MatSnackBar lazily to avoid circular dependency
    const snackBar = this.injector.get(MatSnackBar);
    
    let errorMessage: string;
    let displayMessage: string;

    if (error instanceof HttpErrorResponse) {
      // Server-side or network error
      errorMessage = this.getHttpErrorMessage(error);
      displayMessage = this.getUserFriendlyHttpMessage(error);
      
      // Log to console in development
      if (!environment.production) {
        console.error('HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          error: error.error
        });
      }
      
      // Log to Application Insights in production
      if (environment.production) {
        this.logToApplicationInsights(error, errorMessage);
      }
    } else {
      // Client-side error
      errorMessage = error.message || 'An unexpected error occurred';
      displayMessage = 'An unexpected error occurred. Please try again.';
      
      // Log to console in development
      if (!environment.production) {
        console.error('Client Error:', error);
      }
      
      // Log to Application Insights in production
      if (environment.production) {
        this.logToApplicationInsights(error, errorMessage);
      }
    }

    // Display user-friendly error message
    snackBar.open(displayMessage, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Gets detailed HTTP error message for logging
   * @param error - HTTP error response
   * @returns Detailed error message
   */
  private getHttpErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      return `Network error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      return `HTTP ${error.status}: ${error.statusText} - ${JSON.stringify(error.error)}`;
    }
  }

  /**
   * Gets user-friendly HTTP error message
   * @param error - HTTP error response
   * @returns User-friendly error message
   */
  private getUserFriendlyHttpMessage(error: HttpErrorResponse): string {
    // Handle specific HTTP status codes
    switch (error.status) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection.';
      
      case 400:
        return 'Invalid request. Please check your input and try again.';
      
      case 401:
        return 'Unauthorized. Please log in again.';
      
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      
      case 404:
        return 'Resource not found. The requested item may have been deleted.';
      
      case 408:
        return 'Request timeout. Please try again.';
      
      case 409:
        return 'Conflict. The resource has been modified by another user.';
      
      case 422:
        return 'Validation error. Please check your input.';
      
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      
      case 500:
        return 'Server error. Please try again later.';
      
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      
      case 503:
        return 'Service unavailable. Please try again later.';
      
      case 504:
        return 'Gateway timeout. The server took too long to respond.';
      
      default:
        if (error.status >= 500) {
          return 'Server error. Please try again later.';
        } else if (error.status >= 400) {
          return 'Request error. Please check your input and try again.';
        } else {
          return 'An unexpected error occurred. Please try again.';
        }
    }
  }

  /**
   * Logs error to Application Insights (production only)
   * @param error - The error to log
   * @param message - Error message
   */
  private logToApplicationInsights(error: Error | HttpErrorResponse, message: string): void {
    // Check if Application Insights is available
    if (typeof window !== 'undefined' && (window as any).appInsights) {
      const appInsights = (window as any).appInsights;
      
      if (error instanceof HttpErrorResponse) {
        // Log HTTP error with additional properties
        appInsights.trackException({
          exception: new Error(message),
          properties: {
            type: 'HttpError',
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Log client error
        appInsights.trackException({
          exception: error,
          properties: {
            type: 'ClientError',
            message: message,
            timestamp: new Date().toISOString()
          }
        });
      }
    } else {
      // Fallback: log to console if Application Insights is not available
      console.error('Application Insights not available. Error:', message);
    }
  }

  /**
   * Determines if an error is retryable
   * @param error - HTTP error response
   * @returns True if the error is retryable
   */
  static isRetryableError(error: HttpErrorResponse): boolean {
    // Retry on network errors and specific HTTP status codes
    return (
      error.status === 0 || // Network error
      error.status === 408 || // Request Timeout
      error.status === 429 || // Too Many Requests
      error.status === 500 || // Internal Server Error
      error.status === 502 || // Bad Gateway
      error.status === 503 || // Service Unavailable
      error.status === 504    // Gateway Timeout
    );
  }
}
