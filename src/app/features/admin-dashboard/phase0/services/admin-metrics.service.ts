import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AdminMetrics, AuditLogEntry, SystemHealth, UserActivity } from '../models/admin-viewer.models';
import { CacheService } from '../../../field-resource-management/services/cache.service';

/**
 * Admin Metrics Service
 * 
 * Provides admin dashboard metrics with caching
 * Implements cache TTL enforcement and automatic cache invalidation
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 16.1, 16.3, 16.4**
 */
@Injectable({
  providedIn: 'root'
})
export class AdminMetricsService {
  private readonly API_BASE = '/api/admin';
  private readonly CACHE_TTL = 30000; // 30 seconds (Requirement 16.1)

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Load admin metrics with caching
   * Cache expires after 30 seconds (Requirement 16.1)
   * Fetches fresh data when cache expired (Requirement 16.3)
   * 
   * **Validates: Requirements 1.2, 16.1, 16.3**
   */
  loadAdminMetrics(timeRange?: string): Observable<{
    metrics: AdminMetrics;
    systemHealth: SystemHealth;
    activeUsers: UserActivity[];
  }> {
    const cacheKey = `admin-metrics_${timeRange || 'default'}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        const params: any = {};
        if (timeRange) {
          params.timeRange = timeRange;
        }
        
        return this.http.get<any>(`${this.API_BASE}/metrics`, { params }).pipe(
          map(response => ({
            metrics: response.metrics,
            systemHealth: response.systemHealth,
            activeUsers: response.activeUsers
          })),
          catchError(error => {
            console.error('Error loading admin metrics:', error);
            throw error;
          })
        );
      },
      this.CACHE_TTL
    );
  }

  /**
   * Filter audit log entries
   * 
   * **Validates: Requirements 1.3, 1.4**
   */
  filterAuditLog(filters?: {
    userId?: string;
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Observable<AuditLogEntry[]> {
    const params: any = {};
    
    if (filters) {
      if (filters.userId) params.userId = filters.userId;
      if (filters.actionType) params.actionType = filters.actionType;
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();
    }

    return this.http.get<AuditLogEntry[]>(`${this.API_BASE}/audit-log`, { params }).pipe(
      catchError(error => {
        console.error('Error loading audit log:', error);
        throw error;
      })
    );
  }

  /**
   * Export audit log in specified format
   * 
   * **Validates: Requirement 1.5**
   */
  exportAuditLog(format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.API_BASE}/audit-log/export`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      map(blob => {
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        return blob;
      }),
      catchError(error => {
        console.error('Error exporting audit log:', error);
        throw error;
      })
    );
  }

  /**
   * Clear all admin metrics caches
   * Called when data is updated (Requirement 16.4)
   * 
   * **Validates: Requirement 16.4**
   */
  clearCache(): void {
    this.cacheService.invalidatePattern(/^admin-metrics_/);
  }
}
