import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminMetrics, AuditLogEntry, SystemHealth, UserActivity } from '../models/admin-viewer.models';

@Injectable({
  providedIn: 'root'
})
export class AdminMetricsService {
  private readonly API_BASE = '/api/admin';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  loadAdminMetrics(timeRange?: string): Observable<{
    metrics: AdminMetrics;
    systemHealth: SystemHealth;
    activeUsers: UserActivity[];
  }> {
    const cacheKey = `metrics_${timeRange || 'default'}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    const params: any = {};
    if (timeRange) {
      params.timeRange = timeRange;
    }
    
    return this.http.get<any>(`${this.API_BASE}/metrics`, { params }).pipe(
      map(response => {
        const result = {
          metrics: response.metrics,
          systemHealth: response.systemHealth,
          activeUsers: response.activeUsers
        };
        this.setCache(cacheKey, result);
        return result;
      }),
      catchError(error => {
        console.error('Error loading admin metrics:', error);
        throw error;
      })
    );
  }

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

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }
}
