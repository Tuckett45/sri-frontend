import { TestBed } from '@angular/core/testing';
import { InsightMetricsService } from './insight-metrics.service';
import { InsightMetric } from '../models/recommendation.models';

/**
 * Unit tests for InsightMetricsService
 * 
 * **Validates: Requirements 9.3, 9.4, 9.5**
 */
describe('InsightMetricsService', () => {
  let service: InsightMetricsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InsightMetricsService]
    });
    service = TestBed.inject(InsightMetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateTrend', () => {
    it('should return "up" for positive change percentage', () => {
      expect(service.calculateTrend(10)).toBe('up');
      expect(service.calculateTrend(0.1)).toBe('up');
      expect(service.calculateTrend(100)).toBe('up');
    });

    it('should return "down" for negative change percentage', () => {
      expect(service.calculateTrend(-10)).toBe('down');
      expect(service.calculateTrend(-0.1)).toBe('down');
      expect(service.calculateTrend(-100)).toBe('down');
    });

    it('should return "stable" for zero change percentage', () => {
      expect(service.calculateTrend(0)).toBe('stable');
    });
  });

  describe('calculateChangePercent', () => {
    it('should calculate positive change percentage correctly', () => {
      const result = service.calculateChangePercent(110, 100);
      expect(result).toBe(10);
    });

    it('should calculate negative change percentage correctly', () => {
      const result = service.calculateChangePercent(90, 100);
      expect(result).toBe(-10);
    });

    it('should return 0 for no change', () => {
      const result = service.calculateChangePercent(100, 100);
      expect(result).toBe(0);
    });

    it('should handle division by zero', () => {
      expect(service.calculateChangePercent(50, 0)).toBe(100);
      expect(service.calculateChangePercent(-50, 0)).toBe(-100);
      expect(service.calculateChangePercent(0, 0)).toBe(0);
    });

    it('should handle negative previous values', () => {
      const result = service.calculateChangePercent(-90, -100);
      expect(result).toBe(10);
    });
  });

  describe('validateTrendConsistency', () => {
    it('should validate consistent upward trend', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 100,
        unit: 'units',
        trend: 'up',
        changePercentage: 10
      };
      expect(service.validateTrendConsistency(metric)).toBe(true);
    });

    it('should validate consistent downward trend', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 90,
        unit: 'units',
        trend: 'down',
        changePercentage: -10
      };
      expect(service.validateTrendConsistency(metric)).toBe(true);
    });

    it('should validate consistent stable trend', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 100,
        unit: 'units',
        trend: 'stable',
        changePercentage: 0
      };
      expect(service.validateTrendConsistency(metric)).toBe(true);
    });

    it('should detect inconsistent trend (up with negative change)', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 90,
        unit: 'units',
        trend: 'up',
        changePercentage: -10
      };
      expect(service.validateTrendConsistency(metric)).toBe(false);
    });

    it('should detect inconsistent trend (down with positive change)', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 110,
        unit: 'units',
        trend: 'down',
        changePercentage: 10
      };
      expect(service.validateTrendConsistency(metric)).toBe(false);
    });

    it('should detect inconsistent trend (stable with non-zero change)', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 110,
        unit: 'units',
        trend: 'stable',
        changePercentage: 10
      };
      expect(service.validateTrendConsistency(metric)).toBe(false);
    });
  });

  describe('normalizeMetric', () => {
    it('should correct inconsistent upward trend', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 90,
        unit: 'units',
        trend: 'up',
        changePercentage: -10
      };
      const normalized = service.normalizeMetric(metric);
      expect(normalized.trend).toBe('down');
      expect(normalized.changePercentage).toBe(-10);
    });

    it('should correct inconsistent downward trend', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 110,
        unit: 'units',
        trend: 'down',
        changePercentage: 10
      };
      const normalized = service.normalizeMetric(metric);
      expect(normalized.trend).toBe('up');
      expect(normalized.changePercentage).toBe(10);
    });

    it('should not modify consistent metrics', () => {
      const metric: InsightMetric = {
        name: 'Test',
        value: 110,
        unit: 'units',
        trend: 'up',
        changePercentage: 10
      };
      const normalized = service.normalizeMetric(metric);
      expect(normalized).toEqual(metric);
    });
  });

  describe('normalizeMetrics', () => {
    it('should normalize multiple metrics', () => {
      const metrics: InsightMetric[] = [
        { name: 'Metric1', value: 110, unit: 'units', trend: 'down', changePercentage: 10 },
        { name: 'Metric2', value: 90, unit: 'units', trend: 'up', changePercentage: -10 },
        { name: 'Metric3', value: 100, unit: 'units', trend: 'up', changePercentage: 5 }
      ];

      const normalized = service.normalizeMetrics(metrics);

      expect(normalized[0].trend).toBe('up');
      expect(normalized[1].trend).toBe('down');
      expect(normalized[2].trend).toBe('up');
    });
  });

  describe('createMetric', () => {
    it('should create metric with correct trend for positive change', () => {
      const metric = service.createMetric('CPU Usage', 75, '%', 15);
      
      expect(metric.name).toBe('CPU Usage');
      expect(metric.value).toBe(75);
      expect(metric.unit).toBe('%');
      expect(metric.changePercentage).toBe(15);
      expect(metric.trend).toBe('up');
    });

    it('should create metric with correct trend for negative change', () => {
      const metric = service.createMetric('Response Time', 200, 'ms', -20);
      
      expect(metric.trend).toBe('down');
    });

    it('should create metric with correct trend for zero change', () => {
      const metric = service.createMetric('Errors', 0, 'count', 0);
      
      expect(metric.trend).toBe('stable');
    });
  });

  describe('createMetricFromValues', () => {
    it('should create metric from current and previous values', () => {
      const metric = service.createMetricFromValues('Users', 110, 100, 'count');
      
      expect(metric.name).toBe('Users');
      expect(metric.value).toBe(110);
      expect(metric.unit).toBe('count');
      expect(metric.changePercentage).toBe(10);
      expect(metric.trend).toBe('up');
    });

    it('should handle decreasing values', () => {
      const metric = service.createMetricFromValues('Latency', 90, 100, 'ms');
      
      expect(metric.changePercentage).toBe(-10);
      expect(metric.trend).toBe('down');
    });

    it('should handle stable values', () => {
      const metric = service.createMetricFromValues('Status', 100, 100, 'score');
      
      expect(metric.changePercentage).toBe(0);
      expect(metric.trend).toBe('stable');
    });
  });

  describe('getTrendIcon', () => {
    it('should return correct icons for trends', () => {
      expect(service.getTrendIcon('up')).toBe('↑');
      expect(service.getTrendIcon('down')).toBe('↓');
      expect(service.getTrendIcon('stable')).toBe('→');
    });
  });

  describe('getTrendDescription', () => {
    it('should return correct descriptions for trends', () => {
      expect(service.getTrendDescription('up')).toBe('Increasing');
      expect(service.getTrendDescription('down')).toBe('Decreasing');
      expect(service.getTrendDescription('stable')).toBe('Stable');
    });
  });

  describe('formatChangePercent', () => {
    it('should format positive change with plus sign', () => {
      expect(service.formatChangePercent(10.5)).toBe('+10.5%');
    });

    it('should format negative change with minus sign', () => {
      expect(service.formatChangePercent(-10.5)).toBe('-10.5%');
    });

    it('should format zero change', () => {
      expect(service.formatChangePercent(0)).toBe('0.0%');
    });

    it('should respect decimal places parameter', () => {
      expect(service.formatChangePercent(10.567, 2)).toBe('+10.57%');
      expect(service.formatChangePercent(10.567, 0)).toBe('+11%');
    });
  });

  describe('isSignificantChange', () => {
    it('should identify significant changes above threshold', () => {
      expect(service.isSignificantChange(10, 5)).toBe(true);
      expect(service.isSignificantChange(-10, 5)).toBe(true);
    });

    it('should identify insignificant changes below threshold', () => {
      expect(service.isSignificantChange(3, 5)).toBe(false);
      expect(service.isSignificantChange(-3, 5)).toBe(false);
    });

    it('should handle exact threshold', () => {
      expect(service.isSignificantChange(5, 5)).toBe(true);
      expect(service.isSignificantChange(-5, 5)).toBe(true);
    });
  });

  describe('getChangeSeverity', () => {
    it('should return "high" for changes >= 20%', () => {
      expect(service.getChangeSeverity(20)).toBe('high');
      expect(service.getChangeSeverity(-25)).toBe('high');
      expect(service.getChangeSeverity(100)).toBe('high');
    });

    it('should return "medium" for changes >= 10% and < 20%', () => {
      expect(service.getChangeSeverity(10)).toBe('medium');
      expect(service.getChangeSeverity(-15)).toBe('medium');
      expect(service.getChangeSeverity(19.9)).toBe('medium');
    });

    it('should return "low" for changes < 10%', () => {
      expect(service.getChangeSeverity(5)).toBe('low');
      expect(service.getChangeSeverity(-5)).toBe('low');
      expect(service.getChangeSeverity(0)).toBe('low');
    });
  });

  describe('validateMetrics', () => {
    it('should validate all consistent metrics', () => {
      const metrics: InsightMetric[] = [
        { name: 'Metric1', value: 110, unit: 'units', trend: 'up', changePercentage: 10 },
        { name: 'Metric2', value: 90, unit: 'units', trend: 'down', changePercentage: -10 },
        { name: 'Metric3', value: 100, unit: 'units', trend: 'stable', changePercentage: 0 }
      ];

      const result = service.validateMetrics(metrics);

      expect(result.valid).toBe(true);
      expect(result.invalidMetrics.length).toBe(0);
    });

    it('should identify inconsistent metrics', () => {
      const metrics: InsightMetric[] = [
        { name: 'Metric1', value: 110, unit: 'units', trend: 'down', changePercentage: 10 },
        { name: 'Metric2', value: 90, unit: 'units', trend: 'up', changePercentage: -10 }
      ];

      const result = service.validateMetrics(metrics);

      expect(result.valid).toBe(false);
      expect(result.invalidMetrics.length).toBe(2);
      expect(result.invalidMetrics[0].expectedTrend).toBe('up');
      expect(result.invalidMetrics[1].expectedTrend).toBe('down');
    });

    it('should return valid for empty array', () => {
      const result = service.validateMetrics([]);

      expect(result.valid).toBe(true);
      expect(result.invalidMetrics.length).toBe(0);
    });
  });
});
