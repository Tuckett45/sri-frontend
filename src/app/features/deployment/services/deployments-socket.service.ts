// deployments-socket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { Subject, firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class DeploymentsSocketService {
  private hub?: signalR.HubConnection;
  private connectPromise?: Promise<void>;
  private readonly joinedDeployments = new Set<string>();

  phaseAdvanced$   = new Subject<{ deploymentId: string; toPhase: number }>();
  checklistSaved$  = new Subject<{ deploymentId: string; phase: number; subCode: string }>();
  evidenceAdded$   = new Subject<{ deploymentId: string; phase: number; subCode: string; mediaType: string }>();
  punchUpdated$    = new Subject<{ deploymentId: string; punchId: string; status: string }>();
  handoffSigned$   = new Subject<{ deploymentId: string; role: string }>();
  handoffArchived$ = new Subject<{ deploymentId: string; packageUrl: string }>();

  constructor(private http: HttpClient, private auth: AuthService) {}

  async connect(force = false): Promise<void> {
    if (!force && this.hub && this.hub.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (!force && this.connectPromise) {
      return this.connectPromise;
    }

    const connectTask = this.buildAndStartHub(force);
    this.connectPromise = connectTask;
    try {
      await connectTask;
    } finally {
      this.connectPromise = undefined;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.hub) return;
    try {
      await this.hub.stop();
    } finally {
      this.hub = undefined;
      this.joinedDeployments.clear();
    }
  }

  async joinDeployment(id: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Socket not connected');
    }
    await this.hub.invoke('JoinDeployment', id);
    this.joinedDeployments.add(id);
  }

  async leaveDeployment(id: string): Promise<void> {
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      this.joinedDeployments.delete(id);
      return;
    }
    await this.hub.invoke('LeaveDeployment', id).finally(() => this.joinedDeployments.delete(id));
  }

  // ---- private helpers ----------------------------------------------------

  private async buildAndStartHub(force: boolean): Promise<void> {
    if (force && this.hub) {
      await this.disconnect().catch(() => undefined);
    }

    const info = await this.negotiate();

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(info.url, {
        accessTokenFactory: () => info.accessToken
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(hub);
    hub.onreconnected(() => this.rejoinGroups(hub));
    await hub.start();
    this.hub = hub;
  }

  private registerHandlers(hub: signalR.HubConnection) {
    hub.on('PhaseAdvanced', p => this.phaseAdvanced$.next(p));
    hub.on('ChecklistSaved', p => this.checklistSaved$.next(p));
    hub.on('EvidenceAdded', p => this.evidenceAdded$.next(p));
    hub.on('PunchUpdated', p => this.punchUpdated$.next(p));
    hub.on('HandoffSigned', p => this.handoffSigned$.next(p));
    hub.on('HandoffArchived', p => this.handoffArchived$.next(p));
  }

  private async negotiate(): Promise<{ url: string; accessToken: string }> {
    const urls = this.resolveNegotiateUrls();
    let lastError: unknown;

    for (const endpoint of urls) {
      try {
        return await this.tryNegotiate(endpoint);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Failed to negotiate SignalR connection.');
  }

  private async tryNegotiate(endpoint: string): Promise<{ url: string; accessToken: string }> {
    const headersForPost = await this.buildHeaders(true);
    try {
      return await firstValueFrom(
        this.http.post<{ url: string; accessToken: string }>(endpoint, {}, { headers: headersForPost })
      );
    } catch (postError) {
      const headersForGet = await this.buildHeaders(false);
      return await firstValueFrom(
        this.http.get<{ url: string; accessToken: string }>(endpoint, { headers: headersForGet })
      );
    }
  }

  private async buildHeaders(includeContentType: boolean): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    });

    const token = await this.auth.getAccessToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private resolveNegotiateUrls(): string[] {
    const base = environment.apiUrl?.replace(/\/$/, '') || '';
    const query = '?negotiateVersion=1';
    const absolute = base ? `${base}/deployments/signalr/negotiate${query}` : '';
    const urls: string[] = [];
    if (absolute) urls.push(absolute);
    urls.push(`/api/deployments/signalr/negotiate${query}`);
    return urls;
  }

  private async rejoinGroups(hub: signalR.HubConnection): Promise<void> {
    for (const deploymentId of this.joinedDeployments) {
      try {
        if (hub.state === signalR.HubConnectionState.Connected) {
          await hub.invoke('JoinDeployment', deploymentId);
        }
      } catch (error) {
        console.warn('Failed to rejoin deployment group', deploymentId, error);
      }
    }
  }
}
