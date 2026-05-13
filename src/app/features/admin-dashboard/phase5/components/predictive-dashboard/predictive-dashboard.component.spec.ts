import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PredictiveDashboardComponent } from './predictive-dashboard.component';
import * as ForecastsActions from '../../state/forecasts/forecasts.actions';
import {
  Forecast,
  Prediction,
  Trend,
  ForecastDataPoint
} from '../../models/forecast.models';

describe('PredictiveDashboardComponent', () => {
  let component: PredictiveDashboardComponent;
  let fixture: ComponentFixture<PredictiveDashboardComponent>;
  let store: MockStore;

  const mockForecast: Forecast = {
    id: 'forecast-1',
    metric: 'utilization',
    timeHorizon: 'month',
    dataPoints: [
      {
        timestamp: new Date('2024-01-01'),
        value: 75,
        lowerBound: 70,
        upperBound: 80,
        confidence: 0.95
      },
      {
        timestamp: new Date('2024-01-02'),
        value: 78,
        lowerBound: 73,
        upperBound: 83,
        confidence: 0.95
      }
    ],
    confidence: { level: 0.95, lowerBound: 70, upperBound: 85 },
    methodology: 'ARIMA',
    modelId: 'model-1',
    generatedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-31')
  };

  const mockPrediction: Prediction = {
    id: 'prediction-1',
    type: 'capacity',
    description: 'Resource capacity may be exceeded',
    probability: 0.75,
    impact: 'high',
    timeframe: {
      start: new Date('2024-01-15'),
      end: new Date('2024-01-31')
    },
    indicators: [],
    mitigationActions: ['Hire additional staff'],
    createdAt: new Date('2024-01-01')
  };

  const mockTrend: Trend = {
    id: 'trend-1',
    metric: 'utilization',
    direction: 'upward',
    strength: 0.8,
    dataPoints: [
      { timestamp: new Date('2024-01-01'), value: 70, isAnomaly: false },
      { timestamp: new Date('2024-01-02'), value: 75, isAnomaly: false }
    ],
    statistics: {
      mean: 72.5,
      median: 72.5,
      standardDeviation: 2.5,
      variance: 6.25,
      min: 70,
      max: 75,
      slope: 5,
      rSquared: 0.95
    },
    anomalies: []
  };

  const initialState = {
    forecasts: {
      forecasts: [],
      predictions: [],
      trends: [],
      currentTimeHorizon: null,
      loadingForecasts: false,
      loadingPredictions: false,
      loadingTrends: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictiveDashboardComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(PredictiveDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.dashboardType).toBe('resource');
      expect(component.selectedTimeHorizon).toBe('month');
      expect(component.selectedMetric).toBe('utilization');
      expect(component.showConfidenceIntervals).toBe(true);
      expect(component.compareWithActuals).toBe(true);
    });

    it('should load predictive data on init', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.ngOnInit();
      
      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Forecasts] Load Forecasts' })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Forecasts] Load Predictions' })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Forecasts] Load Trends' })
      );
    });
  });

  describe('Time Horizon Management', () => {
    it('should change time horizon and reload data', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.changeTimeHorizon('quarter');
      
      expect(component.selectedTimeHorizon).toBe('quarter');
      expect(dispatchSpy).toHaveBeenCalledWith(
        ForecastsActions.changeTimeHorizon({ timeHorizon: 'quarter' })
      );
    });

    it('should not reload data if time horizon is the same', () => {
      component.selectedTimeHorizon = 'month';
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.changeTimeHorizon('month');
      
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should synchronize all visualizations when time horizon changes', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.changeTimeHorizon('year');
      
      // Should dispatch actions for forecasts, predictions, and trends
      expect(dispatchSpy).toHaveBeenCalledTimes(4); // setTimeHorizon + 3 load actions
    });

    it('should get correct granularity for time horizon', () => {
      expect(component['getGranularityForTimeHorizon']('week')).toBe('day');
      expect(component['getGranularityForTimeHorizon']('month')).toBe('day');
      expect(component['getGranularityForTimeHorizon']('quarter')).toBe('week');
      expect(component['getGranularityForTimeHorizon']('year')).toBe('month');
    });
  });

  describe('Metric Selection', () => {
    it('should change metric and reload data', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.selectMetric('demand');
      
      expect(component.selectedMetric).toBe('demand');
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should not reload data if metric is the same', () => {
      component.selectedMetric = 'utilization';
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.selectMetric('utilization');
      
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Chart Data Preparation', () => {
    it('should prepare forecast chart data', () => {
      component.forecasts = [mockForecast];
      component['prepareForecastChartData']();
      
      expect(component.forecastChartData).toBeTruthy();
      expect(component.forecastChartData!.labels.length).toBe(2);
      expect(component.forecastChartData!.datasets.length).toBeGreaterThan(0);
    });

    it('should include confidence intervals when enabled', () => {
      component.forecasts = [mockForecast];
      component.showConfidenceIntervals = true;
      component['prepareForecastChartData']();
      
      expect(component.forecastChartData!.datasets.length).toBe(3); // forecast + upper + lower
    });

    it('should not include confidence intervals when disabled', () => {
      component.forecasts = [mockForecast];
      component.showConfidenceIntervals = false;
      component['prepareForecastChartData']();
      
      expect(component.forecastChartData!.datasets.length).toBe(1); // forecast only
    });

    it('should prepare trend chart data', () => {
      component.trends = [mockTrend];
      component['prepareTrendChartData']();
      
      expect(component.trendChartData).toBeTruthy();
      expect(component.trendChartData!.labels.length).toBe(2);
      expect(component.trendChartData!.datasets.length).toBeGreaterThan(0);
    });

    it('should prepare comparison chart data when enabled', () => {
      component.forecasts = [mockForecast];
      component.trends = [mockTrend];
      component.compareWithActuals = true;
      component['prepareComparisonChartData']();
      
      expect(component.comparisonChartData).toBeTruthy();
      expect(component.comparisonChartData!.datasets.length).toBe(2); // forecast + historical
    });

    it('should not prepare comparison chart data when disabled', () => {
      component.forecasts = [mockForecast];
      component.trends = [mockTrend];
      component.compareWithActuals = false;
      component['prepareComparisonChartData']();
      
      expect(component.comparisonChartData).toBeNull();
    });

    it('should handle empty forecast data', () => {
      component.forecasts = [];
      component['prepareForecastChartData']();
      
      expect(component.forecastChartData).toBeNull();
    });

    it('should handle empty trend data', () => {
      component.trends = [];
      component['prepareTrendChartData']();
      
      expect(component.trendChartData).toBeNull();
    });
  });

  describe('Display Options', () => {
    it('should toggle confidence intervals', () => {
      component.showConfidenceIntervals = true;
      const prepareChartDataSpy = spyOn<any>(component, 'prepareChartData');
      
      component.toggleConfidenceIntervals();
      
      expect(component.showConfidenceIntervals).toBe(false);
      expect(prepareChartDataSpy).toHaveBeenCalled();
    });

    it('should toggle compare with actuals', () => {
      component.compareWithActuals = true;
      const prepareChartDataSpy = spyOn<any>(component, 'prepareChartData');
      
      component.toggleCompareWithActuals();
      
      expect(component.compareWithActuals).toBe(false);
      expect(prepareChartDataSpy).toHaveBeenCalled();
    });
  });

  describe('Data Refresh', () => {
    it('should refresh forecasts', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.refreshForecasts();
      
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    it('should get correct time horizon label', () => {
      expect(component.getTimeHorizonLabel('week')).toBe('Next Week');
      expect(component.getTimeHorizonLabel('month')).toBe('Next Month');
      expect(component.getTimeHorizonLabel('quarter')).toBe('Next Quarter');
      expect(component.getTimeHorizonLabel('year')).toBe('Next Year');
    });

    it('should get correct metric label', () => {
      expect(component.getMetricLabel('utilization')).toBe('Resource Utilization');
      expect(component.getMetricLabel('demand')).toBe('Demand Forecast');
      expect(component.getMetricLabel('capacity')).toBe('Capacity Planning');
      expect(component.getMetricLabel('efficiency')).toBe('Efficiency Metrics');
      expect(component.getMetricLabel('cost')).toBe('Cost Projections');
    });

    it('should get correct time range for horizon', () => {
      const now = new Date();
      const weekRange = component['getTimeRangeForHorizon']('week');
      
      expect(weekRange.start.getTime()).toBeLessThan(now.getTime());
      expect(weekRange.end.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Data Subscription', () => {
    it('should update forecasts when store changes', (done) => {
      store.setState({
        forecasts: {
          ...initialState.forecasts,
          forecasts: [mockForecast]
        }
      });

      component.forecasts$.subscribe(forecasts => {
        if (forecasts.length > 0) {
          expect(forecasts).toEqual([mockForecast]);
          done();
        }
      });

      component.ngOnInit();
    });

    it('should update predictions when store changes', (done) => {
      store.setState({
        forecasts: {
          ...initialState.forecasts,
          predictions: [mockPrediction]
        }
      });

      component.predictions$.subscribe(predictions => {
        if (predictions.length > 0) {
          expect(predictions).toEqual([mockPrediction]);
          done();
        }
      });

      component.ngOnInit();
    });

    it('should update trends when store changes', (done) => {
      store.setState({
        forecasts: {
          ...initialState.forecasts,
          trends: [mockTrend]
        }
      });

      component.trends$.subscribe(trends => {
        if (trends.length > 0) {
          expect(trends).toEqual([mockTrend]);
          done();
        }
      });

      component.ngOnInit();
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
