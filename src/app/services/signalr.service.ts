import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { 
  ConnectionStatus, 
  LocationUpdate, 
  MarkerEvent, 
  MessageEvent, 
  StreetSheetEvent 
} from '../models/signalr-events.model';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | null = null;
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  });
  
  // Event subjects
  private locationUpdateSubject = new Subject<LocationUpdate>();
  private markerEventSubject = new Subject<MarkerEvent>();
  private messageEventSubject = new Subject<MessageEvent>();
  private streetSheetEventSubject = new Subject<StreetSheetEvent>();

  // Public observables
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public locationUpdates$ = this.locationUpdateSubject.asObservable();
  public markerEvents$ = this.markerEventSubject.asObservable();
  public messageEvents$ = this.messageEventSubject.asObservable();
  public streetSheetEvents$ = this.streetSheetEventSubject.asObservable();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    const token = this.getAuthToken();
    
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/map`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Exponential backoff: 0, 2, 10, 30 seconds, then 30 seconds
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        }
      })
      .configureLogging(LogLevel.Information)
      .build();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Connection events
    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed', error);
      this.updateConnectionStatus({
        isConnected: false,
        lastDisconnected: new Date(),
        reconnectAttempts: this.connectionStatusSubject.value.reconnectAttempts
      });
    });

    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting', error);
      const currentStatus = this.connectionStatusSubject.value;
      this.updateConnectionStatus({
        ...currentStatus,
        isConnected: false,
        reconnectAttempts: currentStatus.reconnectAttempts + 1
      });
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      this.updateConnectionStatus({
        isConnected: true,
        connectionId,
        lastConnected: new Date(),
        reconnectAttempts: 0
      });
    });

    // Map event handlers
    this.hubConnection.on('LocationUpdated', (data: LocationUpdate) => {
      this.locationUpdateSubject.next(data);
    });

    this.hubConnection.on('MarkerAdded', (data: MarkerEvent) => {
      this.markerEventSubject.next(data);
    });

    this.hubConnection.on('MarkerUpdated', (data: MarkerEvent) => {
      this.markerEventSubject.next(data);
    });

    this.hubConnection.on('MarkerRemoved', (data: MarkerEvent) => {
      this.markerEventSubject.next(data);
    });

    this.hubConnection.on('MessageReceived', (data: MessageEvent) => {
      this.messageEventSubject.next(data);
    });

    this.hubConnection.on('StreetSheetUpdated', (data: StreetSheetEvent) => {
      this.streetSheetEventSubject.next(data);
    });
  }

  public async startConnection(): Promise<void> {
    if (!this.hubConnection) {
      this.initializeConnection();
    }

    if (this.hubConnection?.state === 'Disconnected') {
      try {
        await this.hubConnection.start();
        console.log('SignalR connection started');
        
        this.updateConnectionStatus({
          isConnected: true,
          connectionId: this.hubConnection.connectionId || undefined,
          lastConnected: new Date(),
          reconnectAttempts: 0
        });
      } catch (error) {
        console.error('Error starting SignalR connection:', error);
        throw error;
      }
    }
  }

  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        console.log('SignalR connection stopped');
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
      }
    }
  }

  public async joinRegionGroup(region: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('JoinRegionGroup', region);
        console.log(`Joined region group: ${region}`);
      } catch (error) {
        console.error('Error joining region group:', error);
      }
    }
  }

  public async leaveRegionGroup(region: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('LeaveRegionGroup', region);
        console.log(`Left region group: ${region}`);
      } catch (error) {
        console.error('Error leaving region group:', error);
      }
    }
  }

  public async joinMarketGroup(market: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('JoinMarketGroup', market);
        console.log(`Joined market group: ${market}`);
      } catch (error) {
        console.error('Error joining market group:', error);
      }
    }
  }

  public async leaveMarketGroup(market: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('LeaveMarketGroup', market);
        console.log(`Left market group: ${market}`);
      } catch (error) {
        console.error('Error leaving market group:', error);
      }
    }
  }

  public async updateLocation(latitude: number, longitude: number, accuracy?: number): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('UpdateLocation', latitude, longitude, accuracy);
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }
  }

  public async sendMessage(message: string, targetType: string, targetId: string): Promise<void> {
    if (this.hubConnection?.state === 'Connected') {
      try {
        await this.hubConnection.invoke('SendMessage', message, targetType, targetId);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === 'Connected';
  }

  public getConnectionId(): string | null {
    return this.hubConnection?.connectionId || null;
  }

  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    const currentStatus = this.connectionStatusSubject.value;
    this.connectionStatusSubject.next({ ...currentStatus, ...status });
  }

  private getAuthToken(): string | null {
    // Get token from localStorage or your auth service
    // This should match your existing authentication implementation
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
