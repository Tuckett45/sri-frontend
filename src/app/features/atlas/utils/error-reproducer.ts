/**
 * Error Reproduction Tool
 * 
 * Captures error context and provides tools to reproduce errors for debugging.
 * Includes state snapshots, request logs, and environment information.
 * 
 * @module ErrorReproducer
 */

import { HttpErrorResponse } from '@angular/common/http';
import { StateSnapshot } from './state-inspector';
import { RequestLogEntry } from './request-logger';

/**
 * Error reproduction context
 */
export interface ErrorContext {
  id: string;
  timestamp: Date;
  error: ErrorInfo;
  state?: StateSnapshot;
  requestLog?: RequestLogEntry;
  environment: EnvironmentInfo;
  userActions?: UserAction[];
  metadata?: Record<string, any>;
}

/**
 * Error information
 */
export interface ErrorInfo {
  message: string;
  stack?: string;
  type: string;
  code?: string;
  httpStatus?: number;
  httpError?: any;
  componentStack?: string;
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timestamp: Date;
  url: string;
  referrer: string;
  localStorage?: Record<string, any>;
  sessionStorage?: Record<string, any>;
}

/**
 * User action tracking
 */
export interface UserAction {
  type: string;
  timestamp: Date;
  target?: string;
  data?: any;
}

/**
 * Reproduction script
 */
export interface ReproductionScript {
  id: string;
  context: ErrorContext;
  steps: ReproductionStep[];
  expectedResult: string;
  actualResult: string;
}

/**
 * Reproduction step
 */
export interface ReproductionStep {
  order: number;
  action: string;
  description: string;
  data?: any;
}

/**
 * Error Reproducer Service
 * 
 * Captures error context and generates reproduction scripts.
 */
export class ErrorReproducer {
  private contexts: ErrorContext[] = [];
  private maxContexts = 100;
  private userActions: UserAction[] = [];
  private maxUserActions = 50;
  private trackingEnabled = true;

  /**
   * Capture error context
   * 
   * @param error - Error object
   * @param state - Optional state snapshot
   * @param requestLog - Optional request log entry
   * @returns Error context ID
   */
  captureError(
    error: Error | HttpErrorResponse,
    state?: StateSnapshot,
    requestLog?: RequestLogEntry
  ): string {
    const id = this.generateId();
    
    const context: ErrorContext = {
      id,
      timestamp: new Date(),
      error: this.extractErrorInfo(error),
      state,
      requestLog,
      environment: this.captureEnvironment(),
      userActions: [...this.userActions],
      metadata: {}
    };

    this.contexts.push(context);
    this.maintainMaxContexts();

    return id;
  }

  /**
   * Track user action
   * 
   * @param type - Action type (click, input, navigation, etc.)
   * @param target - Target element or component
   * @param data - Optional action data
   */
  trackUserAction(type: string, target?: string, data?: any): void {
    if (!this.trackingEnabled) {
      return;
    }

    const action: UserAction = {
      type,
      timestamp: new Date(),
      target,
      data
    };

    this.userActions.push(action);
    
    if (this.userActions.length > this.maxUserActions) {
      this.userActions.shift();
    }
  }

  /**
   * Get error context by ID
   * 
   * @param id - Error context ID
   * @returns Error context or undefined
   */
  getContext(id: string): ErrorContext | undefined {
    return this.contexts.find(ctx => ctx.id === id);
  }

  /**
   * Get all error contexts
   * 
   * @returns Array of error contexts
   */
  getAllContexts(): ErrorContext[] {
    return [...this.contexts];
  }

  /**
   * Generate reproduction script
   * 
   * @param contextId - Error context ID
   * @returns Reproduction script
   */
  generateReproductionScript(contextId: string): ReproductionScript | null {
    const context = this.getContext(contextId);
    if (!context) {
      return null;
    }

    const steps: ReproductionStep[] = [];
    let order = 1;

    // Add navigation step
    steps.push({
      order: order++,
      action: 'navigate',
      description: `Navigate to ${context.environment.url}`,
      data: { url: context.environment.url }
    });

    // Add user action steps
    if (context.userActions) {
      context.userActions.forEach(action => {
        steps.push({
          order: order++,
          action: action.type,
          description: `${action.type} on ${action.target || 'unknown'}`,
          data: action.data
        });
      });
    }

    // Add request step if available
    if (context.requestLog) {
      steps.push({
        order: order++,
        action: 'api_request',
        description: `${context.requestLog.method} ${context.requestLog.url}`,
        data: {
          method: context.requestLog.method,
          url: context.requestLog.url,
          body: context.requestLog.body
        }
      });
    }

    return {
      id: this.generateId(),
      context,
      steps,
      expectedResult: 'Operation should complete successfully',
      actualResult: context.error.message
    };
  }

  /**
   * Export error context
   * 
   * @param contextId - Error context ID
   * @returns JSON string of error context
   */
  exportContext(contextId: string): string | null {
    const context = this.getContext(contextId);
    if (!context) {
      return null;
    }

    return JSON.stringify(context, null, 2);
  }

