import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Telemetry event types for ATLAS API usage tracking
 */
export enum TelemetryEventType {
  API_REQUEST = 'API_REQUEST',
  API_RESPONSE = 'API_RESPONSE',
  API_ERROR = 'API_ERROR',
  STATE_TRANSITION = 'STATE_TRANSITION',
  USER_INTERACTION = 'USER_INTERACTION',
  HEALTH_CHECK = 'HEALTH_CHECK'
}

/**
 * Telemetry event data structure
 */
export interface TelemetryEvent {
  eventType: TelemetryEventType;
  timestamp: Date;
  data: any;
  correlationId?: string;
}

/**
 * API telemetry metrics
 */
export interface ApiTelemetryMetrics {
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Aggregated API metrics
 */
export interface AggregatedApiMetrics {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
}

/**
 * Service for tracking and reporting telemetry data about ATLAS API usage
 * 
 * Requirements:
 * - 13.1: Send telemetry data about ATLAS API usage to monitoring systems
 * - 13.3: Track API response times and success rates
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasTelemetryService {
  private telemetryEvents$ = new Subject<TelemetryEvent>();
  private apiMetrics: ApiTelemetryMetrics[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 metrics

  constructor() {}

  /**
   * Get observable stream of telemetry events
   */
  getTelemetryEvents(): Observable<TelemetryEvent> {
    return this.telemetryEvents$.asObservable();
  }

  /**
   * Track API request start
   */
  trackApiRequest(endpoint: string, method: string, correlationId?: string): void {
    const event: TelemetryEvent = {
      eventType: TelemetryEventType.API_REQUEST,
      timestamp: new Date(),
      data: { endpoint, method },
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Track API response and calculate metrics
   */
  trackApiResponse(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    correlationId?: string
  ): void {
    const success = statusCode >= 200 && statusCode < 300;
    
    const metrics: ApiTelemetryMetrics = {
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      success,
      timestamp: new Date(),
      correlationId
    };

    this.addMetric(metrics);

    const event: TelemetryEvent = {
      eventType: TelemetryEventType.API_RESPONSE,
      timestamp: new Date(),
      data: metrics,
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Track API error
   */
  trackApiError(
    endpoint: string,
    method: string,
    errorMessage: string,
    responseTimeMs: number,
    correlationId?: string
  ): void {
    const metrics: ApiTelemetryMetrics = {
      endpoint,
      method,
      responseTimeMs,
      success: false,
      errorMessage,
      timestamp: new Date(),
      correlationId
    };

    this.addMetric(metrics);

    const event: TelemetryEvent = {
      eventType: TelemetryEventType.API_ERROR,
      timestamp: new Date(),
      data: metrics,
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Track state transition
   */
  trackStateTransition(data: any, correlationId?: string): void {
    const event: TelemetryEvent = {
      eventType: TelemetryEventType.STATE_TRANSITION,
      timestamp: new Date(),
      data,
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(data: any, correlationId?: string): void {
    const event: TelemetryEvent = {
      eventType: TelemetryEventType.USER_INTERACTION,
      timestamp: new Date(),
      data,
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Track health check
   */
  trackHealthCheck(data: any, correlationId?: string): void {
    const event: TelemetryEvent = {
      eventType: TelemetryEventType.HEALTH_CHECK,
      timestamp: new Date(),
      data,
      correlationId
    };
    this.telemetryEvents$.next(event);
  }

  /**
   * Get aggregated metrics for a specific endpoint
   */
  getAggregatedMetrics(endpoint?: string): AggregatedApiMetrics[] {
    const metricsToAggregate = endpoint
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;

    const groupedByEndpoint = this.groupBy(metricsToAggregate, 'endpoint');
    
    return Object.entries(groupedByEndpoint).map(([ep, metrics]) => {
      const responseTimes = metrics.map(m => m.responseTimeMs).sort((a, b) => a - b);
      const successfulRequests = metrics.filter(m => m.success).length;
      
      return {
        endpoint: ep,
        totalRequests: metrics.length,
        successfulRequests,
        failedRequests: metrics.length - successfulRequests,
        successRate: metrics.length > 0 ? (successfulRequests / metrics.length) * 100 : 0,
        averageResponseTimeMs: this.average(responseTimes),
        minResponseTimeMs: Math.min(...responseTimes),
        maxResponseTimeMs: Math.max(...responseTimes),
        p95ResponseTimeMs: this.percentile(responseTimes, 95),
        p99ResponseTimeMs: this.percentile(responseTimes, 99)
      };
    });
  }

  /**
   * Get recent API metrics
   */
  getRecentMetrics(count: number = 100): ApiTelemetryMetrics[] {
    return this.apiMetrics.slice(-count);
  }

  /**
   * Get success rate for a specific endpoint
   */
  getSuccessRate(endpoint?: string): number {
    const metrics = endpoint
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;

    if (metrics.length === 0) return 100;

    const successfulRequests = metrics.filter(m => m.success).length;
    return (successfulRequests / metrics.length) * 100;
  }

  /**
   * Get average response time for a specific endpoint
   */
  getAverageResponseTime(endpoint?: string): number {
    const metrics = endpoint
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;

    if (metrics.length === 0) return 0;

    const responseTimes = metrics.map(m => m.responseTimeMs);
    return this.average(responseTimes);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.apiMetrics = [];
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: ApiTelemetryMetrics[];
    aggregated: AggregatedApiMetrics[];
    exportedAt: Date;
  } {
    return {
      metrics: [...this.apiMetrics],
      aggregated: this.getAggregatedMetrics(),
      exportedAt: new Date()
    };
  }

  private addMetric(metric: ApiTelemetryMetrics): void {
    this.apiMetrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.apiMetrics.length > this.maxMetricsHistory) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsHistory);
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private percentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)];
  }
}
