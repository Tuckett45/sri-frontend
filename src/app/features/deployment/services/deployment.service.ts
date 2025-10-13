// src/app/features/deployments/services/deployment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom, map, Observable } from 'rxjs';
import { environment, local_environment } from '../../../../environments/environments';
import { DeploymentHandoff, HandoffPackage } from '../models/deployment.models';
import { StartDeploymentProgressPayload } from '../models/deployment-progress.model';

export enum DeploymentStatus {
  Planned = 'Planned',
  Survey = 'Survey',
  Inventory = 'Inventory',
  Install = 'Install',
  Cabling = 'Cabling',
  Labeling = 'Labeling',
  Handoff = 'Handoff',
  Complete = 'Complete'
}

export interface Deployment {
  id: string;
  name: string;
  dataCenter: string;
  vendorName: string;
  deploymentEngineerId?: string;
  status: DeploymentStatus;
  startDate?: string;
  targetHandoffDate?: string;
  rfpId?: string;
  workOrderId?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
  progressPercent?: number;
  nextStatus?: DeploymentStatus | null;
}

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

export type StartDeploymentProgressBody =
  Omit<StartDeploymentProgressPayload, 'projectId'> & {
    receiving: StartDeploymentProgressPayload['receiving'] | null;
    submittedSiteSurvey: StartDeploymentProgressPayload['submittedSiteSurvey'] | null;
  };

@Injectable({ providedIn: 'root' })
export class DeploymentService {
  private http = inject(HttpClient);
  private base = `${local_environment.apiUrl}/deployments`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  // ----- Deployments -----
  list(q: DeploymentQuery = {}): Observable<Deployment[]> {
    let params = new HttpParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });

    return this.http.get<{ total: number; rows: Deployment[] } | Deployment[]>(this.base, { params, headers: this.httpOptions.headers }).pipe(
      map(res => Array.isArray(res) ? res : res.rows)
    );
  }

  async get(id: string) {
    return firstValueFrom(this.http.get<Deployment>(`${this.base}/${id}`, { headers: this.httpOptions.headers }));
  }

  async create(payload: Partial<Deployment>) {
    return firstValueFrom(this.http.post<{ id: string }>(this.base, payload, { headers: this.httpOptions.headers }));
  }

  async update(id: string, payload: Partial<Deployment>) {
    return firstValueFrom(this.http.put<void>(`${this.base}/${id}`, payload, { headers: this.httpOptions.headers }));
  }

  async advance(id: string, from: number, to: number) {
    return firstValueFrom(this.http.post<void>(`${this.base}/${id}/advance`, { from, to }, { headers: this.httpOptions.headers }));
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

  saveProgress(id: string, payload: StartDeploymentProgressPayload): Observable<void> {
    const { projectId: _ignore, receiving, submittedSiteSurvey, ...rest } = payload;
    const body: StartDeploymentProgressBody = {
      ...rest,
      receiving: receiving ?? null,
      submittedSiteSurvey: submittedSiteSurvey ?? null,
    };
    return this.http.post<void>(`${this.base}/${id}/progress`, body, { headers: this.httpOptions.headers });
  }

  // ----- Handoff -----
  async getHandoff(id: string) {
    return firstValueFrom(this.http.get<HandoffPackage>(`${this.base}/${id}/handoff`, { headers: this.httpOptions.headers }));
  }

  async signHandoff(id: string, payload: HandoffUpdateDto) {
    return firstValueFrom(this.http.post<HandoffPackage>(`${this.base}/${id}/handoff`, payload, { headers: this.httpOptions.headers }));
  }
}
