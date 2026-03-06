/**
 * Trend Analysis Service for Phase 5: Predictive Dashboards
 * 
 * Provides trend analysis, anomaly detection, and statistical calculations.
 * 
 * **Validates: Requirements 14.1-14.7**
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Trend,
  TrendDataPoint,
  TrendStatistics,
  Anomaly,
  TimeRange
} from '../models/forecast.models';

export interface AnomalyDetectionConfig {
  threshold: number; // Standard deviations from mean
  minDataPoints?: number;
  includeExplanations?: boolean;
}

export interface SmoothingConfig {
  algorithm: 'moving-average' | 'exponential';
  windowSize?: number; // For moving average
  alpha?: number; // For exponential smoothing (0-1)
}

@Injectable({
  providedIn: 'root'
})
export class TrendAnalysisService {

  /**
   * Detects anomalies in time series data using threshold-based flagging
   * 
   * **Validates: Requirements 14.4, 14.5, 14.6**
   * 
   * @param dataPoints - Array of data points to analyze
   * @param config - Anomaly detection configuration
   * @returns Array of detected anomalies
   */
  detectAnomalies(
    dataPoints: TrendDataPoint[],
    config: AnomalyDetectionConfig = { threshold: 2.0 }
  ): Anomaly[] {
    const minPoints = config.minDataPoints || 5;
    
    if (dataPoints.length < minPoints) {
      return [];
    }

    // Calculate statistical measures
    const values = dataPoints.map(dp => dp.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStandardDeviation(values, mean);

    const anomalies: Anomaly[] = [];

    dataPoints.forEach((dataPoint, index) => {
      const deviation = Math.abs(dataPoint.value - mean);
      const normalizedDeviation = stdDev > 0 ? deviation / stdDev : 0;

      // Flag as anomaly if deviation exceeds threshold
      if (normalizedDeviation > config.threshold) {
        const severity = this.classifyAnomalySeverity(normalizedDeviation, config.threshold);
        const type = this.determineAnomalyType(dataPoint, dataPoints, index, mean);

        const anomaly: Anomaly = {
          timestamp: dataPoint.timestamp,
          value: dataPoint.value,
          expectedValue: mean,
          deviation: deviation,
          severity: severity,
          type: type
        };

        if (config.includeExplanations) {
          anomaly.explanation = this.generateAnomalyExplanation(anomaly, normalizedDeviation);
        }

        anomalies.push(anomaly);
      }
    });

    return anomalies;
  }

  /**
   * Calculates comprehensive trend statistics
   * 
   * **Validates: Requirements 14.2, 14.3**
   * 
   * @param dataPoints - Array of data points to analyze
   * @returns Trend statistics including mean, median, std dev, variance, and regression
   */
  calculateTrendStatistics(dataPoints: TrendDataPoint[]): TrendStatistics {
    if (dataPoints.length === 0) {
      return this.getEmptyStatistics();
    }

    const values = dataPoints.map(dp => dp.value);
    
    // Calculate basic statistics
    const mean = this.calculateMean(values);
    const median = this.calculateMedian(values);
    const variance = this.calculateVariance(values, mean);
    const standardDeviation = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate linear regression
    const { slope, rSquared } = this.calculateLinearRegression(dataPoints);

    return {
      mean,
      median,
      standardDeviation,
      variance,
      min,
      max,
      slope,
      rSquared
    };
  }

  /**
   * Applies smoothing algorithm to trend data
   * 
   * **Validates: Requirements 14.7**
   * 
   * @param dataPoints - Array of data points to smooth
   * @param config - Smoothing configuration
   * @returns Array of data points with smoothed values
   */
  applySmoothingAlgorithm(
    dataPoints: TrendDataPoint[],
    config: SmoothingConfig
  ): TrendDataPoint[] {
    if (config.algorithm === 'moving-average') {
      return this.applyMovingAverage(dataPoints, config.windowSize || 3);
    } else if (config.algorithm === 'exponential') {
      return this.applyExponentialSmoothing(dataPoints, config.alpha || 0.3);
    }
    return dataPoints;
  }

  /**
   * Analyzes trend direction and strength
   * 
   * @param statistics - Trend statistics
   * @returns Trend direction and strength
   */
  analyzeTrendDirection(statistics: TrendStatistics): {
    direction: 'upward' | 'downward' | 'stable' | 'volatile';
    strength: number;
  } {
    const { slope, rSquared, standardDeviation, mean } = statistics;
    
    // Calculate coefficient of variation for volatility
    const coefficientOfVariation = mean !== 0 ? standardDeviation / Math.abs(mean) : 0;
    
    // Determine direction based on slope and R-squared
    let direction: 'upward' | 'downward' | 'stable' | 'volatile';
    
    if (coefficientOfVariation > 0.5) {
      direction = 'volatile';
    } else if (Math.abs(slope) < 0.01 || rSquared < 0.3) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'upward';
    } else {
      direction = 'downward';
    }

    // Strength is based on R-squared (how well the trend fits)
    const strength = Math.min(rSquared, 1.0);

    return { direction, strength };
  }

  // Private helper methods

  /**
   * Calculates mean (average) of values
   * Ensures: mean = sum / count (Requirement 14.3)
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculates median of values
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Calculates variance of values
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  }

  /**
   * Calculates standard deviation of values
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    return Math.sqrt(this.calculateVariance(values, mean));
  }

  /**
   * Calculates linear regression slope and R-squared
   */
  private calculateLinearRegression(dataPoints: TrendDataPoint[]): {
    slope: number;
    rSquared: number;
  } {
    if (dataPoints.length < 2) {
      return { slope: 0, rSquared: 0 };
    }

    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i); // Use index as x-coordinate
    const y = dataPoints.map(dp => dp.value);

    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
    const sumY2 = y.reduce((acc, val) => acc + val * val, 0);

    // Calculate slope
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((acc, val) => acc + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((acc, val, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return acc + Math.pow(val - predicted, 2);
    }, 0);

    const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

    return { slope, rSquared: Math.max(0, Math.min(1, rSquared)) };
  }

  /**
   * Classifies anomaly severity based on deviation magnitude
   * 
   * **Validates: Requirement 14.5**
   * - High: deviation > threshold × 2
   * - Medium: deviation > threshold × 1.5
   * - Low: otherwise
   */
  private classifyAnomalySeverity(
    normalizedDeviation: number,
    threshold: number
  ): 'low' | 'medium' | 'high' {
    if (normalizedDeviation > threshold * 2) {
      return 'high';
    } else if (normalizedDeviation > threshold * 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determines anomaly type (spike, drop, shift)
   * 
   * **Validates: Requirement 14.6**
   */
  private determineAnomalyType(
    dataPoint: TrendDataPoint,
    allDataPoints: TrendDataPoint[],
    index: number,
    mean: number
  ): 'spike' | 'drop' | 'shift' {
    const value = dataPoint.value;
    
    // Check if it's a temporary spike or drop (returns to normal)
    const hasNeighbors = index > 0 && index < allDataPoints.length - 1;
    
    if (hasNeighbors) {
      const prevValue = allDataPoints[index - 1].value;
      const nextValue = allDataPoints[index + 1].value;
      
      const prevNormal = Math.abs(prevValue - mean) < Math.abs(value - mean);
      const nextNormal = Math.abs(nextValue - mean) < Math.abs(value - mean);
      
      if (prevNormal && nextNormal) {
        return value > mean ? 'spike' : 'drop';
      }
    }
    
    // If not a temporary anomaly, it's a shift
    return 'shift';
  }

  /**
   * Generates human-readable explanation for anomaly
   */
  private generateAnomalyExplanation(
    anomaly: Anomaly,
    normalizedDeviation: number
  ): string {
    const deviationPercent = ((anomaly.deviation / anomaly.expectedValue) * 100).toFixed(1);
    const direction = anomaly.value > anomaly.expectedValue ? 'above' : 'below';
    
    return `${anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)} detected: ` +
           `Value ${anomaly.value.toFixed(2)} is ${deviationPercent}% ${direction} ` +
           `expected value ${anomaly.expectedValue.toFixed(2)} ` +
           `(${normalizedDeviation.toFixed(2)} standard deviations)`;
  }

  /**
   * Applies moving average smoothing
   */
  private applyMovingAverage(
    dataPoints: TrendDataPoint[],
    windowSize: number
  ): TrendDataPoint[] {
    return dataPoints.map((dp, index) => {
      // Use backward-looking window (current point and previous points)
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const window = dataPoints.slice(start, end);
      const smoothedValue = this.calculateMean(window.map(p => p.value));
      
      return {
        ...dp,
        smoothedValue
      };
    });
  }

  /**
   * Applies exponential smoothing
   */
  private applyExponentialSmoothing(
    dataPoints: TrendDataPoint[],
    alpha: number
  ): TrendDataPoint[] {
    if (dataPoints.length === 0) return [];
    
    const result: TrendDataPoint[] = [];
    let smoothedValue = dataPoints[0].value;
    
    dataPoints.forEach(dp => {
      smoothedValue = alpha * dp.value + (1 - alpha) * smoothedValue;
      result.push({
        ...dp,
        smoothedValue
      });
    });
    
    return result;
  }

  /**
   * Returns empty statistics object
   */
  private getEmptyStatistics(): TrendStatistics {
    return {
      mean: 0,
      median: 0,
      standardDeviation: 0,
      variance: 0,
      min: 0,
      max: 0,
      slope: 0,
      rSquared: 0
    };
  }
}
