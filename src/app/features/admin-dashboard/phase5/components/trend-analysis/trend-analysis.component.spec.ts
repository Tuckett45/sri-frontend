/**
 * Trend Analysis Component Unit Tests
 * 
 * Tests for trend visualization, anomaly highlighting, and user interactions.
 * 
 * **Validates: Requirements 14.1, 14.2, 14.6, 14.7**
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TrendAnalysisComponent, ChartType } from './trend-analysis.component';
import { TrendAnalysisService } from '../../services/trend-analysis.service';
import { TrendDataPoint, Anomaly } from '../../models/forecast.models';

describe('TrendAnalysisComponent', () => {
  let component: TrendAnalysisComponent;
  let fixture: ComponentFixture<TrendAnalysisComponent>;
  let trendAnalysisService: jasmine.SpyObj<TrendAnalysisService>;
  let store: MockStore;

  beforeEach(async () => {
    const trendAnalysisServiceSpy = jasmine.createSpyObj('TrendAnalysisService', [
      'calculateTrendStatistics',
      'detectAnomalies',
      'applySmoothingAlgorithm'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TrendAnalysisComponent],
      imports: [FormsModule],
      providers: [
        provideMockStore({}),
        { provide: TrendAnalysisService, useValue: trendAnalysisServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    trendAnalysisService = TestBed.inject(TrendAnalysisService) as jasmine.SpyObj<TrendAnalysisService>;
    fixture = TestBed.createComponent(TrendAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.showAnomalies).toBe(true);
      expect(component.showStatistics).toBe(true);
      expect(component.chartType).toBe('line');
      expect(component.smoothingAlgorithm).toBe('none');
      expect(component.anomalyThreshold).toBe(2.0);
    });

    it('should load trend data on init', () => {
      component.metric = 'test-metric';
      spyOn(component, 'loadTrendData');

      component.ngOnInit();

      expect(component.loadTrendData).toHaveBeenCalled();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics for data points', () => {
      const mockStats = {
        mean: 100,
        median: 95,
        standardDeviation: 15,
        variance: 225,
        min: 70,
        max: 130,
        slope: 2.5,
        rSquared: 0.85
      };

      trendAnalysisService.calculateTrendStatistics.and.returnValue(mockStats);

      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 110, isAnomaly: false }
      ];

      component.calculateStatistics();

      expect(component.statistics).toEqual(mockStats);
      expect(trendAnalysisService.calculateTrendStatistics).toHaveBeenCalledWith(component.dataPoints);
    });

    it('should set statistics to null for empty data', () => {
      component.dataPoints = [];

      component.calculateStatistics();

      expect(component.statistics).toBeNull();
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalies when enabled', () => {
      const mockAnomalies: Anomaly[] = [
        {
          timestamp: new Date('2024-01-03'),
          value: 150,
          expectedValue: 100,
          deviation: 50,
          severity: 'high',
          type: 'spike'
        }
      ];

      trendAnalysisService.detectAnomalies.and.returnValue(mockAnomalies);

      component.showAnomalies = true;
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 105, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 150, isAnomaly: false }
      ];

      component.detectAnomalies();

      expect(component.anomalies).toEqual(mockAnomalies);
      expect(trendAnalysisService.detectAnomalies).toHaveBeenCalledWith(
        jasmine.arrayContaining([
          jasmine.objectContaining({ value: 100, isAnomaly: false }),
          jasmine.objectContaining({ value: 105, isAnomaly: false }),
          jasmine.objectContaining({ value: 150, isAnomaly: false })
        ]),
        jasmine.objectContaining({ threshold: component.anomalyThreshold })
      );
    });

    it('should mark data points as anomalies', () => {
      const mockAnomalies: Anomaly[] = [
        {
          timestamp: new Date('2024-01-03'),
          value: 150,
          expectedValue: 100,
          deviation: 50,
          severity: 'high',
          type: 'spike'
        }
      ];

      trendAnalysisService.detectAnomalies.and.returnValue(mockAnomalies);

      component.showAnomalies = true;
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 105, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 150, isAnomaly: false }
      ];

      component.detectAnomalies();

      const anomalyPoint = component.dataPoints.find(dp => dp.value === 150);
      expect(anomalyPoint?.isAnomaly).toBe(true);
    });

    it('should not detect anomalies when disabled', () => {
      component.showAnomalies = false;
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false }
      ];

      component.detectAnomalies();

      expect(component.anomalies).toEqual([]);
      expect(trendAnalysisService.detectAnomalies).not.toHaveBeenCalled();
    });

    it('should update anomalies when threshold changes', () => {
      const mockAnomalies: Anomaly[] = [];
      trendAnalysisService.detectAnomalies.and.returnValue(mockAnomalies);

      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false }
      ];

      component.updateAnomalyThreshold(3.0);

      expect(component.anomalyThreshold).toBe(3.0);
      expect(trendAnalysisService.detectAnomalies).toHaveBeenCalled();
    });
  });

  describe('Smoothing Algorithms', () => {
    it('should apply moving average smoothing', () => {
      const mockSmoothed: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, smoothedValue: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 110, smoothedValue: 105, isAnomaly: false }
      ];

      trendAnalysisService.applySmoothingAlgorithm.and.returnValue(mockSmoothed);

      component.smoothingAlgorithm = 'moving-average';
      component.smoothingWindowSize = 3;
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 110, isAnomaly: false }
      ];

      component.applySmoothingAlgorithm();

      expect(trendAnalysisService.applySmoothingAlgorithm).toHaveBeenCalledWith(
        jasmine.any(Array),
        jasmine.objectContaining({
          algorithm: 'moving-average',
          windowSize: 3
        })
      );
      expect(component.dataPoints).toEqual(mockSmoothed);
    });

    it('should apply exponential smoothing', () => {
      const mockSmoothed: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, smoothedValue: 100, isAnomaly: false }
      ];

      trendAnalysisService.applySmoothingAlgorithm.and.returnValue(mockSmoothed);

      component.smoothingAlgorithm = 'exponential';
      component.smoothingAlpha = 0.3;
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false }
      ];

      component.applySmoothingAlgorithm();

      expect(trendAnalysisService.applySmoothingAlgorithm).toHaveBeenCalledWith(
        jasmine.any(Array),
        jasmine.objectContaining({
          algorithm: 'exponential',
          alpha: 0.3
        })
      );
    });

    it('should remove smoothing when set to none', () => {
      component.smoothingAlgorithm = 'none';
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, smoothedValue: 95, isAnomaly: false }
      ];

      component.applySmoothingAlgorithm();

      expect(component.dataPoints[0].smoothedValue).toBeUndefined();
    });
  });

  describe('Chart Type Changes', () => {
    it('should change chart type and update visualization', () => {
      component.changeChartType('area');

      expect(component.selectedChartType).toBe('area');
    });

    it('should support all chart types', () => {
      const chartTypes: ChartType[] = ['line', 'area', 'bar', 'scatter'];

      chartTypes.forEach(type => {
        component.changeChartType(type);
        expect(component.selectedChartType).toBe(type);
      });
    });
  });

  describe('Event Emissions', () => {
    it('should emit anomaly selected event', () => {
      const mockAnomaly: Anomaly = {
        timestamp: new Date('2024-01-01'),
        value: 150,
        expectedValue: 100,
        deviation: 50,
        severity: 'high',
        type: 'spike'
      };

      spyOn(component.anomalySelected, 'emit');

      component.onAnomalyClick(mockAnomaly);

      expect(component.anomalySelected.emit).toHaveBeenCalledWith(mockAnomaly);
    });

    it('should emit data point selected event', () => {
      const mockDataPoint: TrendDataPoint = {
        timestamp: new Date('2024-01-01'),
        value: 100,
        isAnomaly: false
      };

      spyOn(component.dataPointSelected, 'emit');

      component.onDataPointClick(mockDataPoint);

      expect(component.dataPointSelected.emit).toHaveBeenCalledWith(mockDataPoint);
    });
  });

  describe('UI Helper Methods', () => {
    it('should return correct severity class', () => {
      expect(component.getSeverityClass('low')).toBe('badge-warning');
      expect(component.getSeverityClass('medium')).toBe('badge-orange');
      expect(component.getSeverityClass('high')).toBe('badge-danger');
    });

    it('should return correct anomaly type icon', () => {
      expect(component.getAnomalyTypeIcon('spike')).toBe('arrow-up');
      expect(component.getAnomalyTypeIcon('drop')).toBe('arrow-down');
      expect(component.getAnomalyTypeIcon('shift')).toBe('trending-up');
    });
  });

  describe('Export Functionality', () => {
    it('should export trend data as CSV', () => {
      spyOn<any>(component, 'exportAsCSV');

      component.metric = 'test-metric';
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false }
      ];

      component.exportTrendData('csv');

      expect(component['exportAsCSV']).toHaveBeenCalled();
    });

    it('should export trend data as JSON', () => {
      spyOn<any>(component, 'exportAsJSON');

      component.metric = 'test-metric';
      component.dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false }
      ];

      component.exportTrendData('json');

      expect(component['exportAsJSON']).toHaveBeenCalled();
    });
  });

  describe('Anomaly Highlighting Toggle', () => {
    it('should toggle anomaly highlighting', () => {
      component.highlightAnomalies = true;
      component.toggleAnomalyHighlighting();

      expect(component.highlightAnomalies).toBe(false);

      component.toggleAnomalyHighlighting();

      expect(component.highlightAnomalies).toBe(true);
    });
  });
});
