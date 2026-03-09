import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { AtlasConfigService } from './atlas-config.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import { AtlasAiAnalysisService } from '../../../services/atlas-ai-analysis.service';
import { AtlasLifecycleState } from '../../../models/atlas.models';
import {
  AnalysisResult,
  RiskAssessment,
  RecommendationSet
} from '../models/ai-analysis.model';

/**
 * Agent metadata for available AI agents
 */
export interface AgentInfo {
  agentId: string;
  agentName: string;
  version?: string;
  domain: string;
  type: string;
  description?: string;
  capabilities?: string[];
  isActive: boolean;
}

/**
 * Agent operation validation request
 */
export interface AgentOperationValidationRequest {
  operation: string;
}

/**
 * Agent operation validation response
 */
export interface AgentOperationValidationResponse {
  isValid: boolean;
  message?: string;
  validationErrors?: string[];
  supportedOperations?: string[];
}

/**
 * AIAnalysisService
 * 
 * Manages AI-powered analysis operations including:
 * - Deployment readiness analysis
 * - Risk assessment
 * - Recommendation generation
 * - Agent management and validation
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */
@Injectable({
  providedIn: 'root'
})
export class AIAnalysisService {
  private cancelSubjects = new Map<string, Subject<void>>();

  constructor(
    private atlasAiAnalysis: AtlasAiAnalysisService,
    private configService: AtlasConfigService,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  // ============================================================================
  // Analysis Operations (Task 8.1)
  // ============================================================================

  /**
   * Trigger AI analysis for a deployment
   * Analyzes deployment readiness, identifies findings, and provides recommendations
   * Requirements: 1.1, 1.2, 1.4, 1.5
   * 
   * POST /v1/ai-analysis/deployments/{deploymentId}/analyze
   * 
   * @param deploymentId - Deployment identifier
   * @param targetState - Optional target state for analysis context
   * @returns Observable of analysis result
   */
  analyzeDeployment(deploymentId: string, targetState?: string): Observable<AnalysisResult> {
    const endpoint = `/v1/ai-analysis/deployments/${deploymentId}/analyze`;
    const cancelToken = this.createCancelToken(`analyzeDeployment-${deploymentId}`);

    const request$ = this.atlasAiAnalysis
      .analyzeDeployment(deploymentId, targetState as AtlasLifecycleState | undefined)
      .pipe(
        takeUntil(cancelToken),
        map((r) => r as unknown as AnalysisResult),
        tap(() => this.errorHandler.recordSuccess(endpoint)),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<AnalysisResult>(error, { endpoint, method: 'POST' })
        ),
        tap(() => this.removeCancelToken(`analyzeDeployment-${deploymentId}`))
      );

    return this.errorHandler.withTimeout<AnalysisResult>(request$, this.configService.getTimeout());
  }

  /**
   * Perform risk assessment for a deployment
   * Identifies potential risks and provides mitigation recommendations
   * Requirements: 1.1, 1.2, 1.4, 1.5
   * 
   * POST /v1/ai-analysis/deployments/{deploymentId}/risk-assessment
   * 
   * @param deploymentId - Deployment identifier
   * @returns Observable of risk assessment result
   */
  assessRisk(deploymentId: string): Observable<RiskAssessment> {
    const endpoint = `/v1/ai-analysis/deployments/${deploymentId}/risk-assessment`;
    const cancelToken = this.createCancelToken(`assessRisk-${deploymentId}`);

    const request$ = this.atlasAiAnalysis.performRiskAssessment(deploymentId).pipe(
      takeUntil(cancelToken),
      map((r) => r as unknown as RiskAssessment),
      tap(() => this.errorHandler.recordSuccess(endpoint)),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<RiskAssessment>(error, { endpoint, method: 'POST' })
      ),
      tap(() => this.removeCancelToken(`assessRisk-${deploymentId}`))
    );

