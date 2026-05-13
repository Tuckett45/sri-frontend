import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AtlasHealthService, AtlasHealthStatus, HealthStatus, ServiceHealthCheck } from '../../services/atlas-health.service';

/**
 * Component for displaying ATLAS service health status in admin dashboard
 * 
 * Requirements:
 * - 13.6: Display service status in admin dashboard
 */
@Component({
  selector: 'app-health-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-dashboard">
      <div class="dashboard-header">
        <h2>ATLAS Service Health</h2>
        <button (click)="refreshHealth()" class="refresh-btn">
          Refresh
        </button>
      </div>

      <div class="overall-status" [class]="'status-' + healthStatus?.overallStatus?.toLowerCase()">
        <div class="status-icon">
          <span *ngIf="healthStatus?.overallStatus === 'HEALTHY'">✓</span>
          <span *ngIf="healthStatus?.overallStatus === 'DEGRADED'">⚠</span>
          <span *ngIf="healthStatus?.overallStatus === 'UNHEALTHY'">✗</span>
          <span *ngIf="healthStatus?.overallStatus === 'UNKNOWN'">?</span>
        </div>
        <div class="status-info">
          <h3>Overall Status: {{ healthStatus?.overallStatus }}</h3>
          <p>Last Updated: {{ healthStatus?.lastUpdated | date:'short' }}</p>
          <p>
            {{ getHealthyCount() }} of {{ getTotalCount() }} services healthy
            (Avg Response: {{ getAvgResponseTime() }}ms)
          </p>
        </div>
      </div>

      <div class="services-grid">
        <div *ngFor="let service of healthStatus?.services" 
             class="service-card"
             [class]="'status-' + service.status.toLowerCase()">
          <div class="service-header">
            <h4>{{ service.serviceName }}</h4>
            <span class="status-badge">{{ service.status }}</span>
          </div>
          <div class="service-details">
            <p *ngIf="service.responseTimeMs">
              Response Time: {{ service.responseTimeMs }}ms
            </p>
            <p>Last Checked: {{ service.lastChecked | date:'short' }}</p>
            <p *ngIf="service.errorMessage" class="error-message">
              Error: {{ service.errorMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-dashboard {
      padding: 20px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .refresh-btn {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .refresh-btn:hover {
      background-color: #0056b3;
    }

    .overall-status {
      display: flex;
      align-items: center;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border: 2px solid;
    }

    .overall-status.status-healthy {
      background-color: #d4edda;
      border-color: #28a745;
      color: #155724;
    }

    .overall-status.status-degraded {
      background-color: #fff3cd;
      border-color: #ffc107;
      color: #856404;
    }

    .overall-status.status-unhealthy {
      background-color: #f8d7da;
      border-color: #dc3545;
      color: #721c24;
    }

    .overall-status.status-unknown {
      background-color: #e2e3e5;
      border-color: #6c757d;
      color: #383d41;
    }

    .status-icon {
      font-size: 48px;
      margin-right: 20px;
    }

    .status-info h3 {
      margin: 0 0 10px 0;
    }

    .status-info p {
      margin: 5px 0;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .service-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background-color: white;
    }

    .service-card.status-healthy {
      border-left: 4px solid #28a745;
    }

    .service-card.status-degraded {
      border-left: 4px solid #ffc107;
    }

    .service-card.status-unhealthy {
      border-left: 4px solid #dc3545;
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .service-header h4 {
      margin: 0;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    .service-card.status-healthy .status-badge {
      background-color: #28a745;
      color: white;
    }

    .service-card.status-degraded .status-badge {
      background-color: #ffc107;
      color: #000;
    }

    .service-card.status-unhealthy .status-badge {
      background-color: #dc3545;
      color: white;
    }

    .service-details p {
      margin: 5px 0;
      font-size: 14px;
    }

    .error-message {
      color: #dc3545;
      font-weight: bold;
    }
  `]
})
export class HealthDashboardComponent implements OnInit, OnDestroy {
  healthStatus: AtlasHealthStatus | null = null;
  private destroy$ = new Subject<void>();

  constructor(private healthService: AtlasHealthService) {}

  ngOnInit(): void {
    this.healthService.getHealthStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.healthStatus = status;
      });

    // Start health checks
    this.healthService.startHealthChecks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshHealth(): void {
    this.healthService.performHealthCheck().subscribe();
  }

  getHealthyCount(): number {
    return this.healthService.getHealthyServiceCount();
  }

  getTotalCount(): number {
    return this.healthStatus?.services.length || 0;
  }

  getAvgResponseTime(): number {
    return Math.round(this.healthService.getAverageResponseTime());
  }
}
