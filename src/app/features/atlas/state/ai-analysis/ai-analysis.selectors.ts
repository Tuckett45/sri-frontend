/**
 * AI Analysis NgRx Selectors
 * 
 * Provides memoized selectors for accessing AI analysis state.
 * Includes base selectors and derived selectors for high-priority
 * recommendations and critical findings.
 * 
 * Requirements: 3.8, 11.3
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AIAnalysisState } from './ai-analysis.state';
import {
  AnalysisResult,
  RiskAssessment,
  RecommendationSet,
  FindingSeverity,
  RiskLevel
} from '../../models/ai-analysis.model';

/**
 * Feature selector for AI analysis state
 */
export const selectAIAnalysisState = createFeatureSelector<AIAnalysisState>('aiAnalysis');

// ============================================================================
// Base Selectors
// ============================================================================

/**
 * Select all analysis results (keyed by deployment ID)
 */
export const selectAnalysisResults = createSelector(
  selectAIAnalysisState,
  (state) => state.analysisResults
);

/**
 * Select all risk assessments (keyed by deployment ID)
 */
export const selectRiskAssessments = createSelector(
  selectAIAnalysisState,
  (state) => state.riskAssessments
);

/**
 * Select all recommendation sets (keyed by deployment ID)
 */
export const selectRecommendationSets = createSelector(
  selectAIAnalysisState,
  (state) => state.recommendationSets
);

/**
 * Select available agents
 */
export const selectAvailableAgents = createSelector(
  selectAIAnalysisState,
  (state) => state.availableAgents
);

/**
 * Select currently selected deployment ID
 */
export const selectSelectedDeploymentId = createSelector(
  selectAIAnalysisState,
  (state) => state.selectedDeploymentId
);

// ============================================================================
// Loading State Selectors
// ============================================================================

/**
 * Select all loading states
 */
export const selectAIAnalysisLoading = createSelector(
  selectAIAnalysisState,
  (state) => state.loading
);

/**
 * Select analyzing loading state
 */
export const selectAnalyzing = createSelector(
  selectAIAnalysisLoading,
  (loading) => loading.analyzing
);

/**
 * Select assessing risk loading state
 */
export const selectAssessingRisk = createSelector(
  selectAIAnalysisLoading,
  (loading) => loading.assessingRisk
);

/**
 * Select generating recommendations loading state
 */
export const selectGeneratingRecommendations = createSelector(
  selectAIAnalysisLoading,
  (loading) => loading.generatingRecommendations
);

/**
 * Select loading agents state
 */
export const selectLoadingAgents = createSelector(
  selectAIAnalysisLoading,
  (loading) => loading.loadingAgents
);

/**
 * Select validating operation state
 */
export const selectValidatingOperation = createSelector(
  selectAIAnalysisLoading,
  (loading) => loading.validatingOperation
);

/**
 * Select if any operation is in progress
 */
export const selectAnyLoading = createSelector(
  selectAIAnalysisLoading,
  (loading) => Object.values(loading).some(value => value === true)
);

// ============================================================================
// Error State Selectors
// ============================================================================

/**
 * Select all error states
 */
export const selectAIAnalysisErrors = createSelector(
  selectAIAnalysisState,
  (state) => state.error
);

/**
 * Select analyzing error
 */
export const selectAnalyzingError = createSelector(
  selectAIAnalysisErrors,
  (errors) => errors.analyzing
);

/**
 * Select assessing risk error
 */
export const selectAssessingRiskError = createSelector(
  selectAIAnalysisErrors,
  (errors) => errors.assessingRisk
);

/**
 * Select generating recommendations error
 */
export const selectGeneratingRecommendationsError = createSelector(
  selectAIAnalysisErrors,
  (errors) => errors.generatingRecommendations
);

/**
 * Select loading agents error
 */
export const selectLoadingAgentsError = createSelector(
  selectAIAnalysisErrors,
  (errors) => errors.loadingAgents
);

/**
 * Select validating operation error
 */
export const selectValidatingOperationError = createSelector(
  selectAIAnalysisErrors,
  (errors) => errors.validatingOperation
);

/**
 * Select if any error exists
 */
export const selectAnyError = createSelector(
  selectAIAnalysisErrors,
  (errors) => Object.values(errors).some(value => value !== null)
);

// ============================================================================
// Cache Timestamp Selectors
// ============================================================================

/**
 * Select last analyzed timestamps
 */
export const selectLastAnalyzed = createSelector(
  selectAIAnalysisState,
  (state) => state.lastAnalyzed
);

/**
 * Select last risk assessed timestamps
 */
export const selectLastRiskAssessed = createSelector(
  selectAIAnalysisState,
  (state) => state.lastRiskAssessed
);

/**
 * Select last recommendations generated timestamps
 */