  /**
   * Export reproduction script
   * 
   * @param contextId - Error context ID
   * @returns Markdown formatted reproduction script
   */
  exportReproductionScript(contextId: string): string | null {
    const script = this.generateReproductionScript(contextId);
    if (!script) {
      return null;
    }

    let markdown = `# Error Reproduction Script\n\n`;
    markdown += `**Error ID:** ${script.context.id}\n`;
    markdown += `**Timestamp:** ${script.context.timestamp.toISOString()}\n`;
    markdown += `**Error:** ${script.context.error.message}\n\n`;

    markdown += `## Environment\n\n`;
    markdown += `- **User Agent:** ${script.context.environment.userAgent}\n`;
    markdown += `- **Platform:** ${script.context.environment.platform}\n`;
    markdown += `- **URL:** ${script.context.environment.url}\n\n`;

    markdown += `## Reproduction Steps\n\n`;
    script.steps.forEach(step => {
      markdown += `${step.order}. ${step.description}\n`;
      if (step.data) {
        markdown += `   \`\`\`json\n   ${JSON.stringify(step.data, null, 2)}\n   \`\`\`\n`;
      }
    });

    markdown += `\n## Expected Result\n\n${script.expectedResult}\n\n`;
    markdown += `## Actual Result\n\n${script.actualResult}\n\n`;

    if (script.context.error.stack) {
      markdown += `## Stack Trace\n\n\`\`\`\n${script.context.error.stack}\n\`\`\`\n`;
    }

    return markdown;
  }

  /**
   * Clear all error contexts
   */
  clearContexts(): void {
    this.contexts = [];
  }

  /**
   * Clear user actions
   */
  clearUserActions(): void {
    this.userActions = [];
  }

  /**
   * Enable/disable user action tracking
   * 
   * @param enabled - Whether tracking is enabled
   */
  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  /**
   * Search error contexts
   * 
   * @param query - Search query (error message, type, etc.)
   * @returns Matching error contexts
   */
  searchContexts(query: string): ErrorContext[] {
    const lowerQuery = query.toLowerCase();
    return this.contexts.filter(ctx => 
      ctx.error.message.toLowerCase().includes(lowerQuery) ||
      ctx.error.type.toLowerCase().includes(lowerQuery) ||
      ctx.environment.url.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get error statistics
   * 
   * @returns Error statistics
   */
  getStatistics() {
    const totalErrors = this.contexts.length;
    const errorsByType = this.contexts.reduce((acc, ctx) => {
      acc[ctx.error.type] = (acc[ctx.error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const httpErrors = this.contexts.filter(ctx => ctx.error.httpStatus).length;
    const jsErrors = this.contexts.filter(ctx => !ctx.error.httpStatus).length;

    return {
      totalErrors,
      httpErrors,
      jsErrors,
      errorsByType
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract error information
   */
  private extractErrorInfo(error: Error | HttpErrorResponse): ErrorInfo {
    if (error instanceof HttpErrorResponse) {
      return {
        message: error.message,
        stack: error.error?.stack,
        type: 'HttpError',
        httpStatus: error.status,
        httpError: {
          status: error.status,
          statusText: error.statusText,
          error: error.error
        }
      };
    }

    return {
      message: error.message,
      stack: error.stack,
      type: error.name || 'Error',
      code: (error as any).code
    };
  }

  /**
   * Capture environment information
   */
  private captureEnvironment(): EnvironmentInfo {
    const env: EnvironmentInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date(),
      url: window.location.href,
      referrer: document.referrer
    };

    // Capture storage (sanitized)
    try {
      env.localStorage = this.sanitizeStorage(localStorage);
      env.sessionStorage = this.sanitizeStorage(sessionStorage);
    } catch (e) {
      // Storage access might be blocked
    }

    return env;
  }

  /**
   * Sanitize storage data
   */
  private sanitizeStorage(storage: Storage): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['token', 'password', 'secret', 'apikey', 'auth'];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          try {
            sanitized[key] = storage.getItem(key);
          } catch (e) {
            sanitized[key] = '[ERROR]';
          }
        }
      }
    }

    return sanitized;
  }

  /**
   * Maintain maximum contexts
   */
  private maintainMaxContexts(): void {
    if (this.contexts.length > this.maxContexts) {
      this.contexts = this.contexts.slice(-this.maxContexts);
    }
  }
}

/**
 * Global error reproducer instance
 */
export const errorReproducer = new ErrorReproducer();

/**
 * Initialize error tracking
 * 
 * Sets up global error handlers to automatically capture errors.
 */
export function initializeErrorTracking(): void {
  // Track window errors
  window.addEventListener('error', (event) => {
    errorReproducer.captureError(event.error);
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = new Error(event.reason?.message || 'Unhandled Promise Rejection');
    errorReproducer.captureError(error);
  });

  // Track user clicks
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    errorReproducer.trackUserAction('click', target.tagName, {
      id: target.id,
      className: target.className
    });
  });

  // Track navigation
  window.addEventListener('popstate', () => {
    errorReproducer.trackUserAction('navigation', window.location.href);
  });
}
