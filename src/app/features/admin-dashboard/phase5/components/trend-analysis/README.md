# Trend Analysis Component

## Overview

The Trend Analysis component provides comprehensive trend visualization, anomaly detection, and statistical analysis for time series data. It supports multiple chart types, smoothing algorithms, and interactive anomaly exploration.

## Features

### Trend Visualization (Requirement 14.1)
- Multiple chart types: line, area, bar, scatter
- Interactive data point selection
- Customizable time ranges
- Export capabilities (CSV, JSON)

### Statistical Analysis (Requirements 14.2, 14.3)
- Mean, median, standard deviation, variance
- Min/max values
- Linear regression (slope and R-squared)
- Statistical accuracy guaranteed (mean = sum / count)

### Anomaly Detection (Requirements 14.4, 14.5, 14.6)
- Threshold-based flagging
- Severity classification (low, medium, high)
- Anomaly type detection (spike, drop, shift)
- Detailed explanations for each anomaly

### Smoothing Algorithms (Requirement 14.7)
- Moving average
- Exponential smoothing
- Configurable parameters (window size, alpha)

## Usage

```typescript
import { TrendAnalysisComponent } from './components/trend-analysis/trend-analysis.component';

// In your template
<app-trend-analysis
  [metric]="'Job Completion Rate'"
  [timeRange]="timeRange"
  [showAnomalies]="true"
  [showStatistics]="true"
  [chartType]="'line'"
  (anomalySelected)="onAnomalySelected($event)"
  (dataPointSelected)="onDataPointSelected($event)"
></app-trend-analysis>
```

## Service API

### TrendAnalysisService

```typescript
// Detect anomalies
const anomalies = trendAnalysisService.detectAnomalies(dataPoints, {
  threshold: 2.0,
  minDataPoints: 5,
  includeExplanations: true
});

// Calculate statistics
const statistics = trendAnalysisService.calculateTrendStatistics(dataPoints);

// Apply smoothing
const smoothed = trendAnalysisService.applySmoothingAlgorithm(dataPoints, {
  algorithm: 'moving-average',
  windowSize: 3
});

// Analyze trend direction
const analysis = trendAnalysisService.analyzeTrendDirection(statistics);
```

## Configuration

### Anomaly Detection
- **threshold**: Number of standard deviations from mean (default: 2.0)
- **minDataPoints**: Minimum data points required (default: 5)
- **includeExplanations**: Generate human-readable explanations (default: false)

### Smoothing
- **Moving Average**
  - windowSize: Number of points to average (default: 3)
- **Exponential Smoothing**
  - alpha: Smoothing factor 0-1 (default: 0.3)

## Anomaly Severity Classification

- **High**: deviation > threshold × 2
- **Medium**: deviation > threshold × 1.5
- **Low**: deviation > threshold

## Anomaly Types

- **Spike**: Temporary increase that returns to normal
- **Drop**: Temporary decrease that returns to normal
- **Shift**: Sustained change in baseline

## Testing

Run unit tests:
```bash
ng test --include='**/trend-analysis/**/*.spec.ts'
```

## Requirements Validation

- ✅ 14.1: Trend visualization with multiple chart types
- ✅ 14.2: Trend statistics display
- ✅ 14.3: Statistical accuracy (mean = sum / count)
- ✅ 14.4: Anomaly detection with threshold
- ✅ 14.5: Anomaly severity classification
- ✅ 14.6: Anomaly highlighting in visualization
- ✅ 14.7: Smoothing algorithms (moving average, exponential)

## Files Created

1. `trend-analysis.service.ts` - Core trend analysis and anomaly detection logic
2. `trend-analysis.service.spec.ts` - Service unit tests
3. `trend-analysis.component.ts` - Component implementation
4. `trend-analysis.component.html` - Component template
5. `trend-analysis.component.scss` - Component styles
6. `trend-analysis.component.spec.ts` - Component unit tests

## Next Steps

1. Integrate with NgRx store for real-time data
2. Add backend API integration for historical data
3. Implement seasonality detection
4. Add correlation analysis with other metrics
5. Create predictive dashboard integration
