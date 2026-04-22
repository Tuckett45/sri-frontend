import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { AtlasTelemetryService } from './atlas-telemetry.service';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Service health check result
 */
export interface ServiceHealthCheck {
  serviceName: string;
  status: HealthStatus;
  responseTimeMs?: number;
  lastChecked: Date;
  errorMessage?: string;
  details?: any;
}

/**
 * Overall ATLAS health status
 */
export interface AtlasHealthStatus {
  overallStatus: HealthStatus;
  services: ServiceHealthCheck[];
  lastUpdated: Date;
}

/**
 * Service for monitoring ATLAS service health and connectivity
 * 
 * Requirements:
 * - 13.5: Add health check endpoints for ATLAS service connectivity
 * - 13.6: Display service status in admin dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasHealthService {
  private readonly healthCheckInterval = 60000; // Check every 60 seconds
  private healthStatus$ = new BehaviorSubject<AtlasHealthStatus>({
    overallStatus: HealthStatus.UNKNOWN,
    services: [],
    lastUpdated: new Date()
  });

  private readonly serviceEndpoints = [
    { name: 'Deployments', path: '/v1/deployments/health' },
    { name: 'AI Analysis', path: '/v1/ai-analysis/health' },
    { name: 'Approvals', path: '/v1/approvals/health' },
    { name: 'Exceptions', path: '/v1/exceptions/health' },
    { name: 'Agents', path: '/v1/agents/health' },
    { name: 'Query Builder', path: '/v1/query-builder/health' }
  ];

  constructor(
    private http: HttpClient,
    private telemetry: AtlasTelemetryService
  ) {}

  /**
   * Get observable stream of health status updates
   */
  getHealthStatus(): Observable<AtlasHealthStatus> {
    return this.healthStatus$.asObservable();
  }

  /**
   * Get current health status synchronously
   */
  getCurrentHealthStatus(): AtlasHealthStatus {
    return this.healthStatus$.value;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    // Perform initial check
    this.performHealthCheck();

    // Set up periodic checks
    interval(this.healthCheckInterval)
      .pipe(
        switchMap(() => this.performHealthCheck())
      )
      .subscribe();
  }

  /**
   * Perform health check on all ATLAS services
   */
  performHealthCheck(): Observable<AtlasHealthStatus> {
    const startTime = Date.now();
    const healthChecks: Observable<ServiceHealthCheck>[] = this.serviceEndpoints.map(
      endpoint => this.checkServiceHealth(endpoint.name, endpoint.path)
    );

    return new Observable(observer => {
      Promise.all(healthChecks.map(check => check.toPromise()))
        .then(results => {
          const validResults = results.filter((r): r is ServiceHealthCheck => r !== undefined);
          const overallStatus = this.calculateOverallStatus(validResults);
          const healthStatus: AtlasHealthStatus = {
            overallStatus,
            services: validResults,
            lastUpdated: new Date()
          };

          this.healthStatus$.next(healthStatus);
          
          // Track health check telemetry
          this.telemetry.trackHealthCheck({
            overallStatus,
            serviceCount: validResults.length,
            healthyServices: validResults.filter(r => r.status === HealthStatus.HEALTHY).length,
            checkDurationMs: Date.now() - startTime
          });

          observer.next(healthStatus);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Check health of a specific service
   */
  checkServiceHealth(serviceName: string, endpoint: string): Observable<ServiceHealthCheck> {
    const startTime = Date.now();

    return this.http.get(endpoint, { observe: 'response' }).pipe(
      map(response => {
        const responseTimeMs = Date.now() - startTime;
        return {
          serviceName,
          status: this.mapHttpStatusToHealth(response.status),
          responseTimeMs,
          lastChecked: new Date(),
          details: response.body
        };
      }),
      catchError(error => {
        const responseTimeMs = Date.now() - startTime;
        return of({
          serviceName,
          status: HealthStatus.UNHEALTHY,
          responseTimeMs,
          lastChecked: new Date(),
          errorMessage: error.message || 'Service unavailable'
        });
      })
    );
  }

  /**
   * Check if ATLAS is healthy
   */
  isHealthy(): boolean {
    const status = this.healthStatus$.value;
    return status.overallStatus === HealthStatus.HEALTHY;
  }

  /**
   * Check if a specific service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    const status = this.healthStatus$.value;
    const service = status.services.find(s => s.serviceName === serviceName);
    return service?.status === HealthStatus.HEALTHY;
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName: string): ServiceHealthCheck | undefined {
    const status = this.healthStatus$.value;
    return status.services.find(s => s.serviceName === serviceName);
  }

  /**
   * Get count of healthy services
   */
  getHealthyServiceCount(): number {
    const status = this.healthStatus$.value;
    return status.services.filter(s => s.status === HealthStatus.HEALTHY).length;
  }

  /**
   * Get count of unhealthy services
   */
  getUnhealthyServiceCount(): number {
    const status = this.healthStatus$.value;
    return status.services.filter(s => s.status === HealthStatus.UNHEALTHY).length;
  }

  /**
   * Get average response time across all services
   */
  getAverageResponseTime(): number {
    const status = this.healthStatus$.value;
    const responseTimes = status.services
      .filter(s => s.responseTimeMs !== undefined)
      .map(s => s.responseTimeMs!);

    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  private mapHttpStatusToHealth(statusCode: number): HealthStatus {
    if (statusCode >= 200 && statusCode < 300) {
      return HealthStatus.HEALTHY;
    } else if (statusCode >= 500) {
      return HealthStatus.UNHEALTHY;
    } else {
      return HealthStatus.DEGRADED;
    }
  }

  private calculateOverallStatus(services: ServiceHealthCheck[]): HealthStatus {
    if (services.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    const unhealthyCount = services.filter(s => s.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = services.filter(s => s.status === HealthStatus.DEGRADED).length;

    // If more than 50% are unhealthy, overall is unhealthy
    if (unhealthyCount > services.length / 2) {
      return HealthStatus.UNHEALTHY;
    }

    // If any are unhealthy or degraded, overall is degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return HealthStatus.DEGRADED;
    }

    // All services are healthy
    return HealthStatus.HEALTHY;
  }
}
