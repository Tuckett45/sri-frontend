import { createReducer, on } from '@ngrx/store';
import { Recommendation, RecommendationContext, RecommendationMetrics } from '../../models/recommendation.models';
import * as AIRecommendationsActions from './ai-recommendations.actions';

/**
 * AI Recommendations State
 * 
 * Manages the state of AI recommendations including loaded recommendations,
 * loading status, errors, and metrics.
 * 
 * **Validates: Requirements 8.1, 8.5, 8.6**
 */
export interface AIRecommendationsState {
  // Recommendations data
  recommendations: Recommendation[];
  selectedRecommendation: Recommendation | null;
  
  // Context
  currentContext: RecommendationContext | null;
  
  // Metrics
  metrics: RecommendationMetrics | null;
  
  // Loading states
  loading: boolean;
  accepting: Set<string>;
  rejecting: Set<string>;
  providingFeedback: Set<string>;
  
  // Error handling
  error: string | null;
  
  // Cache metadata
  lastFetchedAt: Date | null;
}

export const initialState: AIRecommendationsState = {
  recommendations: [],
  selectedRecommendation: null,
  currentContext: null,
  metrics: null,
  loading: false,
  accepting: new Set(),
  rejecting: new Set(),
  providingFeedback: new Set(),
  error: null,
  lastFetchedAt: null
};

export const aiRecommendationsReducer = createReducer(
  initialState,

  // Load Recommendations
  on(AIRecommendationsActions.loadRecommendations, (state, { context }) => ({
    ...state,
    currentContext: context,
    loading: true,
    error: null
  })),

  on(AIRecommendationsActions.loadRecommendationsSuccess, (state, { recommendations, context }) => ({
    ...state,
    recommendations,
    currentContext: context,
    loading: false,
    lastFetchedAt: new Date()
  })),

  on(AIRecommendationsActions.loadRecommendationsFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Refresh Recommendations
  on(AIRecommendationsActions.refreshRecommendations, (state, { context }) => ({
    ...state,
    currentContext: context,
    loading: true,
    error: null
  })),

  // Accept Recommendation
  on(AIRecommendationsActions.acceptRecommendation, (state, { id }) => {
    const newAccepting = new Set(state.accepting);
    newAccepting.add(id);
    return {
      ...state,
      accepting: newAccepting,
      error: null
    };
  }),

  on(AIRecommendationsActions.acceptRecommendationSuccess, (state, { id }) => {
    const newAccepting = new Set(state.accepting);
    newAccepting.delete(id);
    
    // Update recommendation status
    const updatedRecommendations = state.recommendations.map(rec =>
      rec.id === id ? { ...rec, status: 'accepted' as const } : rec
    );
    
    return {
      ...state,
      recommendations: updatedRecommendations,
      accepting: newAccepting
    };
  }),

  on(AIRecommendationsActions.acceptRecommendationFailure, (state, { id, error }) => {
    const newAccepting = new Set(state.accepting);
    newAccepting.delete(id);
    return {
      ...state,
      accepting: newAccepting,
      error
    };
  }),

  // Reject Recommendation
  on(AIRecommendationsActions.rejectRecommendation, (state, { id }) => {
    const newRejecting = new Set(state.rejecting);
    newRejecting.add(id);
    return {
      ...state,
      rejecting: newRejecting,
      error: null
    };
  }),

  on(AIRecommendationsActions.rejectRecommendationSuccess, (state, { id }) => {
    const newRejecting = new Set(state.rejecting);
    newRejecting.delete(id);
    
    // Update recommendation status
    const updatedRecommendations = state.recommendations.map(rec =>
      rec.id === id ? { ...rec, status: 'rejected' as const } : rec
    );
    
    return {
      ...state,
      recommendations: updatedRecommendations,
      rejecting: newRejecting
    };
  }),

  on(AIRecommendationsActions.rejectRecommendationFailure, (state, { id, error }) => {
    const newRejecting = new Set(state.rejecting);
    newRejecting.delete(id);
    return {
      ...state,
      rejecting: newRejecting,
      error
    };
  }),

  // Provide Feedback
  on(AIRecommendationsActions.provideFeedback, (state, { id }) => {
    const newProvidingFeedback = new Set(state.providingFeedback);
    newProvidingFeedback.add(id);
    return {
      ...state,
      providingFeedback: newProvidingFeedback,
      error: null
    };
  }),

  on(AIRecommendationsActions.provideFeedbackSuccess, (state, { id }) => {
    const newProvidingFeedback = new Set(state.providingFeedback);
    newProvidingFeedback.delete(id);
    return {
      ...state,
      providingFeedback: newProvidingFeedback
    };
  }),

  on(AIRecommendationsActions.provideFeedbackFailure, (state, { id, error }) => {
    const newProvidingFeedback = new Set(state.providingFeedback);
    newProvidingFeedback.delete(id);
    return {
      ...state,
      providingFeedback: newProvidingFeedback,
      error
    };
  }),

  // Load Metrics
  on(AIRecommendationsActions.loadRecommendationMetrics, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AIRecommendationsActions.loadRecommendationMetricsSuccess, (state, { metrics }) => ({
    ...state,
    metrics,
    loading: false
  })),

  on(AIRecommendationsActions.loadRecommendationMetricsFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Clear Actions
  on(AIRecommendationsActions.clearRecommendations, () => initialState),

  on(AIRecommendationsActions.clearErrors, (state) => ({
    ...state,
    error: null
  }))
);
