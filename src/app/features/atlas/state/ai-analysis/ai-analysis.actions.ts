/**
 * AI Analysis NgRx Actions
 * 
 * Defines all actions for AI analysis state management including:
 * - Analyze deployment
 * - Assess risk
 * - Generate recommendations
 * - Load available agents
 * - Validate agent operations
 * 
 * Each operation has corresponding success and failure actions.
 * 
 * Requirements: 3.2
 */

import { createAction, props } from '@ngrx/store';
import {
  AnalysisResult,
  RiskAssessment,
  RecommendationSet
} from '../../models/ai-analysis.model';
import { AgentMetadata } from '../../models/agent.model';

// ============================================================================
// Analyze Deployment
// ============================================================================

/**
 * Trigger AI analysis for a deployment
 */
export const analyzeDeployment = createAction(
  '[AI Analysis] Analyze Deployment',
  props<{
    deploymentId: string;
    targetState?: string;
  }>()
);

/**
 * Analysis completed successfully
 */
export const analyzeDeploymentSuccess = createAction(
  '[AI Analysis] Analyze Deployment Success',
  props<{
    deploymentId: string;
    result: AnalysisResult;
  }>()
);

/**
 * Failed to analyze deployment
 */
export const analyzeDeploymentFailure = createAction(
  '[AI Analysis] Analyze Deployment Failure',
  props<{
    deploymentId: string;
    error: string;
  }>()
);

// ============================================================================
// Assess Risk
// ============================================================================

/**
 * Trigger risk assessment for a deployment
 */
export const assessRisk = createAction(
  '[AI Analysis] Assess Risk',
  props<{ deploymentId: string }>()
);

/**
 * Risk assessment completed successfully
 */
export const assessRiskSuccess = createAction(
  '[AI Analysis] Assess Risk Success',
  props<{
    deploymentId: string;
    assessment: RiskAssessment;
  }>()
);

/**
 * Failed to assess risk
 */
export const assessRiskFailure = createAction(
  '[AI Analysis] Assess Risk Failure',
  props<{
    deploymentId: string;
    error: string;
  }>()
);

// ============================================================================
// Generate Recommendations
// ============================================================================

/**
 * Generate recommendations for a deployment
 */
export const generateRecommendations = createAction(
  '[AI Analysis] Generate Recommendations',
  props<{ deploymentId: string }>()
);

/**
 * Recommendations generated successfully
 */
export const generateRecommendationsSuccess = createAction(
  '[AI Analysis] Generate Recommendations Success',
  props<{
    deploymentId: string;
    recommendations: RecommendationSet;
  }>()
);

/**
 * Failed to generate recommendations
 */
export const generateRecommendationsFailure = createAction(
  '[AI Analysis] Generate Recommendations Failure',
  props<{
    deploymentId: string;
    error: string;
  }>()
);

// ============================================================================
// Load Available Agents
// ============================================================================

/**
 * Load available AI agents
 */
export const loadAvailableAgents = createAction(
  '[AI Analysis] Load Available Agents'
);

/**
 * Available agents loaded successfully
 */
export const loadAvailableAgentsSuccess = createAction(
  '[AI Analysis] Load Available Agents Success',
  props<{ agents: AgentMetadata[] }>()
);

/**
 * Failed to load available agents
 */
export const loadAvailableAgentsFailure = createAction(
  '[AI Analysis] Load Available Agents Failure',
  props<{ error: string }>()
);

// ============================================================================
// Validate Agent Operation
// ============================================================================

/**
 * Validate an agent operation
 */
export const validateAgentOperation = createAction(
  '[AI Analysis] Validate Agent Operation',
  props<{
    agentId: string;
    operation: string;
  }>()
);

/**
 * Agent operation validated successfully
 */
export const validateAgentOperationSuccess = createAction(
  '[AI Analysis] Validate Agent Operation Success',
  props<{
    agentId: string;
    operation: string;
    result: any;
  }>()
);

/**
 * Failed to validate agent operation
 */
export const validateAgentOperationFailure = createAction(
  '[AI Analysis] Validate Agent Operation Failure',
  props<{
    agentId: string;
    error: string;
  }>()
);

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Select a deployment for analysis
 */
export const selectDeploymentForAnalysis = createAction(
  '[AI Analysis] Select Deployment',
  props<{ deploymentId: string }>()
);

/**
 * Clear deployment selection
 */
export const clearDeploymentSelection = createAction(
  '[AI Analysis] Clear Deployment Selection'
);

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all AI analysis state (useful for logout or reset)
 */
export const clearAIAnalysisState = createAction(
  '[AI Analysis] Clear State'
);

/**
 * Clear analysis results for a specific deployment
 */
export const clearAnalysisForDeployment = createAction(
  '[AI Analysis] Clear Analysis For Deployment',
  props<{ deploymentId: string }>()
);

/**
 * Refresh analysis for a deployment (force reload)
 */
export const refreshAnalysis = createAction(
  '[AI Analysis] Refresh Analysis',
  props<{ deploymentId: string }>()
);
