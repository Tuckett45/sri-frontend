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
  
  // notification events
  deploymentAssigned$ = new Subject<any>();
  deploymentReadyForSignoff$ = new Subject<any>();
  deploymentIssueCreated$ = new Subject<any>();
  deploymentCompleted$ = new Subject<any>();

  async connect(hubUrl = '/hubs/deployments') {
    if (this.hub) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => (await this.auth.getAccessToken()) || ''
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('PhaseAdvanced',    p => this.phaseAdvanced$.next(p));
    this.hub.on('ChecklistSaved',   p => this.checklistSaved$.next(p));
    this.hub.on('SubPhaseCompleted',p => this.subPhaseCompleted$.next(p));
    this.hub.on('EvidenceAdded',    p => this.evidenceAdded$.next(p));
    this.hub.on('PunchUpdated',     p => this.punchUpdated$.next(p));
    this.hub.on('HandoffSigned',    p => this.handoffSigned$.next(p));
    this.hub.on('HandoffArchived',  p => this.handoffArchived$.next(p));
    
    // notification events
    this.hub.on('DeploymentAssigned', p => this.deploymentAssigned$.next(p));
    this.hub.on('DeploymentReadyForSignoff', p => this.deploymentReadyForSignoff$.next(p));
    this.hub.on('DeploymentIssueCreated', p => this.deploymentIssueCreated$.next(p));
    this.hub.on('DeploymentCompleted', p => this.deploymentCompleted$.next(p));

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
