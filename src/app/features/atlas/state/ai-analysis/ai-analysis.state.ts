/**
 * AI Analysis NgRx State Management
 * 
 * This module defines the state structure for AI analysis management in the ATLAS feature.
 * It uses NgRx for predictable state management with analysis results, risk assessments,
 * recommendations, and available agents.
 * 
 * Requirements: 3.1, 3.9
 */

import {
  AnalysisResult,
  RiskAssessment,
  RecommendationSet
} from '../../models/ai-analysis.model';

import { AgentMetadata } from '../../models/agent.model';

/**
 * Loading state for different AI analysis operations
 */
export interface AIAnalysisLoadingState {
  /** Analyzing deployment */
  analyzing: boolean;
  
  /** Assessing risk */
  assessingRisk: boolean;
  
  /** Generating recommendations */
  generatingRecommendations: boolean;
  
  /** Loading available agents */
  loadingAgents: boolean;
  
  /** Validating agent operation */
  validatingOperation: boolean;
}

/**
 * Error state for different AI analysis operations
 */
export interface AIAnalysisErrorState {
  /** Error analyzing deployment */
  analyzing: string | null;
  
  /** Error assessing risk */
  assessingRisk: string | null;
  
  /** Error generating recommendations */
  generatingRecommendations: string | null;
  
  /** Error loading agents */
  loadingAgents: string | null;
  
  /** Error validating operation */
  validatingOperation: string | null;
}

/**
 * AI Analysis state interface
 * 
 * Manages AI analysis results, risk assessments, recommendations,
 * and available agents with loading states and errors.
 */
export interface AIAnalysisState {
  /** Current analysis result (keyed by deployment ID) */
  analysisResults: Record<string, AnalysisResult>;
  
  /** Current risk assessment (keyed by deployment ID) */
  riskAssessments: Record<string, RiskAssessment>;
  
  /** Current recommendation sets (keyed by deployment ID) */
  recommendationSets: Record<string, RecommendationSet>;
  
  /** Available AI agents */
  availableAgents: AgentMetadata[];
  
  /** Currently selected deployment ID for analysis */
  selectedDeploymentId: string | null;
  
  /** Loading states for various operations */
  loading: AIAnalysisLoadingState;
  
  /** Error states for various operations */
  error: AIAnalysisErrorState;
  
  /** Timestamp of last successful analysis */
  lastAnalyzed: Record<string, number>;
  
  /** Timestamp of last successful risk assessment */
  lastRiskAssessed: Record<string, number>;
  
  /** Timestamp of last successful recommendation generation */
  lastRecommendationsGenerated: Record<string, number>;
}

/**
 * Initial loading state
 */
const initialLoadingState: AIAnalysisLoadingState = {
  analyzing: false,
  assessingRisk: false,
  generatingRecommendations: false,
  loadingAgents: false,
  validatingOperation: false
};

/**
 * Initial error state
 */
const initialErrorState: AIAnalysisErrorState = {
  analyzing: null,
  assessingRisk: null,
  generatingRecommendations: null,
  loadingAgents: null,
  validatingOperation: null
};

/**
 * Initial AI analysis state
 * 
 * Provides the default state structure with empty results,
 * no selection, no loading, and no errors.
 */
export const initialAIAnalysisState: AIAnalysisState = {
  analysisResults: {},
  riskAssessments: {},
  recommendationSets: {},
  availableAgents: [],
  selectedDeploymentId: null,
  loading: initialLoadingState,
  error: initialErrorState,
  lastAnalyzed: {},
  lastRiskAssessed: {},
  lastRecommendationsGenerated: {}
};
