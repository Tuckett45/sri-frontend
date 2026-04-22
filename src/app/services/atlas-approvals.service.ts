import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  AtlasApprovalDto,
  AtlasApprovalRequestDto,
  AtlasApprovalDecisionDto,
  AtlasApprovalAuthority,
  AtlasCriticalGateDefinition,
  AtlasPagedResult,
  AtlasLifecycleState
} from '../models/atlas.models';

/**
 * Service for the Atlas Platform approvals API.
 * Base path: /v1/approvals
 *
 * Manages the human-in-the-loop governance layer: requesting approvals,
 * recording decisions, and querying critical gate requirements.
 */
@Injectable({ providedIn: 'root' })
export class AtlasApprovalsService {
  private readonly baseUrl = `${environment.atlasApiUrl}/approvals`;

  constructor(private http: HttpClient) {}

  // ─── Authority Checks ─────────────────────────────────────────────────────

  /**
   * Check whether the current user has authority to approve a deployment's
   * transition to the given state.
   */
  validateApprovalAuthority(deploymentId: string, forState: AtlasLifecycleState): Observable<AtlasApprovalAuthority> {
    return this.http.get<AtlasApprovalAuthority>(
      `${this.baseUrl}/authority/${deploymentId}/${forState}`
    );
  }

  // ─── Request & Decision ───────────────────────────────────────────────────

  requestApproval(request: AtlasApprovalRequestDto): Observable<{ approvalId: string; isSuccess: boolean }> {
    return this.http.post<{ approvalId: string; isSuccess: boolean }>(
      `${this.baseUrl}/request`,
      request
    );
  }

  recordDecision(approvalId: string, decision: AtlasApprovalDecisionDto): Observable<AtlasApprovalDto> {
    return this.http.post<AtlasApprovalDto>(
      `${this.baseUrl}/${approvalId}/decision`,
      decision
    );
  }

  // ─── Query Approvals ──────────────────────────────────────────────────────

  getPendingApprovals(deploymentId: string): Observable<AtlasApprovalDto[]> {
    return this.http.get<AtlasApprovalDto[]>(
      `${this.baseUrl}/deployment/${deploymentId}/pending`
    );
  }

  getApprovalsForState(deploymentId: string, forState: AtlasLifecycleState): Observable<AtlasApprovalDto[]> {
    return this.http.get<AtlasApprovalDto[]>(
      `${this.baseUrl}/deployment/${deploymentId}/state/${forState}`
    );
  }

  hasSufficientApprovals(deploymentId: string, forState: AtlasLifecycleState): Observable<{ hasSufficientApprovals: boolean }> {
    return this.http.get<{ hasSufficientApprovals: boolean }>(
      `${this.baseUrl}/deployment/${deploymentId}/state/${forState}/sufficient`
    );
  }

  // ─── Critical Gate ────────────────────────────────────────────────────────

  getCriticalGateDefinition(state: AtlasLifecycleState): Observable<AtlasCriticalGateDefinition | null> {
    return this.http.get<AtlasCriticalGateDefinition | null>(
      `${this.baseUrl}/critical-gate/${state}`
    );
  }

  // ─── Current-User Approvals ───────────────────────────────────────────────

  getUserApprovals(page = 1, pageSize = 50): Observable<AtlasPagedResult<AtlasApprovalDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<AtlasPagedResult<AtlasApprovalDto>>(
      `${this.baseUrl}/user/approvals`,
      { params }
    );
  }
}
