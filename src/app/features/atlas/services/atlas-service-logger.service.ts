import { Injectable } from '@angular/core';

/**
 * Service routing log entry
 */
export interface ServiceRoutingLogEntry {
  timestamp: Date;
  featureName: string;
  service: 'ATLAS' | 'ARK';
  operation: string;
  success: boolean;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Service routing statistics
 */
export interface ServiceRoutingStatistics {
  totalRequests: number;
  atlasRequests: number;
  arkRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDuration: number;
  byFeature: Record<string, {
    atlas: number;
    ark: number;
    success: number;
    failed: number;
  }>;
  byService: {
    atlas: { total: number; success: number; failed: number };
    ark: { total: number; success: number; failed: number };
  };
}

/**
 * AtlasServiceLoggerService
 * 
 * Logs which services (ARK or ATLAS) handle each request for monitoring.
 * Provides statistics and analytics about service routing decisions.
 * 
 * Requirements: 10.7
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasServiceLoggerService {
  private logs: ServiceRoutingLogEntry[] = [];
  private readonly MAX_LOG_SIZE = 5000;

  /**
   * Log a service routing event
   * Requirements: 10.7
   * 
   * @param entry - The log entry to record
   */
  logServiceRouting(entry: ServiceRoutingLogEntry): void {
    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date();
    }

    // Add to log
    this.logs.push(entry);

    // Trim log if it exceeds max size
    if (this.logs.length > this.MAX_LOG_SIZE) {
      this.logs = this.logs.slice(-this.MAX_LOG_SIZE);
    }

    // Log to console for debugging
    const status = entry.success ? 'SUCCESS' : 'FAILED';
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';
    
    console.log(
      `[Service Routing] ${entry.service} | ${entry.featureName} | ` +
      `${entry.operation} | ${status}${duration}`
    );

    // Log error if present
    if (entry.error) {
      console.error(`[Service Routing] Error: ${entry.error}`);
    }
  }

  /**
   * Log ATLAS service request
   * Requirements: 10.7
   * 
   * @param featureName - The feature name
   * @param operation - The operation being performed
   * @param success - Whether the operation succeeded
   * @param duration - Optional duration in milliseconds
   * @param error - Optional error message
   * @param metadata - Optional additional metadata
   */
  logAtlasRequest(
    featureName: string,
    operation: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    this.logServiceRouting({
      timestamp: new Date(),
      featureName,
      service: 'ATLAS',
      operation,
      success,
      duration,
      error,
      metadata
    });
  }

  /**
   * Log ARK service request
   * Requirements: 10.7
   * 
   * @param featureName - The feature name
   * @param operation - The operation being performed
   * @param success - Whether the operation succeeded
   * @param duration - Optional duration in milliseconds
   * @param error - Optional error message
   * @param metadata - Optional additional metadata
   */
  logArkRequest(
    featureName: string,
    operation: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    this.logServiceRouting({
      timestamp: new Date(),
      featureName,
      service: 'ARK',
      operation,
      success,
      duration,
      error,
      metadata
    });
  }

  /**
   * Get service routing logs
   * Requirements: 10.7
   * 
   * @param options - Filter options
   * @returns Array of log entries
   */
  getLogs(options?: {
    featureName?: string;
    service?: 'ATLAS' | 'ARK';
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ServiceRoutingLogEntry[] {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (options) {
      if (options.featureName) {
        filteredLogs = filteredLogs.filter(log => log.featureName === options.featureName);
      }

      if (options.service) {
        filteredLogs = filteredLogs.filter(log => log.service === options.service);
      }

      if (options.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === options.success);
      }

      if (options.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startDate!);
      }

      if (options.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endDate!);
      }

      if (options.limit) {
        filteredLogs = filteredLogs.slice(-options.limit);
      }
    }

    return filteredLogs;
  }

  /**
   * Get service routing statistics
   * Requirements: 10.7
   * 
   * @param options - Filter options
   * @returns Statistics object
   */
  getStatistics(options?: {
    featureName?: string;
    startDate?: Date;
    endDate?: Date;
  }): ServiceRoutingStatistics {
    const logs = this.getLogs(options);

    const stats: ServiceRoutingStatistics = {
      totalRequests: logs.length,
      atlasRequests: 0,
      arkRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
      byFeature: {},
      byService: {
        atlas: { total: 0, success: 0, failed: 0 },
        ark: { total: 0, success: 0, failed: 0 }
      }
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const log of logs) {
      // Count by service
      if (log.service === 'ATLAS') {
        stats.atlasRequests++;
        stats.byService.atlas.total++;
        if (log.success) {
          stats.byService.atlas.success++;
        } else {
          stats.byService.atlas.failed++;
        }
      } else {
        stats.arkRequests++;
        stats.byService.ark.total++;
        if (log.success) {
          stats.byService.ark.success++;
        } else {
          stats.byService.ark.failed++;
        }
      }

      // Count success/failure
      if (log.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }

      // Calculate average duration
      if (log.duration !== undefined) {
        totalDuration += log.duration;
        durationCount++;
      }

      // Count by feature
      if (!stats.byFeature[log.featureName]) {
        stats.byFeature[log.featureName] = {
          atlas: 0,
          ark: 0,
          success: 0,
          failed: 0
        };
      }

      if (log.service === 'ATLAS') {
        stats.byFeature[log.featureName].atlas++;
      } else {
        stats.byFeature[log.featureName].ark++;
      }

      if (log.success) {
        stats.byFeature[log.featureName].success++;
      } else {
        stats.byFeature[log.featureName].failed++;
      }
    }

    // Calculate average duration
    if (durationCount > 0) {
      stats.averageDuration = totalDuration / durationCount;
    }

    return stats;
  }

  /**
   * Get recent errors
   * Requirements: 10.7
   * 
   * @param limit - Maximum number of errors to return
   * @returns Array of error log entries
   */
  getRecentErrors(limit: number = 50): ServiceRoutingLogEntry[] {
    return this.getLogs({ success: false, limit });
  }

  /**
   * Get logs for a specific feature
   * Requirements: 10.7
   * 
   * @param featureName - The feature name
   * @param limit - Maximum number of logs to return
   * @returns Array of log entries
   */
  getFeatureLogs(featureName: string, limit: number = 100): ServiceRoutingLogEntry[] {
    return this.getLogs({ featureName, limit });
  }

  /**
   * Get logs for a specific service
   * Requirements: 10.7
   * 
   * @param service - The service (ATLAS or ARK)
   * @param limit - Maximum number of logs to return
   * @returns Array of log entries
   */
  getServiceLogs(service: 'ATLAS' | 'ARK', limit: number = 100): ServiceRoutingLogEntry[] {
    return this.getLogs({ service, limit });
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   * 
   * @param options - Filter options
   * @returns JSON string of logs
   */
  exportLogs(options?: {
    featureName?: string;
    service?: 'ATLAS' | 'ARK';
    startDate?: Date;
    endDate?: Date;
  }): string {
    const logs = this.getLogs(options);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get log summary for monitoring dashboard
   * Requirements: 10.7
   * 
   * @returns Summary object
   */
  getLogSummary(): {
    totalLogs: number;
    recentErrors: number;
    atlasUsage: number;
    arkUsage: number;
    successRate: number;
  } {
    const stats = this.getStatistics();
    const recentErrors = this.getRecentErrors(10).length;

    return {
      totalLogs: stats.totalRequests,
      recentErrors,
      atlasUsage: stats.atlasRequests,
      arkUsage: stats.arkRequests,
      successRate: stats.totalRequests > 0
        ? (stats.successfulRequests / stats.totalRequests) * 100
        : 0
    };
  }
}
