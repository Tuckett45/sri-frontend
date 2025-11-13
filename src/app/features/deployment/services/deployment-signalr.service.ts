import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ToastrService } from 'ngx-toastr';
import { DeploymentFeatureFlagsService } from './deployment-feature-flags.service';
import { DeploymentPushNotificationService } from './deployment-push-notification.service';
import { environment } from 'src/environments/environments';

export interface DeploymentNotification {
  type: 'assigned' | 'ready_for_signoff' | 'signoff_recorded' | 'issues' | 'issue_created' | 
        'issue_updated' | 'issue_resolved' | 'phase_advanced' | 'evidence_added' | 'completed';
  deploymentId: string;
  deploymentName: string;
  message: string;
  timestamp: Date;
  userId?: string;
  role?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  data?: any; // Additional context data
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentSignalRService {
  private readonly toastr = inject(ToastrService);
  private readonly featureFlags = inject(DeploymentFeatureFlagsService);
  private readonly pushNotifications = inject(DeploymentPushNotificationService);

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
   * Set up SignalR event handlers for ALL ARK deployment events
   */
  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // ===========================
    // Role-Based Workflow Events (Run Book v7)
    // ===========================

    // Handle deployment assigned
    this.hubConnection.on('DeploymentAssigned', (data: any) => {
      this.handleNotification({
        type: 'assigned',
        deploymentId: data.deploymentId,
        deploymentName: data.deploymentName,
        message: `You have been assigned to deployment in ${data.dataCenter}`,
        timestamp: new Date(data.timestamp),
        userId: data.assignedTo,
        role: data.role,
        priority: 'high',
        data
      });
    });

    // Handle role assigned
    this.hubConnection.on('RoleAssigned', (data: any) => {
      this.handleNotification({
        type: 'assigned',
        deploymentId: data.deploymentId,
        deploymentName: data.deploymentName,
        message: `Your role has been updated for this deployment`,
        timestamp: new Date(),
        userId: data.assignedTo,
        priority: 'medium',
        data
      });
    });

    // Handle ready for sign-off
    this.hubConnection.on('ReadyForSignOff', (data: any) => {
      this.handleNotification({
        type: 'ready_for_signoff',
        deploymentId: data.deploymentId,
        deploymentName: data.deploymentName,
        message: `Deployment is ready for your sign-off (${data.pendingFrom})`,
        timestamp: new Date(data.timestamp),
        priority: 'critical',
        data
      });
    });

    // Handle sign-off recorded
    this.hubConnection.on('SignOffRecorded', (data: any) => {
      this.handleNotification({
        type: 'signoff_recorded',
        deploymentId: data.deploymentId,
        deploymentName: data.deploymentName,
        message: `${data.signOffType} sign-off has been recorded`,
        timestamp: new Date(),
        priority: 'medium',
        data
      });
    });

    // Handle deployment completed (all sign-offs)
    this.hubConnection.on('DeploymentCompleted', (data: any) => {
      this.handleNotification({
        type: 'completed',
        deploymentId: data.deploymentId,
        deploymentName: data.deploymentName,
        message: `All sign-offs complete! 🎉`,
        timestamp: new Date(data.timestamp),
        priority: 'high',
        data
      });
    });

    // ===========================
    // Phase & Progress Events
    // ===========================

    // Handle phase advanced
    this.hubConnection.on('PhaseAdvanced', (data: any) => {
      this.handleNotification({
        type: 'phase_advanced',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Deployment advanced to phase ${data.toPhase}`,
        timestamp: new Date(),
        priority: 'medium',
        data
      });
    });

    // Handle checklist saved
    this.hubConnection.on('ChecklistSaved', (data: any) => {
      console.log('Checklist saved:', data);
      // Silent notification - no toast for checklist saves
    });

    // Handle sub-phase completed
    this.hubConnection.on('SubPhaseCompleted', (data: any) => {
      this.handleNotification({
        type: 'phase_advanced',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Sub-phase ${data.subCode} completed`,
        timestamp: new Date(),
        priority: 'low',
        data
      });
    });

    // Handle evidence added
    this.hubConnection.on('EvidenceAdded', (data: any) => {
      this.handleNotification({
        type: 'evidence_added',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `${data.mediaType} evidence added to phase ${data.phase}`,
        timestamp: new Date(),
        priority: 'low',
        data
      });
    });

    // ===========================
    // Issue Reporting Events
    // ===========================

    // Handle issue created
    this.hubConnection.on('IssueCreated', (data: any) => {
      this.handleNotification({
        type: 'issue_created',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `New ${data.priority} priority issue: ${data.title}`,
        timestamp: new Date(),
        priority: data.priority === 'Critical' ? 'critical' : 'high',
        data
      });
    });

    // Handle issue updated
    this.hubConnection.on('IssueUpdated', (data: any) => {
      this.handleNotification({
        type: 'issue_updated',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Issue status updated to ${data.status}`,
        timestamp: new Date(),
        priority: 'medium',
        data
      });
    });

    // Handle issue assigned
    this.hubConnection.on('IssueAssigned', (data: any) => {
      this.handleNotification({
        type: 'issue_updated',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Issue has been assigned to you`,
        timestamp: new Date(),
        priority: 'high',
        data
      });
    });

    // Handle issue resolved
    this.hubConnection.on('IssueResolved', (data: any) => {
      this.handleNotification({
        type: 'issue_resolved',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Issue resolved by ${data.resolvedBy}`,
        timestamp: new Date(),
        priority: 'medium',
        data
      });
    });

    // ===========================
    // Punch List Events
    // ===========================

    // Handle punch updated
    this.hubConnection.on('PunchUpdated', (data: any) => {
      console.log('Punch item updated:', data);
      // Silent notification - handled by punch list component
    });

    // ===========================
    // Handoff Events
    // ===========================

    // Handle handoff signed
    this.hubConnection.on('HandoffSigned', (data: any) => {
      this.handleNotification({
        type: 'signoff_recorded',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `${data.role} has signed off on handoff`,
        timestamp: new Date(),
        priority: 'high',
        data
      });
    });

    // Handle handoff archived
    this.hubConnection.on('HandoffArchived', (data: any) => {
      this.handleNotification({
        type: 'completed',
        deploymentId: data.deploymentId,
        deploymentName: '', // Backend should provide this
        message: `Deployment package archived`,
        timestamp: new Date(),
        priority: 'medium',
        data
      });
    });

    // ===========================
    // Connection State Events
    // ===========================

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
  private async handleNotification(notification: DeploymentNotification): Promise<void> {
    console.log('📬 Deployment notification received:', notification);

    // Add to notification list
    this.notifications.update(current => [notification, ...current].slice(0, 50)); // Keep last 50

    if (!this.featureFlags.areNotificationsEnabled()) {
      return;
    }

    // Show toast notification
    this.showToastNotification(notification);

    // Send push notification if supported and permission granted
    if (this.pushNotifications.isSupported() && 
        this.pushNotifications.permission === 'granted') {
      
      // Only send push for high/critical priority or if app is not visible
      const shouldSendPush = 
        notification.priority === 'high' || 
        notification.priority === 'critical' ||
        document.hidden; // App is in background

      if (shouldSendPush) {
        try {
          await this.pushNotifications.showLocalNotification({
            title: this.getNotificationTitle(notification.type),
            body: `${notification.deploymentName || 'Deployment'}: ${notification.message}`,
            tag: `deployment-${notification.deploymentId}`,
            data: {
              deploymentId: notification.deploymentId,
              type: notification.type,
              url: `/deployments/${notification.deploymentId}`
            },
            requireInteraction: notification.priority === 'critical'
          });
        } catch (error) {
          console.warn('Failed to send push notification:', error);
        }
      }
    }
  }

  /**
   * Show toast notification based on type and priority
   */
  private showToastNotification(notification: DeploymentNotification): void {
    const title = this.getNotificationTitle(notification.type);
    const message = notification.deploymentName 
      ? `${notification.deploymentName}: ${notification.message}`
      : notification.message;

    // Determine timeout based on priority
    const timeOut = notification.priority === 'critical' ? 15000 
      : notification.priority === 'high' ? 10000 
      : notification.priority === 'medium' ? 8000 
      : 6000;

    const options = { 
      timeOut, 
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right',
      enableHtml: true
    };

    // Show appropriate toast based on type
    switch (notification.type) {
      case 'assigned':
        this.toastr.info(message, title, options);
        break;
      
      case 'ready_for_signoff':
        this.toastr.warning(message, title, { ...options, timeOut: 15000 }); // Extra time for critical action
        break;
      
      case 'signoff_recorded':
        this.toastr.success(message, title, options);
        break;
      
      case 'completed':
        this.toastr.success(message, title, { ...options, timeOut: 10000 });
        break;
      
      case 'issue_created':
        this.toastr.warning(message, title, options);
        break;
      
      case 'issue_updated':
        this.toastr.info(message, title, options);
        break;
      
      case 'issue_resolved':
        this.toastr.success(message, title, options);
        break;
      
      case 'phase_advanced':
        this.toastr.info(message, title, { ...options, timeOut: 5000 });
        break;
      
      case 'evidence_added':
        this.toastr.info(message, title, { ...options, timeOut: 5000 });
        break;
      
      case 'issues': // Legacy
        this.toastr.warning(message, title, options);
        break;
      
      default:
        this.toastr.info(message, title, options);
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
        return '✍️ Ready for Sign-off';
      case 'signoff_recorded':
        return '✅ Sign-off Recorded';
      case 'completed':
        return '🎉 Deployment Complete';
      case 'issue_created':
        return '⚠️ New Issue';
      case 'issue_updated':
        return '🔄 Issue Updated';
      case 'issue_resolved':
        return '✅ Issue Resolved';
      case 'phase_advanced':
        return '🚀 Phase Advanced';
      case 'evidence_added':
        return '📸 Evidence Added';
      case 'issues': // Legacy
        return '⚠️ Deployment Issues';
      default:
        return '📬 Deployment Update';
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
