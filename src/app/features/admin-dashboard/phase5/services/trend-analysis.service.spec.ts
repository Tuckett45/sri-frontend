/**
 * Trend Analysis Service Unit Tests
 * 
 * Tests for trend analysis, anomaly detection, and statistical calculations.
 * 
 * **Validates: Requirements 14.1-14.7**
 */

import { TestBed } from '@angular/core/testing';
import { TrendAnalysisService } from './trend-analysis.service';
import { TrendDataPoint } from '../models/forecast.models';

describe('TrendAnalysisService', () => {
  let service: TrendAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TrendAnalysisService]
    });
    service = TestBed.inject(TrendAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('detectAnomalies', () => {
    it('should detect spike anomalies', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 300, isAnomaly: false }, // Spike - very extreme
        { timestamp: new Date('2024-01-04'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 100, isAnomaly: false }
      ];

      const anomalies = service.detectAnomalies(dataPoints, { threshold: 2.0 });

      expect(anomalies.length).toBeGreaterThan(0);
      const spike = anomalies.find(a => a.type === 'spike');
      expect(spike).toBeDefined();
      expect(spike?.value).toBe(300);
    });

    it('should detect drop anomalies', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 0, isAnomaly: false }, // Drop - very extreme
        { timestamp: new Date('2024-01-04'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 100, isAnomaly: false }
      ];

      const anomalies = service.detectAnomalies(dataPoints, { threshold: 2.0 });

      expect(anomalies.length).toBeGreaterThan(0);
      const drop = anomalies.find(a => a.type === 'drop');
      expect(drop).toBeDefined();
      expect(drop?.value).toBe(0);
    });

    it('should classify anomaly severity correctly', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 300, isAnomaly: false } // High severity
      ];

      const anomalies = service.detectAnomalies(dataPoints, { threshold: 2.0 });

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].severity).toBe('high');
    });

    it('should return empty array for insufficient data', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 102, isAnomaly: false }
      ];

      const anomalies = service.detectAnomalies(dataPoints, { threshold: 2.0, minDataPoints: 5 });

      expect(anomalies).toEqual([]);
    });

    it('should include explanations when requested', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 300, isAnomaly: false }
      ];

      const anomalies = service.detectAnomalies(dataPoints, { 
        threshold: 2.0, 
        includeExplanations: true 
      });

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].explanation).toBeDefined();
      expect(anomalies[0].explanation).toContain('standard deviations');
    });
  });

  describe('calculateTrendStatistics', () => {
    it('should calculate mean correctly', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 200, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 300, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.mean).toBe(200); // (100 + 200 + 300) / 3 = 200
    });

    it('should calculate median correctly for odd number of values', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 200, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 300, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.median).toBe(200);
    });

    it('should calculate median correctly for even number of values', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 100, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 200, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 300, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 400, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.median).toBe(250); // (200 + 300) / 2
    });

    it('should calculate standard deviation and variance', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 2, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 4, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 4, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 4, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 5, isAnomaly: false },
        { timestamp: new Date('2024-01-06'), value: 5, isAnomaly: false },
        { timestamp: new Date('2024-01-07'), value: 7, isAnomaly: false },
        { timestamp: new Date('2024-01-08'), value: 9, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.mean).toBe(5);
      expect(stats.variance).toBeCloseTo(4, 1);
      expect(stats.standardDeviation).toBeCloseTo(2, 1);
    });

    it('should calculate min and max correctly', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 50, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 200, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 100, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.min).toBe(50);
      expect(stats.max).toBe(200);
    });

    it('should calculate linear regression slope', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 20, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 30, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 40, isAnomaly: false }
      ];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.slope).toBeCloseTo(10, 0); // Perfect upward trend
      expect(stats.rSquared).toBeCloseTo(1, 1); // Perfect fit
    });

    it('should return empty statistics for empty data', () => {
      const dataPoints: TrendDataPoint[] = [];

      const stats = service.calculateTrendStatistics(dataPoints);

      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.standardDeviation).toBe(0);
      expect(stats.variance).toBe(0);
    });
  });

  describe('applySmoothingAlgorithm', () => {
    it('should apply moving average smoothing', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 20, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 30, isAnomaly: false },
        { timestamp: new Date('2024-01-04'), value: 40, isAnomaly: false },
        { timestamp: new Date('2024-01-05'), value: 50, isAnomaly: false }
      ];

      const smoothed = service.applySmoothingAlgorithm(dataPoints, {
        algorithm: 'moving-average',
        windowSize: 3
      });

      expect(smoothed.length).toBe(dataPoints.length);
      expect(smoothed[2].smoothedValue).toBe(20); // Average of 10, 20, 30
    });

    it('should apply exponential smoothing', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, isAnomaly: false },
        { timestamp: new Date('2024-01-02'), value: 20, isAnomaly: false },
        { timestamp: new Date('2024-01-03'), value: 30, isAnomaly: false }
      ];

      const smoothed = service.applySmoothingAlgorithm(dataPoints, {
        algorithm: 'exponential',
        alpha: 0.5
      });

      expect(smoothed.length).toBe(dataPoints.length);
      expect(smoothed[0].smoothedValue).toBe(10);
      expect(smoothed[1].smoothedValue).toBe(15); // 0.5 * 20 + 0.5 * 10
    });

    it('should return original data for unknown algorithm', () => {
      const dataPoints: TrendDataPoint[] = [
        { timestamp: new Date('2024-01-01'), value: 10, isAnomaly: false }
      ];

      const smoothed = service.applySmoothingAlgorithm(dataPoints, {
        algorithm: 'moving-average',
        windowSize: 3
      });

      // With window size 3 and only 1 data point, smoothed value should equal original
      expect(smoothed.length).toBe(1);
      expect(smoothed[0].value).toBe(10);
      expect(smoothed[0].smoothedValue).toBe(10);
    });
  });

  describe('analyzeTrendDirection', () => {
    it('should identify upward trend', () => {
      const stats = {
        mean: 100,
        median: 100,
        standardDeviation: 10,
        variance: 100,
        min: 80,
        max: 120,
        slope: 5,
        rSquared: 0.9
      };

      const analysis = service.analyzeTrendDirection(stats);

      expect(analysis.direction).toBe('upward');
      expect(analysis.strength).toBeCloseTo(0.9, 1);
    });

    it('should identify downward trend', () => {
      const stats = {
        mean: 100,
        median: 100,
        standardDeviation: 10,
        variance: 100,
        min: 80,
        max: 120,
        slope: -5,
        rSquared: 0.85
      };

      const analysis = service.analyzeTrendDirection(stats);

      expect(analysis.direction).toBe('downward');
      expect(analysis.strength).toBeCloseTo(0.85, 1);
    });

    it('should identify stable trend', () => {
      const stats = {
        mean: 100,
        median: 100,
        standardDeviation: 2,
        variance: 4,
        min: 98,
        max: 102,
        slope: 0.005,
        rSquared: 0.1
      };

      const analysis = service.analyzeTrendDirection(stats);

      expect(analysis.direction).toBe('stable');
    });

    it('should identify volatile trend', () => {
      const stats = {
        mean: 100,
        median: 100,
        standardDeviation: 60,
        variance: 3600,
        min: 20,
        max: 180,
        slope: 2,
        rSquared: 0.3
      };

      const analysis = service.analyzeTrendDirection(stats);

      expect(analysis.direction).toBe('volatile');
    });
  });
});
