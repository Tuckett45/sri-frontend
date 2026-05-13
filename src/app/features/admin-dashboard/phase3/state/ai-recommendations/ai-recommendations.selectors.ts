import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AIRecommendationsState } from './ai-recommendations.reducer';

/**
 * AI Recommendations Selectors
 * 
 * Selectors for accessing AI recommendations state
 * 
 * **Validates: Requirements 8.1, 8.5, 8.6**
 */

export const selectAIRecommendationsState = createFeatureSelector<AIRecommendationsState>('aiRecommendations');

// Basic selectors
export const selectRecommendations = createSelector(
  selectAIRecommendationsState,
  (state) => state.recommendations
);

export const selectSelectedRecommendation = createSelector(
  selectAIRecommendationsState,
  (state) => state.selectedRecommendation
);

export const selectCurrentContext = createSelector(
  selectAIRecommendationsState,
  (state) => state.currentContext
);

export const selectMetrics = createSelector(
  selectAIRecommendationsState,
  (state) => state.metrics
);

export const selectLoading = createSelector(
  selectAIRecommendationsState,
  (state) => state.loading
);

export const selectError = createSelector(
  selectAIRecommendationsState,
  (state) => state.error
);

export const selectLastFetchedAt = createSelector(
  selectAIRecommendationsState,
  (state) => state.lastFetchedAt
);

// Derived selectors
export const selectPendingRecommendations = createSelector(
  selectRecommendations,
  (recommendations) => recommendations.filter(rec => rec.status === 'pending')
);

export const selectAcceptedRecommendations = createSelector(
  selectRecommendations,
  (recommendations) => recommendations.filter(rec => rec.status === 'accepted')
);

export const selectRejectedRecommendations = createSelector(
  selectRecommendations,
  (recommendations) => recommendations.filter(rec => rec.status === 'rejected')
);

export const selectCriticalRecommendations = createSelector(
  selectRecommendations,
  (recommendations) => recommendations.filter(rec => rec.priority === 'critical')
);

export const selectHighConfidenceRecommendations = createSelector(
  selectRecommendations,
  (recommendations) => recommendations.filter(rec => rec.confidence >= 0.8)
);

// Loading state selectors
export const selectIsAccepting = (id: string) => createSelector(
  selectAIRecommendationsState,
  (state) => state.accepting.has(id)
);

export const selectIsRejecting = (id: string) => createSelector(
  selectAIRecommendationsState,
  (state) => state.rejecting.has(id)
);

export const selectIsProvidingFeedback = (id: string) => createSelector(
  selectAIRecommendationsState,
  (state) => state.providingFeedback.has(id)
);

// Recommendation by ID selector
export const selectRecommendationById = (id: string) => createSelector(
  selectRecommendations,
  (recommendations) => recommendations.find(rec => rec.id === id)
);

// Cache validity selector
export const selectIsCacheValid = createSelector(
  selectLastFetchedAt,
  (lastFetchedAt) => {
    if (!lastFetchedAt) return false;
    const now = new Date().getTime();
    const cacheAge = now - lastFetchedAt.getTime();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    return cacheAge < CACHE_TTL;
  }
);
