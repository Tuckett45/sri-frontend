import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  AtlasAnalysisResult,
  AtlasRiskAssessment,
  AtlasRecommendationSet,
  AtlasAgentInfo,
  AtlasLifecycleState
} from '../models/atlas.models';

/**
 * Service for the Atlas Platform AI analysis API.
 * Base path: /v1/ai-analysis
 *
 * Exposes AI-powered readiness assessment, risk analysis, and recommendations.
 * Per Atlas governance rules, AI can only advise — not approve or advance state.
 */
@Injectable({ providedIn: 'root' })
export class AtlasAiAnalysisService {
  private readonly baseUrl = `${environment.atlasApiUrl}/ai-analysis`;

  constructor(private http: HttpClient) {}

  // ─── Analysis ─────────────────────────────────────────────────────────────

  /**
   * Trigger AI readiness analysis for a deployment.
   * Optionally supply a targetState to focus the analysis on transition readiness.
   */
  analyzeDeployment(
    deploymentId: string,
    targetState?: AtlasLifecycleState
  ): Observable<AtlasAnalysisResult> {
    let params = new HttpParams();
    if (targetState) params = params.set('targetState', targetState);

    return this.http.post<AtlasAnalysisResult>(
      `${this.baseUrl}/deployments/${deploymentId}/analyze`,
      {},
      { params }
    );
  }

  performRiskAssessment(deploymentId: string): Observable<AtlasRiskAssessment> {
    return this.http.post<AtlasRiskAssessment>(
      `${this.baseUrl}/deployments/${deploymentId}/risk-assessment`,
      {}
    );
  }

  generateRecommendations(deploymentId: string): Observable<AtlasRecommendationSet> {
    return this.http.post<AtlasRecommendationSet>(
      `${this.baseUrl}/deployments/${deploymentId}/recommendations`,
      {}
    );
  }

  // ─── Agent Discovery ──────────────────────────────────────────────────────

  getAvailableAgents(): Observable<AtlasAgentInfo[]> {
    return this.http.get<AtlasAgentInfo[]>(`${this.baseUrl}/agents`);
  }

  validateAgentOperation(agentId: string, operation: string): Observable<{
    agentId: string;
    operation: string;
    isAllowed: boolean;
    message: string;
  }> {
    return this.http.post<{ agentId: string; operation: string; isAllowed: boolean; message: string }>(
      `${this.baseUrl}/agents/${agentId}/validate-operation`,
      operation
    );
  }
}
