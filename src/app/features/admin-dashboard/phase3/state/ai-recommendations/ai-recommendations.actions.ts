import { createAction, props } from '@ngrx/store';
import { 
  Recommendation, 
  RecommendationContext, 
  AcceptanceResult,
  Feedback,
  RecommendationMetrics
} from '../../models/recommendation.models';

/**
 * AI Recommendations Actions
 * 
 * Actions for fetching, accepting, rejecting recommendations,
 * and managing recommendation feedback.
 * 
 * **Validates: Requirements 8.1, 8.5, 8.6**
 */

// Fetch Recommendations Actions
export const loadRecommendations = createAction(
  '[AI Recommendations] Load Recommendations',
  props<{ context: RecommendationContext }>()
);

export const loadRecommendationsSuccess = createAction(
  '[AI Recommendations] Load Recommendations Success',
  props<{ recommendations: Recommendation[]; context: RecommendationContext }>()
);

export const loadRecommendationsFailure = createAction(
  '[AI Recommendations] Load Recommendations Failure',
  props<{ error: string }>()
);

// Refresh Recommendations Actions
export const refreshRecommendations = createAction(
  '[AI Recommendations] Refresh Recommendations',
  props<{ context: RecommendationContext }>()
);

// Accept Recommendation Actions
export const acceptRecommendation = createAction(
  '[AI Recommendations] Accept Recommendation',
  props<{ id: string; metadata?: any }>()
);

export const acceptRecommendationSuccess = createAction(
  '[AI Recommendations] Accept Recommendation Success',
  props<{ id: string; result: AcceptanceResult }>()
);

export const acceptRecommendationFailure = createAction(
  '[AI Recommendations] Accept Recommendation Failure',
  props<{ id: string; error: string }>()
);

// Reject Recommendation Actions
export const rejectRecommendation = createAction(
  '[AI Recommendations] Reject Recommendation',
  props<{ id: string; reason: string }>()
);

export const rejectRecommendationSuccess = createAction(
  '[AI Recommendations] Reject Recommendation Success',
  props<{ id: string }>()
);

export const rejectRecommendationFailure = createAction(
  '[AI Recommendations] Reject Recommendation Failure',
  props<{ id: string; error: string }>()
);

// Feedback Actions
export const provideFeedback = createAction(
  '[AI Recommendations] Provide Feedback',
  props<{ id: string; feedback: Feedback }>()
);

export const provideFeedbackSuccess = createAction(
  '[AI Recommendations] Provide Feedback Success',
  props<{ id: string }>()
);

export const provideFeedbackFailure = createAction(
  '[AI Recommendations] Provide Feedback Failure',
  props<{ id: string; error: string }>()
);

// Metrics Actions
export const loadRecommendationMetrics = createAction(
  '[AI Recommendations] Load Recommendation Metrics'
);

export const loadRecommendationMetricsSuccess = createAction(
  '[AI Recommendations] Load Recommendation Metrics Success',
  props<{ metrics: RecommendationMetrics }>()
);

export const loadRecommendationMetricsFailure = createAction(
  '[AI Recommendations] Load Recommendation Metrics Failure',
  props<{ error: string }>()
);

// Clear Actions
export const clearRecommendations = createAction(
  '[AI Recommendations] Clear Recommendations'
);

export const clearErrors = createAction(
  '[AI Recommendations] Clear Errors'
);
