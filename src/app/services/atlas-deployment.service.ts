import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  AtlasDeploymentDto,
  AtlasDeploymentDetailDto,
  AtlasPagedResult,
  AtlasCreateDeploymentRequest,
  AtlasUpdateDeploymentRequest,
  AtlasTransitionRequest,
  AtlasTransitionResponse,
  AtlasEvidenceDto,
  AtlasEvidenceSubmissionRequest,
  AtlasAuditEventDto,
  AtlasLifecycleState,
  AtlasDeploymentType,
  AtlasSignOffRequest,
  AtlasSignOffStatus
} from '../models/atlas.models';

export interface AtlasDeploymentQueryParams {
  state?: AtlasLifecycleState;
  type?: AtlasDeploymentType;
  assignedToMe?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Service for the Atlas Platform deployment governance API.
 * Base path: /v1/deployments
 *
 * Complements the SRI DeploymentService by providing access to the Atlas
 * lifecycle engine: state transitions, evidence, approvals, and audit trails.
 */
@Injectable({ providedIn: 'root' })
export class AtlasDeploymentService {
  private readonly baseUrl = `${environment.atlasApiUrl}/deployments`;

  constructor(private http: HttpClient) {}

  // ─── Deployment CRUD ──────────────────────────────────────────────────────

  getDeployments(params?: AtlasDeploymentQueryParams): Observable<AtlasPagedResult<AtlasDeploymentDto>> {
    let httpParams = new HttpParams();
    if (params?.state) httpParams = httpParams.set('state', params.state);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.assignedToMe) httpParams = httpParams.set('assignedToMe', 'true');
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<AtlasPagedResult<AtlasDeploymentDto>>(this.baseUrl, { params: httpParams });
  }

  /** Deployments assigned to the currently authenticated user */
  getMyDeployments(params?: Omit<AtlasDeploymentQueryParams, 'assignedToMe'>): Observable<AtlasPagedResult<AtlasDeploymentDto>> {
    return this.getDeployments({ ...params, assignedToMe: true });
  }

  getDeployment(id: string): Observable<AtlasDeploymentDetailDto> {
    return this.http.get<AtlasDeploymentDetailDto>(`${this.baseUrl}/${id}`);
  }

  createDeployment(request: AtlasCreateDeploymentRequest): Observable<AtlasDeploymentDto> {
    return this.http.post<AtlasDeploymentDto>(this.baseUrl, request);
  }

  updateDeployment(id: string, request: AtlasUpdateDeploymentRequest): Observable<AtlasDeploymentDto> {
    return this.http.put<AtlasDeploymentDto>(`${this.baseUrl}/${id}`, request);
  }

  // ─── State Transitions ────────────────────────────────────────────────────

  /**
   * Request a lifecycle state transition.
   * The rules engine evaluates guards before any transition is committed.
   */
  requestTransition(id: string, request: AtlasTransitionRequest): Observable<AtlasTransitionResponse> {
    return this.http.post<AtlasTransitionResponse>(`${this.baseUrl}/${id}/transition`, request);
  }

  /** Get available transitions from the deployment's current state */
  getAvailableTransitions(id: string): Observable<AtlasLifecycleState[]> {
    return this.http.get<AtlasLifecycleState[]>(`${this.baseUrl}/${id}/transitions/available`);
  }

  // ─── Evidence ─────────────────────────────────────────────────────────────

  submitEvidence(id: string, request: AtlasEvidenceSubmissionRequest): Observable<AtlasEvidenceDto> {
    return this.http.post<AtlasEvidenceDto>(`${this.baseUrl}/${id}/evidence`, request);
  }

  getEvidence(id: string, evidenceId: string): Observable<AtlasEvidenceDto> {
    return this.http.get<AtlasEvidenceDto>(`${this.baseUrl}/${id}/evidence/${evidenceId}`);
  }

  // ─── Audit Trail ──────────────────────────────────────────────────────────

  getAuditTrail(id: string): Observable<AtlasAuditEventDto[]> {
    return this.http.get<AtlasAuditEventDto[]>(`${this.baseUrl}/${id}/audit`);
  }

  // ─── Sign-Off ─────────────────────────────────────────────────────────────

  /**
   * Record a three-party sign-off (Vendor / DE / Tech).
   * Sign-off state is stored in the deployment's metadata and mirrored as Atlas evidence.
   */
  recordSignOff(id: string, request: AtlasSignOffRequest): Observable<AtlasSignOffStatus> {
    return this.http.post<AtlasSignOffStatus>(`${this.baseUrl}/${id}/signoff`, request);
  }

  getSignOffStatus(id: string): Observable<AtlasSignOffStatus> {
    return this.http.get<AtlasSignOffStatus>(`${this.baseUrl}/${id}/signoffs`);
  }
}
