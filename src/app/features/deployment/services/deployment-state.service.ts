// src/app/features/deployments/services/deployment-state.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { DeploymentService } from './deployment.service';
import { DeploymentsSocketService } from './deployments-socket.service';
import { Deployment, DeploymentStatus } from '../models/deployment.models';
import { NotificationService } from 'src/app/services/notification.service';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';
import { resolveUserDeploymentRole } from '../utils/role.utils';

@Injectable({ providedIn: 'root' })
export class DeploymentStateService {
  private api = inject(DeploymentService);
  private sock = inject(DeploymentsSocketService);
  private notifications = inject(NotificationService);
  private auth = inject(AuthService);

  private projectSignal = signal<Deployment | null>(null);
  readonly project$ = this.projectSignal.asReadonly();
  readonly status$ = computed<DeploymentStatus | null>(() => this.projectSignal()?.status ?? null);

  private currentId?: string;
  private projectSubscriptions: Subscription[] = [];
  private globalSubscriptions: Subscription[] = [];
  private globalSubscriptionsRegistered = false;
  private readonly userRole = resolveUserDeploymentRole(this.auth.getUser());
  private readonly notifiedReadyForSignoff = new Set<string>();
  private readonly notifiedCompleted = new Set<string>();

  constructor() {
    this.ensureConnected();
  }

  async loadProject(id: string) {
    this.ensureConnected();
    this.teardownProjectSubscriptions();
    this.currentId = id;
    const project = await this.api.get(id);
    this.projectSignal.set(project);
    await this.sock.joinDeployment(id);

    const subs: Subscription[] = [];
    subs.push(
      this.sock.phaseAdvanced$.subscribe(e => {
        if (e.deploymentId === id) {
          const cur = this.projectSignal();
          if (cur) {
            this.projectSignal.set({ ...cur, status: this.mapPhaseToStatus(e.toPhase) });
          }
        }
      })
    );
    subs.push(
      this.sock.checklistSaved$.subscribe(e => {
        if (e.deploymentId === id) {
          // Placeholder for future checklist toast/refresh logic
        }
      })
    );
    subs.push(
      this.sock.evidenceAdded$.subscribe(e => {
        if (e.deploymentId === id) {
          // Placeholder for future evidence update logic
        }
      })
    );

    this.projectSubscriptions = subs;
  }

  clear() {
    if (this.currentId) void this.sock.leaveDeployment(this.currentId);
    this.currentId = undefined;
    this.teardownProjectSubscriptions();
    this.projectSignal.set(null);
  }

  setProject(project: Deployment | null) {
    this.projectSignal.set(project);
  }

  private ensureConnected(): void {
    void this.sock.connect();
    this.registerGlobalSubscriptions();
  }

