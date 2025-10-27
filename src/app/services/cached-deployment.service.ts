import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { map, shareReplay, switchMap, tap, catchError } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface DeploymentListItem {
  id: string;
  name: string;
  dataCenter: string;
  vendorName: string;
  status: string;
  startDate?: Date;
  targetHandoffDate?: Date;
  createdDate: Date;
  updatedDate?: Date;
  deploymentEngineerId?: string;
  deploymentEngineerName?: string;
  isSignedOff: boolean;
  signedOffAt?: Date;
  progressPercentage: number;
  totalIssues: number;
  openIssues: number;
  criticalIssues: number;
}

export interface DeploymentListResponse {
  total: number;
  rows: DeploymentListItem[];
}

export interface DeploymentQueryParams {
  status?: string;
  vendor?: string;
  dataCenter?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class CachedDeploymentService {
  private readonly baseUrl = `${environment.apiUrl}/api/deployments`;
  private readonly cache = new Map<string, CacheEntry<any>>();
  
  // Cache configuration
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly LIST_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for lists
  private readonly DETAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for details
  
  // Real-time data streams
  private deploymentsSubject = new BehaviorSubject<DeploymentListItem[]>([]);
  public deployments$ = this.deploymentsSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {
    // Clean up expired cache entries every 5 minutes
    timer(0, 5 * 60 * 1000).subscribe(() => this.cleanupExpiredCache());
  }

  /**
   * Get deployments list with caching and real-time updates
   */
  getDeployments(params: DeploymentQueryParams = {}): Observable<DeploymentListResponse> {
    const cacheKey = this.generateCacheKey('deployments-list', params);
    
    // Check cache first
    const cached = this.getFromCache<DeploymentListResponse>(cacheKey);
    if (cached) {
      return of(cached);
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<DeploymentListResponse>(this.baseUrl, { params: httpParams }).pipe(
      tap(response => {
        // Cache the response
        this.setCache(cacheKey, response, this.LIST_CACHE_TTL);
        
        // Update the deployments stream
        this.deploymentsSubject.next(response.rows);
        
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next(error.message || 'Failed to load deployments');
        throw error;
      }),
      shareReplay(1)
    );
  }

  /**
   * Get single deployment with caching
   */
  getDeployment(id: string): Observable<any> {
    const cacheKey = `deployment-${id}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get(`${this.baseUrl}/${id}`).pipe(
      tap(deployment => {
        // Cache the deployment
        this.setCache(cacheKey, deployment, this.DETAIL_CACHE_TTL);
      }),
      shareReplay(1)
    );
  }

  /**
   * Create deployment and invalidate cache
   */
  createDeployment(deployment: any): Observable<any> {
    return this.http.post(this.baseUrl, deployment).pipe(
      tap(() => {
        // Invalidate list caches
        this.invalidateListCaches();
      })
    );
  }

  /**
   * Update deployment and invalidate cache
   */
  updateDeployment(id: string, deployment: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, deployment).pipe(
      tap(() => {
        // Invalidate specific deployment and list caches
        this.invalidateCache(`deployment-${id}`);
        this.invalidateListCaches();
      })
    );
  }

  /**
   * Get deployment progress with short-term caching
   */
  getDeploymentProgress(id: string): Observable<any> {
    const cacheKey = `deployment-progress-${id}`;
    
    // Check cache with shorter TTL for progress data
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get(`${this.baseUrl}/${id}/progress`).pipe(
      tap(progress => {
        // Cache progress with shorter TTL (1 minute)
        this.setCache(cacheKey, progress, 60 * 1000);
      }),
      shareReplay(1)
    );
  }

  /**
   * Save deployment progress and invalidate cache
   */
  saveDeploymentProgress(id: string, progress: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/progress`, progress).pipe(
      tap(() => {
        // Invalidate progress cache
        this.invalidateCache(`deployment-progress-${id}`);
        this.invalidateCache(`deployment-${id}`);
      })
    );
  }

  /**
   * Refresh deployments list (bypass cache)
   */
  refreshDeployments(params: DeploymentQueryParams = {}): Observable<DeploymentListResponse> {
    const cacheKey = this.generateCacheKey('deployments-list', params);
    this.invalidateCache(cacheKey);
    return this.getDeployments(params);
  }

  /**
   * Get cached deployments count for performance metrics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses for real hit rate
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private generateCacheKey(prefix: string, params: any): string {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `${prefix}-${paramString}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  private invalidateListCaches(): void {
    // Remove all deployment list caches
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith('deployments-list'));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

/**
 * Performance monitoring service for deployments
 */
@Injectable({
  providedIn: 'root'
})
export class DeploymentPerformanceService {
  private metrics: Array<{
    operation: string;
    duration: number;
    timestamp: number;
    fromCache: boolean;
  }> = [];

  recordOperation(operation: string, startTime: number, fromCache: boolean = false): void {
    const duration = performance.now() - startTime;
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      fromCache
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow operations
    if (duration > 1000 && !fromCache) {
      console.warn(`Slow deployment operation: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(): any[] {
    return [...this.metrics];
  }

  getAverageResponseTime(operation?: string): number {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const cacheHits = this.metrics.filter(m => m.fromCache).length;
    return (cacheHits / this.metrics.length) * 100;
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}
