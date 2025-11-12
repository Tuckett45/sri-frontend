// src/app/features/deployments/services/deployments-socket.service.ts
import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Injectable({ providedIn: 'root' })
export class DeploymentsSocketService {
  private hub?: signalR.HubConnection;
  private auth = inject(AuthService);

  // events
  phaseAdvanced$    = new Subject<{ deploymentId: string; toPhase: number }>();
  checklistSaved$   = new Subject<{ deploymentId: string; phase: number; subCode: string }>();
  subPhaseCompleted$= new Subject<{ deploymentId: string; phase: number; subCode: string }>();
  evidenceAdded$    = new Subject<{ deploymentId: string; phase: number; subCode: string; mediaType: string }>();
  punchUpdated$     = new Subject<{ deploymentId: string; punchId: string; status: string }>();
  handoffSigned$    = new Subject<{ deploymentId: string; role: string }>();
  handoffArchived$  = new Subject<{ deploymentId: string; packageUrl: string }>();

  async connect(hubUrl = '/hubs/deployments') {
    if (this.hub) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => (await this.auth.getAccessToken()) || ''
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('PhaseAdvanced',    (p: { deploymentId: string; toPhase: number; }) => this.phaseAdvanced$.next(p));
    this.hub.on('ChecklistSaved',   (p: { deploymentId: string; phase: number; subCode: string; }) => this.checklistSaved$.next(p));
    this.hub.on('SubPhaseCompleted',(p: { deploymentId: string; phase: number; subCode: string; }) => this.subPhaseCompleted$.next(p));
    this.hub.on('EvidenceAdded',    (p: { deploymentId: string; phase: number; subCode: string; mediaType: string; }) => this.evidenceAdded$.next(p));
    this.hub.on('PunchUpdated',     (p: { deploymentId: string; punchId: string; status: string; }) => this.punchUpdated$.next(p));
    this.hub.on('HandoffSigned',    (p: { deploymentId: string; role: string; }) => this.handoffSigned$.next(p));
    this.hub.on('HandoffArchived',  (p: { deploymentId: string; packageUrl: string; }) => this.handoffArchived$.next(p));

    await this.hub.start();
  }

  async joinDeployment(deploymentId: string) {
    if (!this.hub) await this.connect();
    await this.hub!.invoke('JoinDeployment', deploymentId);
  }

  async leaveDeployment(deploymentId: string) {
    if (!this.hub) return;
    await this.hub.invoke('LeaveDeployment', deploymentId);
  }

  async stop() {
    if (!this.hub) return;
    await this.hub.stop();
    this.hub = undefined;
  }
}
