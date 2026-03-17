import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error context information for structured logging
 */
export interface ErrorContext {
  correlationId: string;
  userId: string | null;
  sessionId: string | null;
  featureArea: string;
  operation: string;
  requestUrl?: string;
  requestMethod?: string;
  timestamp: Date;
  additionalData?: Record<string, unknown>;
}

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  context: ErrorContext;
  error: {
    name: string;
    message: string;
    stack?: string;
    status?: number;
    statusText?: string;
  };
  severity: ErrorSeverity;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

/**
 * Error Context Service
 * 
 * Provides structured error context tracking for comprehensive error logging.
 * Tracks user, session, feature area, and operation context for all errors.
 * Supports error correlation IDs for tracing errors across services.
 * 
 * Features:
 * - Generates unique correlation IDs for error tracking
 * - Maintains session context across requests
 * - Provides structured error logging with full context
 * - Supports feature area and operation tracking
 * 
 * @example
 * // Create error context
 * const context = errorContextService.createContext('budgets', 'adjustBudget');
 * 
 * // Log error with context
 * errorContextService.logError(error, context, ErrorSeverity.Error);
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorContextService {
  private currentUserId: string | null = null;
  private sessionId: string;
  private errorLog: ErrorLogEntry[] = [];
  private readonly MAX_LOG_ENTRIES = 100;

  constructor() {
    // Generate session ID on service initialization
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set the current user ID for error context
   * @param userId - User ID to set
   */
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * Get the current session ID
   * @returns Session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Create a new error context for an operation
   * @param featureArea - Feature area (e.g., 'budgets', 'travel', 'inventory')
   * @param operation - Operation being performed (e.g., 'adjustBudget', 'geocodeAddress')
   * @param additionalData - Optional additional context data
   * @returns ErrorContext object
   */
  createContext(
    featureArea: string,
    operation: string,
    additionalData?: Record<string, unknown>
  ): ErrorContext {
    return {
      correlationId: this.generateCorrelationId(),
      userId: this.currentUserId,
      sessionId: this.sessionId,
      featureArea,
      operation,
      timestamp: new Date(),
      additionalData
    };
  }

  /**
   * Create error context from HTTP request
   * @param featureArea - Feature area
   * @param operation - Operation being performed
   * @param requestUrl - HTTP request URL
   * @param requestMethod - HTTP request method
   * @param additionalData - Optional additional context data
   * @returns ErrorContext object
   */
  createHttpContext(
    featureArea: string,
    operation: string,
    requestUrl: string,
    requestMethod: string,
    additionalData?: Record<string, unknown>
  ): ErrorContext {
    return {
      ...this.createContext(featureArea, operation, additionalData),
      requestUrl,
      requestMethod
    };
  }

  /**
   * Log an error with full context
   * @param error - Error object
   * @param context - Error context
   * @param severity - Error severity level
   */
  logError(
    error: Error | any,
    context: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.Error
  ): void {
    const logEntry: ErrorLogEntry = {
      context,
      error: {
        name: error.name || 'UnknownError',
        message: error.message || 'An unknown error occurred',
        stack: error.stack,
        status: error.status,
        statusText: error.statusText
      },
      severity
    };

    // Add to in-memory log (circular buffer)
    this.errorLog.push(logEntry);
    if (this.errorLog.length > this.MAX_LOG_ENTRIES) {
      this.errorLog.shift();
    }

    // Log to console with structured format
    this.logToConsole(logEntry);

    // In production, this would also send to Application Insights or other logging service
    this.sendToRemoteLogging(logEntry);
  }

  /**
   * Get recent error logs
   * @param count - Number of recent logs to retrieve
   * @returns Array of error log entries
   */
  getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Get errors by correlation ID
   * @param correlationId - Correlation ID to search for
   * @returns Array of matching error log entries
   */
  getErrorsByCorrelationId(correlationId: string): ErrorLogEntry[] {
    return this.errorLog.filter(
      entry => entry.context.correlationId === correlationId
    );
  }

  /**
   * Get errors by feature area
   * @param featureArea - Feature area to filter by
   * @returns Array of matching error log entries
   */
  getErrorsByFeatureArea(featureArea: string): ErrorLogEntry[] {
    return this.errorLog.filter(
      entry => entry.context.featureArea === featureArea
    );
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Generate a unique correlation ID
   * @returns Unique correlation ID
   */
  private generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Generate a unique session ID
   * @returns Unique session ID
   */
  private generateSessionId(): string {
    // Check for existing session ID in storage
    const existingSessionId = sessionStorage.getItem('errorContextSessionId');
    if (existingSessionId) {
      return existingSessionId;
    }

    // Generate new session ID
    const newSessionId = uuidv4();
    sessionStorage.setItem('errorContextSessionId', newSessionId);
    return newSessionId;
  }

  /**
   * Log error to console with structured format
   * @param logEntry - Error log entry
   */
  private logToConsole(logEntry: ErrorLogEntry): void {
    const { context, error, severity } = logEntry;
    
    const logMessage = `[${severity.toUpperCase()}] [${context.correlationId}] ${context.featureArea}/${context.operation}: ${error.message}`;
    
    const logData = {
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId,
      featureArea: context.featureArea,
      operation: context.operation,
      requestUrl: context.requestUrl,
      requestMethod: context.requestMethod,
      timestamp: context.timestamp.toISOString(),
      error: {
        name: error.name,
        message: error.message,
        status: error.status
      },
      additionalData: context.additionalData
    };

    switch (severity) {
      case ErrorSeverity.Debug:
        console.debug(logMessage, logData);
        break;
      case ErrorSeverity.Info:
        console.info(logMessage, logData);
        break;
      case ErrorSeverity.Warning:
        console.warn(logMessage, logData);
        break;
      case ErrorSeverity.Error:
      case ErrorSeverity.Critical:
        console.error(logMessage, logData);
        break;
    }
  }

  /**
   * Send error to remote logging service
   * @param logEntry - Error log entry
   */
  private sendToRemoteLogging(logEntry: ErrorLogEntry): void {
    // Check if Application Insights is available
    if (typeof window !== 'undefined' && (window as any).appInsights) {
      const appInsights = (window as any).appInsights;
      
      appInsights.trackException({
        exception: new Error(logEntry.error.message),
        severityLevel: this.mapSeverityToAppInsights(logEntry.severity),
        properties: {
          correlationId: logEntry.context.correlationId,
          userId: logEntry.context.userId,
          sessionId: logEntry.context.sessionId,
          featureArea: logEntry.context.featureArea,
          operation: logEntry.context.operation,
          requestUrl: logEntry.context.requestUrl,
          requestMethod: logEntry.context.requestMethod,
          errorName: logEntry.error.name,
          errorStatus: logEntry.error.status,
          timestamp: logEntry.context.timestamp.toISOString()
        }
      });
    }
  }

  /**
   * Map internal severity to Application Insights severity level
   * @param severity - Internal severity level
   * @returns Application Insights severity level
   */
  private mapSeverityToAppInsights(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.Debug:
        return 0; // Verbose
      case ErrorSeverity.Info:
        return 1; // Information
      case ErrorSeverity.Warning:
        return 2; // Warning
      case ErrorSeverity.Error:
        return 3; // Error
      case ErrorSeverity.Critical:
        return 4; // Critical
      default:
        return 3; // Error
    }
  }
}
