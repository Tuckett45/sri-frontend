// src/app/features/deployments/services/deployment-state.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { DeploymentService } from './deployment.service';
import { DeploymentsSocketService } from './deployments-socket.service';
import { Deployment, DeploymentStatus } from '../models/deployment.models';

@Injectable({ providedIn: 'root' })
export class DeploymentStateService {
  private api = inject(DeploymentService);
  private sock = inject(DeploymentsSocketService);

  private projectSignal = signal<Deployment | null>(null);
  readonly project$ = this.projectSignal.asReadonly();
  readonly status$ = computed<DeploymentStatus | null>(() => this.projectSignal()?.status ?? null);

  private currentId?: string;

  async loadProject(id: string) {
    this.currentId = id;
    const project = await this.api.get(id);
    this.projectSignal.set(project);

    await this.sock.connect();
    await this.sock.joinDeployment(id);

    // live updates
    this.sock.phaseAdvanced$.subscribe(e => {
      if (e.deploymentId === id) {
        const cur = this.projectSignal();
        if (cur) this.projectSignal.set({ ...cur, status: this.mapPhaseToStatus(e.toPhase) });
      }
    });
    this.sock.checklistSaved$.subscribe(e => { if (e.deploymentId === id) {/* toast/refresh */} });
    this.sock.evidenceAdded$.subscribe(e => { if (e.deploymentId === id) {/* update evidence counters */} });
  }

  clear() {
    if (this.currentId) this.sock.leaveDeployment(this.currentId);
    this.currentId = undefined;
    this.projectSignal.set(null);
  }

  setProject(project: Deployment | null) {
    this.projectSignal.set(project);
  }

  private mapPhaseToStatus(idx: number): DeploymentStatus {
    const order: DeploymentStatus[] = [
      DeploymentStatus.Planned,
      DeploymentStatus.Survey,
      DeploymentStatus.Inventory,
      DeploymentStatus.Install,
      DeploymentStatus.Cabling,
      DeploymentStatus.Labeling,
      DeploymentStatus.Handoff,
      DeploymentStatus.Complete,
    ];
    return order[Math.max(0, Math.min(idx, order.length - 1))];
  }
}
