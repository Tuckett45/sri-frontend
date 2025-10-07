// deployment-state.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { DeploymentProject, DeploymentStatus } from '../models/deployment.models';
import { DeploymentService } from './deployment.service';
import { DeploymentsSocketService } from './deployments-socket.service'; // <-- add

@Injectable({ providedIn: 'root' })
export class DeploymentStateService {
  private readonly deploymentService = inject(DeploymentService);
  private readonly socket = inject(DeploymentsSocketService); // <-- add

  private readonly projectSignal = signal<DeploymentProject | null>(null);
  readonly project$ = this.projectSignal.asReadonly();
  readonly status$ = computed<DeploymentStatus | null>(() => this.projectSignal()?.status ?? null);

  private deploymentId?: string;
  private socketSubscriptions: Subscription[] = [];

  async loadProject(id: string) {
    if (this.deploymentId && this.deploymentId !== id) {
      await this.socket.leaveDeployment(this.deploymentId).catch(() => undefined);
      this.teardownSocketSubscriptions();
    }
    this.deploymentId = id;
    // initial fetch
    this.deploymentService.get(id).subscribe(project => this.projectSignal.set(project));
    // live updates
    await this.ensureSocket(id);
  }

  setProject(project: DeploymentProject | null) {
    this.projectSignal.set(project);
  }

  patchStatus(status: DeploymentStatus) {
    const current = this.projectSignal();
    if (current) this.projectSignal.set({ ...current, status });
  }

  clear() {
    if (this.deploymentId) {
      this.socket.leaveDeployment(this.deploymentId).catch(() => undefined);
    }
    this.teardownSocketSubscriptions();
    this.deploymentId = undefined;
    this.projectSignal.set(null);
  }

  // ---- private -------------------------------------------------------------

  private async ensureSocket(id: string) {
    await this.socket.connect();
    await this.socket.joinDeployment(id);

    // When a phase advances, refresh the project (or patch status if you prefer)
    this.teardownSocketSubscriptions();

    this.socketSubscriptions.push(this.socket.phaseAdvanced$.subscribe(e => {
      if (e.deploymentId === id) {
        // lightweight: patch status locally
        const cur = this.projectSignal();
        if (cur) this.projectSignal.set({ ...cur, status: this.mapPhaseIndexToStatus(e.toPhase) });
        // or heavier: refetch full project
        // this.deploymentService.get(id).subscribe(p => this.projectSignal.set(p));
      }
    }));

    // If you want more live UX, you can hook these too:
    this.socketSubscriptions.push(this.socket.checklistSaved$.subscribe(e => { if (e.deploymentId === id) {/* maybe toast or refresh phase */} }));
    this.socketSubscriptions.push(this.socket.evidenceAdded$.subscribe(e => { if (e.deploymentId === id) {/* update counts/badges */} }));
    this.socketSubscriptions.push(this.socket.punchUpdated$.subscribe(e => { if (e.deploymentId === id) {/* refresh punch list */} }));
    this.socketSubscriptions.push(this.socket.handoffSigned$.subscribe(e => { if (e.deploymentId === id) {/* UI signal */} }));
    this.socketSubscriptions.push(this.socket.handoffArchived$.subscribe(e => { if (e.deploymentId === id) {/* show archive link */} }));
  }

  // map numeric phase index → your enum; adjust if your backend uses different codes
  private mapPhaseIndexToStatus(idx: number): DeploymentStatus {
    // 0: Planned, 1: Survey, 2: Inventory, 3: Install, 4: Cabling, 5: Labeling, 6: Handoff, 7: Complete
    const order: DeploymentStatus[] = [
      'Planned','Survey','Inventory','Install','Cabling','Labeling','Handoff','Complete'
    ] as unknown as DeploymentStatus[]; // narrow if you have a true enum
    return order[Math.max(0, Math.min(idx, order.length - 1))];
  }

  private teardownSocketSubscriptions() {
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.socketSubscriptions = [];
  }
}
