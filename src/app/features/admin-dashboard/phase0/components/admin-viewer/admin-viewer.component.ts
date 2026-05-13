import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AdminMetrics,
  AuditLogEntry,
  SystemHealth,
  UserActivity
} from '../../models/admin-viewer.models';
import {
  selectAdminMetrics,
  selectActiveUsers,
  selectSystemHealth,
  selectFilteredAuditLog,
  selectAdminViewerLoading,
  selectAdminViewerError
} from '../../state/admin-viewer/admin-viewer.selectors';
import {
  loadAdminMetrics,
  loadAuditLog,
  filterAuditLog,
  exportAuditLog,
  refreshMetrics
} from '../../state/admin-viewer/admin-viewer.actions';
import { Insight } from '../../../phase3/models/recommendation.models';
import { selectInsights } from '../../../phase3/state/insights/insights.selectors';

@Component({
  selector: 'app-admin-viewer',
  templateUrl: './admin-viewer.component.html',
  styleUrls: ['./admin-viewer.component.scss']
})
export class AdminViewerComponent implements OnInit, OnDestroy {
  // Observables from store
  adminMetrics$: Observable<AdminMetrics | null>;
  activeUsers$: Observable<UserActivity[]>;
  systemHealth$: Observable<SystemHealth | null>;
  auditLog$: Observable<AuditLogEntry[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  insights$: Observable<Insight[]>;

  // Component state
  selectedTimeRange: string = 'last24hours';
  refreshInterval: number = 30000; // 30 seconds
  autoRefreshEnabled: boolean = true;

  // Filter state
  userIdFilter: string = '';
  actionTypeFilter: string = '';
  startDateFilter: Date | null = null;
  endDateFilter: Date | null = null;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.adminMetrics$ = this.store.select(selectAdminMetrics);
    this.activeUsers$ = this.store.select(selectActiveUsers);
    this.systemHealth$ = this.store.select(selectSystemHealth);
    this.auditLog$ = this.store.select(selectFilteredAuditLog);
    this.loading$ = this.store.select(selectAdminViewerLoading);
    this.error$ = this.store.select(selectAdminViewerError);
    this.insights$ = this.store.select(selectInsights);
  }

  ngOnInit(): void {
    // Initial data load
    this.loadData();

    // Set up auto-refresh
    if (this.autoRefreshEnabled) {
      interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshMetrics();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load initial data
   */
  private loadData(): void {
    this.store.dispatch(loadAdminMetrics({ timeRange: this.selectedTimeRange }));
    this.store.dispatch(loadAuditLog({}));
  }

  /**
   * Refresh metrics manually
   */
  refreshMetrics(): void {
    this.store.dispatch(refreshMetrics());
    this.store.dispatch(loadAdminMetrics({ timeRange: this.selectedTimeRange }));
  }

  /**
   * Export audit log in specified format
   */
  exportAuditLog(format: 'csv' | 'pdf'): void {
    this.store.dispatch(exportAuditLog({ format }));
  }

  /**
   * Filter audit log by user ID
   */
  filterByUser(userId: string): void {
    this.userIdFilter = userId;
    this.applyFilters();
  }

  /**
   * Filter audit log by action type
   */
  filterByAction(actionType: string): void {
    this.actionTypeFilter = actionType;
    this.applyFilters();
  }

  /**
   * Apply all current filters
   */
  applyFilters(): void {
    const filters: any = {};
    
    if (this.userIdFilter) {
      filters.userId = this.userIdFilter;
    }
    
    if (this.actionTypeFilter) {
      filters.actionType = this.actionTypeFilter;
    }
    
    if (this.startDateFilter) {
      filters.startDate = this.startDateFilter;
    }
    
    if (this.endDateFilter) {
      filters.endDate = this.endDateFilter;
    }

    this.store.dispatch(filterAuditLog({ filters }));
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.userIdFilter = '';
    this.actionTypeFilter = '';
    this.startDateFilter = null;
    this.endDateFilter = null;
    this.store.dispatch(filterAuditLog({ filters: {} }));
  }

  /**
   * Change time range and reload data
   */
  onTimeRangeChange(timeRange: string): void {
    this.selectedTimeRange = timeRange;
    this.store.dispatch(loadAdminMetrics({ timeRange }));
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshMetrics();
        });
    }
  }

  /**
   * Get health status CSS class
   */
  getHealthStatusClass(status: string | undefined): string {
    switch (status) {
      case 'healthy':
        return 'health-healthy';
      case 'degraded':
        return 'health-degraded';
      case 'critical':
        return 'health-critical';
      default:
        return 'health-unknown';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date: Date | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Format duration in seconds to human-readable format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
