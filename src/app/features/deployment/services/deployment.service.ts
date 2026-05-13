// src/app/features/deployments/services/deployment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { environment, local_environment } from '../../../../environments/environments';
import { DeploymentHandoff, HandoffPackage, Deployment, SignOffRequest, SignOffStatus, SignOffType, DeploymentStatus } from '../models/deployment.models';
import { StartDeploymentProgressPayload } from '../models/deployment-progress.model';

export interface DeploymentQuery {
  status?: DeploymentStatus;
  vendor?: string;
  dataCenter?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  pageSize?: number;
}

export interface ChecklistItemDto {
  itemKey: string;
  label: string;
  value?: string | null;
  required: boolean;
  passed?: boolean | null;
  notes?: string | null;
}

export interface HandoffUpdateDto {
  requiredPhotos: string[];
  asBuiltFileId?: string | null;
  portTestFileId?: string | null;
  signedVendorAt?: string | null;
  signedDeAt?: string | null;
}

export type StartDeploymentProgressBody = StartDeploymentProgressPayload & {
  receiving: StartDeploymentProgressPayload['receiving'] | null;
  submittedSiteSurvey: StartDeploymentProgressPayload['submittedSiteSurvey'] | null;
  projectId: string | null;
};

@Injectable({ providedIn: 'root' })
export class DeploymentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/deployments`;
  private listCache = new Map<string, Observable<Deployment[]>>();

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
      // Note: Ocp-Apim-Subscription-Key is now handled by ConfigurationInterceptor
    })
  };

  // ----- Deployments -----
  list(q: DeploymentQuery = {}): Observable<Deployment[]> {
    const key = this.buildQueryCacheKey(q);
    const cached = this.listCache.get(key);
    if (cached) return cached;

    let params = new HttpParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });

    const request$ = this.http
      .get<{ total: number; rows: Deployment[] } | Deployment[]>(this.base, { params, headers: this.httpOptions.headers })
      .pipe(
        map(res => Array.isArray(res) ? res : res.rows),
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(err => {
          this.listCache.delete(key);
          return throwError(() => err);
        })
      );

    this.listCache.set(key, request$);
    return request$;
  }

  async get(id: string) {
    return firstValueFrom(this.http.get<Deployment>(`${this.base}/${id}`, { headers: this.httpOptions.headers }));
  }

  async create(payload: Partial<Deployment>) {
    const body = this.normalizePayload(payload);
    const result = await firstValueFrom(this.http.post<{ id: string }>(this.base, body, { headers: this.httpOptions.headers }));
    this.invalidateListCache();
    return result;
  }

  async update(id: string, payload: Partial<Deployment>) {
    const body = this.normalizePayload(payload);
    const result = await firstValueFrom(this.http.put<void>(`${this.base}/${id}`, body, { headers: this.httpOptions.headers }));
    this.invalidateListCache();
    return result;
  }

  async advance(id: string, from: number, to: number) {
    const result = await firstValueFrom(this.http.post<void>(`${this.base}/${id}/advance`, { from, to }, { headers: this.httpOptions.headers }));
    this.invalidateListCache();
    return result;
  }

  /**
   * Request an Atlas lifecycle state transition.
   * Use when the deployment is governed by the Atlas platform backend.
   * Endpoint: POST /deployments/{id}/transition
   */
  async requestAtlasTransition(id: string, targetState: string, reason: string) {
    const result = await firstValueFrom(
      this.http.post<{ deploymentId: string; previousState: string; newState: string; transitionedAt: string }>(
        `${this.base}/${id}/transition`,
        { targetState, reason },
        { headers: this.httpOptions.headers }
      )
    );
    this.invalidateListCache();
    return result;
  }

  /** Get available Atlas lifecycle transitions for a deployment */
  getAvailableTransitions(id: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/${id}/transitions/available`, { headers: this.httpOptions.headers });
  }

  // ----- Phases/Subphases/Checklist -----
  async getSubPhases(id: string, phaseCode: number) {
    return firstValueFrom(this.http.get<any[]>(`${this.base}/${id}/phases/${phaseCode}/subphases`, { headers: this.httpOptions.headers }));
  }

  async getChecklist(id: string, phaseCode: number, subCode: string) {
    return firstValueFrom(this.http.get<ChecklistItemDto[]>(
      `${this.base}/${id}/phases/${phaseCode}/${encodeURIComponent(subCode)}/checklist`, { headers: this.httpOptions.headers }));
  }

  async saveChecklist(id: string, phaseCode: number, subCode: string, items: ChecklistItemDto[]) {
    return firstValueFrom(this.http.post<void>(
      `${this.base}/${id}/phases/${phaseCode}/${encodeURIComponent(subCode)}/checklist`, items, { headers: this.httpOptions.headers }));
  }

  async completeSubPhase(id: string, phaseCode: number, subCode: string) {
    return firstValueFrom(this.http.post<void>(
      `${this.base}/${id}/phases/${phaseCode}/${encodeURIComponent(subCode)}/complete`, {}, { headers: this.httpOptions.headers }));
  }

  async linkEvidence(id: string, phaseCode: number, subCode: string, mediaId: string) {
    return firstValueFrom(this.http.post<void>(
      `${this.base}/${id}/phases/${phaseCode}/${encodeURIComponent(subCode)}/evidence/${mediaId}`, {}, { headers: this.httpOptions.headers }));
  }

  getProgress(deploymentId: string): Observable<StartDeploymentProgressPayload> {
    const normalizedId = this.stripBraces(deploymentId);
    return this.http.get<StartDeploymentProgressPayload>(`${this.base}/${normalizedId}/progress`, {
      headers: this.httpOptions.headers
    });
  }

  saveProgress(id: string, payload: StartDeploymentProgressPayload): Observable<void> {
    const body: StartDeploymentProgressBody = {
      ...payload,
      projectId: payload.projectId ?? id,
      receiving: payload.receiving ?? { responses: [] },
      submittedSiteSurvey: payload.submittedSiteSurvey ?? null,
    };
    return this.http.post<void>(`${this.base}/${id}/progress`, body, { headers: this.httpOptions.headers }).pipe(
      tap(() => this.invalidateListCache())
    );
  }

  // ----- Handoff -----
  async getHandoff(id: string) {
    return firstValueFrom(this.http.get<HandoffPackage>(`${this.base}/${id}/handoff`, { headers: this.httpOptions.headers }));
  }

  async signHandoff(id: string, payload: HandoffUpdateDto) {
    return firstValueFrom(this.http.post<HandoffPackage>(`${this.base}/${id}/handoff`, payload, { headers: this.httpOptions.headers }));
  }

  // ----- Three-Way Sign-Off (Run Book v7 Section 6) -----
  
  /**
   * Record a sign-off from Vendor Rep, DE, or SRI Tech
   * @param deploymentId - ID of the deployment
   * @param signOffType - Type of sign-off (Vendor, DE, Tech)
   * @param userId - ID of the user signing off
   * @returns Updated sign-off status
   */
  async recordSignOff(deploymentId: string, signOffType: SignOffType, userId: string): Promise<SignOffStatus> {
    const request: SignOffRequest = {
      deploymentId,
      userId,
      type: signOffType
    };
    
    const response = await firstValueFrom(
      this.http.post<SignOffStatus>(
        `${this.base}/${deploymentId}/signoff`,
        request,
        { headers: this.httpOptions.headers }
      )
    );
    
    // Invalidate cache after sign-off recorded
    this.invalidateListCache();
    
    return response;
  }

  /**
   * Get the current sign-off status for a deployment
   * @param deploymentId - ID of the deployment
   * @returns Current sign-off status
   */
  async getSignOffStatus(deploymentId: string): Promise<SignOffStatus> {
    return firstValueFrom(
      this.http.get<SignOffStatus>(
        `${this.base}/${deploymentId}/signoffs`,
        { headers: this.httpOptions.headers }
      )
    );
  }

  private buildQueryCacheKey(q: DeploymentQuery): string {
    const normalizedEntries = Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(normalizedEntries);
  }

  private invalidateListCache(): void {
    this.listCache.clear();
  }

  private stripBraces(id: string | null | undefined): string {
    return (id ?? '').replace(/[{}]/g, '');
  }

  private normalizePayload(payload: Partial<Deployment>): {
    id: string | null;
    name: string;
    dataCenter: string;
    vendorName: string;
    status: DeploymentStatus | '';
    startDate: string | null | undefined;
    targetHandoffDate: string | null | undefined;
    updatedBy: string | null | undefined;
  } {
    return {
      id: payload.id ?? null,
      name: payload.name ?? '',
      dataCenter: payload.dataCenter ?? '',
      vendorName: payload.vendorName ?? '',
      status: payload.status ?? '',
      startDate: payload.startDate ?? null,
      targetHandoffDate: payload.targetHandoffDate ?? null,
      updatedBy: payload.updatedBy ?? null
    };
  }
}
