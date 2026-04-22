/**
 * Request/Response Logger Utility
 * 
 * Provides detailed logging capabilities for ATLAS API requests and responses.
 * Supports filtering, formatting, and exporting of HTTP traffic logs.
 * 
 * @module RequestLogger
 */

import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';

/**
 * Log entry interface
 */
export interface RequestLogEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  duration?: number;
  status?: number;
  response?: any;
  error?: any;
  metadata?: Record<string, any>;
}

/**
 * Log filter options
 */
export interface LogFilterOptions {
  method?: string[];
  status?: number[];
  urlPattern?: RegExp;
  startDate?: Date;
  endDate?: Date;
  hasError?: boolean;
}

/**
 * Log export format
 */
export enum LogExportFormat {
  JSON = 'json',
  CSV = 'csv',
  HAR = 'har' // HTTP Archive format
}

/**
 * Request Logger Service
 * 
 * Captures and manages HTTP request/response logs for debugging.
 */
export class RequestLogger {
  private logs: RequestLogEntry[] = [];
  private maxLogs = 500;
  private enabled = true;
  private sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
  private sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  /**
   * Log an HTTP request
   * 
   * @param request - HTTP request object
   * @returns Log entry ID
   */
  logRequest(request: HttpRequest<any>): string {
    if (!this.enabled) {
      return '';
    }

    const id = this.generateId();
    const entry: RequestLogEntry = {
      id,
      timestamp: new Date(),
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(this.extractHeaders(request)),
      body: this.sanitizeBody(request.body),
      params: this.extractParams(request)
    };

    this.logs.push(entry);
    this.maintainMaxLogs();

    if (this.shouldLogToConsole()) {
      this.logRequestToConsole(entry);
    }

    return id;
  }

  /**
   * Log an HTTP response
   * 
   * @param id - Request log entry ID
   * @param response - HTTP response object
   * @param duration - Request duration in milliseconds
   */
  logResponse(id: string, response: HttpResponse<any>, duration: number): void {
    if (!this.enabled) {
      return;
    }

    const entry = this.logs.find(log => log.id === id);
    if (entry) {
      entry.duration = duration;
      entry.status = response.status;
      entry.response = this.sanitizeBody(response.body);

      if (this.shouldLogToConsole()) {
        this.logResponseToConsole(entry);
      }
    }
  }

  /**
   * Log an HTTP error
   * 
   * @param id - Request log entry ID
   * @param error - HTTP error response
   * @param duration - Request duration in milliseconds
   */
  logError(id: string, error: HttpErrorResponse, duration: number): void {
    if (!this.enabled) {
      return;
    }

    const entry = this.logs.find(log => log.id === id);
    if (entry) {
      entry.duration = duration;
      entry.status = error.status;
      entry.error = {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        error: this.sanitizeBody(error.error)
      };

      if (this.shouldLogToConsole()) {
        this.logErrorToConsole(entry);
      }
    }
  }