  private registerGlobalSubscriptions(): void {
    if (this.globalSubscriptionsRegistered) {
      return;
    }
    this.globalSubscriptionsRegistered = true;

    this.globalSubscriptions.push(
      this.sock.deploymentAssigned$.subscribe(payload => {
        if (!this.notificationsEnabled()) {
          return;
        }
        const targetId =
          payload.assigneeId ??
          payload.assignedToId ??
          payload.assignedTo ??
          null;
        if (!this.matchesCurrentUser(targetId)) {
          return;
        }
        const name = payload.deploymentName ?? 'A deployment';
        this.sendNotification(
          'Deployment assigned',
          `${name} was assigned to you.`,
          'project',
          `/deployments/${payload.deploymentId}`,
          'Open deployment'
        );
      })
    );

    this.globalSubscriptions.push(
      this.sock.deploymentReadyForSignoff$.subscribe(payload => {
        this.notifyReadyForSignoff(payload.deploymentId, payload.deploymentName);
      })
    );

    this.globalSubscriptions.push(
      this.sock.deploymentIssueCreated$.subscribe(payload => {
        if (!this.notificationsEnabled()) {
          return;
        }
        const targetId =
          payload.assignedToId ??
          payload.assigneeId ??
          payload.assignedTo ??
          null;
        if (targetId && !this.matchesCurrentUser(targetId)) {
          return;
        }
        const message = payload.title
          ? `New issue "${payload.title}" reported.`
          : 'A new deployment issue was reported.';
        this.sendNotification(
          'Deployment issue reported',
          message,
          'alert',
          `/deployments/${payload.deploymentId}`,
          'Review deployment'
        );
      })
    );

    this.globalSubscriptions.push(
      this.sock.punchUpdated$.subscribe(payload => {
        if (!this.notificationsEnabled()) {
          return;
        }
        this.sendNotification(
          'Deployment issue updated',
          `Punch item ${payload.punchId} updated (${payload.status}).`,
          'alert',
          `/deployments/${payload.deploymentId}`,
          'Review deployment'
        );
      })
    );

    this.globalSubscriptions.push(
      this.sock.deploymentCompleted$.subscribe(payload => {
        this.notifyDeploymentCompleted(payload.deploymentId, payload.deploymentName);
      })
    );

    this.globalSubscriptions.push(
      this.sock.phaseAdvanced$.subscribe(event => {
        const status = this.mapPhaseToStatus(event.toPhase);
        if (status === DeploymentStatus.Handoff) {
          this.notifyReadyForSignoff(event.deploymentId);
        } else if (status === DeploymentStatus.Complete) {
          this.notifyDeploymentCompleted(event.deploymentId);
        } else {
          this.notifiedReadyForSignoff.delete(event.deploymentId);
          this.notifiedCompleted.delete(event.deploymentId);
        }
      })
    );
  }

  private teardownProjectSubscriptions(): void {
    this.projectSubscriptions.forEach(sub => sub.unsubscribe());
    this.projectSubscriptions = [];
  }

  private notificationsEnabled(): boolean {
    return this.notifications.notificationsEnabled();
  }

  private getCurrentUserId(): string | null {
    const user = this.auth.getUser() as { id?: string } | null | undefined;
    return user?.id ?? null;
  }

  private matchesCurrentUser(targetId?: string | null): boolean {
    if (!targetId) {
      return false;
    }
    const current = this.getCurrentUserId();
    return !!current && current === targetId;
  }

  private shouldReceiveSignoffNotice(): boolean {
    return ['Vendor', 'ComcastDeploymentEngineer', 'Technician', 'DcOps'].includes(this.userRole);
  }

  private sendNotification(
    title: string,
    message: string,
    category: 'project' | 'alert' | 'task',
    routerLink?: string,
    actionLabel = 'View'
  ): void {
    if (!this.notificationsEnabled()) {
      return;
    }
    this.notifications.addNotification({
      title,
      message,
      category,
      action: routerLink ? { label: actionLabel, routerLink } : undefined,
    });
  }

  private notifyReadyForSignoff(deploymentId: string, name?: string): void {
    if (!this.notificationsEnabled() || !this.shouldReceiveSignoffNotice()) {
      return;
    }
    if (!deploymentId || this.notifiedReadyForSignoff.has(deploymentId)) {
      return;
    }
    this.notifiedReadyForSignoff.add(deploymentId);
    const label =
      this.userRole === 'Vendor' ? 'Review vendor checklist' : 'Open handoff';
    this.sendNotification(
      'Ready for sign-off',
      `${name ?? 'Deployment'} is ready for sign-off.`,
      'task',
      `/deployments/${deploymentId}/handoff`,
      label
    );
  }

  private notifyDeploymentCompleted(deploymentId: string, name?: string): void {
    if (!this.notificationsEnabled()) {
      return;
    }
    if (!deploymentId || this.notifiedCompleted.has(deploymentId)) {
      return;
    }
    this.notifiedCompleted.add(deploymentId);
    this.sendNotification(
      'Deployment completed',
      `${name ?? 'Deployment'} has been marked complete.`,
      'project',
      `/deployments/${deploymentId}`,
      'View deployment'
    );
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
