/**
 * Predictive Dashboard Component for Phase 5: Predictive Dashboards
 * 
 * Main dashboard component that displays forecasts, predictions, and trends
 * with unified time horizon control and metric selection.
 * 
 * **Validates: Requirements 13.1, 13.3, 13.7**
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  Forecast,
  Prediction,
  Trend,
  ForecastParams,
  PredictionContext,
  TimeRange
} from '../../models/forecast.models';
import {
  selectForecasts,
  selectPredictions,
  selectTrends,
  selectCurrentTimeHorizon,
  selectIsLoading,
  selectError
} from '../../state/forecasts/forecasts.selectors';
import * as ForecastsActions from '../../state/forecasts/forecasts.actions';

export type DashboardType = 'resource' | 'workload' | 'performance' | 'financial';
export type TimeHorizon = 'week' | 'month' | 'quarter' | 'year';
export type MetricType = 'utilization' | 'demand' | 'capacity' | 'efficiency' | 'cost';

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  fill?: boolean | string;
}

@Component({
  selector: 'app-predictive-dashboard',
  templateUrl: './predictive-dashboard.component.html',
  styleUrls: ['./predictive-dashboard.component.scss']
})
export class PredictiveDashboardComponent implements OnInit, OnDestroy {
  @Input() dashboardType: DashboardType = 'resource';
  @Input() initialTimeHorizon: TimeHorizon = 'month';

  // Observables from store
  forecasts$: Observable<Forecast[]>;
  predictions$: Observable<Prediction[]>;
  trends$: Observable<Trend[]>;
  currentTimeHorizon$: Observable<TimeHorizon | null>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Component state
  selectedTimeHorizon: TimeHorizon = 'month';
  selectedMetric: MetricType = 'utilization';
  showConfidenceIntervals: boolean = true;
  compareWithActuals: boolean = true;
  availableMetrics: MetricType[] = ['utilization', 'demand', 'capacity', 'efficiency', 'cost'];
  availableTimeHorizons: TimeHorizon[] = ['week', 'month', 'quarter', 'year'];

  // Chart data
  forecastChartData: ChartData | null = null;
  trendChartData: ChartData | null = null;
  comparisonChartData: ChartData | null = null;

  // Data arrays
  forecasts: Forecast[] = [];
  predictions: Prediction[] = [];
  trends: Trend[] = [];

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.forecasts$ = this.store.select(selectForecasts);
    this.predictions$ = this.store.select(selectPredictions);
    this.trends$ = this.store.select(selectTrends);
    this.currentTimeHorizon$ = this.store.select(selectCurrentTimeHorizon);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.error$ = this.store.select(selectError);
  }

  ngOnInit(): void {
    this.selectedTimeHorizon = this.initialTimeHorizon;
    
    // Subscribe to data changes
    this.subscribeToDataChanges();
    
    // Load initial data
    this.loadPredictiveData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribes to data changes from store
   * Updates chart data when forecasts, predictions, or trends change
   */
  private subscribeToDataChanges(): void {
    // Subscribe to forecasts
    this.forecasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(forecasts => {
        this.forecasts = forecasts;
        this.prepareChartData();
      });

    // Subscribe to predictions
    this.predictions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(predictions => {
        this.predictions = predictions;
      });

    // Subscribe to trends
    this.trends$
      .pipe(takeUntil(this.destroy$))
      .subscribe(trends => {
        this.trends = trends;
        this.prepareChartData();
      });

    // Subscribe to time horizon changes
    this.currentTimeHorizon$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(timeHorizon => {
        if (timeHorizon && timeHorizon !== this.selectedTimeHorizon) {
          this.selectedTimeHorizon = timeHorizon;
        }
      });
  }

  /**
   * Loads predictive data (forecasts, predictions, trends)
   * 
   * **Validates: Requirement 13.1**
   */
  loadPredictiveData(): void {
    // Load forecasts for selected metric and time horizon
    const forecastParams: ForecastParams = {
      metric: this.selectedMetric,
      timeHorizon: this.selectedTimeHorizon,
      includeConfidenceIntervals: this.showConfidenceIntervals,
      granularity: this.getGranularityForTimeHorizon(this.selectedTimeHorizon)
    };

    this.store.dispatch(ForecastsActions.loadForecasts({ params: forecastParams }));

    // Load predictions
    const predictionContext: PredictionContext = {
      type: this.dashboardType,
      includeRecommendations: true,
      timeRange: this.getTimeRangeForHorizon(this.selectedTimeHorizon)
    };

    this.store.dispatch(ForecastsActions.loadPredictions({ context: predictionContext }));

    // Load trends
    const trendTimeRange = this.getTimeRangeForHorizon(this.selectedTimeHorizon);
    this.store.dispatch(ForecastsActions.loadTrends({ 
      metric: this.selectedMetric, 
      timeRange: trendTimeRange 
    }));
  }

  /**
   * Refreshes all forecasts
   * 
   * **Validates: Requirement 13.1**
   */
  refreshForecasts(): void {
    this.loadPredictiveData();
  }

  /**
   * Changes time horizon and reloads all data
   * Ensures all visualizations are synchronized with the new time horizon
   * 
   * **Validates: Requirement 13.7**
   */
  changeTimeHorizon(horizon: TimeHorizon): void {
    if (this.selectedTimeHorizon === horizon) {
      return;
    }

    this.selectedTimeHorizon = horizon;
    
    // Update time horizon in store
    this.store.dispatch(ForecastsActions.changeTimeHorizon({ timeHorizon: horizon }));
    
    // Reload all data with new time horizon
    this.loadPredictiveData();
  }

  /**
   * Changes selected metric and reloads data
   * 
   * **Validates: Requirement 13.1**
   */
  selectMetric(metric: MetricType): void {
    if (this.selectedMetric === metric) {
      return;
    }

    this.selectedMetric = metric;
    this.loadPredictiveData();
  }

  /**
   * Toggles confidence intervals display
   * 
   * **Validates: Requirement 13.1**
   */
  toggleConfidenceIntervals(): void {
    this.showConfidenceIntervals = !this.showConfidenceIntervals;
    this.prepareChartData();
  }

  /**
   * Toggles comparison with actual data
   */
  toggleCompareWithActuals(): void {
    this.compareWithActuals = !this.compareWithActuals;
    this.prepareChartData();
  }

  /**
   * Exports dashboard data
   */
  exportDashboard(format: 'pdf' | 'excel'): void {
    const dashboardData = {
      dashboardType: this.dashboardType,
      timeHorizon: this.selectedTimeHorizon,
      selectedMetric: this.selectedMetric,
      forecasts: this.forecasts,
      predictions: this.predictions,
      trends: this.trends,
      exportedAt: new Date()
    };

    if (format === 'pdf') {
      this.exportAsPDF(dashboardData);
    } else {
      this.exportAsExcel(dashboardData);
    }
  }

  /**
   * Prepares chart data for visualization
   * Transforms forecast and trend data for chart libraries
   * 
   * **Validates: Requirement 13.3**
   */
  prepareChartData(): void {
    this.prepareForecastChartData();
    this.prepareTrendChartData();
    this.prepareComparisonChartData();
  }

  /**
   * Prepares forecast chart data
   * Displays forecast data points with model metadata
   * 
   * **Validates: Requirement 13.3**
   */
  private prepareForecastChartData(): void {
    if (this.forecasts.length === 0) {
      this.forecastChartData = null;
      return;
    }

    // Get the first forecast (assuming single metric)
    const forecast = this.forecasts[0];
    
    const labels = forecast.dataPoints.map(dp => 
      new Date(dp.timestamp).toLocaleDateString()
    );
    
    const datasets: ChartDataset[] = [
      {
        label: `${forecast.metric} Forecast`,
        data: forecast.dataPoints.map(dp => dp.value),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false
      }
    ];

    // Add confidence intervals if enabled
    if (this.showConfidenceIntervals) {
      datasets.push({
        label: 'Upper Bound',
        data: forecast.dataPoints.map(dp => dp.upperBound),
        borderColor: '#93c5fd',
        backgroundColor: 'transparent',
        fill: false
      });

      datasets.push({
        label: 'Lower Bound',
        data: forecast.dataPoints.map(dp => dp.lowerBound),
        borderColor: '#93c5fd',
        backgroundColor: 'rgba(147, 197, 253, 0.1)',
        fill: '-1'
      });
    }

    this.forecastChartData = { labels, datasets };
  }

  /**
   * Prepares trend chart data
   */
  private prepareTrendChartData(): void {
    if (this.trends.length === 0) {
      this.trendChartData = null;
      return;
    }

    const trend = this.trends[0];
    
    const labels = trend.dataPoints.map(dp => 
      new Date(dp.timestamp).toLocaleDateString()
    );
    
    const datasets: ChartDataset[] = [
      {
        label: `${trend.metric} Historical Trend`,
        data: trend.dataPoints.map(dp => dp.value),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true
      }
    ];

    // Add smoothed values if available
    const smoothedValues = trend.dataPoints
      .filter(dp => dp.smoothedValue !== undefined)
      .map(dp => dp.smoothedValue!);

    if (smoothedValues.length > 0) {
      datasets.push({
        label: 'Smoothed Trend',
        data: smoothedValues,
        borderColor: '#059669',
        backgroundColor: 'transparent',
        fill: false
      });
    }

    this.trendChartData = { labels, datasets };
  }

  /**
   * Prepares comparison chart data (forecast vs actual)
   * Creates multi-metric visualizations
   * 
   * **Validates: Requirement 13.3**
   */
  private prepareComparisonChartData(): void {
    if (!this.compareWithActuals || this.forecasts.length === 0 || this.trends.length === 0) {
      this.comparisonChartData = null;
      return;
    }

    const forecast = this.forecasts[0];
    const trend = this.trends[0];

    // Align timestamps between forecast and trend
    const labels = forecast.dataPoints.map(dp => 
      new Date(dp.timestamp).toLocaleDateString()
    );

    const datasets: ChartDataset[] = [
      {
        label: 'Forecast',
        data: forecast.dataPoints.map(dp => dp.value),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        fill: false
      },
      {
        label: 'Historical',
        data: trend.dataPoints.slice(-forecast.dataPoints.length).map(dp => dp.value),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        fill: false
      }
    ];

    this.comparisonChartData = { labels, datasets };
  }

  /**
   * Gets granularity based on time horizon
   */
  private getGranularityForTimeHorizon(horizon: TimeHorizon): 'hour' | 'day' | 'week' | 'month' {
    const granularityMap: Record<TimeHorizon, 'hour' | 'day' | 'week' | 'month'> = {
      'week': 'day',
      'month': 'day',
      'quarter': 'week',
      'year': 'month'
    };
    return granularityMap[horizon];
  }

  /**
   * Gets time range for a given horizon
   */
  private getTimeRangeForHorizon(horizon: TimeHorizon): TimeRange {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (horizon) {
      case 'week':
        start.setDate(now.getDate() - 7);
        end.setDate(now.getDate() + 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        end.setMonth(now.getMonth() + 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        end.setMonth(now.getMonth() + 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        end.setFullYear(now.getFullYear() + 1);
        break;
    }

    return { start, end };
  }

  /**
   * Exports dashboard as PDF
   */
  private exportAsPDF(data: any): void {
    // In a real implementation, this would use a PDF library like jsPDF
    console.log('Exporting dashboard as PDF:', data);
    alert('PDF export functionality would be implemented here');
  }

  /**
   * Exports dashboard as Excel
   */
  private exportAsExcel(data: any): void {
    // In a real implementation, this would use a library like xlsx
    console.log('Exporting dashboard as Excel:', data);
    alert('Excel export functionality would be implemented here');
  }

  /**
   * Gets display label for time horizon
   */
  getTimeHorizonLabel(horizon: TimeHorizon): string {
    const labels: Record<TimeHorizon, string> = {
      'week': 'Next Week',
      'month': 'Next Month',
      'quarter': 'Next Quarter',
      'year': 'Next Year'
    };
    return labels[horizon];
  }

  /**
   * Gets display label for metric
   */
  getMetricLabel(metric: MetricType): string {
    const labels: Record<MetricType, string> = {
      'utilization': 'Resource Utilization',
      'demand': 'Demand Forecast',
      'capacity': 'Capacity Planning',
      'efficiency': 'Efficiency Metrics',
      'cost': 'Cost Projections'
    };
    return labels[metric];
  }
}
