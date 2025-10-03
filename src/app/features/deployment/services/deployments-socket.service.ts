// deployments-socket.service.ts
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Injectable({ providedIn: 'root' })
export class DeploymentsSocketService {
  private hub?: signalR.HubConnection;

  phaseAdvanced$   = new Subject<{ deploymentId: string; toPhase: number }>();
  checklistSaved$  = new Subject<{ deploymentId: string; phase: number; subCode: string }>();
  evidenceAdded$   = new Subject<{ deploymentId: string; phase: number; subCode: string; mediaType: string }>();
  punchUpdated$    = new Subject<{ deploymentId: string; punchId: string; status: string }>();
  handoffSigned$   = new Subject<{ deploymentId: string; role: string }>();
  handoffArchived$ = new Subject<{ deploymentId: string; packageUrl: string }>();

  constructor(private auth: AuthService) {}

  async connect() {
    if (this.hub) return;
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/deployments', {
        accessTokenFactory: async () => (await this.auth.getAccessToken()) || ''
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('PhaseAdvanced', p => this.phaseAdvanced$.next(p));
    this.hub.on('ChecklistSaved', p => this.checklistSaved$.next(p));
    this.hub.on('EvidenceAdded', p => this.evidenceAdded$.next(p));
    this.hub.on('PunchUpdated', p => this.punchUpdated$.next(p));
    this.hub.on('HandoffSigned', p => this.handoffSigned$.next(p));
    this.hub.on('HandoffArchived', p => this.handoffArchived$.next(p));

    await this.hub.start();
  }

  joinDeployment(id: string) { return this.hub?.invoke('JoinDeployment', id); }
  leaveDeployment(id: string) { return this.hub?.invoke('LeaveDeployment', id); }
}
