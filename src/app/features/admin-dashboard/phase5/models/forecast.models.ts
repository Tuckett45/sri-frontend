/**
 * Forecast Models for Phase 5: Predictive Dashboards
 * 
 * Defines data structures for forecasts, predictions, trends, and related analytics.
 * 
 * **Validates: Requirements 13.1-13.7, 14.1-14.7, 15.1-15.5**
 */

// Common Models
export interface TimeRange {
  start: Date;
  end: Date;
}

// Forecast Models
export interface Forecast {
  id: string;
  metric: string;
  timeHorizon: 'week' | 'month' | 'quarter' | 'year';
  dataPoints: ForecastDataPoint[];
  confidence: ConfidenceInterval;
  methodology: string;
  modelId: string;
  generatedAt: Date;
  expiresAt: Date;
}

export interface ForecastDataPoint {
  timestamp: Date;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ConfidenceInterval {
  level: number; // e.g., 0.95 for 95% confidence
  lowerBound: number;
  upperBound: number;
}

export interface ResourceForecast extends Forecast {
  resourceType: 'technician' | 'equipment' | 'material';
  currentCapacity: number;
  projectedDemand: number;
  utilizationRate: number;
  recommendations: string[];
}

export interface WorkloadForecast extends Forecast {
  jobType: string;
  projectedVolume: number;
  peakPeriods: PeakPeriod[];
  resourceRequirements: ResourceRequirement[];
}

export interface PeakPeriod {
  startDate: Date;
  endDate: Date;
  projectedVolume: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ResourceRequirement {
  resourceType: string;
  quantity: number;
  skillLevel: string;
  timeframe: TimeRange;
}

// Prediction Models
export interface Prediction {
  id: string;
  type: 'anomaly' | 'capacity' | 'performance' | 'risk';
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timeframe: TimeRange;
  indicators: PredictionIndicator[];
  mitigationActions: string[];
  createdAt: Date;
}

export interface PredictionIndicator {
  name: string;
  currentValue: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: number;
}

export interface AnomalyPrediction extends Prediction {
  anomalyType: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  historicalContext: HistoricalContext;
}

export interface CapacityPrediction extends Prediction {
  resourceType: string;
  currentCapacity: number;
  projectedDemand: number;
  shortfall: number;
  recommendedActions: CapacityAction[];
}

export interface CapacityAction {
  type: 'hire' | 'train' | 'reallocate' | 'outsource';
  quantity: number;
  timeframe: string;
  estimatedCost: number;
}

// Trend Models
export interface Trend {
  id: string;
  metric: string;
  direction: 'upward' | 'downward' | 'stable' | 'volatile';
  strength: number; // 0-1
  dataPoints: TrendDataPoint[];
  statistics: TrendStatistics;
  seasonality?: SeasonalityPattern;
  anomalies: Anomaly[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  smoothedValue?: number;
  isAnomaly: boolean;
}

export interface TrendStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  slope: number;
  rSquared: number;
}

export interface SeasonalityPattern {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  strength: number;
  peaks: Date[];
  troughs: Date[];
}

export interface Anomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'drop' | 'shift';
  explanation?: string;
}

export interface HistoricalTrend {
  metric: string;
  timeRange: TimeRange;
  dataPoints: TrendDataPoint[];
  patterns: Pattern[];
  correlations: Correlation[];
}

export interface Pattern {
  type: 'seasonal' | 'cyclical' | 'trend' | 'irregular';
  description: string;
  strength: number;
  occurrences: Date[];
}

export interface Correlation {
  metric1: string;
  metric2: string;
  coefficient: number;
  significance: number;
  relationship: 'positive' | 'negative' | 'none';
}

export interface TrendComparison {
  metrics: string[];
  timeRange: TimeRange;
  trends: Map<string, Trend>;
  correlations: Correlation[];
  insights: string[];
}

// Model and Scenario Models
export interface ModelMetadata {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'time-series' | 'neural-network';
  version: string;
  trainedOn: Date;
  features: string[];
  accuracy: AccuracyMetrics;
  parameters: Record<string, any>;
}

export interface AccuracyMetrics {
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  mape: number; // Mean Absolute Percentage Error
  r2Score: number; // R-squared
  confidenceLevel: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: ScenarioParameter[];
  assumptions: string[];
}

export interface ScenarioParameter {
  name: string;
  baseValue: number;
  adjustedValue: number;
  changePercent: number;
}

export interface ScenarioResult {
  scenarioId: string;
  outcomes: ScenarioOutcome[];
  metrics: Record<string, number>;
  recommendations: string[];
  confidence: number;
}

export interface ScenarioOutcome {
  metric: string;
  baselineValue: number;
  projectedValue: number;
  change: number;
  changePercent: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  results: Map<string, ScenarioResult>;
  bestScenario: string;
  worstScenario: string;
  insights: string[];
}

// Request/Response Models
export interface ForecastParams {
  metric: string;
  timeHorizon: 'week' | 'month' | 'quarter' | 'year';
  includeConfidenceIntervals: boolean;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface PredictionContext {
  type: string;
  entityId?: string;
  timeRange?: TimeRange;
  includeRecommendations: boolean;
}

export interface HistoricalContext {
  similarEvents: HistoricalEvent[];
  averageImpact: number;
  resolutionTime: number;
}

export interface HistoricalEvent {
  timestamp: Date;
  description: string;
  impact: number;
  resolution: string;
}

export interface ConfidenceMetrics {
  overall: number;
  byMetric: Map<string, number>;
  byTimeframe: Map<string, number>;
}
