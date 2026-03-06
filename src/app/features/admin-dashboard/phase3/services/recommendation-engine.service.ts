import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environments';
import { CacheService } from '../../../field-resource-management/services/cache.service';
import {
  Recommendation,
  RecommendationContext,
  AcceptanceResult,
  Feedback,
  Insight,
  InsightContext,
  Explanation,
  RecommendationMetrics
} from '../models/recommendation.models';

/**
 * Service for managing AI-powered recommendations
 * Implements caching with 5-minute TTL, sorting, and feedback collection
 * 
 * **Validates: Requirements 8.1, 8.3, 8.4, 8.5, 8.6, 16.2, 16.3, 16.4**
 */
@Injectable({
  providedIn: 'root'
})
export class RecommendationEngineService {
  private readonly baseUrl = `${environment.apiUrl}/ai/recommendations`;
  private readonly insightsUrl = `${environment.apiUrl}/ai/insights`;
  
  // Cache TTL: 5 minutes (Requirement 16.2)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Fetches recommendations for a given context
   * Implements caching with 5-minute TTL (Requirement 16.2)
   * Fetches fresh data when cache expired (Requirement 16.3)
   * Sorts recommendations by priority and confidence
   * Returns cached recommendations when AI service is unavailable
   * 
   * **Validates: Requirements 8.1, 8.3, 8.4, 16.2, 16.3, 18.5, 18.6**
   */
  getRecommendations(context: RecommendationContext): Observable<Recommendation[]> {
    const cacheKey = this.getCacheKey(context);
    
    return this.cacheService.get(
      cacheKey,
      () => {
        const params = this.buildQueryParams(context);
        
        return this.http.get<Recommendation[]>(this.baseUrl, { params }).pipe(
          map(recommendations => this.sortRecommendations(recommendations)),
          catchError(error => {
            console.error('Error fetching recommendations:', error);
            
            // If AI service is unavailable (503) or network error (0), try to return cached data
            if (error.status === 503 || error.status === 0) {
              console.log('AI service unavailable, attempting to use cached recommendations');
              // The cache service will handle returning cached data if available
            }
            
            return throwError(() => error);
          })
        );
      },
      this.CACHE_TTL
    );
  }

