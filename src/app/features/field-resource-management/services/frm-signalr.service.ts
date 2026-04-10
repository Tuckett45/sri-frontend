import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { Assignment, AssignmentStatus } from '../models/assignment.model';
import { Job, JobStatus } from '../models/job.model';
import { Notification, NotificationType } from '../models/notification.model';
import { GeoLocation } from '../models/time-entry.model';
import * as JobActions from '../state/jobs/job.actions';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import * as TechnicianActions from '../state/technicians/technician.actions';
import * as CrewActions from '../state/crews/crew.actions';
import * as NotificationActions from '../state/notifications/notification.actions';
import * as UIActions from '../state/ui/ui.actions';
import { local_environment } from '../../../../environments/environments';

/**
 * Location update event
 */
export interface LocationUpdate {
  technicianId: string;
  location: GeoLocation;
  timestamp: Date;
}

/**
 * Crew location update event
 */
export interface CrewLocationUpdate {
  crewId: string;
  location: GeoLocation;
  timestamp: Date;
}

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
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Disconnected);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000; // 1 second
  private readonly maxReconnectDelay = 30000; // 30 seconds
  private subscribedTechnicians: Set<string> = new Set();
  private manualDisconnect = false;
  private reconnectTimeoutId: any = null;
  private lastEventTimestamp: Date | null = null;
  private missedEventsRecoveryEnabled = true;

  // Event subjects for hub method subscriptions
  private locationUpdateSubject = new BehaviorSubject<LocationUpdate | null>(null);
  private crewLocationUpdateSubject = new BehaviorSubject<CrewLocationUpdate | null>(null);
  private jobAssignedSubject = new BehaviorSubject<Assignment | null>(null);
  private jobStatusChangedSubject = new BehaviorSubject<JobStatusUpdate | null>(null);
  private jobReassignedSubject = new BehaviorSubject<Reassignment | null>(null);
  private notificationSubject = new BehaviorSubject<Notification | null>(null);

  /**
   * Observable for monitoring connection status changes
   */
  public connectionStatus$: Observable<ConnectionStatus> = this.connectionStatusSubject.asObservable();

  /**
   * Observable stream of location update events
   */
  public locationUpdate$: Observable<LocationUpdate | null> = this.locationUpdateSubject.asObservable();

  /**
   * Observable stream of crew location update events
   */
  public crewLocationUpdate$: Observable<CrewLocationUpdate | null> = this.crewLocationUpdateSubject.asObservable();

  /**
   * Observable stream of job assigned events
   */
  public jobAssigned$: Observable<Assignment | null> = this.jobAssignedSubject.asObservable();

  /**
   * Observable stream of job status changed events
   */
  public jobStatusChanged$: Observable<JobStatusUpdate | null> = this.jobStatusChangedSubject.asObservable();

  /**
   * Observable stream of job reassigned events
   */
  public jobReassigned$: Observable<Reassignment | null> = this.jobReassignedSubject.asObservable();

  /**
   * Observable stream of notification events
   */
  public notification$: Observable<Notification | null> = this.notificationSubject.asObservable();

  constructor(private store: Store) {}

  /**
   * Triggers a full state synchronization after reconnection
   * Reloads all critical data to ensure consistency
   * Also requests missed events if enabled
   */
  syncStateAfterReconnection(): void {
    console.log('Syncing state after reconnection...');
    
    // Request missed events if we have a last event timestamp
    if (this.missedEventsRecoveryEnabled && this.lastEventTimestamp) {
      this.recoverMissedEvents(this.lastEventTimestamp)
        .then(() => {
          console.log('Missed events recovery completed');
        })
        .catch(error => {
          console.error('Failed to recover missed events, falling back to full reload', error);
          this.performFullStateReload();
        });
    } else {
      // No timestamp or recovery disabled, perform full reload
      this.performFullStateReload();
    }
  }

  /**
   * Recovers missed events since the last received event
   * @param lastEventTimestamp Timestamp of the last received event
   * @returns Promise that resolves when recovery is complete
   */
  private async recoverMissedEvents(lastEventTimestamp: Date): Promise<void> {
    console.log(`Recovering missed events since ${lastEventTimestamp.toISOString()}`);
    
    try {
      await this.requestEventSync(lastEventTimestamp);
      console.log('Missed events sync request sent successfully');
    } catch (error) {
      console.error('Error requesting missed events sync', error);
      throw error;
    }
  }

  /**
   * Performs a full state reload of all entities
   */
  private performFullStateReload(): void {
    console.log('Performing full state reload...');
    
    // Dispatch actions to reload all critical state
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    this.store.dispatch(AssignmentActions.loadAssignments({ filters: {} }));
    this.store.dispatch(CrewActions.loadCrews({ filters: {} }));
    
    console.log('State sync initiated - all entities will be reloaded');
  }

  /**
   * Establishes connection to the SignalR hub
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    if (this.hubConnection && this.connectionStatusSubject.value === ConnectionStatus.Connected) {
      console.log('SignalR already connected');
      return;
    }

    this.manualDisconnect = false;
    
    // Clear any pending reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${local_environment.apiUrl}/hubs/field-resource-management`, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: delay = baseDelay * 2^attempt
            // Capped at maxReconnectDelay (30 seconds)
            const delay = Math.min(
              this.baseReconnectDelay * Math.pow(2, retryContext.previousRetryCount),
              this.maxReconnectDelay
            );
            console.log(`SignalR automatic reconnect attempt ${retryContext.previousRetryCount + 1}, delay: ${delay}ms`);
            return delay;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Set up connection lifecycle handlers
      this.hubConnection.onclose((error) => {
        this.updateConnectionStatus(ConnectionStatus.Disconnected);
        if (error) {
          console.error('SignalR connection closed with error', error);
          this.store.dispatch(UIActions.connectionLost({ 
            error: error.message 
          }));
        } else {
          console.log('SignalR connection closed');
          this.store.dispatch(UIActions.connectionLost({}));
        }
        
        // Only attempt manual reconnect if not manually disconnected and max attempts not reached
        if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Connection abandoned.`);
          this.store.dispatch({ 
            type: '[SignalR] Max Reconnect Attempts Reached',
            payload: { attempts: this.reconnectAttempts }
          });
        }
      });

      this.hubConnection.onreconnecting((error) => {
        this.updateConnectionStatus(ConnectionStatus.Reconnecting);
        if (error) {
          console.warn('SignalR reconnecting due to error', error);
          this.store.dispatch(UIActions.reconnecting({ 
            attempt: this.reconnectAttempts + 1 
          }));
        } else {
          console.log('SignalR reconnecting');
          this.store.dispatch(UIActions.reconnecting({ 
            attempt: this.reconnectAttempts + 1 
          }));
        }
      });

      this.hubConnection.onreconnected((connectionId) => {
        this.updateConnectionStatus(ConnectionStatus.Connected);
        this.reconnectAttempts = 0;
        console.log('SignalR reconnected successfully', connectionId);
        
        // Dispatch connection established action to UI state
        this.store.dispatch(UIActions.connectionEstablished());
        
        // Resubscribe to technician updates
        this.resubscribeToTechnicians();
        
        // Sync state after reconnection to ensure data consistency
        this.syncStateAfterReconnection();
        
        // Notify store to sync state after reconnection
        this.store.dispatch({ type: '[SignalR] Reconnected' });
      });

      // Start connection
      await this.hubConnection.start();
      this.updateConnectionStatus(ConnectionStatus.Connected);
      this.reconnectAttempts = 0;
      console.log('SignalR connected successfully');
      
      // Dispatch connection established action to UI state
      this.store.dispatch(UIActions.connectionEstablished());
    } catch (error) {
      this.updateConnectionStatus(ConnectionStatus.Disconnected);
      console.error('SignalR connection failed', error);
      
      // Dispatch connection lost action to UI state
      this.store.dispatch(UIActions.connectionLost({ 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }));
      
      // Attempt reconnect if not manually disconnected
      if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
      throw error;
    }
  }

  /**
   * Disconnects from the SignalR hub
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    
    // Clear any pending reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.updateConnectionStatus(ConnectionStatus.Disconnected);
        this.subscribedTechnicians.clear();
        this.reconnectAttempts = 0;
        
        // Clear all event subjects
        this.locationUpdateSubject.next(null);
        this.jobAssignedSubject.next(null);
        this.jobStatusChangedSubject.next(null);
        this.jobReassignedSubject.next(null);
        this.notificationSubject.next(null);
        
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
    return this.connectionStatusSubject.value;
  }

  /**
   * Checks if the connection is currently active
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connectionStatusSubject.value === ConnectionStatus.Connected;
  }

  /**
   * Subscribes to updates for a specific technician
   * @param technicianId Technician ID
   */
  subscribeToTechnicianUpdates(technicianId: string): void {
    if (this.hubConnection && this.isConnected()) {
      this.hubConnection.invoke('SubscribeToTechnicianUpdates', technicianId)
        .then(() => {
          this.subscribedTechnicians.add(technicianId);
          console.log(`Subscribed to updates for technician ${technicianId}`);
        })
        .catch(error => {
          console.error(`Error subscribing to technician ${technicianId}`, error);
        });
    } else {
      console.warn('Cannot subscribe: SignalR not connected');
    }
  }

  /**
   * Unsubscribes from updates for a specific technician
   * @param technicianId Technician ID
   */
  unsubscribeFromTechnicianUpdates(technicianId: string): void {
    if (this.hubConnection && this.isConnected()) {
      this.hubConnection.invoke('UnsubscribeFromTechnicianUpdates', technicianId)
        .then(() => {
          this.subscribedTechnicians.delete(technicianId);
          console.log(`Unsubscribed from updates for technician ${technicianId}`);
        })
        .catch(error => {
          console.error(`Error unsubscribing from technician ${technicianId}`, error);
        });
    } else {
      // Remove from local set even if not connected
      this.subscribedTechnicians.delete(technicianId);
    }
  }

  /**
   * Sends a location update to the server via SignalR
   * @param technicianId Technician ID
   * @param location Location data
   * @returns Promise that resolves when the update is sent
   */
  async sendLocationUpdate(technicianId: string, location: GeoLocation): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('UpdateLocation', technicianId, location);
        console.log(`Location update sent for technician ${technicianId}`);
      } catch (error) {
        console.error(`Error sending location update for technician ${technicianId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot send location update: SignalR not connected');
    }
  }

  /**
   * Accepts a job assignment via SignalR
   * @param assignmentId Assignment ID
   * @returns Promise that resolves when the acceptance is sent
   */
  async acceptAssignment(assignmentId: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('AcceptAssignment', assignmentId);
        console.log(`Assignment ${assignmentId} accepted`);
      } catch (error) {
        console.error(`Error accepting assignment ${assignmentId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot accept assignment: SignalR not connected');
    }
  }

  /**
   * Rejects a job assignment via SignalR
   * @param assignmentId Assignment ID
   * @param reason Rejection reason
   * @returns Promise that resolves when the rejection is sent
   */
  async rejectAssignment(assignmentId: string, reason?: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('RejectAssignment', assignmentId, reason);
        console.log(`Assignment ${assignmentId} rejected`);
      } catch (error) {
        console.error(`Error rejecting assignment ${assignmentId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot reject assignment: SignalR not connected');
    }
  }

  /**
   * Updates job status via SignalR
   * @param jobId Job ID
   * @param status New job status
   * @returns Promise that resolves when the update is sent
   */
  async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('UpdateJobStatus', jobId, status);
        console.log(`Job ${jobId} status updated to ${status}`);
      } catch (error) {
        console.error(`Error updating job status for ${jobId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot update job status: SignalR not connected');
    }
  }

  /**
   * Starts a job via SignalR
   * @param jobId Job ID
   * @param technicianId Technician ID starting the job
   * @returns Promise that resolves when the start is sent
   */
  async startJob(jobId: string, technicianId: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('StartJob', jobId, technicianId);
        console.log(`Job ${jobId} started by technician ${technicianId}`);
      } catch (error) {
        console.error(`Error starting job ${jobId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot start job: SignalR not connected');
    }
  }

  /**
   * Completes a job via SignalR
   * @param jobId Job ID
   * @param technicianId Technician ID completing the job
   * @param notes Optional completion notes
   * @returns Promise that resolves when the completion is sent
   */
  async completeJob(jobId: string, technicianId: string, notes?: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('CompleteJob', jobId, technicianId, notes);
        console.log(`Job ${jobId} completed by technician ${technicianId}`);
      } catch (error) {
        console.error(`Error completing job ${jobId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot complete job: SignalR not connected');
    }
  }

  /**
   * Sends a notification to specific users via SignalR
   * @param userIds Array of user IDs to notify
   * @param notification Notification data
   * @returns Promise that resolves when the notification is sent
   */
  async sendNotification(userIds: string[], notification: Notification): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('SendNotification', userIds, notification);
        console.log(`Notification sent to ${userIds.length} users`);
      } catch (error) {
        console.error('Error sending notification', error);
        throw error;
      }
    } else {
      throw new Error('Cannot send notification: SignalR not connected');
    }
  }

  /**
   * Broadcasts a notification to all users in a market via SignalR
   * @param market Market identifier
   * @param notification Notification data
   * @returns Promise that resolves when the broadcast is sent
   */
  async broadcastToMarket(market: string, notification: Notification): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('BroadcastToMarket', market, notification);
        console.log(`Notification broadcast to market ${market}`);
      } catch (error) {
        console.error(`Error broadcasting to market ${market}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot broadcast to market: SignalR not connected');
    }
  }

  /**
   * Updates crew location via SignalR
   * @param crewId Crew ID
   * @param location Location data
   * @returns Promise that resolves when the update is sent
   */
  async updateCrewLocation(crewId: string, location: GeoLocation): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('UpdateCrewLocation', crewId, location);
        console.log(`Crew location updated for crew ${crewId}`);
      } catch (error) {
        console.error(`Error updating crew location for ${crewId}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot update crew location: SignalR not connected');
    }
  }

  /**
   * Requests a sync of missed events after reconnection
   * @param lastEventTimestamp Timestamp of the last received event
   * @returns Promise that resolves when the sync request is sent
   */
  async requestEventSync(lastEventTimestamp: Date): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('RequestEventSync', lastEventTimestamp);
        console.log(`Event sync requested from ${lastEventTimestamp}`);
      } catch (error) {
        console.error('Error requesting event sync', error);
        throw error;
      }
    } else {
      throw new Error('Cannot request event sync: SignalR not connected');
    }
  }

  /**
   * Joins a market group for receiving market-specific updates
   * @param market Market identifier
   * @returns Promise that resolves when joined
   */
  async joinMarketGroup(market: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('JoinMarketGroup', market);
        console.log(`Joined market group: ${market}`);
      } catch (error) {
        console.error(`Error joining market group ${market}`, error);
        throw error;
      }
    } else {
      throw new Error('Cannot join market group: SignalR not connected');
    }
  }

  /**
   * Leaves a market group
   * @param market Market identifier
   * @returns Promise that resolves when left
   */
  async leaveMarketGroup(market: string): Promise<void> {
    if (this.hubConnection && this.isConnected()) {
      try {
        await this.hubConnection.invoke('LeaveMarketGroup', market);
        console.log(`Left market group: ${market}`);
      } catch (error) {
        console.error(`Error leaving market group ${market}`, error);
        throw error;
      }
    } else {
      console.warn(`Cannot leave market group ${market}: SignalR not connected`);
    }
  }

  /**
   * Enables or disables missed event recovery
   * @param enabled Whether to enable missed event recovery
   */
  setMissedEventRecoveryEnabled(enabled: boolean): void {
    this.missedEventsRecoveryEnabled = enabled;
    console.log(`Missed event recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Gets the timestamp of the last received event
   * @returns Last event timestamp or null if no events received
   */
  getLastEventTimestamp(): Date | null {
    return this.lastEventTimestamp;
  }

  /**
   * Manually triggers missed event recovery from a specific timestamp
   * @param fromTimestamp Timestamp to recover events from
   * @returns Promise that resolves when recovery is complete
   */
  async triggerMissedEventRecovery(fromTimestamp: Date): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Cannot trigger missed event recovery: SignalR not connected');
    }

    console.log(`Manually triggering missed event recovery from ${fromTimestamp.toISOString()}`);
    await this.recoverMissedEvents(fromTimestamp);
  }

  /**
   * Registers a callback for location update events
   * @param callback Callback function to handle location update events
   */
  onLocationUpdate(callback: (update: LocationUpdate) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('LocationUpdate', callback);
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

    // Location update event
    this.hubConnection.on('LocationUpdate', (update: LocationUpdate) => {
      console.log('Location update event received', update);
      
      // Validate update structure
      if (!update || !update.technicianId || !update.location) {
        console.error('Invalid location update received', update);
        return;
      }

      // Validate location coordinates
      if (
        typeof update.location.latitude !== 'number' ||
        typeof update.location.longitude !== 'number' ||
        update.location.latitude < -90 ||
        update.location.latitude > 90 ||
        update.location.longitude < -180 ||
        update.location.longitude > 180
      ) {
        console.error('Invalid location coordinates in update', update);
        return;
      }

      // Update last event timestamp
      this.updateLastEventTimestamp(update.timestamp);

      // Emit through observable for subscribers
      this.locationUpdateSubject.next(update);
      
      // Dispatch to NgRx store to update technician location
      this.store.dispatch(TechnicianActions.updateTechnicianLocationSuccess({
        technicianId: update.technicianId,
        location: update.location
      }));
      
      console.log(`Location updated for technician ${update.technicianId}`, {
        latitude: update.location.latitude,
        longitude: update.location.longitude,
        timestamp: update.timestamp
      });
    });

    // Job assigned event
    this.hubConnection.on('JobAssigned', (assignment: Assignment) => {
      console.log('Job assigned event received', assignment);
      
      // Update last event timestamp
      this.updateLastEventTimestamp(assignment.assignedAt);
      
      this.jobAssignedSubject.next(assignment);
      this.store.dispatch(AssignmentActions.assignTechnicianSuccess({ assignment }));
    });

    // Job status changed event
    this.hubConnection.on('JobStatusChanged', (update: JobStatusUpdate) => {
      console.log('Job status changed event received', update);
      this.jobStatusChangedSubject.next(update);
      this.store.dispatch(JobActions.updateJobStatusSuccess({ 
        job: update.job
      }));
    });

    // Job reassigned event
    this.hubConnection.on('JobReassigned', (reassignment: Reassignment) => {
      console.log('Job reassigned event received', reassignment);
      this.jobReassignedSubject.next(reassignment);
      // Reload assignments with filters to get updated data
      this.store.dispatch(AssignmentActions.loadAssignments({ 
        filters: { jobId: reassignment.jobId } 
      }));
    });

    // Notification event
    this.hubConnection.on('Notification', (notification: Notification) => {
      console.log('Notification event received', notification);
      this.notificationSubject.next(notification);
      this.store.dispatch(NotificationActions.addNotification({ notification }));
    });

    // Assignment created event
    this.hubConnection.on('AssignmentCreated', (assignment: Assignment) => {
      console.log('Assignment created event received', assignment);
      
      // Validate assignment structure
      if (!assignment || !assignment.id || !assignment.jobId || !assignment.technicianId) {
        console.error('Invalid assignment received', assignment);
        return;
      }

      // Validate required fields
      if (!assignment.assignedBy || !assignment.assignedAt) {
        console.error('Assignment missing required fields', assignment);
        return;
      }

      // Update last event timestamp
      this.updateLastEventTimestamp(assignment.assignedAt);

      // Emit through observable for subscribers
      this.jobAssignedSubject.next(assignment);
      
      // Dispatch to NgRx store to add assignment
      this.store.dispatch(AssignmentActions.assignTechnicianSuccess({ assignment }));
      
      // Dispatch notification for the assigned technician
      const notification: Notification = {
        id: `assignment-${assignment.id}`,
        type: NotificationType.JobAssignment,
        message: `You have been assigned to a new job`,
        isRead: false,
        createdAt: new Date(),
        timestamp: new Date(),
        userId: assignment.technicianId,
        relatedEntityId: assignment.jobId,
        relatedEntityType: 'job',
        metadata: {
          assignmentId: assignment.id,
          assignedBy: assignment.assignedBy
        }
      };
      
      this.store.dispatch(NotificationActions.addNotification({ notification }));
      
      console.log(`Assignment created: ${assignment.id} for technician ${assignment.technicianId} on job ${assignment.jobId}`, {
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt
      });
    });

    // Assignment status changed event
    this.hubConnection.on('AssignmentStatusChanged', (assignment: Assignment) => {
      console.log('Assignment status changed event received', assignment);
      
      // Validate assignment structure
      if (!assignment || !assignment.id || !assignment.status) {
        console.error('Invalid assignment status change received - missing required fields', assignment);
        return;
      }

      // Validate status value against enum
      const validStatuses = Object.values(AssignmentStatus);
      if (!validStatuses.includes(assignment.status)) {
        console.error('Invalid assignment status value received', assignment);
        return;
      }

      // Dispatch to NgRx store to update assignment
      this.store.dispatch(AssignmentActions.updateAssignmentSuccess({ 
        assignment
      }));
      
      console.log(`Assignment status updated: ${assignment.id} to ${assignment.status}`, {
        jobId: assignment.jobId,
        technicianId: assignment.technicianId,
        status: assignment.status
      });
    });

    // Crew location update event
    this.hubConnection.on('CrewLocationUpdate', (update: { crewId: string; location: GeoLocation; timestamp: Date }) => {
      console.log('Crew location update event received', update);
      
      // Validate update structure
      if (!update || !update.crewId || !update.location) {
        console.error('Invalid crew location update received', update);
        return;
      }

      // Validate location coordinates
      if (
        typeof update.location.latitude !== 'number' ||
        typeof update.location.longitude !== 'number' ||
        update.location.latitude < -90 ||
        update.location.latitude > 90 ||
        update.location.longitude < -180 ||
        update.location.longitude > 180
      ) {
        console.error('Invalid location coordinates in crew update', update);
        return;
      }

      // Update last event timestamp
      this.updateLastEventTimestamp(update.timestamp);

      // Emit through observable for real-time subscribers
      this.crewLocationUpdateSubject.next({
        crewId: update.crewId,
        location: update.location,
        timestamp: update.timestamp
      });

      // Dispatch to NgRx store to update crew location
      this.store.dispatch(CrewActions.updateCrewLocationSuccess({ 
        crewId: update.crewId, 
        location: update.location 
      }));
      
      console.log(`Crew location updated: ${update.crewId}`, {
        latitude: update.location.latitude,
        longitude: update.location.longitude,
        timestamp: update.timestamp
      });
    });

    // Event sync response - handles missed events recovery
    this.hubConnection.on('EventSyncResponse', (response: { 
      events: any[]; 
      fromTimestamp: Date; 
      toTimestamp: Date;
      eventCount: number;
    }) => {
      console.log('Event sync response received', {
        eventCount: response.eventCount,
        fromTimestamp: response.fromTimestamp,
        toTimestamp: response.toTimestamp
      });
      
      if (!response.events || response.events.length === 0) {
        console.log('No missed events to recover');
        return;
      }

      // Process each missed event
      response.events.forEach((event: any) => {
        this.processMissedEvent(event);
      });

      console.log(`Processed ${response.events.length} missed events`);
    });
  }

  /**
   * Processes a single missed event from the event sync response
   * @param event The missed event to process
   */
  private processMissedEvent(event: any): void {
    if (!event || !event.type) {
      console.error('Invalid missed event received', event);
      return;
    }

    console.log(`Processing missed event: ${event.type}`, event);

    switch (event.type) {
      case 'LocationUpdate':
        if (event.data && event.data.technicianId && event.data.location) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(TechnicianActions.updateTechnicianLocationSuccess({
            technicianId: event.data.technicianId,
            location: event.data.location
          }));
        }
        break;

      case 'AssignmentCreated':
      case 'JobAssigned':
        if (event.data && event.data.id) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(AssignmentActions.assignTechnicianSuccess({ 
            assignment: event.data 
          }));
        }
        break;

      case 'AssignmentStatusChanged':
        if (event.data && event.data.id) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(AssignmentActions.updateAssignmentSuccess({ 
            assignment: event.data 
          }));
        }
        break;

      case 'JobStatusChanged':
        if (event.data && event.data.job) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(JobActions.updateJobStatusSuccess({ 
            job: event.data.job 
          }));
        }
        break;

      case 'JobReassigned':
        if (event.data && event.data.jobId) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(AssignmentActions.loadAssignments({ 
            filters: { jobId: event.data.jobId } 
          }));
        }
        break;

      case 'CrewLocationUpdate':
        if (event.data && event.data.crewId && event.data.location) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(CrewActions.updateCrewLocationSuccess({ 
            crewId: event.data.crewId, 
            location: event.data.location 
          }));
        }
        break;

      case 'Notification':
        if (event.data) {
          this.updateLastEventTimestamp(event.timestamp);
          this.store.dispatch(NotificationActions.addNotification({ 
            notification: event.data 
          }));
        }
        break;

      default:
        console.warn(`Unknown missed event type: ${event.type}`);
    }
  }

  /**
   * Updates the last event timestamp if the new timestamp is more recent
   * @param timestamp The timestamp to update to
   */
  private updateLastEventTimestamp(timestamp: Date | undefined): void {
    if (!timestamp) {
      return;
    }

    const eventDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    if (!this.lastEventTimestamp || eventDate > this.lastEventTimestamp) {
      this.lastEventTimestamp = eventDate;
      console.log(`Last event timestamp updated to: ${this.lastEventTimestamp.toISOString()}`);
    }
  }

  /**
   * Attempts to reconnect with exponential backoff
   * Uses formula: delay = baseDelay * 2^attempt, capped at maxDelay
   * 
   * Backoff sequence (in seconds):
   * - Attempt 1: 1s
   * - Attempt 2: 2s
   * - Attempt 3: 4s
   * - Attempt 4: 8s
   * - Attempt 5: 16s
   * - Attempt 6+: 30s (capped)
   */
  private attemptReconnect(): void {
    if (this.manualDisconnect) {
      console.log('Manual disconnect - skipping reconnect attempt');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.store.dispatch({ 
        type: '[SignalR] Max Reconnect Attempts Reached',
        payload: { attempts: this.reconnectAttempts }
      });
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    this.updateConnectionStatus(ConnectionStatus.Reconnecting);
    
    // Dispatch reconnecting action to UI state
    this.store.dispatch(UIActions.reconnecting({ 
      attempt: this.reconnectAttempts 
    }));
    
    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    // Clear any existing timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    // Schedule reconnection attempt
    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectTimeoutId = null;
      
      try {
        console.log(`Executing reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        await this.connect();
        console.log('Reconnect attempt succeeded');
      } catch (error) {
        console.error(`Reconnect attempt ${this.reconnectAttempts} failed`, error);
        // The connect() method will trigger attemptReconnect() again if needed
      }
    }, delay);
  }

  /**
   * Updates connection status and notifies subscribers
   * @param status New connection status
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatusSubject.value !== status) {
      this.connectionStatusSubject.next(status);
      console.log(`SignalR connection status changed to: ${status}`);
    }
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
