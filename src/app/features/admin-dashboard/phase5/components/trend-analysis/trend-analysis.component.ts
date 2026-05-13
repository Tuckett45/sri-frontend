/**
 * Trend Analysis Component for Phase 5: Predictive Dashboards
 * 
 * Displays trend visualization with anomaly highlighting and statistics.
 * 
 * **Validates: Requirements 14.1, 14.2, 14.6, 14.7**
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  Trend,
  TrendDataPoint,
  TrendStatistics,
  Anomaly,
  TimeRange
} from '../../models/forecast.models';
import { TrendAnalysisService, SmoothingConfig } from '../../services/trend-analysis.service';

export type ChartType = 'line' | 'area' | 'bar' | 'scatter';
export type SmoothingAlgorithm = 'none' | 'moving-average' | 'exponential';

@Component({
  selector: 'app-trend-analysis',
  templateUrl: './trend-analysis.component.html',
  styleUrls: ['./trend-analysis.component.scss']
})
export class TrendAnalysisComponent implements OnInit, OnDestroy {
  @Input() metric!: string;
  @Input() timeRange?: TimeRange;
  @Input() showAnomalies: boolean = true;
  @Input() showStatistics: boolean = true;
  @Input() chartType: ChartType = 'line';
  @Output() anomalySelected = new EventEmitter<Anomaly>();
  @Output() dataPointSelected = new EventEmitter<TrendDataPoint>();

  @ViewChild('chartContainer', { static: false }) chartContainer?: ElementRef;

  // Component state
  trend$!: Observable<Trend | null>;
  dataPoints: TrendDataPoint[] = [];
  statistics: TrendStatistics | null = null;
  anomalies: Anomaly[] = [];
  loading: boolean = false;
  
  // UI controls
  selectedChartType: ChartType = 'line';
  smoothingAlgorithm: SmoothingAlgorithm = 'none';
  smoothingWindowSize: number = 3;
  smoothingAlpha: number = 0.3;
  anomalyThreshold: number = 2.0;
  highlightAnomalies: boolean = true;
  showConfidenceIntervals: boolean = false;

  // Chart data
  chartData: any = null;
  chartOptions: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private trendAnalysisService: TrendAnalysisService
  ) {}

  ngOnInit(): void {
    this.selectedChartType = this.chartType;
    this.loadTrendData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads trend data from store or service
   * 
   * **Validates: Requirement 14.1**
   */
  loadTrendData(): void {
    // In a real implementation, this would load from NgRx store
    // For now, we'll use mock data
    this.dataPoints = this.generateMockDataPoints();
    this.calculateStatistics();
    this.detectAnomalies();
    this.prepareChartData();
  }

  /**
   * Calculates trend statistics
   * 
   * **Validates: Requirement 14.2**
   */
  calculateStatistics(): void {
    if (this.dataPoints.length === 0) {
      this.statistics = null;
      return;
    }

    this.statistics = this.trendAnalysisService.calculateTrendStatistics(this.dataPoints);
  }

  /**
   * Detects anomalies in trend data
   * 
   * **Validates: Requirement 14.6**
   */
  detectAnomalies(): void {
    if (!this.showAnomalies || this.dataPoints.length === 0) {
      this.anomalies = [];
      return;
    }

    this.anomalies = this.trendAnalysisService.detectAnomalies(
      this.dataPoints,
      {
        threshold: this.anomalyThreshold,
        includeExplanations: true
      }
    );

    // Mark anomalies in data points
    this.dataPoints = this.dataPoints.map(dp => ({
      ...dp,
      isAnomaly: this.anomalies.some(a => 
        a.timestamp.getTime() === dp.timestamp.getTime()
      )
    }));
  }

  /**
   * Applies smoothing algorithm to trend data
   * 
   * **Validates: Requirement 14.7**
   */
  applySmoothingAlgorithm(): void {
    if (this.smoothingAlgorithm === 'none') {
      // Remove smoothed values
      this.dataPoints = this.dataPoints.map(dp => ({
        ...dp,
        smoothedValue: undefined
      }));
    } else {
      const config: SmoothingConfig = {
        algorithm: this.smoothingAlgorithm,
        windowSize: this.smoothingWindowSize,
        alpha: this.smoothingAlpha
      };

      this.dataPoints = this.trendAnalysisService.applySmoothingAlgorithm(
        this.dataPoints,
        config
      );
    }

    this.prepareChartData();
  }

  /**
   * Changes chart type and updates visualization
   */
  changeChartType(type: ChartType): void {
    this.selectedChartType = type;
    this.prepareChartData();
  }

  /**
   * Updates anomaly detection threshold
   */
  updateAnomalyThreshold(threshold: number): void {
    this.anomalyThreshold = threshold;
    this.detectAnomalies();
    this.prepareChartData();
  }

  /**
   * Toggles anomaly highlighting
   */
  toggleAnomalyHighlighting(): void {
    this.highlightAnomalies = !this.highlightAnomalies;
    this.prepareChartData();
  }

  /**
   * Handles anomaly click event
   */
  onAnomalyClick(anomaly: Anomaly): void {
    this.anomalySelected.emit(anomaly);
  }

  /**
   * Handles data point click event
   */
  onDataPointClick(dataPoint: TrendDataPoint): void {
    this.dataPointSelected.emit(dataPoint);
  }

  /**
   * Exports trend data
   */
  exportTrendData(format: 'csv' | 'json'): void {
    const data = {
      metric: this.metric,
      timeRange: this.timeRange,
      dataPoints: this.dataPoints,
      statistics: this.statistics,
      anomalies: this.anomalies
    };

    if (format === 'csv') {
      this.exportAsCSV(data);
    } else {
      this.exportAsJSON(data);
    }
  }

  /**
   * Prepares chart data for visualization library
   */
  private prepareChartData(): void {
    if (this.dataPoints.length === 0) {
      this.chartData = null;
      return;
    }

    const labels = this.dataPoints.map(dp => dp.timestamp);
    const values = this.dataPoints.map(dp => dp.value);
    const smoothedValues = this.dataPoints
      .filter(dp => dp.smoothedValue !== undefined)
      .map(dp => dp.smoothedValue);

    // Prepare datasets
    const datasets: any[] = [
      {
        label: this.metric,
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: this.selectedChartType === 'area' ? 'rgba(59, 130, 246, 0.1)' : '#3b82f6',
        fill: this.selectedChartType === 'area',
        tension: 0.4,
        pointRadius: this.selectedChartType === 'scatter' ? 5 : 3,
        pointHoverRadius: 7
      }
    ];

    // Add smoothed line if smoothing is applied
    if (smoothedValues.length > 0) {
      datasets.push({
        label: `${this.metric} (Smoothed)`,
        data: smoothedValues,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
      });
    }

    // Highlight anomalies
    if (this.highlightAnomalies && this.anomalies.length > 0) {
      const anomalyPoints = this.dataPoints.map(dp => 
        dp.isAnomaly ? dp.value : null
      );

      datasets.push({
        label: 'Anomalies',
        data: anomalyPoints,
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
        type: 'scatter'
      });
    }

    this.chartData = {
      labels,
      datasets
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            afterLabel: (context: any) => {
              const index = context.dataIndex;
              const dataPoint = this.dataPoints[index];
              if (dataPoint?.isAnomaly) {
                const anomaly = this.anomalies.find(a => 
                  a.timestamp.getTime() === dataPoint.timestamp.getTime()
                );
                return anomaly?.explanation || 'Anomaly detected';
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: this.metric
          }
        }
      }
    };
  }

  /**
   * Exports data as CSV
   */
  private exportAsCSV(data: any): void {
    const headers = ['Timestamp', 'Value', 'Smoothed Value', 'Is Anomaly'];
    const rows = this.dataPoints.map(dp => [
      dp.timestamp.toISOString(),
      dp.value,
      dp.smoothedValue || '',
      dp.isAnomaly
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadFile(csv, 'trend-data.csv', 'text/csv');
  }

  /**
   * Exports data as JSON
   */
  private exportAsJSON(data: any): void {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, 'trend-data.json', 'application/json');
  }

  /**
   * Downloads file to user's computer
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generates mock data points for demonstration
   */
  private generateMockDataPoints(): TrendDataPoint[] {
    const points: TrendDataPoint[] = [];
    const now = new Date();
    const baseValue = 100;

    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      
      // Generate value with trend and some noise
      let value = baseValue + i * 2 + (Math.random() - 0.5) * 10;
      
      // Add some anomalies
      if (i === 10 || i === 20) {
        value += 30; // Spike
      } else if (i === 15) {
        value -= 25; // Drop
      }

      points.push({
        timestamp,
        value,
        isAnomaly: false
      });
    }

    return points;
  }

  /**
   * Gets severity badge class for anomaly
   */
  getSeverityClass(severity: 'low' | 'medium' | 'high'): string {
    const classes = {
      low: 'badge-warning',
      medium: 'badge-orange',
      high: 'badge-danger'
    };
    return classes[severity];
  }

  /**
   * Gets anomaly type icon
   */
  getAnomalyTypeIcon(type: 'spike' | 'drop' | 'shift'): string {
    const icons = {
      spike: 'arrow-up',
      drop: 'arrow-down',
      shift: 'trending-up'
    };
    return icons[type];
  }
}
