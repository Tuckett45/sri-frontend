import { Component, Input } from '@angular/core';
import { KPI, Trend, KPIStatus } from '../../../models/reporting.model';

/**
 * KPI Card Component
 * Displays a single KPI metric with trend indicator and status
 */
@Component({
  selector: 'frm-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss']
})
export class KPICardComponent {
  @Input() kpi!: KPI;
  
  // Enum references for template
  Trend = Trend;
  KPIStatus = KPIStatus;
  
  /**
   * Get trend icon based on trend value
   */
  getTrendIcon(): string {
    switch (this.kpi.trend) {
      case Trend.Up:
        return 'trending_up';
      case Trend.Down:
        return 'trending_down';
      case Trend.Stable:
        return 'trending_flat';
      default:
        return 'trending_flat';
    }
  }
  
  /**
   * Get trend color based on trend value
   */
  getTrendColor(): string {
    switch (this.kpi.trend) {
      case Trend.Up:
        return 'trend-up';
      case Trend.Down:
        return 'trend-down';
      case Trend.Stable:
        return 'trend-stable';
      default:
        return 'trend-stable';
    }
  }
  
  /**
   * Get status color based on KPI status
   */
  getStatusColor(): string {
    switch (this.kpi.status) {
      case KPIStatus.OnTrack:
        return 'status-on-track';
      case KPIStatus.AtRisk:
        return 'status-at-risk';
      case KPIStatus.BelowTarget:
        return 'status-below-target';
      default:
        return 'status-on-track';
    }
  }
  
  /**
   * Get status label
   */
  getStatusLabel(): string {
    switch (this.kpi.status) {
      case KPIStatus.OnTrack:
        return 'On Track';
      case KPIStatus.AtRisk:
        return 'At Risk';
      case KPIStatus.BelowTarget:
        return 'Below Target';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Get progress percentage (value / target * 100)
   */
  getProgressPercentage(): number {
    if (this.kpi.target === 0) return 0;
    return Math.min((this.kpi.value / this.kpi.target) * 100, 100);
  }
  
  /**
   * Get sparkline data (mock data for visualization)
   * In a real implementation, this would come from the KPI object
   */
  getSparklineData(): number[] {
    // Mock sparkline data - would be provided by API
    return [65, 70, 68, 72, 75, 73, this.kpi.value];
  }
}