    return this.errorHandler.withTimeout<RiskAssessment>(request$, this.configService.getTimeout());
  }

  /**
   * Generate recommendations for a deployment
   * Provides actionable suggestions for improving deployment success
   * Requirements: 1.1, 1.2, 1.4, 1.5
   * 
   * POST /v1/ai-analysis/deployments/{deploymentId}/recommendations
   * 
   * @param deploymentId - Deployment identifier
   * @returns Observable of recommendation set
   */
  generateRecommendations(deploymentId: string): Observable<RecommendationSet> {
    const endpoint = `/v1/ai-analysis/deployments/${deploymentId}/recommendations`;
    const cancelToken = this.createCancelToken(`generateRecommendations-${deploymentId}`);

    const request$ = this.atlasAiAnalysis.generateRecommendations(deploymentId).pipe(
      takeUntil(cancelToken),
      map((r) => r as unknown as RecommendationSet),
      tap(() => this.errorHandler.recordSuccess(endpoint)),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<RecommendationSet>(error, { endpoint, method: 'POST' })
      ),
      tap(() => this.removeCancelToken(`generateRecommendations-${deploymentId}`))
    );

    return this.errorHandler.withTimeout<RecommendationSet>(request$, this.configService.getTimeout());
  }

  // ============================================================================
  // Agent Management Operations (Task 8.2)
  // ============================================================================

  /**
   * Get list of available AI agents
   * Requirements: 1.2, 1.4
   * 
   * GET /v1/ai-analysis/agents
   * 
   * @returns Observable of available agent information
   */
  getAvailableAgents(): Observable<AgentInfo[]> {
    const endpoint = '/v1/ai-analysis/agents';
    const cancelToken = this.createCancelToken('getAvailableAgents');

    const request$ = this.atlasAiAnalysis.getAvailableAgents().pipe(
      takeUntil(cancelToken),
      map((r) => r as unknown as AgentInfo[]),
      tap(() => this.errorHandler.recordSuccess(endpoint)),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<AgentInfo[]>(error, { endpoint, method: 'GET' })
      ),
      tap(() => this.removeCancelToken('getAvailableAgents'))
    );

    return this.errorHandler.withTimeout<AgentInfo[]>(
      this.errorHandler.withRetry<AgentInfo[]>(request$, endpoint, this.configService.getRetryAttempts()),
      this.configService.getTimeout()
    );
  }

  /**
   * Validate an agent operation before execution
   * Requirements: 1.2, 1.4
   * 
   * POST /v1/ai-analysis/agents/{agentId}/validate-operation
   * 
   * @param agentId - Agent identifier
   * @param operation - Operation to validate
   * @returns Observable of validation result
   */
  validateAgentOperation(agentId: string, operation: string): Observable<AgentOperationValidationResponse> {
    const endpoint = `/v1/ai-analysis/agents/${agentId}/validate-operation`;
    const cancelToken = this.createCancelToken(`validateAgentOperation-${agentId}`);

    const request$ = this.atlasAiAnalysis.validateAgentOperation(agentId, operation).pipe(
      takeUntil(cancelToken),
      map((r) => ({ isValid: r.isAllowed, message: r.message } as AgentOperationValidationResponse)),
      tap(() => this.errorHandler.recordSuccess(endpoint)),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<AgentOperationValidationResponse>(error, { endpoint, method: 'POST' })
      ),
      tap(() => this.removeCancelToken(`validateAgentOperation-${agentId}`))
    );

    return this.errorHandler.withTimeout<AgentOperationValidationResponse>(request$, this.configService.getTimeout());
  }

  // ============================================================================
  // Request Cancellation Support
  // ============================================================================

  /**
   * Cancel an ongoing request by operation key
   * Requirements: 1.8
   * 
   * @param operationKey - Unique key identifying the operation to cancel
   */
  cancelRequest(operationKey: string): void {
    const cancelSubject = this.cancelSubjects.get(operationKey);
    if (cancelSubject) {
      cancelSubject.next();
      cancelSubject.complete();
      this.cancelSubjects.delete(operationKey);
      console.log(`Cancelled AI analysis request: ${operationKey}`);
    }
  }

  /**
   * Cancel all ongoing requests
   * Requirements: 1.8
   */
  cancelAllRequests(): void {
    this.cancelSubjects.forEach((subject, key) => {
      subject.next();
      subject.complete();
      console.log(`Cancelled AI analysis request: ${key}`);
    });
    this.cancelSubjects.clear();
  }

  /**
   * Create a cancel token for an operation
   * 
   * @param operationKey - Unique key identifying the operation
   * @returns Subject that emits when cancellation is requested
   */
  private createCancelToken(operationKey: string): Subject<void> {
    // Clean up any existing token for this operation
    this.removeCancelToken(operationKey);

    const cancelSubject = new Subject<void>();
    this.cancelSubjects.set(operationKey, cancelSubject);
    return cancelSubject;
  }

  /**
   * Remove a cancel token after operation completes
   * 
   * @param operationKey - Unique key identifying the operation
   */
  private removeCancelToken(operationKey: string): void {
    const cancelSubject = this.cancelSubjects.get(operationKey);
    if (cancelSubject) {
      cancelSubject.complete();
      this.cancelSubjects.delete(operationKey);
    }
  }

  /**
   * Get list of active operation keys (for debugging)
   * 
   * @returns Array of active operation keys
   */
  getActiveOperations(): string[] {
    return Array.from(this.cancelSubjects.keys());
  }
}