export const selectLastRecommendationsGenerated = createSelector(
  selectAIAnalysisState,
  (state) => state.lastRecommendationsGenerated
);

// ============================================================================
// Deployment-Specific Selectors (Factory Selectors)
// ============================================================================

/**
 * Select analysis result for a specific deployment
 */
export const selectAnalysisResultForDeployment = (deploymentId: string) =>
  createSelector(
    selectAnalysisResults,
    (results) => results[deploymentId] || null
  );

/**
 * Select risk assessment for a specific deployment
 */
export const selectRiskAssessmentForDeployment = (deploymentId: string) =>
  createSelector(
    selectRiskAssessments,
    (assessments) => assessments[deploymentId] || null
  );

/**
 * Select recommendations for a specific deployment
 */
export const selectRecommendationsForDeployment = (deploymentId: string) =>
  createSelector(
    selectRecommendationSets,
    (sets) => sets[deploymentId] || null
  );

/**
 * Select if analysis is stale for a deployment (older than 30 minutes)
 */
export const selectIsAnalysisStale = (deploymentId: string) =>
  createSelector(
    selectLastAnalyzed,
    (timestamps) => {
      const lastAnalyzed = timestamps[deploymentId];
      if (!lastAnalyzed) return true;
      const thirtyMinutes = 30 * 60 * 1000;
      return Date.now() - lastAnalyzed > thirtyMinutes;
    }
  );

/**
 * Select if risk assessment is stale for a deployment (older than 30 minutes)
 */
export const selectIsRiskAssessmentStale = (deploymentId: string) =>
  createSelector(
    selectLastRiskAssessed,
    (timestamps) => {
      const lastAssessed = timestamps[deploymentId];
      if (!lastAssessed) return true;
      const thirtyMinutes = 30 * 60 * 1000;
      return Date.now() - lastAssessed > thirtyMinutes;
    }
  );

// ============================================================================
// Derived Selectors for Selected Deployment
// ============================================================================

/**
 * Select analysis result for currently selected deployment
 */
export const selectSelectedDeploymentAnalysis = createSelector(
  selectSelectedDeploymentId,
  selectAnalysisResults,
  (deploymentId, results) => deploymentId ? results[deploymentId] || null : null
);

/**
 * Select risk assessment for currently selected deployment
 */
export const selectSelectedDeploymentRiskAssessment = createSelector(
  selectSelectedDeploymentId,
  selectRiskAssessments,
  (deploymentId, assessments) => deploymentId ? assessments[deploymentId] || null : null
);

/**
 * Select recommendations for currently selected deployment
 */
export const selectSelectedDeploymentRecommendations = createSelector(
  selectSelectedDeploymentId,
  selectRecommendationSets,
  (deploymentId, sets) => deploymentId ? sets[deploymentId] || null : null
);

// ============================================================================
// Derived Selectors - Critical Findings
// Requirement 11.3: Memoized derived selectors
// ============================================================================

/**
 * Select critical findings from analysis result for a deployment
 */
export const selectCriticalFindings = (deploymentId: string) =>
  createSelector(
    selectAnalysisResultForDeployment(deploymentId),
    (result: AnalysisResult | null) => {
      if (!result || !result.findings) return [];
      return result.findings.filter(
        finding => finding.severity === FindingSeverity.Critical
      );
    }
  );

/**
 * Select high severity findings from analysis result for a deployment
 */
export const selectHighSeverityFindings = (deploymentId: string) =>
  createSelector(
    selectAnalysisResultForDeployment(deploymentId),
    (result: AnalysisResult | null) => {
      if (!result || !result.findings) return [];
      return result.findings.filter(
        finding => finding.severity === FindingSeverity.High ||
                   finding.severity === FindingSeverity.Critical
      );
    }
  );

/**
 * Select findings grouped by severity for a deployment
 */
export const selectFindingsBySeverity = (deploymentId: string) =>
  createSelector(
    selectAnalysisResultForDeployment(deploymentId),
    (result: AnalysisResult | null) => {
      if (!result || !result.findings) return {};
      
      const grouped: Record<string, any[]> = {};
      result.findings.forEach(finding => {
        const severity = finding.severity;
        if (!grouped[severity]) {
          grouped[severity] = [];
        }
        grouped[severity].push(finding);
      });
      
      return grouped;
    }
  );

// ============================================================================
// Derived Selectors - High-Priority Recommendations
// Requirement 11.3: Memoized derived selectors
// ============================================================================

/**
 * Select high-priority recommendations for a deployment
 */
export const selectHighPriorityRecommendations = (deploymentId: string) =>
  createSelector(
    selectRecommendationsForDeployment(deploymentId),
    (recommendationSet: RecommendationSet | null) => {
      if (!recommendationSet || !recommendationSet.recommendations) return [];
      return recommendationSet.recommendations.filter(
        rec => rec.priority === 'High' || rec.priority === 'Critical'
      );
    }
  );

