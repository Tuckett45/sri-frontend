import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as signalR from '@microsoft/signalr';
import { Assignment } from '../models/assignment.model';
import { Job, JobStatus } from '../models/job.model';
import { Notification } from '../models/notification.model';
import * as JobActions from '../state/jobs/job.actions';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import * as NotificationActions from '../state/notifications/notification.actions';

/**
 * Job status update event
 */
export interface JobStatusUpdate {
  job: Job;
}

/**
 * Job reassignment event
 */
export interface Reassignment {
  jobId: string;
  fromTechnicianId: string;
  toTechnicianId: string;
  reassignedBy: string;
  reassignedAt: Date;
  reason?: string;
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting'
}

/**
 * Service for managing SignalR real-time communication
 * Handles connection management, event subscriptions, and NgRx store integration
 */
@Injectable({
  providedIn: 'root'
})
export class FrmSignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000; // 1 second
  private subscribedTechnicians: Set<string> = new Set();

  constructor(private store: Store) {}

  /**
   * Establishes connection to the SignalR hub
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    if (this.hubConnection && this.connectionStatus === ConnectionStatus.Connected) {
      console.log('SignalR already connected');
      return;
    }

    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/field-resource-management', {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff with max delay of 30 seconds
            const delay = Math.min(
              this.baseReconnectDelay * Math.pow(2, retryContext.previousRetryCount),
              30000
            );
            return delay;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Set up connection lifecycle handlers
      this.hubConnection.onclose((error) => {
        this.connectionStatus = ConnectionStatus.Disconnected;
        console.error('SignalR connection closed', error);
        this.attemptReconnect();
      });

      this.hubConnection.onreconnecting((error) => {
        this.connectionStatus = ConnectionStatus.Reconnecting;
        console.warn('SignalR reconnecting', error);
      });

      this.hubConnection.onreconnected((connectionId) => {
        this.connectionStatus = ConnectionStatus.Connected;
        this.reconnectAttempts = 0;
        console.log('SignalR reconnected', connectionId);
        
        // Resubscribe to technician updates
        this.resubscribeToTechnicians();
      });

      // Start connection
      await this.hubConnection.start();
      this.connectionStatus = ConnectionStatus.Connected;
      this.reconnectAttempts = 0;
      console.log('SignalR connected successfully');
    } catch (error) {
      this.connectionStatus = ConnectionStatus.Disconnected;
      console.error('SignalR connection failed', error);
      this.attemptReconnect();
      throw error;
    }
  }

  /**
   * Disconnects from the SignalR hub
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.connectionStatus = ConnectionStatus.Disconnected;
        this.subscribedTechnicians.clear();
        console.log('SignalR disconnected');
      } catch (error) {
        console.error('Error disconnecting SignalR', error);
        throw error;
      }
    }
  }

  /**
   * Gets the current connection status
   * @returns Current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Subscribes to updates for a specific technician
   * @param technicianId Technician ID
   */
  subscribeToTechnicianUpdates(technicianId: string): void {
    if (this.hubConnection && this.connectionStatus === ConnectionStatus.Connected) {
      this.hubConnection.invoke('SubscribeToTechnicianUpdates', technicianId)
        .then(() => {
          this.subscribedTechnicians.add(technicianId);
          console.log(`Subscribed to updates for technician ${technicianId}`);
        })
        .catch(error => {
          console.error(`Error subscribing to technician ${technicianId}`, error);
        });
    }
  }

  /**
   * Unsubscribes from updates for a specific technician
   * @param technicianId Technician ID
   */
  unsubscribeFromTechnicianUpdates(technicianId: string): void {
    if (this.hubConnection && this.connectionStatus === ConnectionStatus.Connected) {
      this.hubConnection.invoke('UnsubscribeFromTechnicianUpdates', technicianId)
        .then(() => {
          this.subscribedTechnicians.delete(technicianId);
          console.log(`Unsubscribed from updates for technician ${technicianId}`);
        })
        .catch(error => {
          console.error(`Error unsubscribing from technician ${technicianId}`, error);
        });
    }
  }

  /**
   * Registers a callback for job assigned events
   * @param callback Callback function to handle job assigned events
   */
  onJobAssigned(callback: (assignment: Assignment) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('JobAssigned', callback);
    }
  }

  /**
   * Registers a callback for job status changed events
   * @param callback Callback function to handle job status changed events
   */
  onJobStatusChanged(callback: (update: JobStatusUpdate) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('JobStatusChanged', callback);
    }
  }

  /**
   * Registers a callback for job reassigned events
   * @param callback Callback function to handle job reassigned events
   */
  onJobReassigned(callback: (reassignment: Reassignment) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('JobReassigned', callback);
    }
  }

  /**
   * Registers a callback for notification events
   * @param callback Callback function to handle notification events
   */
  onNotification(callback: (notification: Notification) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('Notification', callback);
    }
  }

  /**
   * Sets up event handlers that dispatch actions to NgRx store
   */
  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Job assigned event
    this.hubConnection.on('JobAssigned', (assignment: Assignment) => {
      console.log('Job assigned event received', assignment);
      this.store.dispatch(AssignmentActions.assignTechnicianSuccess({ assignment }));
    });

    // Job status changed event
    this.hubConnection.on('JobStatusChanged', (update: JobStatusUpdate) => {
      console.log('Job status changed event received', update);
      this.store.dispatch(JobActions.updateJobStatusSuccess({ 
        job: update.job
      }));
    });

    // Job reassigned event
    this.hubConnection.on('JobReassigned', (reassignment: Reassignment) => {
      console.log('Job reassigned event received', reassignment);
      // Note: In a real implementation, we'd need the full Assignment object from the server
      // For now, we'll just reload assignments
      this.store.dispatch(AssignmentActions.loadAssignments({ jobId: reassignment.jobId }));
    });

    // Notification event
    this.hubConnection.on('Notification', (notification: Notification) => {
      console.log('Notification event received', notification);
      this.store.dispatch(NotificationActions.addNotification({ notification }));
    });
  }

  /**
   * Attempts to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectAttempts++;
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect attempt failed', error);
      });
    }, delay);
  }

  /**
   * Resubscribes to all previously subscribed technicians after reconnection
   */
  private resubscribeToTechnicians(): void {
    this.subscribedTechnicians.forEach(technicianId => {
      this.subscribeToTechnicianUpdates(technicianId);
    });
  }
}
