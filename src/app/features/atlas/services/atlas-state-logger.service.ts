import { Injectable } from '@angular/core';
import { AtlasTelemetryService } from './atlas-telemetry.service';

/**
 * Log levels for state transitions
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * State transition log entry
 */
export interface StateTransitionLog {
  timestamp: Date;
  level: LogLevel;
  feature: string;
  action: string;
  fromState?: any;
  toState?: any;
  metadata?: any;
  userId?: string;
  correlationId?: string;
}

/**
 * Service for logging ATLAS state transitions for troubleshooting
 * 
 * Requirements:
 * - 13.7: Log all ATLAS state transitions for troubleshooting
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasStateLoggerService {
  private logs: StateTransitionLog[] = [];
  private readonly maxLogs = 500; // Keep last 500 logs
  private enableConsoleLogging = true;

  constructor(private telemetry: AtlasTelemetryService) {}

  /**
   * Log a state transition
   */
  logStateTransition(
    feature: string,
    action: string,
    fromState?: any,
    toState?: any,
    metadata?: any,
    level: LogLevel = LogLevel.INFO
  ): void {
    const log: StateTransitionLog = {
      timestamp: new Date(),
      level,
      feature,
      action,
      fromState: this.sanitizeState(fromState),
      toState: this.sanitizeState(toState),
      metadata,
      correlationId: this.generateCorrelationId()
    };

    this.addLog(log);

    // Track in telemetry
    this.telemetry.trackStateTransition({
      feature,
      action,
      level,
      hasFromState: !!fromState,
      hasToState: !!toState,
      timestamp: log.timestamp
    }, log.correlationId);

    // Console logging for development
    if (this.enableConsoleLogging) {
      this.logToConsole(log);
    }
  }

  /**
   * Log deployment state transition
   */
  logDeploymentTransition(
    action: string,
    deploymentId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'Deployments',
      action,
      fromState,
      toState,
      { ...metadata, deploymentId }
    );
  }

  /**
   * Log AI analysis state transition
   */
  logAIAnalysisTransition(
    action: string,
    analysisId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'AI Analysis',
      action,
      fromState,
      toState,
      { ...metadata, analysisId }
    );
  }

  /**
   * Log approval state transition
   */
  logApprovalTransition(
    action: string,
    approvalId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'Approvals',
      action,
      fromState,
      toState,
      { ...metadata, approvalId }
    );
  }

  /**
   * Log exception state transition
   */
  logExceptionTransition(
    action: string,
    exceptionId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'Exceptions',
      action,
      fromState,
      toState,
      { ...metadata, exceptionId }
    );
  }

  /**
   * Log agent state transition
   */
  logAgentTransition(
    action: string,
    agentId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'Agents',
      action,
      fromState,
      toState,
      { ...metadata, agentId }
    );
  }

  /**
   * Log query builder state transition
   */
  logQueryBuilderTransition(
    action: string,
    queryId: string,
    fromState?: any,
    toState?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      'Query Builder',
      action,
      fromState,
      toState,
      { ...metadata, queryId }
    );
  }

  /**
   * Log an error during state transition
   */
  logError(
    feature: string,
    action: string,
    error: any,
    state?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      feature,
      action,
      state,
      undefined,
      {
        ...metadata,
        error: error.message || error.toString(),
        errorStack: error.stack
      },
      LogLevel.ERROR
    );
  }

  /**
   * Log a warning during state transition
   */
  logWarning(
    feature: string,
    action: string,
    message: string,
    state?: any,
    metadata?: any
  ): void {
    this.logStateTransition(
      feature,
      action,
      state,
      undefined,
      { ...metadata, warning: message },
      LogLevel.WARN
    );
  }

  /**
   * Get all logs
   */
  getLogs(filter?: {
    feature?: string;
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
  }): StateTransitionLog[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.feature) {
        filteredLogs = filteredLogs.filter(log => log.feature === filter.feature);
      }
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    return filteredLogs;
  }

  /**
   * Get logs for a specific feature
   */
  getFeatureLogs(feature: string): StateTransitionLog[] {
    return this.logs.filter(log => log.feature === feature);
  }

  /**
   * Get error logs
   */
  getErrorLogs(): StateTransitionLog[] {
    return this.logs.filter(log => log.level === LogLevel.ERROR);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): StateTransitionLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(): {
    logs: StateTransitionLog[];
    exportedAt: Date;
    totalCount: number;
  } {
    return {
      logs: [...this.logs],
      exportedAt: new Date(),
      totalCount: this.logs.length
    };
  }

  /**
   * Enable or disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.enableConsoleLogging = enabled;
  }

  /**
   * Search logs by action
   */
  searchByAction(action: string): StateTransitionLog[] {
    return this.logs.filter(log => 
      log.action.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    totalLogs: number;
    byFeature: Record<string, number>;
    byLevel: Record<string, number>;
    errorCount: number;
    warningCount: number;
  } {
    const byFeature: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    this.logs.forEach(log => {
      byFeature[log.feature] = (byFeature[log.feature] || 0) + 1;
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    return {
      totalLogs: this.logs.length,
      byFeature,
      byLevel,
      errorCount: byLevel[LogLevel.ERROR] || 0,
      warningCount: byLevel[LogLevel.WARN] || 0
    };
  }

  private addLog(log: StateTransitionLog): void {
    this.logs.push(log);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private sanitizeState(state: any): any {
    if (!state) return undefined;

    // Create a shallow copy to avoid circular references
    try {
      return JSON.parse(JSON.stringify(state));
    } catch (error) {
      return { _error: 'Could not serialize state' };
    }
  }

  private logToConsole(log: StateTransitionLog): void {
    const prefix = `[ATLAS ${log.feature}]`;
    const message = `${log.action}`;
    const details = {
      timestamp: log.timestamp,
      fromState: log.fromState,
      toState: log.toState,
      metadata: log.metadata,
      correlationId: log.correlationId
    };

    switch (log.level) {
      case LogLevel.ERROR:
        console.error(prefix, message, details);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, details);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, details);
        break;
      default:
        console.log(prefix, message, details);
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
