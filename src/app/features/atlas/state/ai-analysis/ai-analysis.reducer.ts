/**
 * AI Analysis NgRx Reducer
 * 
 * Implements pure, immutable state transitions for all AI analysis actions.
 * Manages analysis results, risk assessments, recommendations, and agents.
 * 
 * Requirements: 3.3
 */

import { createReducer, on } from '@ngrx/store';
import { AIAnalysisState, initialAIAnalysisState } from './ai-analysis.state';
import * as AIAnalysisActions from './ai-analysis.actions';

/**
 * AI Analysis reducer
 * 
 * Handles all AI analysis-related actions and produces new immutable state.
 * Stores results keyed by deployment ID for efficient lookup.
 */
export const aiAnalysisReducer = createReducer(
  initialAIAnalysisState,

  // ============================================================================
  // Analyze Deployment
  // ============================================================================

  on(AIAnalysisActions.analyzeDeployment, (state, { deploymentId }): AIAnalysisState => ({
    ...state,
    selectedDeploymentId: deploymentId,
    loading: { ...state.loading, analyzing: true },
    error: { ...state.error, analyzing: null }
  })),

  on(AIAnalysisActions.analyzeDeploymentSuccess, (state, { deploymentId, result }): AIAnalysisState => ({
    ...state,
    analysisResults: {
      ...state.analysisResults,
      [deploymentId]: result
    },
    lastAnalyzed: {
      ...state.lastAnalyzed,
      [deploymentId]: Date.now()
    },
    loading: { ...state.loading, analyzing: false },
    error: { ...state.error, analyzing: null }
  })),

  on(AIAnalysisActions.analyzeDeploymentFailure, (state, { error }): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, analyzing: false },
    error: { ...state.error, analyzing: error }
  })),

  // ============================================================================
  // Assess Risk
  // ============================================================================

  on(AIAnalysisActions.assessRisk, (state, { deploymentId }): AIAnalysisState => ({
    ...state,
    selectedDeploymentId: deploymentId,
    loading: { ...state.loading, assessingRisk: true },
    error: { ...state.error, assessingRisk: null }
  })),

  on(AIAnalysisActions.assessRiskSuccess, (state, { deploymentId, assessment }): AIAnalysisState => ({
    ...state,
    riskAssessments: {
      ...state.riskAssessments,
      [deploymentId]: assessment
    },
    lastRiskAssessed: {
      ...state.lastRiskAssessed,
      [deploymentId]: Date.now()
    },
    loading: { ...state.loading, assessingRisk: false },
    error: { ...state.error, assessingRisk: null }
  })),

  on(AIAnalysisActions.assessRiskFailure, (state, { error }): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, assessingRisk: false },
    error: { ...state.error, assessingRisk: error }
  })),

  // ============================================================================
  // Generate Recommendations
  // ============================================================================

  on(AIAnalysisActions.generateRecommendations, (state, { deploymentId }): AIAnalysisState => ({
    ...state,
    selectedDeploymentId: deploymentId,
    loading: { ...state.loading, generatingRecommendations: true },
    error: { ...state.error, generatingRecommendations: null }
  })),

  on(AIAnalysisActions.generateRecommendationsSuccess, (state, { deploymentId, recommendations }): AIAnalysisState => ({
    ...state,
    recommendationSets: {
      ...state.recommendationSets,
      [deploymentId]: recommendations
    },
    lastRecommendationsGenerated: {
      ...state.lastRecommendationsGenerated,
      [deploymentId]: Date.now()
    },
    loading: { ...state.loading, generatingRecommendations: false },
    error: { ...state.error, generatingRecommendations: null }
  })),

  on(AIAnalysisActions.generateRecommendationsFailure, (state, { error }): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, generatingRecommendations: false },
    error: { ...state.error, generatingRecommendations: error }
  })),

  // ============================================================================
  // Load Available Agents
  // ============================================================================

  on(AIAnalysisActions.loadAvailableAgents, (state): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, loadingAgents: true },
    error: { ...state.error, loadingAgents: null }
  })),

  on(AIAnalysisActions.loadAvailableAgentsSuccess, (state, { agents }): AIAnalysisState => ({
    ...state,
    availableAgents: agents,
    loading: { ...state.loading, loadingAgents: false },
    error: { ...state.error, loadingAgents: null }
  })),

  on(AIAnalysisActions.loadAvailableAgentsFailure, (state, { error }): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, loadingAgents: false },
    error: { ...state.error, loadingAgents: error }
  })),

  // ============================================================================
  // Validate Agent Operation
  // ============================================================================

  on(AIAnalysisActions.validateAgentOperation, (state): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, validatingOperation: true },
    error: { ...state.error, validatingOperation: null }
  })),

  on(AIAnalysisActions.validateAgentOperationSuccess, (state): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, validatingOperation: false },
    error: { ...state.error, validatingOperation: null }
  })),

  on(AIAnalysisActions.validateAgentOperationFailure, (state, { error }): AIAnalysisState => ({
    ...state,
    loading: { ...state.loading, validatingOperation: false },
    error: { ...state.error, validatingOperation: error }
  })),

  // ============================================================================
  // Selection Management
  // ============================================================================

  on(AIAnalysisActions.selectDeploymentForAnalysis, (state, { deploymentId }): AIAnalysisState => ({
    ...state,
    selectedDeploymentId: deploymentId
  })),

  on(AIAnalysisActions.clearDeploymentSelection, (state): AIAnalysisState => ({
    ...state,
    selectedDeploymentId: null
  })),

  // ============================================================================
  // Cache Management
  // ============================================================================

  on(AIAnalysisActions.clearAIAnalysisState, (): AIAnalysisState => initialAIAnalysisState),

  on(AIAnalysisActions.clearAnalysisForDeployment, (state, { deploymentId }): AIAnalysisState => {
    const { [deploymentId]: removedAnalysis, ...remainingAnalysis } = state.analysisResults;
    const { [deploymentId]: removedRisk, ...remainingRisk } = state.riskAssessments;
    const { [deploymentId]: removedRecs, ...remainingRecs } = state.recommendationSets;
    const { [deploymentId]: removedAnalyzed, ...remainingAnalyzed } = state.lastAnalyzed;
    const { [deploymentId]: removedRiskAssessed, ...remainingRiskAssessed } = state.lastRiskAssessed;
    const { [deploymentId]: removedRecsGenerated, ...remainingRecsGenerated } = state.lastRecommendationsGenerated;

    return {
      ...state,
      analysisResults: remainingAnalysis,
      riskAssessments: remainingRisk,
      recommendationSets: remainingRecs,
      lastAnalyzed: remainingAnalyzed,
      lastRiskAssessed: remainingRiskAssessed,
      lastRecommendationsGenerated: remainingRecsGenerated,
      selectedDeploymentId: state.selectedDeploymentId === deploymentId ? null : state.selectedDeploymentId
    };
  }),

  on(AIAnalysisActions.refreshAnalysis, (state, { deploymentId }): AIAnalysisState => {
    const { [deploymentId]: removedAnalyzed, ...remainingAnalyzed } = state.lastAnalyzed;
    const { [deploymentId]: removedRiskAssessed, ...remainingRiskAssessed } = state.lastRiskAssessed;
    const { [deploymentId]: removedRecsGenerated, ...remainingRecsGenerated } = state.lastRecommendationsGenerated;

    return {
      ...state,
      lastAnalyzed: remainingAnalyzed,
      lastRiskAssessed: remainingRiskAssessed,
      lastRecommendationsGenerated: remainingRecsGenerated
    };
  })
);
