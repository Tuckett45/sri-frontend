import { Component, OnInit } from '@angular/core';

interface KpiItem {
  label: string;
  value: string | number;
  icon: string;
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-kpi-summary-card',
  templateUrl: './kpi-summary-card.component.html',
  styleUrls: ['./kpi-summary-card.component.scss']
})
export class KpiSummaryCardComponent implements OnInit {
  kpis: KpiItem[] = [
    { label: 'Open Jobs', value: 0, icon: 'work', trend: 'up' },
    { label: 'Active Technicians', value: 0, icon: 'people', trend: 'stable' },
    { label: 'Completion Rate', value: '0%', icon: 'check_circle', trend: 'up' },
    { label: 'Avg Response Time', value: '0h', icon: 'timer', trend: 'down' }
  ];

  ngOnInit(): void {}

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getTrendClass(trend: string): string {
    switch (trend) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      default: return 'trend-stable';
    }
  }
}
