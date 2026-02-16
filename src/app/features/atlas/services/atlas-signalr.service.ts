import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AtlasConfigService } from './atlas-config.service';
import { AtlasAuthService } from './atlas-auth.service';

/**
 * SignalR connection state
 */
export enum SignalRConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting',
  Disconnecting = 'Disconnecting'
}

/**
 * SignalR event subscription
 */
export interface SignalRSubscription {
  eventName: string;
  handler: (data: any) => void;
  subscriptionId: string;
}

/**
 * SignalR connection status
 */
export interface SignalRStatus {
  state: SignalRConnectionState;
  isConnected: boolean;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnectAttempts: number;
  error: string | null;
}

/**
 * ATLAS event types that can be received via SignalR
 */
export enum AtlasEventType {
  DeploymentCreated = 'DeploymentCreated',
  DeploymentUpdated = 'DeploymentUpdated',
  DeploymentDeleted = 'DeploymentDeleted',
  DeploymentStateTransitioned = 'DeploymentStateTransitioned',
  EvidenceSubmitted = 'EvidenceSubmitted',
  ApprovalRequested = 'ApprovalRequested',
  ApprovalDecisionRecorded = 'ApprovalDecisionRecorded',
  ExceptionCreated = 'ExceptionCreated',
  ExceptionApproved = 'ExceptionApproved',
  ExceptionDenied = 'ExceptionDenied',
  AnalysisCompleted = 'AnalysisCompleted',
  RiskAssessmentCompleted = 'RiskAssessmentCompleted',
  AgentExecutionCompleted = 'AgentExecutionCompleted'
}