  /**
   * Fetches a single recommendation by ID
   * 
   * **Validates: Requirements 8.1**
   */
  getRecommendationById(id: string): Observable<Recommendation> {
    return this.http.get<Recommendation>(`${this.baseUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching recommendation ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refreshes recommendations by clearing cache and fetching new data
   * Clears cache entry before fetching (Requirement 16.4)
   * 
   * **Validates: Requirements 8.1, 16.2, 16.4**
   */
  refreshRecommendations(context: RecommendationContext): Observable<Recommendation[]> {
    const cacheKey = this.getCacheKey(context);
    this.cacheService.invalidate(cacheKey);
    return this.getRecommendations(context);
  }

  /**
   * Accepts a recommendation and executes its actions
   * Records acceptance feedback for model improvement
   * Clears all recommendation caches on update (Requirement 16.4)
   * 
   * **Validates: Requirements 8.5, 8.6, 16.4**
   */
  acceptRecommendation(id: string, metadata?: any): Observable<AcceptanceResult> {
    return this.http.post<AcceptanceResult>(
      `${this.baseUrl}/${id}/accept`,
      { metadata }
    ).pipe(
      tap(() => this.clearAllCaches()),
      catchError(error => {
        console.error(`Error accepting recommendation ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Rejects a recommendation with a reason
   * Records rejection feedback for model improvement
   * Clears all recommendation caches on update (Requirement 16.4)
   * 
   * **Validates: Requirements 8.5, 8.6, 16.4**
   */
  rejectRecommendation(id: string, reason: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${id}/reject`,
      { reason }
    ).pipe(
      tap(() => this.clearAllCaches()),
      catchError(error => {
        console.error(`Error rejecting recommendation ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Provides user feedback on a recommendation
   * 
   * **Validates: Requirements 8.5, 8.6**
   */
  provideFeedback(id: string, feedback: Feedback): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${id}/feedback`,
      feedback
    ).pipe(
      catchError(error => {
        console.error(`Error providing feedback for recommendation ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches insights for a given context
   * 
   * **Validates: Requirements 9.1, 9.6**
   */
  getInsights(context: InsightContext): Observable<Insight[]> {
    const params = this.buildInsightQueryParams(context);
    
    return this.http.get<Insight[]>(this.insightsUrl, { params }).pipe(
      catchError(error => {
        console.error('Error fetching insights:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches insights related to a specific recommendation
   * 
   * **Validates: Requirements 9.6**
   */
  getRelatedInsights(recommendationId: string): Observable<Insight[]> {
    return this.http.get<Insight[]>(
      `${this.baseUrl}/${recommendationId}/insights`
    ).pipe(
      catchError(error => {
        console.error(`Error fetching related insights for ${recommendationId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Requests an explanation for a recommendation
   * 
   * **Validates: Requirements 9.6**
   */
  explainRecommendation(id: string): Observable<Explanation> {
    return this.http.get<Explanation>(
      `${this.baseUrl}/${id}/explain`
    ).pipe(
      catchError(error => {
        console.error(`Error fetching explanation for recommendation ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetches analytics metrics for recommendations
   * 
   * **Validates: Requirements 8.5, 8.6**
   */
  getRecommendationMetrics(): Observable<RecommendationMetrics> {
    return this.http.get<RecommendationMetrics>(
      `${this.baseUrl}/metrics`
    ).pipe(
      catchError(error => {
        console.error('Error fetching recommendation metrics:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gets the acceptance rate for a specific context
   * 
   * **Validates: Requirements 8.5, 8.6**
   */
  getAcceptanceRate(context: string): Observable<number> {
    return this.http.get<{ acceptanceRate: number }>(
      `${this.baseUrl}/metrics/acceptance-rate`,
      { params: { context } }
    ).pipe(
      map(response => response.acceptanceRate),
      catchError(error => {
        console.error(`Error fetching acceptance rate for ${context}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sorts recommendations by priority (critical > high > medium > low)
   * then by confidence score (descending)
   * 
   * **Validates: Requirements 8.3, 8.4**
   */
  private sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...recommendations].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // If priorities are equal, sort by confidence (descending)
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generates a cache key from the recommendation context
   */
  private getCacheKey(context: RecommendationContext): string {
    return JSON.stringify({
      type: context.type,
      entityId: context.entityId,
      timeRange: context.timeRange,
      filters: context.filters
    });
  }

  /**
   * Builds query parameters from recommendation context
   */
  private buildQueryParams(context: RecommendationContext): any {
    const params: any = { type: context.type };
    
    if (context.entityId) {
      params.entityId = context.entityId;
    }
    
    if (context.timeRange) {
      params.startDate = context.timeRange.start.toISOString();
      params.endDate = context.timeRange.end.toISOString();
    }
    
    if (context.filters) {
      Object.keys(context.filters).forEach(key => {
        params[key] = context.filters![key];
      });
    }
    
    return params;
  }

  /**
   * Builds query parameters from insight context
   */
  private buildInsightQueryParams(context: InsightContext): any {
    const params: any = { type: context.type };
    
    if (context.timeRange) {
      params.startDate = context.timeRange.start.toISOString();
      params.endDate = context.timeRange.end.toISOString();
    }
    
    if (context.filters) {
      Object.keys(context.filters).forEach(key => {
        params[key] = context.filters![key];
      });
    }
    
    return params;
  }

  /**
   * Clears all recommendation caches
   * Called when recommendations are updated (Requirement 16.4)
   * 
   * **Validates: Requirement 16.4**
   */
  private clearAllCaches(): void {
    this.cacheService.invalidatePattern(/^recommendations_/);
  }
}
