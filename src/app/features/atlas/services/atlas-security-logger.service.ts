import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Security event types
 */
export enum SecurityEventType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_ROTATION = 'TOKEN_ROTATION',
  TOKEN_REVOCATION = 'TOKEN_REVOCATION',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_INPUT = 'INVALID_INPUT',
  MALICIOUS_CONTENT = 'MALICIOUS_CONTENT',
  SSRF_ATTEMPT = 'SSRF_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  API_ERROR = 'API_ERROR',
  VALIDATION_FAILURE = 'VALIDATION_FAILURE'
}

/**
 * Security event data
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, any>;
  stackTrace?: string;
}

/**
 * Security event statistics
 */
export interface SecurityEventStats {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  recentEvents: SecurityEvent[];
  criticalEvents: SecurityEvent[];
}

/**
 * AtlasSecurityLoggerService
 * 
 * Logs all security-relevant events for audit purposes.
 * Tracks authentication, authorization, token operations, and
 * potential security threats.
 * 
 * Requirements: 12.7
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasSecurityLoggerService {
  private readonly MAX_EVENTS_IN_MEMORY = 1000;
  private readonly MAX_RECENT_EVENTS = 50;
  
  private events: SecurityEvent[] = [];
  private eventsSubject = new BehaviorSubject<SecurityEvent[]>([]);
  private statsSubject = new BehaviorSubject<SecurityEventStats>(this.getInitialStats());

  /**
   * Get security events as an observable
   */
  get events$(): Observable<SecurityEvent[]> {
    return this.eventsSubject.asObservable();
  }

  /**
   * Get security event statistics as an observable
   */
  get stats$(): Observable<SecurityEventStats> {
    return this.statsSubject.asObservable();
  }

  /**
   * Log a security event
   * Requirements: 12.7
   * 
   * @param type - Event type
   * @param severity - Event severity
   * @param message - Event message
   * @param details - Additional event details
   */
  logEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    message: string,
    details?: {
      userId?: string;
      sessionId?: string;
      resource?: string;
      action?: string;
      metadata?: Record<string, any>;
      error?: Error;
    }
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity,
      message,
      userId: details?.userId,
      sessionId: details?.sessionId,
      resource: details?.resource,
      action: details?.action,
      details: details?.metadata,
      stackTrace: details?.error?.stack
    };

    // Add to events array
    this.events.push(event);

    // Trim events if exceeding max size
    if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
      this.events = this.events.slice(-this.MAX_EVENTS_IN_MEMORY);
    }

    // Notify subscribers
    this.eventsSubject.next([...this.events]);
    this.updateStats();

    // Log to console based on severity
    this.logToConsole(event);

    // Send to external logging service if configured
    this.sendToExternalLogger(event);
  }

  /**
   * Log authentication event
   * Requirements: 12.7
   */
  logAuthentication(success: boolean, userId?: string, sessionId?: string, error?: Error): void {
    this.logEvent(
      SecurityEventType.AUTHENTICATION,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
      success ? 'User authenticated successfully' : 'Authentication failed',
      {
        userId,
        sessionId,
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
        error
      }
    );
  }

  /**
   * Log authorization event
   * Requirements: 12.7
   */
  logAuthorization(
    granted: boolean,
    resource: string,
    action: string,
    userId?: string,
    sessionId?: string
  ): void {
    this.logEvent(
      SecurityEventType.AUTHORIZATION,
      granted ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
      granted ? `Access granted to ${resource}` : `Access denied to ${resource}`,
      {
        userId,
        sessionId,
        resource,
        action
      }
    );
  }

  /**
   * Log token refresh event
   * Requirements: 12.7
   */
  logTokenRefresh(success: boolean, sessionId?: string, error?: Error): void {
    this.logEvent(
      SecurityEventType.TOKEN_REFRESH,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.ERROR,
      success ? 'Token refreshed successfully' : 'Token refresh failed',
      {
        sessionId,
        action: success ? 'REFRESH_SUCCESS' : 'REFRESH_FAILURE',
        error
      }
    );
  }

  /**
   * Log token rotation event
   * Requirements: 12.7
   */
  logTokenRotation(success: boolean, sessionId?: string, error?: Error): void {
    this.logEvent(
      SecurityEventType.TOKEN_ROTATION,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
      success ? 'Token rotated successfully' : 'Token rotation failed',
      {
        sessionId,
        action: success ? 'ROTATION_SUCCESS' : 'ROTATION_FAILURE',
        error
      }
    );
  }

  /**
   * Log token revocation event
   * Requirements: 12.7
   */
  logTokenRevocation(sessionId?: string): void {
    this.logEvent(
      SecurityEventType.TOKEN_REVOCATION,
      SecurityEventSeverity.INFO,
      'Token revoked',
      {
        sessionId,
        action: 'REVOKE'
      }
    );
  }

  /**
   * Log access denied event
   * Requirements: 12.7
   */
  logAccessDenied(resource: string, action: string, userId?: string, sessionId?: string): void {
    this.logEvent(
      SecurityEventType.ACCESS_DENIED,
      SecurityEventSeverity.WARNING,
      `Access denied: ${action} on ${resource}`,
      {
        userId,
        sessionId,
        resource,
        action
      }
    );
  }

  /**
   * Log invalid input event
   * Requirements: 12.7
   */
  logInvalidInput(inputType: string, reason: string, details?: Record<string, any>): void {
    this.logEvent(
      SecurityEventType.INVALID_INPUT,
      SecurityEventSeverity.WARNING,
      `Invalid input detected: ${inputType} - ${reason}`,
      {
        action: 'INPUT_VALIDATION',
        metadata: { inputType, reason, ...details }
      }
    );
  }

  /**
   * Log malicious content detection
   * Requirements: 12.7
   */
  logMaliciousContent(
    contentType: 'XSS' | 'SQL_INJECTION' | 'OTHER',
    content: string,
    location: string
  ): void {
    const eventType = contentType === 'XSS' 
      ? SecurityEventType.XSS_ATTEMPT 
      : contentType === 'SQL_INJECTION'
      ? SecurityEventType.SQL_INJECTION_ATTEMPT
      : SecurityEventType.MALICIOUS_CONTENT;

    this.logEvent(
      eventType,
      SecurityEventSeverity.CRITICAL,
      `Malicious content detected: ${contentType} in ${location}`,
      {
        action: 'MALICIOUS_CONTENT_BLOCKED',
        metadata: {
          contentType,
          location,
          contentPreview: content.substring(0, 100)
        }
      }
    );
  }

  /**
   * Log SSRF attempt
   * Requirements: 12.7
   */
  logSsrfAttempt(url: string, reason: string): void {
    this.logEvent(
      SecurityEventType.SSRF_ATTEMPT,
      SecurityEventSeverity.CRITICAL,
      `SSRF attempt blocked: ${url}`,
      {
        action: 'SSRF_BLOCKED',
        metadata: { url, reason }
      }
    );
  }

  /**
   * Log rate limit exceeded event
   * Requirements: 12.7
   */
  logRateLimitExceeded(resource: string, userId?: string, sessionId?: string): void {
    this.logEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventSeverity.WARNING,
      `Rate limit exceeded for ${resource}`,
      {
        userId,
        sessionId,
        resource,
        action: 'RATE_LIMIT'
      }
    );
  }

  /**
   * Log session expired event
   * Requirements: 12.7
   */
  logSessionExpired(sessionId?: string): void {
    this.logEvent(
      SecurityEventType.SESSION_EXPIRED,
      SecurityEventSeverity.INFO,
      'Session expired',
      {
        sessionId,
        action: 'SESSION_EXPIRE'
      }
    );
  }

  /**
   * Log configuration change event
   * Requirements: 12.7
   */
  logConfigurationChange(
    configKey: string,
    oldValue: any,
    newValue: any,
    userId?: string
  ): void {
    this.logEvent(
      SecurityEventType.CONFIGURATION_CHANGE,
      SecurityEventSeverity.WARNING,
      `Configuration changed: ${configKey}`,
      {
        userId,
        action: 'CONFIG_UPDATE',
        metadata: {
          configKey,
          oldValue: this.sanitizeValue(oldValue),
          newValue: this.sanitizeValue(newValue)
        }
      }
    );
  }

  /**
   * Log API error event
   * Requirements: 12.7
   */
  logApiError(
    endpoint: string,
    statusCode: number,
    error: Error,
    userId?: string,
    sessionId?: string
  ): void {
    this.logEvent(
      SecurityEventType.API_ERROR,
      statusCode >= 500 ? SecurityEventSeverity.ERROR : SecurityEventSeverity.WARNING,
      `API error: ${endpoint} - ${statusCode}`,
      {
        userId,
        sessionId,
        resource: endpoint,
        action: 'API_CALL',
        metadata: { statusCode },
        error
      }
    );
  }

  /**
   * Log validation failure event
   * Requirements: 12.7
   */
  logValidationFailure(
    validationType: string,
    errors: string[],
    resource?: string
  ): void {
    this.logEvent(
      SecurityEventType.VALIDATION_FAILURE,
      SecurityEventSeverity.WARNING,
      `Validation failed: ${validationType}`,
      {
        resource,
        action: 'VALIDATION',
        metadata: {
          validationType,
          errors
        }
      }
    );
  }

  /**
   * Get all security events
   */
  getAllEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecurityEventSeverity): SecurityEvent[] {
    return this.events.filter(e => e.severity === severity);
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = this.MAX_RECENT_EVENTS): SecurityEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get critical events
   */
  getCriticalEvents(): SecurityEvent[] {
    return this.events.filter(e => e.severity === SecurityEventSeverity.CRITICAL);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
    this.eventsSubject.next([]);
    this.updateStats();
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return 'sec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Log event to console based on severity
   */
  private logToConsole(event: SecurityEvent): void {
    const prefix = `[ATLAS Security] [${event.severity}] [${event.type}]`;
    const message = `${prefix} ${event.message}`;

    switch (event.severity) {
      case SecurityEventSeverity.CRITICAL:
      case SecurityEventSeverity.ERROR:
        console.error(message, event);
        break;
      case SecurityEventSeverity.WARNING:
        console.warn(message, event);
        break;
      case SecurityEventSeverity.INFO:
        console.log(message, event);
        break;
    }
  }

  /**
   * Send event to external logging service
   * Requirements: 12.7
   */
  private sendToExternalLogger(event: SecurityEvent): void {
    // TODO: Implement integration with external logging service
    // Examples: Splunk, ELK Stack, Azure Application Insights, etc.
    
    // For now, just log critical events
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      console.warn('CRITICAL SECURITY EVENT - Should be sent to external logger:', event);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const stats: SecurityEventStats = {
      totalEvents: this.events.length,
      eventsByType: this.countEventsByType(),
      eventsBySeverity: this.countEventsBySeverity(),
      recentEvents: this.getRecentEvents(),
      criticalEvents: this.getCriticalEvents()
    };

    this.statsSubject.next(stats);
  }

  /**
   * Count events by type
   */
  private countEventsByType(): Record<SecurityEventType, number> {
    const counts = {} as Record<SecurityEventType, number>;
    
    Object.values(SecurityEventType).forEach(type => {
      counts[type] = 0;
    });

    this.events.forEach(event => {
      counts[event.type]++;
    });

    return counts;
  }

  /**
   * Count events by severity
   */
  private countEventsBySeverity(): Record<SecurityEventSeverity, number> {
    const counts = {} as Record<SecurityEventSeverity, number>;
    
    Object.values(SecurityEventSeverity).forEach(severity => {
      counts[severity] = 0;
    });

    this.events.forEach(event => {
      counts[event.severity]++;
    });

    return counts;
  }

  /**
   * Get initial statistics
   */
  private getInitialStats(): SecurityEventStats {
    return {
      totalEvents: 0,
      eventsByType: Object.values(SecurityEventType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<SecurityEventType, number>),
      eventsBySeverity: Object.values(SecurityEventSeverity).reduce((acc, severity) => {
        acc[severity] = 0;
        return acc;
      }, {} as Record<SecurityEventSeverity, number>),
      recentEvents: [],
      criticalEvents: []
    };
  }

  /**
   * Sanitize value for logging (remove sensitive data)
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Mask tokens and passwords
      if (value.length > 20) {
        return value.substring(0, 10) + '...' + value.substring(value.length - 5);
      }
      return value;
    }
    return value;
  }
}