/**
 * AtlasSignalRService
 * 
 * Manages real-time communication with ATLAS services using SignalR.
 * Provides persistent connection, automatic reconnection, event subscription,
 * and fallback to polling when SignalR is unavailable.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasSignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private subscriptions: Map<string, SignalRSubscription> = new Map();
  private destroy$ = new Subject<void>();
  
  private statusSubject = new BehaviorSubject<SignalRStatus>({
    state: SignalRConnectionState.Disconnected,
    isConnected: false,
    lastConnected: null,
    lastDisconnected: null,
    reconnectAttempts: 0,
    error: null
  });

  private lastEventTimestamp: Date | null = null;
  private pollingInterval: any = null;
  private readonly POLLING_INTERVAL_MS = 30000; // 30 seconds
  private isPollingFallbackActive = false;
  
  // Connectivity notification subject
  private connectivityNotification$ = new Subject<{ type: 'error' | 'warning' | 'info'; message: string }>();

  constructor(
    private configService: AtlasConfigService,
    private authService: AtlasAuthService,
    private store: Store
  ) {}

  /**
   * Get the current connection status as an observable
   */
  get status$(): Observable<SignalRStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Get connectivity notifications as an observable
   * Requirements: 6.8
   */
  get connectivityNotifications$(): Observable<{ type: 'error' | 'warning' | 'info'; message: string }> {
    return this.connectivityNotification$.asObservable();
  }

  /**
   * Get the current connection status synchronously
   */
  get status(): SignalRStatus {
    return this.statusSubject.value;
  }

  /**
   * Check if SignalR is connected
   */
  isConnected(): boolean {
    return this.statusSubject.value.isConnected;
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): SignalRConnectionState {
    return this.statusSubject.value.state;
  }

  /**
   * Establish persistent connection to ATLAS SignalR hub
   * Requirements: 6.1, 6.6
   * 
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    // Check if ATLAS integration is enabled
    if (!this.configService.isEnabled()) {
      console.log('ATLAS integration is disabled, skipping SignalR connection');
      return;
    }

    // Check if already connected
    if (this.hubConnection && this.isConnected()) {
      console.log('SignalR already connected');
      return;
    }

    try {
      this.updateStatus({
        state: SignalRConnectionState.Connecting,
        isConnected: false,
        error: null
      });

      // Get SignalR endpoint from configuration
      const baseUrl = this.configService.getBaseUrl();
      const signalRPath = this.configService.config.endpoints.signalR;
      const hubUrl = `${baseUrl}${signalRPath}`;

      console.log(`Connecting to ATLAS SignalR hub at: ${hubUrl}`);

      // Get authentication token (Requirement 6.6)
      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) {
        throw new Error('No ATLAS access token available for SignalR authentication');
      }

      // Build SignalR connection with authentication (Requirement 6.6)
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: async () => {
            // Get fresh token on each request
            const token = await this.authService.getAccessToken();
            return token || '';
          },
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 10s, 30s, then 60s
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount === 3) return 30000;
            return 60000;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up connection lifecycle handlers
      this.setupConnectionHandlers();

      // Start the connection (Requirement 6.1)
      await this.hubConnection.start();

      this.updateStatus({
        state: SignalRConnectionState.Connected,
        isConnected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0,
        error: null
      });

      // Stop polling fallback if it was active
      this.stopPollingFallback();

      console.log('SignalR connection established successfully');

      // Request missed events since last connection (Requirement 6.5)
      await this.requestMissedEvents();

    } catch (error: any) {
      console.error('Failed to establish SignalR connection:', error);
      
      this.updateStatus({
        state: SignalRConnectionState.Disconnected,
        isConnected: false,
        lastDisconnected: new Date(),
        error: error.message || 'Connection failed'
      });

      // Fall back to polling (Requirement 6.10)
      this.startPollingFallback();

      throw error;
    }
  }

  /**
   * Disconnect from SignalR hub and unsubscribe from all channels
   * Requirements: 6.7
   */
  async disconnect(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    try {
      this.updateStatus({
        state: SignalRConnectionState.Disconnecting,
        isConnected: false
      });

      // Unsubscribe from all channels (Requirement 6.7)
      this.unsubscribeAll();

      // Stop the connection
      await this.hubConnection.stop();

      this.hubConnection = null;

      this.updateStatus({
        state: SignalRConnectionState.Disconnected,
        isConnected: false,
        lastDisconnected: new Date(),
        error: null
      });

      // Stop polling fallback
      this.stopPollingFallback();

      console.log('SignalR disconnected successfully');
    } catch (error: any) {
      console.error('Error during SignalR disconnect:', error);
      
      this.updateStatus({
        state: SignalRConnectionState.Disconnected,
        isConnected: false,
        lastDisconnected: new Date(),
        error: error.message || 'Disconnect error'
      });
    }
  }

  /**
   * Subscribe to a specific ATLAS event channel
   * Requirements: 6.2, 6.9
   * 
   * @param eventName - The event name to subscribe to
   * @param handler - Callback function to handle received events
   * @returns Subscription ID for later unsubscription
   */
  subscribe(eventName: string, handler: (data: any) => void): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: SignalRSubscription = {
      eventName,
      handler,
      subscriptionId
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Register handler with SignalR hub if connected
    if (this.hubConnection && this.isConnected()) {
      this.hubConnection.on(eventName, (data: any) => {
        this.handleEvent(eventName, data);
      });
    }

    console.log(`Subscribed to ATLAS event: ${eventName} (ID: ${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific event subscription
   * 
   * @param subscriptionId - The subscription ID to unsubscribe
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      console.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Remove handler from SignalR hub if connected
    if (this.hubConnection && this.isConnected()) {
      this.hubConnection.off(subscription.eventName);
    }

    this.subscriptions.delete(subscriptionId);

    console.log(`Unsubscribed from ATLAS event: ${subscription.eventName} (ID: ${subscriptionId})`);
  }

  /**
   * Unsubscribe from all event subscriptions
   * Requirements: 6.7
   */
  unsubscribeAll(): void {
    if (this.hubConnection) {
      // Remove all handlers from SignalR hub
      this.subscriptions.forEach((subscription) => {
        this.hubConnection?.off(subscription.eventName);
      });
    }

    this.subscriptions.clear();

    console.log('Unsubscribed from all ATLAS events');
  }

  /**
   * Set up connection lifecycle event handlers
   * Requirements: 6.4, 6.7, 6.8
   */
  private setupConnectionHandlers(): void {
    if (!this.hubConnection) {
      return;
    }

    // Handle reconnecting event (Requirement 6.4)
    this.hubConnection.onreconnecting((error) => {
      console.warn('SignalR reconnecting...', error);
      
      const currentStatus = this.statusSubject.value;
      this.updateStatus({
        state: SignalRConnectionState.Reconnecting,
        isConnected: false,
        reconnectAttempts: currentStatus.reconnectAttempts + 1,
        error: error?.message || 'Connection lost, reconnecting...'
      });

      // Notify users of connectivity issues (Requirement 6.8)
      this.connectivityNotification$.next({
        type: 'warning',
        message: 'Connection to ATLAS lost. Attempting to reconnect...'
      });
    });

    // Handle reconnected event (Requirement 6.4, 6.5)
    this.hubConnection.onreconnected(async (connectionId) => {
      console.log('SignalR reconnected successfully', connectionId);
      
      this.updateStatus({
        state: SignalRConnectionState.Connected,
        isConnected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0,
        error: null
      });

      // Notify users of successful reconnection (Requirement 6.8)
      this.connectivityNotification$.next({
        type: 'info',
        message: 'Connection to ATLAS restored successfully.'
      });

      // Re-subscribe to all event channels
      this.resubscribeAll();

      // Request missed events since last connection (Requirement 6.5)
      await this.requestMissedEvents();

      // Stop polling fallback if it was active
      this.stopPollingFallback();
    });

    // Handle close event (Requirement 6.7, 6.8)
    this.hubConnection.onclose((error) => {
      console.error('SignalR connection closed', error);
      
      this.updateStatus({
        state: SignalRConnectionState.Disconnected,
        isConnected: false,
        lastDisconnected: new Date(),
        error: error?.message || 'Connection closed'
      });

      // Notify users of connection closure (Requirement 6.8)
      if (error) {
        this.connectivityNotification$.next({
          type: 'error',
          message: `Connection to ATLAS closed: ${error.message}. Falling back to polling.`
        });
      }

      // Fall back to polling (Requirement 6.10)
      this.startPollingFallback();
    });
  }

  /**
   * Re-subscribe to all event channels after reconnection
   * Requirements: 6.4
   */
  private resubscribeAll(): void {
    if (!this.hubConnection || !this.isConnected()) {
      return;
    }

    this.subscriptions.forEach((subscription) => {
      this.hubConnection?.on(subscription.eventName, (data: any) => {
        this.handleEvent(subscription.eventName, data);
      });
    });

    console.log(`Re-subscribed to ${this.subscriptions.size} ATLAS event channels`);
  }

  /**
   * Request missed events since last connection
   * Requirements: 6.5
   */
  private async requestMissedEvents(): Promise<void> {
    if (!this.hubConnection || !this.isConnected()) {
      return;
    }

    try {
      if (this.lastEventTimestamp) {
        console.log(`Requesting missed events since ${this.lastEventTimestamp.toISOString()}`);
        
        // Invoke server method to get missed events
        await this.hubConnection.invoke('GetMissedEvents', this.lastEventTimestamp.toISOString());
      }
    } catch (error) {
      console.error('Failed to request missed events:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  /**
   * Handle received event and dispatch to NgRx store
   * Requirements: 6.3
   * 
   * @param eventName - The event name
   * @param data - The event data
   */
  private handleEvent(eventName: string, data: any): void {
    console.log(`Received ATLAS event: ${eventName}`, data);

    // Update last event timestamp
    this.lastEventTimestamp = new Date();

    // Find all subscriptions for this event
    const handlers: ((data: any) => void)[] = [];
    this.subscriptions.forEach((subscription) => {
      if (subscription.eventName === eventName) {
        handlers.push(subscription.handler);
      }
    });

    // Call all handlers
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });

    // Dispatch to NgRx store based on event type (Requirement 6.3)
    this.dispatchEventToStore(eventName, data);
  }

  /**
   * Dispatch event to NgRx store
   * Requirements: 6.3
   * 
   * @param eventName - The event name
   * @param data - The event data
   */
  private dispatchEventToStore(eventName: string, data: any): void {
    try {
      // Import actions dynamically to avoid circular dependencies
      // The actual action imports will be added when integrating with specific state slices
      
      switch (eventName) {
        case AtlasEventType.DeploymentCreated:
        case AtlasEventType.DeploymentUpdated:
        case AtlasEventType.DeploymentDeleted:
        case AtlasEventType.DeploymentStateTransitioned:
        case AtlasEventType.EvidenceSubmitted:
          // Dispatch deployment-related events
          this.dispatchDeploymentEvent(eventName, data);
          break;

        case AtlasEventType.ApprovalRequested:
        case AtlasEventType.ApprovalDecisionRecorded:
          // Dispatch approval-related events
          this.dispatchApprovalEvent(eventName, data);
          break;

        case AtlasEventType.ExceptionCreated:
        case AtlasEventType.ExceptionApproved:
        case AtlasEventType.ExceptionDenied:
          // Dispatch exception-related events
          this.dispatchExceptionEvent(eventName, data);
          break;

        case AtlasEventType.AnalysisCompleted:
        case AtlasEventType.RiskAssessmentCompleted:
          // Dispatch AI analysis events
          this.dispatchAIAnalysisEvent(eventName, data);
          break;

        case AtlasEventType.AgentExecutionCompleted:
          // Dispatch agent events
          this.dispatchAgentEvent(eventName, data);
          break;

        default:
          console.warn(`Unknown ATLAS event type: ${eventName}`);
      }
    } catch (error) {
      console.error(`Error dispatching event ${eventName} to store:`, error);
    }
  }

  /**
   * Dispatch deployment-related events to store
   * Requirements: 6.3
   */
  private dispatchDeploymentEvent(eventName: string, data: any): void {
    // Import deployment actions
    import('../state/deployments/deployment.actions').then((actions) => {
      switch (eventName) {
        case AtlasEventType.DeploymentCreated:
          this.store.dispatch(actions.loadDeploymentsSuccess({ 
            result: { items: [data], pagination: data.pagination || {} } 
          }));
          break;

        case AtlasEventType.DeploymentUpdated:
          // Reload the specific deployment to get latest data
          if (data.id) {
            this.store.dispatch(actions.loadDeploymentDetail({ id: data.id }));
          }
          break;

        case AtlasEventType.DeploymentDeleted:
          // Refresh the deployment list
          this.store.dispatch(actions.refreshDeployments());
          break;

        case AtlasEventType.DeploymentStateTransitioned:
          // Reload the deployment to reflect state change
          if (data.deploymentId) {
            this.store.dispatch(actions.loadDeploymentDetail({ id: data.deploymentId }));
          }
          break;

        case AtlasEventType.EvidenceSubmitted:
          // Reload the deployment to show new evidence
          if (data.deploymentId) {
            this.store.dispatch(actions.loadDeploymentDetail({ id: data.deploymentId }));
          }
          break;
      }
    }).catch(error => {
      console.error('Failed to import deployment actions:', error);
    });
  }

  /**
   * Dispatch approval-related events to store
   * Requirements: 6.3
   */
  private dispatchApprovalEvent(eventName: string, data: any): void {
    // Import approval actions
    import('../state/approvals/approval.actions').then((actions) => {
      switch (eventName) {
        case AtlasEventType.ApprovalRequested:
          // Reload pending approvals
          this.store.dispatch(actions.loadPendingApprovals({ deploymentId: data.deploymentId }));
          break;

        case AtlasEventType.ApprovalDecisionRecorded:
          // Reload approvals for the deployment
          if (data.deploymentId) {
            this.store.dispatch(actions.loadPendingApprovals({ deploymentId: data.deploymentId }));
          }
          break;
      }
    }).catch(error => {
      console.error('Failed to import approval actions:', error);
    });
  }

  /**
   * Dispatch exception-related events to store
   * Requirements: 6.3
   */
  private dispatchExceptionEvent(eventName: string, data: any): void {
    // Import exception actions
    import('../state/exceptions/exception.actions').then((actions) => {
      switch (eventName) {
        case AtlasEventType.ExceptionCreated:
        case AtlasEventType.ExceptionApproved:
        case AtlasEventType.ExceptionDenied:
          // Reload exceptions for the deployment
          if (data.deploymentId) {
            this.store.dispatch(actions.loadExceptions({ deploymentId: data.deploymentId }));
          }
          break;
      }
    }).catch(error => {
      console.error('Failed to import exception actions:', error);
    });
  }

  /**
   * Dispatch AI analysis events to store
   * Requirements: 6.3
   */
  private dispatchAIAnalysisEvent(eventName: string, data: any): void {
    // Import AI analysis actions
    import('../state/ai-analysis/ai-analysis.actions').then((actions) => {
      switch (eventName) {
        case AtlasEventType.AnalysisCompleted:
          if (data.deploymentId) {
            this.store.dispatch(actions.analyzeDeploymentSuccess({ 
              deploymentId: data.deploymentId,
              result: data 
            }));
          }
          break;

        case AtlasEventType.RiskAssessmentCompleted:
          if (data.deploymentId) {
            this.store.dispatch(actions.assessRiskSuccess({ 
              deploymentId: data.deploymentId,
              assessment: data 
            }));
          }
          break;
      }
    }).catch(error => {
      console.error('Failed to import AI analysis actions:', error);
    });
  }

  /**
   * Dispatch agent-related events to store
   * Requirements: 6.3
   */
  private dispatchAgentEvent(eventName: string, data: any): void {
    // Import agent actions
    import('../state/agents/agent.actions').then((actions) => {
      switch (eventName) {
        case AtlasEventType.AgentExecutionCompleted:
          // Reload agent performance data
          if (data.agentId) {
            this.store.dispatch(actions.loadPerformanceReport({ agentId: data.agentId }));
          }
          break;
      }
    }).catch(error => {
      console.error('Failed to import agent actions:', error);
    });
  }

  /**
   * Start polling fallback when SignalR is unavailable
   * Requirements: 6.10
   */
  private startPollingFallback(): void {
    if (this.isPollingFallbackActive) {
      return;
    }

    console.log('Starting polling fallback for ATLAS updates');
    this.isPollingFallbackActive = true;

    // Poll for updates at regular intervals
    this.pollingInterval = setInterval(() => {
      this.pollForUpdates();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Stop polling fallback
   * Requirements: 6.10
   */
  private stopPollingFallback(): void {
    if (!this.isPollingFallbackActive) {
      return;
    }

    console.log('Stopping polling fallback');
    this.isPollingFallbackActive = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll for updates when SignalR is unavailable
   * Requirements: 6.10
   */
  private pollForUpdates(): void {
    if (!this.configService.isEnabled()) {
      return;
    }

    console.log('Polling for ATLAS updates...');

    // Poll each subscribed event type
    const eventTypes = new Set<string>();
    this.subscriptions.forEach((subscription) => {
      eventTypes.add(subscription.eventName);
    });

    // For each event type, poll for updates
    eventTypes.forEach((eventType) => {
      this.pollEventType(eventType);
    });
  }

  /**
   * Poll for a specific event type
   * Requirements: 6.10
   * 
   * @param eventType - The event type to poll for
   */
  private async pollEventType(eventType: string): Promise<void> {
    try {
      // Determine which service to poll based on event type
      switch (eventType) {
        case AtlasEventType.DeploymentCreated:
        case AtlasEventType.DeploymentUpdated:
        case AtlasEventType.DeploymentDeleted:
        case AtlasEventType.DeploymentStateTransitioned:
        case AtlasEventType.EvidenceSubmitted:
          await this.pollDeployments();
          break;

        case AtlasEventType.ApprovalRequested:
        case AtlasEventType.ApprovalDecisionRecorded:
          await this.pollApprovals();
          break;

        case AtlasEventType.ExceptionCreated:
        case AtlasEventType.ExceptionApproved:
        case AtlasEventType.ExceptionDenied:
          await this.pollExceptions();
          break;

        case AtlasEventType.AnalysisCompleted:
        case AtlasEventType.RiskAssessmentCompleted:
          // AI analysis is typically on-demand, no polling needed
          break;

        case AtlasEventType.AgentExecutionCompleted:
          // Agent execution is typically on-demand, no polling needed
          break;

        default:
          console.warn(`No polling implementation for event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`Error polling for ${eventType}:`, error);
    }
  }

  /**
   * Poll for deployment updates
   * Requirements: 6.10
   */
  private async pollDeployments(): Promise<void> {
    try {
      // Dispatch action to refresh deployments
      import('../state/deployments/deployment.actions').then((actions) => {
        this.store.dispatch(actions.refreshDeployments());
      });
    } catch (error) {
      console.error('Error polling deployments:', error);
    }
  }

  /**
   * Poll for approval updates
   * Requirements: 6.10
   */
  private async pollApprovals(): Promise<void> {
    try {
      // Dispatch action to refresh approvals
      import('../state/approvals/approval.actions').then((actions) => {
        // Refresh user approvals
        this.store.dispatch(actions.loadUserApprovals({ page: 1, pageSize: 50 }));
      });
    } catch (error) {
      console.error('Error polling approvals:', error);
    }
  }

  /**
   * Poll for exception updates
   * Requirements: 6.10
   */
  private async pollExceptions(): Promise<void> {
    try {
      // Dispatch action to refresh exceptions
      import('../state/exceptions/exception.actions').then((actions) => {
        // This would need a deploymentId - for now just log
        console.log('Would poll exceptions for active deployments');
      });
    } catch (error) {
      console.error('Error polling exceptions:', error);
    }
  }

  /**
   * Update connection status
   * 
   * @param updates - Partial status updates
   */
  private updateStatus(updates: Partial<SignalRStatus>): void {
    const currentStatus = this.statusSubject.value;
    this.statusSubject.next({
      ...currentStatus,
      ...updates
    });
  }

  /**
   * Generate a unique subscription ID
   * 
   * @returns Subscription ID
   */
  private generateSubscriptionId(): string {
    return 'sub_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }

  /**
   * Clean up on service destruction
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Disconnect from SignalR
    this.disconnect();
  }
}
