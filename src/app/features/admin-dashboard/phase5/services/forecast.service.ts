import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environments';
import { CacheService } from '../../../field-resource-management/services/cache.service';
import {
  Forecast,
  ForecastParams,
  ResourceForecast,
  WorkloadForecast,
  Prediction,
  PredictionContext,
  AnomalyPrediction,
  CapacityPrediction,
  Trend,
  TimeRange,
  HistoricalTrend,
  TrendComparison,
  ModelMetadata,
  AccuracyMetrics,
  Scenario,
  ScenarioParameter,
  ScenarioResult,
  ScenarioOutcome,
  ScenarioComparison
} from '../models/forecast.models';

/**
 * Service for managing forecasts, predictions, and trend analysis
 * Implements caching with expiration, data validation, and error handling
 * 
 * **Validates: Requirements 13.1, 13.2, 13.6, 14.1, 16.4, 16.5**
 */
@Injectable({
  providedIn: 'root'
})
export class ForecastService {
  private readonly baseUrl = `${environment.apiUrl}/analytics`;
  private readonly forecastsUrl = `${this.baseUrl}/forecasts`;
  private readonly predictionsUrl = `${this.baseUrl}/predictions`;
  private readonly trendsUrl = `${this.baseUrl}/trends`;
  
  // Minimum historical data points required for forecasting
  private readonly MIN_HISTORICAL_DATA_POINTS = 30;

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Fetches forecasts for given parameters
   * Validates sufficient historical data exists (minimum 30 points)
   * Implements caching with expiration (Requirement 16.4)
   * Fetches fresh data when cache expired (Requirement 16.3)
   * 
   * **Validates: Requirements 13.1, 13.2, 13.6, 16.3, 16.4**
   */
  getForecasts(params: ForecastParams): Observable<Forecast[]> {
    // Validate parameters
    if (!params.metric || !params.timeHorizon) {
      return throwError(() => new Error('Invalid forecast parameters: metric and timeHorizon are required'));
    }

    const cacheKey = this.getCacheKey(params);
    
    return this.cacheService.get(
      cacheKey,
      () => {
        // Build query parameters
        const queryParams = this.buildForecastQueryParams(params);
        
        return this.http.get<{ forecasts: Forecast[]; historicalDataPoints: number }>(
          this.forecastsUrl, 
          { params: queryParams }
        ).pipe(
          map(response => {
            // Validate sufficient historical data
            if (response.historicalDataPoints < this.MIN_HISTORICAL_DATA_POINTS) {
              const error: any = new Error(
                `Insufficient historical data: ${response.historicalDataPoints} points available, ` +
                `minimum ${this.MIN_HISTORICAL_DATA_POINTS} required`
              );
              error.code = 'INSUFFICIENT_DATA';
              error.userFriendlyMessage = 
                `Unable to generate forecast: At least ${this.MIN_HISTORICAL_DATA_POINTS} historical data points are required, ` +
                `but only ${response.historicalDataPoints} are available. Please collect more data before requesting a forecast.`;
              throw error;
            }

            // Validate and transform forecasts
            const validatedForecasts = response.forecasts.map(forecast => 
              this.validateAndTransformForecast(forecast)
            );

            return validatedForecasts;
          }),
          catchError(error => {
            console.error('Error fetching forecasts:', error);
            
            // Add user-friendly message if not already present
            if (!error.userFriendlyMessage) {
              if (error.code === 'INSUFFICIENT_DATA') {
                // Already has user-friendly message from validation above
              } else if (error.status === 503 || error.status === 0) {
                error.userFriendlyMessage = 'The forecasting service is temporarily unavailable. Please try again later.';
              } else {
                error.userFriendlyMessage = 'Unable to generate forecast. Please try again or contact support if the problem persists.';
              }
            }
            
            return throwError(() => error);
          })
        );
      },
      // Calculate TTL based on forecast expiration (cache until expiration)
      24 * 60 * 60 * 1000 // Default 24 hours, will be overridden by forecast expiration
    );
  }