  /**
   * Get all log entries
   * 
   * @returns Array of log entries
   */
  getLogs(): RequestLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get filtered log entries
   * 
   * @param options - Filter options
   * @returns Filtered array of log entries
   */
  getFilteredLogs(options: LogFilterOptions): RequestLogEntry[] {
    return this.logs.filter(log => {
      if (options.method && !options.method.includes(log.method)) {
        return false;
      }

      if (options.status && log.status && !options.status.includes(log.status)) {
        return false;
      }

      if (options.urlPattern && !options.urlPattern.test(log.url)) {
        return false;
      }

      if (options.startDate && log.timestamp < options.startDate) {
        return false;
      }

      if (options.endDate && log.timestamp > options.endDate) {
        return false;
      }

      if (options.hasError !== undefined && (!!log.error) !== options.hasError) {
        return false;
      }

      return true;
    });
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Enable/disable logging
   * 
   * @param enabled - Whether logging is enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   * 
   * @returns True if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Export logs in specified format
   * 
   * @param format - Export format
   * @param options - Optional filter options
   * @returns Exported logs as string
   */
  exportLogs(format: LogExportFormat, options?: LogFilterOptions): string {
    const logs = options ? this.getFilteredLogs(options) : this.logs;

    switch (format) {
      case LogExportFormat.JSON:
        return this.exportAsJson(logs);
      case LogExportFormat.CSV:
        return this.exportAsCsv(logs);
      case LogExportFormat.HAR:
        return this.exportAsHar(logs);
      default:
        return this.exportAsJson(logs);
    }
  }

  /**
   * Get statistics about logged requests
   * 
   * @returns Statistics object
   */
  getStatistics() {
    const totalRequests = this.logs.length;
    const successfulRequests = this.logs.filter(log => log.status && log.status >= 200 && log.status < 300).length;
    const failedRequests = this.logs.filter(log => log.error).length;
    const averageDuration = this.logs
      .filter(log => log.duration)
      .reduce((sum, log) => sum + (log.duration || 0), 0) / totalRequests || 0;

    const methodCounts = this.logs.reduce((acc, log) => {
      acc[log.method] = (acc[log.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusCounts = this.logs.reduce((acc, log) => {
      if (log.status) {
        acc[log.status] = (acc[log.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageDuration: Math.round(averageDuration),
      methodCounts,
      statusCounts
    };
  }

  /**
   * Generate unique log entry ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract headers from request
   */
  private extractHeaders(request: HttpRequest<any>): Record<string, string> {
    const headers: Record<string, string> = {};
    request.headers.keys().forEach(key => {
      headers[key] = request.headers.get(key) || '';
    });
    return headers;
  }

  /**
   * Extract query params from request
   */
  private extractParams(request: HttpRequest<any>): Record<string, string> {
    const params: Record<string, string> = {};
    request.params.keys().forEach(key => {
      params[key] = request.params.get(key) || '';
    });
    return params;
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    this.sensitiveHeaders.forEach(header => {
      const key = Object.keys(sanitized).find(k => k.toLowerCase() === header.toLowerCase());
      if (key) {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  /**
   * Sanitize body to remove sensitive data
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = Array.isArray(body) ? [...body] : { ...body };

    for (const key in sanitized) {
      if (sanitized.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeBody(sanitized[key]);
        }
      }
    }

    return sanitized;
  }

  /**
   * Maintain maximum log entries
   */
  private maintainMaxLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Check if should log to console
   */
  private shouldLogToConsole(): boolean {
    return typeof window !== 'undefined' && (window as any).__ATLAS_DEBUG__;
  }

  /**
   * Log request to console
   */
  private logRequestToConsole(entry: RequestLogEntry): void {
    console.group(`🌐 ${entry.method} ${entry.url}`);
    console.log('Request ID:', entry.id);
    console.log('Timestamp:', entry.timestamp.toISOString());
    console.log('Headers:', entry.headers);
    if (entry.params && Object.keys(entry.params).length > 0) {
      console.log('Params:', entry.params);
    }
    if (entry.body) {
      console.log('Body:', entry.body);
    }
    console.groupEnd();
  }

  /**
   * Log response to console
   */
  private logResponseToConsole(entry: RequestLogEntry): void {
    console.group(`✅ ${entry.method} ${entry.url} - ${entry.status} (${entry.duration}ms)`);
    console.log('Response:', entry.response);
    console.groupEnd();
  }

  /**
   * Log error to console
   */
  private logErrorToConsole(entry: RequestLogEntry): void {
    console.group(`❌ ${entry.method} ${entry.url} - ${entry.status} (${entry.duration}ms)`);
    console.error('Error:', entry.error);
    console.groupEnd();
  }

  /**
   * Export logs as JSON
   */
  private exportAsJson(logs: RequestLogEntry[]): string {
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  private exportAsCsv(logs: RequestLogEntry[]): string {
    const headers = ['ID', 'Timestamp', 'Method', 'URL', 'Status', 'Duration (ms)', 'Has Error'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.method,
      log.url,
      log.status?.toString() || '',
      log.duration?.toString() || '',
      log.error ? 'Yes' : 'No'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export logs as HAR (HTTP Archive) format
   */
  private exportAsHar(logs: RequestLogEntry[]): string {
    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'ATLAS Request Logger',
          version: '1.0'
        },
        entries: logs.map(log => ({
          startedDateTime: log.timestamp.toISOString(),
          time: log.duration || 0,
          request: {
            method: log.method,
            url: log.url,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(log.headers).map(([name, value]) => ({ name, value })),
            queryString: Object.entries(log.params || {}).map(([name, value]) => ({ name, value })),
            postData: log.body ? {
              mimeType: 'application/json',
              text: JSON.stringify(log.body)
            } : undefined
          },
          response: {
            status: log.status || 0,
            statusText: log.error ? 'Error' : 'OK',
            httpVersion: 'HTTP/1.1',
            headers: [],
            content: {
              size: 0,
              mimeType: 'application/json',
              text: log.response ? JSON.stringify(log.response) : (log.error ? JSON.stringify(log.error) : '')
            }
          },
          cache: {},
          timings: {
            send: 0,
            wait: log.duration || 0,
            receive: 0
          }
        }))
      }
    };

    return JSON.stringify(har, null, 2);
  }
}

/**
 * Global request logger instance
 */
export const requestLogger = new RequestLogger();

/**
 * Enable debug mode for console logging
 */
export function enableDebugMode(): void {
  if (typeof window !== 'undefined') {
    (window as any).__ATLAS_DEBUG__ = true;
  }
}

/**
 * Disable debug mode
 */
export function disableDebugMode(): void {
  if (typeof window !== 'undefined') {
    (window as any).__ATLAS_DEBUG__ = false;
  }
}
