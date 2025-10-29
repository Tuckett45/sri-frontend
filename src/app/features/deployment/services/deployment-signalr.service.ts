import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ToastrService } from 'ngx-toastr';
import { DeploymentFeatureFlagsService } from './deployment-feature-flags.service';
import { environment } from 'src/environments/environment';

export interface DeploymentNotification {
  type: 'assigned' | 'ready_for_signoff' | 'issues' | 'completed';
  deploymentId: string;
  deploymentName: string;
  message: string;
  timestamp: Date;
  userId?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentSignalRService {
  private readonly toastr = inject(ToastrService);
  private readonly featureFlags = inject(DeploymentFeatureFlagsService);

  private hubConnection: signalR.HubConnection | null = null;
  private readonly connectionState = signal<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  private readonly notifications = signal<DeploymentNotification[]>([]);

  /**
   * Get the current connection state
   */
  getConnectionState() {
    return this.connectionState.asReadonly();
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return this.notifications.asReadonly();
  }

  /**
   * Initialize SignalR connection for deployment notifications
   */
  async connect(userId: string): Promise<void> {
    if (!this.featureFlags.areNotificationsEnabled()) {
      console.log('Deployment notifications are disabled');
      return;
    }

    if (this.hubConnection) {
      console.log('SignalR connection already exists');
      return;
    }

    try {
      // Build the SignalR hub connection
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}/deploymentHub`, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
          accessTokenFactory: () => this.getAuthToken()
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: () => {
            // Exponential backoff: 0, 2, 10, 30 seconds, then 30 seconds
            return Math.min(1000 * Math.pow(2, this.getReconnectAttempts()), 30000);
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start the connection
      await this.hubConnection.start();
      this.connectionState.set(signalR.HubConnectionState.Connected);
      console.log('✅ Connected to Deployment SignalR Hub');

      // Join user's notification group
      await this.hubConnection.invoke('JoinUserGroup', userId);

    } catch (error) {
      console.error('❌ Failed to connect to Deployment SignalR Hub:', error);
      this.connectionState.set(signalR.HubConnectionState.Disconnected);
      throw error;
    }
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.hubConnection = null;
        this.connectionState.set(signalR.HubConnectionState.Disconnected);
        console.log('Disconnected from Deployment SignalR Hub');
      } catch (error) {
        console.error('Error disconnecting from SignalR hub:', error);
      }
    }
  }

  /**
   * Send a test notification (for debugging)
   */
  async sendTestNotification(deploymentId: string, message: string): Promise<void> {
    if (!this.hubConnection) {
      throw new Error('Not connected to SignalR hub');
    }

    try {
      await this.hubConnection.invoke('SendDeploymentNotification', {
        type: 'assigned',
        deploymentId,
        message,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.set([]);
  }

  /**
   * Set up SignalR event handlers
   */
  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Handle deployment assigned
    this.hubConnection.on('DeploymentAssigned', (notification: DeploymentNotification) => {
      this.handleNotification({
        ...notification,
        type: 'assigned',
        timestamp: new Date(notification.timestamp)
      });
    });

    // Handle ready for sign-off
    this.hubConnection.on('ReadyForSignOff', (notification: DeploymentNotification) => {
      this.handleNotification({
        ...notification,
        type: 'ready_for_signoff',
        timestamp: new Date(notification.timestamp)
      });
    });

    // Handle deployment issues
    this.hubConnection.on('DeploymentIssues', (notification: DeploymentNotification) => {
      this.handleNotification({
        ...notification,
        type: 'issues',
        timestamp: new Date(notification.timestamp)
      });
    });

    // Handle deployment completed
    this.hubConnection.on('DeploymentCompleted', (notification: DeploymentNotification) => {
      this.handleNotification({
        ...notification,
        type: 'completed',
        timestamp: new Date(notification.timestamp)
      });
    });

    // Handle reconnecting
    this.hubConnection.onreconnecting(() => {
      console.log('🔄 Reconnecting to Deployment SignalR Hub...');
      this.connectionState.set(signalR.HubConnectionState.Reconnecting);
    });

    // Handle reconnected
    this.hubConnection.onreconnected(() => {
      console.log('✅ Reconnected to Deployment SignalR Hub');
      this.connectionState.set(signalR.HubConnectionState.Connected);
      this.toastr.success('Reconnected to deployment notifications', 'Connected');
    });

    // Handle connection closed
    this.hubConnection.onclose((error) => {
      console.log('❌ Connection to Deployment SignalR Hub closed', error);
      this.connectionState.set(signalR.HubConnectionState.Disconnected);
      if (error) {
        this.toastr.error('Lost connection to deployment notifications', 'Disconnected');
      }
    });
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: DeploymentNotification): void {
    console.log('📬 Deployment notification received:', notification);

    // Add to notification list
    this.notifications.update(current => [notification, ...current].slice(0, 50)); // Keep last 50

    // Show toast notification if enabled
    if (this.featureFlags.areNotificationsEnabled()) {
      this.showToastNotification(notification);
    }
  }

  /**
   * Show toast notification based on type
   */
  private showToastNotification(notification: DeploymentNotification): void {
    const title = this.getNotificationTitle(notification.type);
    const message = `${notification.deploymentName}: ${notification.message}`;

    switch (notification.type) {
      case 'assigned':
        this.toastr.info(message, title, { timeOut: 8000 });
        break;
      case 'ready_for_signoff':
        this.toastr.success(message, title, { timeOut: 10000 });
        break;
      case 'issues':
        this.toastr.warning(message, title, { timeOut: 12000 });
        break;
      case 'completed':
        this.toastr.success(message, title, { timeOut: 8000 });
        break;
    }
  }

  /**
   * Get notification title based on type
   */
  private getNotificationTitle(type: DeploymentNotification['type']): string {
    switch (type) {
      case 'assigned':
        return '📋 Deployment Assigned';
      case 'ready_for_signoff':
        return '✅ Ready for Sign-off';
      case 'issues':
        return '⚠️ Deployment Issues';
      case 'completed':
        return '🎉 Deployment Complete';
      default:
        return 'Deployment Update';
    }
  }

  /**
   * Get auth token for SignalR connection
   */
  private getAuthToken(): string {
    // Get token from localStorage or auth service
    const token = localStorage.getItem('token') || '';
    return token;
  }

  /**
   * Get number of reconnect attempts (for exponential backoff)
   */
  private getReconnectAttempts(): number {
    // This would be tracked internally by SignalR's reconnect policy
    return 0;
  }
}

