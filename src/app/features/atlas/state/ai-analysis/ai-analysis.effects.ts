/**
 * AI Analysis NgRx Effects
 * 
 * Handles side effects for AI analysis actions including:
 * - API calls with loading, success, and error handling
 * - Analysis, risk assessment, and recommendation generation
 * - Agent management operations
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AIAnalysisService } from '../../services/ai-analysis.service';
import { AgentDomain, AgentType } from '../../models/agent.model';
import * as AIAnalysisActions from './ai-analysis.actions';

@Injectable()
export class AIAnalysisEffects {
  constructor(
    private actions$: Actions,
    private aiAnalysisService: AIAnalysisService
  ) {}

  // ============================================================================
  // Analyze Deployment
  // ============================================================================

  /**
   * Trigger AI analysis for a deployment
   * Requirement 3.4: Effects for API calls
   * Requirement 3.5: Loading state handling
   * Requirement 3.6: Success handling
   * Requirement 3.7: Error handling
   */
  analyzeDeployment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.analyzeDeployment),
      switchMap(({ deploymentId, targetState }) =>
        this.aiAnalysisService.analyzeDeployment(deploymentId, targetState).pipe(
          map((result) => AIAnalysisActions.analyzeDeploymentSuccess({
            deploymentId,
            result
          })),
          catchError((error) =>
            of(AIAnalysisActions.analyzeDeploymentFailure({
              deploymentId,
              error: error.message || 'Failed to analyze deployment'
            }))
          )
        )
      )
    )
  );

  /**
   * Refresh analysis triggers a new analysis
   */
  refreshAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.refreshAnalysis),
      map(({ deploymentId }) => AIAnalysisActions.analyzeDeployment({ deploymentId }))
    )
  );

  // ============================================================================
  // Assess Risk
  // ============================================================================

  /**
   * Perform risk assessment for a deployment
   * Requirement 3.4: Effects for API calls
   * Requirement 3.5: Loading state handling
   * Requirement 3.6: Success handling
   * Requirement 3.7: Error handling
   */
  assessRisk$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.assessRisk),
      switchMap(({ deploymentId }) =>
        this.aiAnalysisService.assessRisk(deploymentId).pipe(
          map((assessment) => AIAnalysisActions.assessRiskSuccess({
            deploymentId,
            assessment
          })),
          catchError((error) =>
            of(AIAnalysisActions.assessRiskFailure({
              deploymentId,
              error: error.message || 'Failed to assess risk'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Generate Recommendations
  // ============================================================================

  /**
   * Generate recommendations for a deployment
   * Requirement 3.4: Effects for API calls
   * Requirement 3.5: Loading state handling
   * Requirement 3.6: Success handling
   * Requirement 3.7: Error handling
   */
  generateRecommendations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.generateRecommendations),
      switchMap(({ deploymentId }) =>
        this.aiAnalysisService.generateRecommendations(deploymentId).pipe(
          map((recommendations) => AIAnalysisActions.generateRecommendationsSuccess({
            deploymentId,
            recommendations
          })),
          catchError((error) =>
            of(AIAnalysisActions.generateRecommendationsFailure({
              deploymentId,
              error: error.message || 'Failed to generate recommendations'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Available Agents
  // ============================================================================

  /**
   * Load available AI agents
   * Requirement 3.4: Effects for API calls
   * Requirement 3.5: Loading state handling
   * Requirement 3.6: Success handling
   * Requirement 3.7: Error handling
   */
  loadAvailableAgents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.loadAvailableAgents),
      switchMap(() =>
        this.aiAnalysisService.getAvailableAgents().pipe(
          map((agentInfos) => {
            // Map AgentInfo[] to AgentMetadata[] by adding required fields and casting enums
            const agents = agentInfos.map(info => ({
              ...info,
              domain: info.domain as AgentDomain, // Cast string to enum
              type: info.type as AgentType, // Cast string to enum
              registeredAt: new Date() // Default to current date since API doesn't provide it
            }));
            return AIAnalysisActions.loadAvailableAgentsSuccess({ agents });
          }),
          catchError((error) =>
            of(AIAnalysisActions.loadAvailableAgentsFailure({
              error: error.message || 'Failed to load available agents'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Validate Agent Operation
  // ============================================================================

  /**
   * Validate an agent operation
   * Requirement 3.4: Effects for API calls
   * Requirement 3.5: Loading state handling
   * Requirement 3.6: Success handling
   * Requirement 3.7: Error handling
   */
  validateAgentOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AIAnalysisActions.validateAgentOperation),
      switchMap(({ agentId, operation }) =>
        this.aiAnalysisService.validateAgentOperation(agentId, operation).pipe(
          map((result) => AIAnalysisActions.validateAgentOperationSuccess({
            agentId,
            operation,
            result
          })),
          catchError((error) =>
            of(AIAnalysisActions.validateAgentOperationFailure({
              agentId,
              error: error.message || 'Failed to validate agent operation'
            }))
          )
        )
      )
    )
  );
}
