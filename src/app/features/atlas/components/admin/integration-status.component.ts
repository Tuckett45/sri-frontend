import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AtlasConfigService, AtlasConfiguration } from '../../services/atlas-config.service';
import { AtlasRoutingService } from '../../services/atlas-routing.service';
import { AtlasServiceLoggerService, ServiceRoutingStatistics } from '../../services/atlas-service-logger.service';
import { AtlasFallbackService } from '../../services/atlas-fallback.service';
import { AtlasHybridService } from '../../services/atlas-hybrid.service';

/**
 * Integration Status Component
 * 
 * Admin interface for monitoring ATLAS integration status and configuration.
 * Displays real-time statistics about service routing, fallbacks, and errors.
 * 
 * Requirements: 10.9
 */
@Component({
  selector: 'app-atlas-integration-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="integration-status-container">
      <h2>ATLAS Integration Status</h2>

      <!-- Overall Status -->
      <div class="status-card">
        <h3>Overall Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="label">ATLAS Enabled:</span>
            <span class="value" [class.enabled]="config.features.enabled" [class.disabled]="!config.features.enabled">
              {{ config.features.enabled ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Hybrid Mode:</span>
            <span class="value">{{ config.features.hybridMode ? 'Yes' : 'No' }}</span>
          </div>
          <div class="status-item">
            <span class="label">Environment:</span>
            <span class="value">{{ environment }}</span>
          </div>
          <div class="status-item">
            <span class="label">Base URL:</span>
            <span class="value">{{ config.baseUrl }}</span>
          </div>
        </div>
      </div>

      <!-- Feature Status -->
      <div class="status-card">
        <h3>Feature Status</h3>
        <div class="feature-list">
          <div *ngFor="let feature of allFeatures" class="feature-item">
            <span class="feature-name">{{ feature }}</span>
            <span class="feature-status" [class.atlas]="isFeatureUsingAtlas(feature)" [class.ark]="!isFeatureUsingAtlas(feature)">
              {{ isFeatureUsingAtlas(feature) ? 'ATLAS' : 'ARK' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Routing Statistics -->
      <div class="status-card">
        <h3>Routing Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Requests:</span>
            <span class="stat-value">{{ routingStats.totalRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">ATLAS Requests:</span>
            <span class="stat-value">{{ routingStats.atlasRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">ARK Requests:</span>
            <span class="stat-value">{{ routingStats.arkRequests }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Success Rate:</span>
            <span class="stat-value">{{ getSuccessRate() }}%</span>
          </div>
        </div>
      </div>

      <!-- Fallback Statistics -->
      <div class="status-card" *ngIf="config.features.enabled">
        <h3>Fallback Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Fallbacks:</span>
            <span class="stat-value">{{ fallbackStats.totalFallbacks }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Fallback Rate:</span>
            <span class="stat-value">{{ fallbackStats.fallbackRate.toFixed(2) }}%</span>
          </div>
        </div>
        <div class="fallback-by-feature" *ngIf="hasFallbacks()">
          <h4>Fallbacks by Feature:</h4>
          <div *ngFor="let feature of getFallbackFeatures()" class="fallback-item">
            <span>{{ feature }}:</span>
            <span>{{ fallbackStats.fallbacksByFeature[feature] }}</span>
          </div>
        </div>
      </div>

      <!-- Service Statistics by Feature -->
      <div class="status-card">
        <h3>Statistics by Feature</h3>
        <div class="feature-stats">
          <div *ngFor="let feature of getFeatureNames()" class="feature-stat-item">
            <h4>{{ feature }}</h4>
            <div class="feature-stat-grid">
              <div class="stat-item">
                <span class="stat-label">ATLAS:</span>
                <span class="stat-value">{{ routingStats.byFeature[feature]?.atlas || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">ARK:</span>
                <span class="stat-value">{{ routingStats.byFeature[feature]?.ark || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Success:</span>
                <span class="stat-value">{{ routingStats.byFeature[feature]?.success || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Failed:</span>
                <span class="stat-value">{{ routingStats.byFeature[feature]?.failed || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Errors -->
      <div class="status-card" *ngIf="recentErrors.length > 0">
        <h3>Recent Errors (Last 10)</h3>
        <div class="error-list">
          <div *ngFor="let error of recentErrors" class="error-item">
            <div class="error-header">
              <span class="error-time">{{ formatTime(error.timestamp) }}</span>
              <span class="error-service">{{ error.service }}</span>
              <span class="error-feature">{{ error.featureName }}</span>
            </div>
            <div class="error-message">{{ error.error }}</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button (click)="refreshStats()" class="btn-primary">Refresh Statistics</button>
        <button (click)="clearLogs()" class="btn-secondary">Clear Logs</button>
        <button (click)="exportLogs()" class="btn-secondary">Export Logs</button>
      </div>
    </div>
  `,
  styles: [`
    .integration-status-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 20px;
      color: #333;
    }

    .status-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-card h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #555;
      font-size: 18px;
    }

    .status-grid, .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .status-item, .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .label, .stat-label {
      font-weight: 600;
      color: #666;
    }

    .value, .stat-value {
      color: #333;
    }

    .value.enabled {
      color: #4caf50;
      font-weight: 600;
    }

    .value.disabled {
      color: #f44336;
      font-weight: 600;
    }

    .feature-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 10px;
    }

    .feature-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .feature-name {
      font-weight: 500;
    }

    .feature-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .feature-status.atlas {
      background: #e3f2fd;
      color: #1976d2;
    }

    .feature-status.ark {
      background: #fff3e0;
      color: #f57c00;
    }

    .feature-stats {
      display: grid;
      gap: 15px;
    }

    .feature-stat-item {
      border-left: 3px solid #1976d2;
      padding-left: 15px;
    }

    .feature-stat-item h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .feature-stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .fallback-by-feature {
      margin-top: 15px;
    }

    .fallback-by-feature h4 {
      margin-bottom: 10px;
      color: #666;
      font-size: 14px;
    }

    .fallback-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #fff3e0;
      border-radius: 4px;
      margin-bottom: 5px;
    }

    .error-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .error-item {
      padding: 10px;
      background: #ffebee;
      border-left: 3px solid #f44336;
      border-radius: 4px;
    }

    .error-header {
      display: flex;
      gap: 15px;
      margin-bottom: 5px;
      font-size: 12px;
    }

    .error-time {
      color: #666;
    }

    .error-service, .error-feature {
      font-weight: 600;
      color: #333;
    }

    .error-message {
      color: #d32f2f;
      font-size: 13px;
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .btn-primary {
      background: #1976d2;
      color: white;
    }

    .btn-primary:hover {
      background: #1565c0;
    }

    .btn-secondary {
      background: #757575;
      color: white;
    }

    .btn-secondary:hover {
      background: #616161;
    }
  `]
})
export class IntegrationStatusComponent implements OnInit, OnDestroy {
  config: AtlasConfiguration;
  environment: string;
  routingStats: ServiceRoutingStatistics;
  fallbackStats: any;
  recentErrors: any[] = [];
  allFeatures = ['deployments', 'aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder'];

  private destroy$ = new Subject<void>();

  constructor(
    private configService: AtlasConfigService,
    private routingService: AtlasRoutingService,
    private loggerService: AtlasServiceLoggerService,
    private fallbackService: AtlasFallbackService,
    private hybridService: AtlasHybridService
  ) {
    this.config = this.configService.config;
    this.environment = this.configService.getEnvironment();
    this.routingStats = this.getEmptyStats();
    this.fallbackStats = { totalFallbacks: 0, fallbacksByFeature: {}, fallbackRate: 0 };
  }

  ngOnInit(): void {
    this.loadStats();

    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadStats());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.config = this.configService.config;
    this.routingStats = this.loggerService.getStatistics();
    this.fallbackStats = this.fallbackService.getFallbackStatistics();
    this.recentErrors = this.loggerService.getRecentErrors(10);
  }

  refreshStats(): void {
    this.loadStats();
  }

  clearLogs(): void {
    if (confirm('Are you sure you want to clear all logs?')) {
      this.loggerService.clearLogs();
      this.routingService.clearRoutingLog();
      this.loadStats();
    }
  }

  exportLogs(): void {
    const logs = this.loggerService.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-logs-${new Date().toISOString()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  isFeatureUsingAtlas(feature: string): boolean {
    return this.hybridService.shouldFeatureUseAtlas(feature);
  }

  getSuccessRate(): string {
    if (this.routingStats.totalRequests === 0) {
      return '0.00';
    }
    const rate = (this.routingStats.successfulRequests / this.routingStats.totalRequests) * 100;
    return rate.toFixed(2);
  }

  hasFallbacks(): boolean {
    return this.fallbackStats.totalFallbacks > 0;
  }

  getFallbackFeatures(): string[] {
    return Object.keys(this.fallbackStats.fallbacksByFeature);
  }

  getFeatureNames(): string[] {
    return Object.keys(this.routingStats.byFeature);
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  private getEmptyStats(): ServiceRoutingStatistics {
    return {
      totalRequests: 0,
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
  }
}