/**
 * Select recommendations grouped by priority for a deployment
 */
export const selectRecommendationsByPriority = (deploymentId: string) =>
  createSelector(
    selectRecommendationsForDeployment(deploymentId),
    (recommendationSet: RecommendationSet | null) => {
      if (!recommendationSet || !recommendationSet.recommendations) return {};
      
      const grouped: Record<string, any[]> = {};
      recommendationSet.recommendations.forEach(rec => {
        const priority = rec.priority || 'Unknown';
        if (!grouped[priority]) {
          grouped[priority] = [];
        }
        grouped[priority].push(rec);
      });
      
      return grouped;
    }
  );

/**
 * Select recommendations grouped by category for a deployment
 */
export const selectRecommendationsByCategory = (deploymentId: string) =>
  createSelector(
    selectRecommendationsForDeployment(deploymentId),
    (recommendationSet: RecommendationSet | null) => {
      if (!recommendationSet || !recommendationSet.recommendations) return {};
      
      const grouped: Record<string, any[]> = {};
      recommendationSet.recommendations.forEach(rec => {
        const category = rec.category || 'Unknown';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(rec);
      });
      
      return grouped;
    }
  );

// ============================================================================
// Derived Selectors - Risk Assessment
// ============================================================================

/**
 * Select critical risks for a deployment
 */
export const selectCriticalRisks = (deploymentId: string) =>
  createSelector(
    selectRiskAssessmentForDeployment(deploymentId),
    (assessment: RiskAssessment | null) => {
      if (!assessment || !assessment.identifiedRisks) return [];
      return assessment.identifiedRisks.filter(
        risk => risk.severity === 'Critical'
      );
    }
  );

/**
 * Select high-severity risks for a deployment
 */
export const selectHighSeverityRisks = (deploymentId: string) =>
  createSelector(
    selectRiskAssessmentForDeployment(deploymentId),
    (assessment: RiskAssessment | null) => {
      if (!assessment || !assessment.identifiedRisks) return [];
      return assessment.identifiedRisks.filter(
        risk => risk.severity === 'Critical' || risk.severity === 'Severe'
      );
    }
  );

/**
 * Select if deployment has critical risk level
 */
export const selectHasCriticalRisk = (deploymentId: string) =>
  createSelector(
    selectRiskAssessmentForDeployment(deploymentId),
    (assessment: RiskAssessment | null) => {
      if (!assessment) return false;
      return assessment.overallRiskLevel === RiskLevel.Critical ||
             assessment.overallRiskLevel === RiskLevel.VeryHigh;
    }
  );

/**
 * Select risks grouped by category for a deployment
 */
export const selectRisksByCategory = (deploymentId: string) =>
  createSelector(
    selectRiskAssessmentForDeployment(deploymentId),
    (assessment: RiskAssessment | null) => {
      if (!assessment || !assessment.identifiedRisks) return {};
      
      const grouped: Record<string, any[]> = {};
      assessment.identifiedRisks.forEach(risk => {
        const category = risk.category;
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(risk);
      });
      
      return grouped;
    }
  );

// ============================================================================
// Agent Selectors
// ============================================================================

/**
 * Select active agents
 */
export const selectActiveAgents = createSelector(
  selectAvailableAgents,
  (agents) => agents.filter(agent => agent.isActive)
);

/**
 * Select agents by domain
 */
export const selectAgentsByDomain = (domain: string) =>
  createSelector(
    selectAvailableAgents,
    (agents) => agents.filter(agent => agent.domain === domain)
  );

/**
 * Select agent by ID
 */
export const selectAgentById = (agentId: string) =>
  createSelector(
    selectAvailableAgents,
    (agents) => agents.find(agent => agent.agentId === agentId) || null
  );

/**
 * Select count of available agents
 */
export const selectAgentCount = createSelector(
  selectAvailableAgents,
  (agents) => agents.length
);

/**
 * Select count of active agents
 */
export const selectActiveAgentCount = createSelector(
  selectActiveAgents,
  (agents) => agents.length
);

// ============================================================================
// Additional Deployment-Specific Selectors (for component compatibility)
// ============================================================================

/**
 * Select analysis result by deployment ID (alternative naming for component compatibility)
 */
export const selectAnalysisResultByDeploymentId = (deploymentId: string) =>
  selectAnalysisResultForDeployment(deploymentId);

/**
 * Select risk assessment by deployment ID (alternative naming for component compatibility)
 */
export const selectRiskAssessmentByDeploymentId = (deploymentId: string) =>
  selectRiskAssessmentForDeployment(deploymentId);
