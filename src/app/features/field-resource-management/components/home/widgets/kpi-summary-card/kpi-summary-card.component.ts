import { Component, Input } from '@angular/core';
import { KpiItem } from '../../../../models/dashboard.models';


@Component({
  selector: 'app-kpi-summary-card',
  templateUrl: './kpi-summary-card.component.html',
  styleUrls: ['./kpi-summary-card.component.scss']
})
export class KpiSummaryCardComponent {
  @Input() kpis: KpiItem[] = [];

  getTrendIcon(trend?: 'positive' | 'negative' | 'neutral'): string {
    switch (trend) {
      case 'positive': return 'trending_up';
      case 'negative': return 'trending_down';
      case 'neutral': return 'trending_flat';
      default: return '';
    }
  }

  getTrendClass(trend?: 'positive' | 'negative' | 'neutral'): string {
    switch (trend) {
      case 'positive': return 'trend-positive';
      case 'negative': return 'trend-negative';
      case 'neutral': return 'trend-neutral';
      default: return '';
    }
  }

  getColorClass(color: 'primary' | 'success' | 'accent'): string {
    switch (color) {
      case 'primary': return 'kpi-primary';
      case 'success': return 'kpi-success';
      case 'accent': return 'kpi-accent';
      default: return '';
    }
  }
}