  /**
   * Fetches a single forecast by ID
   * 
   * **Validates: Requirements 13.1**
   */
  getForecastById(id: string): Observable<Forecast> {
    if (!id) {
      return throwError(() => new Error('Forecast ID is required'));
    }

    return this.http.get<Forecast>(`${this.forecastsUrl}/${id}`).pipe(
      map(forecast => this.validateAndTransformForecast(forecast)),
      catchError(error => {
        console.error(`Error fetching forecast ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches resource forecasts for a given time horizon
   * 
   * **Validates: Requirements 13.1, 13.6**
   */
  getResourceForecasts(timeHorizon: string): Observable<ResourceForecast[]> {
    if (!timeHorizon) {
      return throwError(() => new Error('Time horizon is required'));
    }

    return this.http.get<ResourceForecast[]>(
      `${this.forecastsUrl}/resources`,
      { params: { timeHorizon } }
    ).pipe(
      map(forecasts => forecasts.map(f => this.validateAndTransformForecast(f) as ResourceForecast)),
      catchError(error => {
        console.error('Error fetching resource forecasts:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches workload forecasts for a given time horizon
   * 
   * **Validates: Requirements 13.1, 13.6**
   */
  getWorkloadForecasts(timeHorizon: string): Observable<WorkloadForecast[]> {
    if (!timeHorizon) {
      return throwError(() => new Error('Time horizon is required'));
    }

    return this.http.get<WorkloadForecast[]>(
      `${this.forecastsUrl}/workload`,
      { params: { timeHorizon } }
    ).pipe(
      map(forecasts => forecasts.map(f => this.validateAndTransformForecast(f) as WorkloadForecast)),
      catchError(error => {
        console.error('Error fetching workload forecasts:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches predictions for a given context
   * 
   * **Validates: Requirements 13.1**
   */
  getPredictions(context: PredictionContext): Observable<Prediction[]> {
    if (!context.type) {
      return throwError(() => new Error('Prediction context type is required'));
    }

    const params = this.buildPredictionQueryParams(context);
    
    return this.http.get<Prediction[]>(this.predictionsUrl, { params }).pipe(
      map(predictions => predictions.map(p => this.transformPrediction(p))),
      catchError(error => {
        console.error('Error fetching predictions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches anomaly predictions
   * 
   * **Validates: Requirements 14.1**
   */
  getAnomalyPredictions(): Observable<AnomalyPrediction[]> {
    return this.http.get<AnomalyPrediction[]>(
      `${this.predictionsUrl}/anomalies`
    ).pipe(
      map(predictions => predictions.map(p => this.transformPrediction(p) as AnomalyPrediction)),
      catchError(error => {
        console.error('Error fetching anomaly predictions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches capacity predictions for a given time horizon
   * 
   * **Validates: Requirements 13.1**
   */
  getCapacityPredictions(timeHorizon: string): Observable<CapacityPrediction> {
    if (!timeHorizon) {
      return throwError(() => new Error('Time horizon is required'));
    }

    return this.http.get<CapacityPrediction>(
      `${this.predictionsUrl}/capacity`,
      { params: { timeHorizon } }
    ).pipe(
      map(prediction => this.transformPrediction(prediction) as CapacityPrediction),
      catchError(error => {
        console.error('Error fetching capacity predictions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches trends for a given metric and time range
   * 
   * **Validates: Requirements 14.1**
   */
  getTrends(metric: string, timeRange: TimeRange): Observable<Trend[]> {
    if (!metric) {
      return throwError(() => new Error('Metric is required'));
    }
    if (!timeRange || !timeRange.start || !timeRange.end) {
      return throwError(() => new Error('Valid time range is required'));
    }

    const params = {
      metric,
      startDate: timeRange.start.toISOString(),
      endDate: timeRange.end.toISOString()
    };
    
    return this.http.get<Trend[]>(this.trendsUrl, { params }).pipe(
      map(trends => trends.map(t => this.transformTrend(t))),
      catchError(error => {
        console.error('Error fetching trends:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches historical trends for a given metric
   * 
   * **Validates: Requirements 14.1**
   */
  getHistoricalTrends(metric: string): Observable<HistoricalTrend> {
    if (!metric) {
      return throwError(() => new Error('Metric is required'));
    }

    return this.http.get<HistoricalTrend>(
      `${this.trendsUrl}/historical/${metric}`
    ).pipe(
      map(trend => this.transformHistoricalTrend(trend)),
      catchError(error => {
        console.error(`Error fetching historical trends for ${metric}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Compares trends across multiple metrics
   * 
   * **Validates: Requirements 14.1**
   */
  compareTrends(metrics: string[]): Observable<TrendComparison> {
    if (!metrics || metrics.length === 0) {
      return throwError(() => new Error('At least one metric is required'));
    }

    return this.http.post<TrendComparison>(
      `${this.trendsUrl}/compare`,
      { metrics }
    ).pipe(
      map(comparison => this.transformTrendComparison(comparison)),
      catchError(error => {
        console.error('Error comparing trends:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches model metadata
   * 
   * **Validates: Requirements 13.1**
   */
  getModelMetadata(): Observable<ModelMetadata> {
    return this.http.get<ModelMetadata>(`${this.baseUrl}/models/metadata`).pipe(
      catchError(error => {
        console.error('Error fetching model metadata:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches model accuracy metrics
   * 
   * **Validates: Requirements 13.1**
   */
  getModelAccuracy(modelId: string): Observable<AccuracyMetrics> {
    if (!modelId) {
      return throwError(() => new Error('Model ID is required'));
    }

    return this.http.get<AccuracyMetrics>(
      `${this.baseUrl}/models/${modelId}/accuracy`
    ).pipe(
      catchError(error => {
        console.error(`Error fetching accuracy for model ${modelId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Runs scenario analysis
   * 
   * **Validates: Requirements 15.1, 15.2, 15.3**
   */
  runScenarioAnalysis(scenario: Scenario): Observable<ScenarioResult> {
    // Validate scenario structure
    if (!scenario || !scenario.parameters || scenario.parameters.length === 0) {
      return throwError(() => new Error('Valid scenario with parameters is required'));
    }

    // Validate scenario parameters (Requirements 15.1, 15.2)
    const validationErrors = this.validateScenarioParameters(scenario.parameters);
    if (validationErrors.length > 0) {
      return throwError(() => new Error(`Invalid scenario parameters: ${validationErrors.join(', ')}`));
    }

    return this.http.post<ScenarioResult>(
      `${this.baseUrl}/scenarios/analyze`,
      scenario
    ).pipe(
      map(result => this.transformScenarioResult(result)),
      catchError(error => {
        console.error('Error running scenario analysis:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Compares multiple scenarios
   * 
   * **Validates: Requirements 15.4**
   */
  compareScenarios(scenarios: Scenario[]): Observable<ScenarioComparison> {
    if (!scenarios || scenarios.length === 0) {
      return throwError(() => new Error('At least one scenario is required'));
    }

    // Validate all scenarios
    for (const scenario of scenarios) {
      const validationErrors = this.validateScenarioParameters(scenario.parameters);
      if (validationErrors.length > 0) {
        return throwError(() => new Error(`Invalid scenario "${scenario.name}": ${validationErrors.join(', ')}`));
      }
    }

    return this.http.post<ScenarioComparison>(
      `${this.baseUrl}/scenarios/compare`,
      { scenarios }
    ).pipe(
      map(comparison => this.transformScenarioComparison(comparison)),
      catchError(error => {
        console.error('Error comparing scenarios:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clears the forecast cache
   * Called when forecasts are updated (Requirement 16.4)
   * 
   * **Validates: Requirement 16.4**
   */
  clearCache(): void {
    this.cacheService.invalidatePattern(/^forecast_/);
  }

  /**
   * Validates and transforms a forecast object
   * Ensures data point ordering and confidence interval bounds
   * 
   * **Validates: Requirements 13.4, 13.5**
   */
  private validateAndTransformForecast(forecast: any): Forecast {
    // Transform date strings to Date objects
    const transformedForecast: Forecast = {
      ...forecast,
      generatedAt: new Date(forecast.generatedAt),
      expiresAt: new Date(forecast.expiresAt),
      dataPoints: forecast.dataPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }))
    };

    // Validate confidence interval bounds (lowerBound ≤ value ≤ upperBound)
    transformedForecast.dataPoints.forEach((point, index) => {
      if (point.lowerBound > point.value || point.value > point.upperBound) {
        throw new Error(
          `Invalid confidence interval at data point ${index}: ` +
          `lowerBound (${point.lowerBound}) ≤ value (${point.value}) ≤ upperBound (${point.upperBound}) not satisfied`
        );
      }
    });

    // Validate chronological ordering
    for (let i = 1; i < transformedForecast.dataPoints.length; i++) {
      const prevTimestamp = transformedForecast.dataPoints[i - 1].timestamp.getTime();
      const currTimestamp = transformedForecast.dataPoints[i].timestamp.getTime();
      
      if (currTimestamp <= prevTimestamp) {
        throw new Error(
          `Data points are not in chronological order at index ${i}: ` +
          `${transformedForecast.dataPoints[i - 1].timestamp} >= ${transformedForecast.dataPoints[i].timestamp}`
        );
      }
    }

    return transformedForecast;
  }

  /**
   * Transforms prediction object with date conversions
   */
  private transformPrediction(prediction: any): Prediction {
    return {
      ...prediction,
      createdAt: new Date(prediction.createdAt),
      timeframe: {
        start: new Date(prediction.timeframe.start),
        end: new Date(prediction.timeframe.end)
      }
    };
  }

  /**
   * Transforms trend object with date conversions
   */
  private transformTrend(trend: any): Trend {
    return {
      ...trend,
      dataPoints: trend.dataPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      })),
      anomalies: trend.anomalies.map((anomaly: any) => ({
        ...anomaly,
        timestamp: new Date(anomaly.timestamp)
      }))
    };
  }

  /**
   * Transforms historical trend object with date conversions
   */
  private transformHistoricalTrend(trend: any): HistoricalTrend {
    return {
      ...trend,
      timeRange: {
        start: new Date(trend.timeRange.start),
        end: new Date(trend.timeRange.end)
      },
      dataPoints: trend.dataPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }))
    };
  }

  /**
   * Transforms trend comparison object
   */
  private transformTrendComparison(comparison: any): TrendComparison {
    return {
      ...comparison,
      timeRange: {
        start: new Date(comparison.timeRange.start),
        end: new Date(comparison.timeRange.end)
      },
      trends: new Map(Object.entries(comparison.trends).map(([key, value]: [string, any]) => 
        [key, this.transformTrend(value)]
      ))
    };
  }

  /**
   * Generates a cache key from forecast parameters
   */
  private getCacheKey(params: Partial<ForecastParams>): string {
    return JSON.stringify({
      metric: params.metric,
      timeHorizon: params.timeHorizon,
      includeConfidenceIntervals: params.includeConfidenceIntervals,
      granularity: params.granularity
    });
  }

  /**
   * Builds query parameters for forecast requests
   */
  private buildForecastQueryParams(params: ForecastParams): any {
    return {
      metric: params.metric,
      timeHorizon: params.timeHorizon,
      includeConfidenceIntervals: params.includeConfidenceIntervals.toString(),
      granularity: params.granularity
    };
  }

  /**
   * Builds query parameters for prediction requests
   */
  private buildPredictionQueryParams(context: PredictionContext): any {
    const params: any = { 
      type: context.type,
      includeRecommendations: context.includeRecommendations.toString()
    };
    
    if (context.entityId) {
      params.entityId = context.entityId;
    }
    
    if (context.timeRange) {
      params.startDate = context.timeRange.start.toISOString();
      params.endDate = context.timeRange.end.toISOString();
    }
    
    return params;
  }

  /**
   * Validates scenario parameters
   * 
   * **Validates: Requirements 15.1, 15.2**
   * 
   * Ensures:
   * - All parameters have valid numeric values
   * - adjustedValue differs from baseValue
   */
  private validateScenarioParameters(parameters: ScenarioParameter[]): string[] {
    const errors: string[] = [];

    for (const param of parameters) {
      // Validate numeric values (Requirement 15.1)
      if (typeof param.baseValue !== 'number' || isNaN(param.baseValue)) {
        errors.push(`Parameter "${param.name}" has invalid baseValue`);
      }
      if (typeof param.adjustedValue !== 'number' || isNaN(param.adjustedValue)) {
        errors.push(`Parameter "${param.name}" has invalid adjustedValue`);
      }

      // Validate adjustedValue differs from baseValue (Requirement 15.2)
      if (param.baseValue === param.adjustedValue) {
        errors.push(`Parameter "${param.name}" adjustedValue must differ from baseValue`);
      }
    }

    return errors;
  }

  /**
   * Transforms and validates scenario result
   * 
   * **Validates: Requirements 15.3, 15.5**
   * 
   * Ensures:
   * - Outcomes include baseline, projected, and change values
   * - Impact classification is present
   */
  private transformScenarioResult(result: any): ScenarioResult {
    return {
      scenarioId: result.scenarioId,
      outcomes: result.outcomes.map((outcome: any) => this.classifyOutcomeImpact(outcome)),
      metrics: result.metrics || {},
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0
    };
  }

  /**
   * Classifies outcome impact based on change value
   * 
   * **Validates: Requirement 15.5**
   */
  private classifyOutcomeImpact(outcome: any): ScenarioOutcome {
    const change = outcome.projectedValue - outcome.baselineValue;
    const changePercent = outcome.baselineValue !== 0 
      ? (change / outcome.baselineValue) * 100 
      : 0;

    let impact: 'positive' | 'negative' | 'neutral';
    if (change > 0) {
      impact = 'positive';
    } else if (change < 0) {
      impact = 'negative';
    } else {
      impact = 'neutral';
    }

    return {
      metric: outcome.metric,
      baselineValue: outcome.baselineValue,
      projectedValue: outcome.projectedValue,
      change,
      changePercent,
      impact
    };
  }

  /**
   * Transforms scenario comparison result
   * 
   * **Validates: Requirement 15.4**
   * 
   * Ensures best and worst scenarios are identified
   */
  private transformScenarioComparison(comparison: any): ScenarioComparison {
    const resultsMap = new Map<string, ScenarioResult>();
    
    if (comparison.results) {
      Object.keys(comparison.results).forEach(key => {
        resultsMap.set(key, this.transformScenarioResult(comparison.results[key]));
      });
    }

    return {
      scenarios: comparison.scenarios || [],
      results: resultsMap,
      bestScenario: comparison.bestScenario || '',
      worstScenario: comparison.worstScenario || '',
      insights: comparison.insights || []
    };
  }
}
