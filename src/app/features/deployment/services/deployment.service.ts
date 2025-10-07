import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeploymentProject, DeploymentStatus, PhaseRun, ChecklistItem, Photo, TestResult, PunchItem, HandoffPackage } from '../models/deployment.models';
import { StartDeploymentProgressPayload } from '../models/deployment-progress.model';

type ChecklistPayload = { items: ChecklistItem[] };

@Injectable({ providedIn: 'root' })
export class DeploymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/deployments';

  list(params: Record<string, unknown> = {}): Observable<DeploymentProject[]> {
    const httpParams = new HttpParams({ fromObject: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value?.toString() ?? ''])) });
    return this.http.get<DeploymentProject[]>(this.baseUrl, { params: httpParams });
  }

  get(id: string): Observable<DeploymentProject> {
    return this.http.get<DeploymentProject>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<DeploymentProject>): Observable<DeploymentProject> {
    return this.http.post<DeploymentProject>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<DeploymentProject>): Observable<DeploymentProject> {
    return this.http.patch<DeploymentProject>(`${this.baseUrl}/${id}`, payload);
  }

  getPhaseRun(id: string, phase: DeploymentStatus): Observable<PhaseRun> {
    return this.http.get<PhaseRun>(`${this.baseUrl}/${id}/phases/${phase}`);
  }

  saveChecklist(id: string, phase: DeploymentStatus, items: ChecklistItem[]): Observable<PhaseRun> {
    const body: ChecklistPayload = { items };
    return this.http.put<PhaseRun>(`${this.baseUrl}/${id}/phases/${phase}/checklist`, body);
  }

  advancePhase(id: string, from: DeploymentStatus, to: DeploymentStatus): Observable<DeploymentProject> {
    return this.http.post<DeploymentProject>(`${this.baseUrl}/${id}/phases/advance`, { from, to });
  }

  addPhoto(id: string, photo: FormData | Photo): Observable<Photo> {
    // TODO: integrate media upload contract once backend is finalized
    return this.http.post<Photo>(`${this.baseUrl}/${id}/photos`, photo);
  }

  addTestResult(id: string, test: FormData | TestResult): Observable<TestResult> {
    return this.http.post<TestResult>(`${this.baseUrl}/${id}/tests`, test);
  }

  listPunch(id: string): Observable<PunchItem[]> {
    return this.http.get<PunchItem[]>(`${this.baseUrl}/${id}/punch`);
  }

  addPunch(id: string, payload: Partial<PunchItem>): Observable<PunchItem> {
    return this.http.post<PunchItem>(`${this.baseUrl}/${id}/punch`, payload);
  }

  resolvePunch(id: string, punchId: string, payload: Partial<PunchItem>): Observable<PunchItem> {
    return this.http.post<PunchItem>(`${this.baseUrl}/${id}/punch/${punchId}/resolve`, payload);
  }

  getHandoff(id: string): Observable<HandoffPackage> {
    return this.http.get<HandoffPackage>(`${this.baseUrl}/${id}/handoff`);
  }

  signHandoff(id: string, payload: Partial<HandoffPackage>): Observable<HandoffPackage> {
    return this.http.post<HandoffPackage>(`${this.baseUrl}/${id}/handoff/sign`, payload);
  }

  saveProgress(id: string, payload: StartDeploymentProgressPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/progress`, payload);
  }
}
