import { Injectable } from '@angular/core';
import { InsightMetric } from '../models/recommendation.models';

/**
 * Insight Metrics Service
 * 
 * Provides utility functions for calculating and validating insight metric trends.
 * Ensures trend consistency with change percentages.
 * 
 * **Validates: Requirements 9.3, 9.4, 9.5**
 */
@Injectable({
  providedIn: 'root'
})
export class InsightMetricsService {

  /**
   * Calculate trend based on change percentage
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * Rules:
   * - Positive change percentage → trend = 'up'
   * - Negative change percentage → trend = 'down'
   * - Zero change percentage → trend = 'stable'
   * 
   * @param changePercentage The percentage change value
   * @returns The trend direction ('up', 'down', or 'stable')
   */
  calculateTrend(changePercentage: number): 'up' | 'down' | 'stable' {
    if (changePercentage > 0) {
      return 'up';
    } else if (changePercentage < 0) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate change percentage between two values
   * 
   * @param currentValue The current value
   * @param previousValue The previous value
   * @returns The percentage change
   */
  calculateChangePercent(currentValue: number, previousValue: number): number {
    if (previousValue === 0) {
      // Handle division by zero
      return currentValue > 0 ? 100 : (currentValue < 0 ? -100 : 0);
    }
    
    const change = currentValue - previousValue;
    const changePercentage = (change / Math.abs(previousValue)) * 100;
    
    return changePercentage;
  }

  /**
   * Validate that trend is consistent with change percentage
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * Ensures:
   * - If changePercentage > 0, trend must be 'up'
   * - If changePercentage < 0, trend must be 'down'
   * - If changePercentage === 0, trend must be 'stable'
   * 
   * @param metric The insight metric to validate
   * @returns True if trend is consistent with changePercentage, false otherwise
   */
  validateTrendConsistency(metric: InsightMetric): boolean {
    const expectedTrend = this.calculateTrend(metric.changePercentage);
    return metric.trend === expectedTrend;
  }

  /**
   * Normalize an insight metric to ensure trend consistency
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * If the trend is inconsistent with changePercentage, this function
   * corrects the trend to match the changePercentage value.
   * 
   * @param metric The insight metric to normalize
   * @returns A normalized metric with consistent trend
   */
  normalizeMetric(metric: InsightMetric): InsightMetric {
    const correctTrend = this.calculateTrend(metric.changePercentage);
    
    return {
      ...metric,
      trend: correctTrend
    };
  }

  /**
   * Normalize multiple metrics to ensure trend consistency
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * @param metrics Array of insight metrics to normalize
   * @returns Array of normalized metrics with consistent trends
   */
  normalizeMetrics(metrics: InsightMetric[]): InsightMetric[] {
    return metrics.map(metric => this.normalizeMetric(metric));
  }

  /**
   * Create an insight metric with automatic trend calculation
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * @param name Metric name
   * @param value Current value
   * @param unit Unit of measurement
   * @param changePercentage Percentage change
   * @returns A complete InsightMetric with calculated trend
   */
  createMetric(
    name: string,
    value: number,
    unit: string,
    changePercentage: number
  ): InsightMetric {
    return {
      name,
      value,
      unit,
      changePercentage,
      trend: this.calculateTrend(changePercentage)
    };
  }

  /**
   * Create an insight metric from current and previous values
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * @param name Metric name
   * @param currentValue Current value
   * @param previousValue Previous value
   * @param unit Unit of measurement
   * @returns A complete InsightMetric with calculated change and trend
   */
  createMetricFromValues(
    name: string,
    currentValue: number,
    previousValue: number,
    unit: string
  ): InsightMetric {
    const changePercentage = this.calculateChangePercent(currentValue, previousValue);
    
    return this.createMetric(name, currentValue, unit, changePercentage);
  }

  /**
   * Get trend icon representation
   * 
   * @param trend The trend direction
   * @returns Unicode arrow character representing the trend
   */
  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
        return '→';
      default:
        return '→';
    }
  }

  /**
   * Get trend description
   * 
   * @param trend The trend direction
   * @returns Human-readable description of the trend
   */
  getTrendDescription(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up':
        return 'Increasing';
      case 'down':
        return 'Decreasing';
      case 'stable':
        return 'Stable';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format change percentage for display
   * 
   * @param changePercentage The percentage change value
   * @param decimals Number of decimal places (default: 1)
   * @returns Formatted string with sign and percentage symbol
   */
  formatChangePercent(changePercentage: number, decimals: number = 1): string {
    const sign = changePercentage > 0 ? '+' : '';
    return `${sign}${changePercentage.toFixed(decimals)}%`;
  }

  /**
   * Determine if a change is significant
   * 
   * @param changePercentage The percentage change value
   * @param threshold Threshold for significance (default: 5%)
   * @returns True if the absolute change exceeds the threshold
   */
  isSignificantChange(changePercentage: number, threshold: number = 5): boolean {
    return Math.abs(changePercentage) >= threshold;
  }

  /**
   * Get change severity level
   * 
   * @param changePercentage The percentage change value
   * @returns Severity level ('low', 'medium', 'high')
   */
  getChangeSeverity(changePercentage: number): 'low' | 'medium' | 'high' {
    const absChange = Math.abs(changePercentage);
    
    if (absChange >= 20) {
      return 'high';
    } else if (absChange >= 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Validate multiple metrics for trend consistency
   * 
   * **Validates: Requirements 9.3, 9.4, 9.5**
   * 
   * @param metrics Array of insight metrics to validate
   * @returns Object with validation results
   */
  validateMetrics(metrics: InsightMetric[]): {
    valid: boolean;
    invalidMetrics: Array<{ metric: InsightMetric; expectedTrend: 'up' | 'down' | 'stable' }>;
  } {
    const invalidMetrics: Array<{ metric: InsightMetric; expectedTrend: 'up' | 'down' | 'stable' }> = [];

    metrics.forEach(metric => {
      if (!this.validateTrendConsistency(metric)) {
        invalidMetrics.push({
          metric,
          expectedTrend: this.calculateTrend(metric.changePercentage)
        });
      }
    });

    return {
      valid: invalidMetrics.length === 0,
      invalidMetrics
    };
  }
}
