import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AtlasSignalRService } from './atlas-signalr.service';
import { AtlasAuthService } from './atlas-auth.service';
import { AtlasConfigService } from './atlas-config.service';
import {
  AtlasNotification,
  AtlasNotificationType,
  AtlasNotificationPriority,
  AtlasNotificationStatus,
  AtlasNotificationPreferences,
  AtlasNotificationFilters,
  AtlasConnectivityAlertType,
  AtlasHealthSeverity
} from '../models/atlas-notification.model';
import { DeploymentDto } from '../models/deployment.model';

/**
 * AtlasNotificationService
 * 
 * Manages ATLAS-specific notifications with real-time delivery via SignalR.
 * Handles deployment notifications, connectivity alerts, system health notifications,
 * evidence and approval notifications, and user notification management.
 * 
 * Requirements: 2.1, 2.5, 6.1, 6.2, 6.3
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasNotificationService {
  private readonly API_BASE = '/api/atlas/notifications';
  private subscriptions: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    private signalRService: AtlasSignalRService,
    private authService: AtlasAuthService,
    private configService: AtlasConfigService,
    private store: Store
  ) {
    this.initializeSignalRSubscriptions();
  }

  /**
   * Initialize SignalR subscriptions for real-time notifications
   * Requirements: 2.4, 6.4, 6.5
   */
  private initializeSignalRSubscriptions(): void {
    // Subscribe to notification events via SignalR
    if (this.signalRService.isConnected()) {
      this.setupSignalRHandlers();
    }

    // Listen for connection state changes to update delivery mechanism
    // Requirements: 6.4, 6.5
    this.signalRService.status$.subscribe(status => {
      if (status.isConnected) {
        console.log('SignalR connected - notifications will be delivered via SignalR');
        this.setupSignalRHandlers();
      } else {
        console.log('SignalR disconnected - notifications will fall back to HTTP polling');
      }
    });

    // Subscribe to connectivity notifications for alerts
    // Requirements: 6.2
    this.signalRService.connectivityNotifications$.subscribe(notification => {
      this.handleConnectivityNotification(notification);
    });
  }

  /**
   * Set up SignalR event handlers for notifications
   * Requirements: 2.4, 6.4
   */
  private setupSignalRHandlers(): void {
    // Subscribe to notification events
    const notificationSubscriptionId = this.signalRService.subscribe(
      'NotificationReceived',
      (notification: AtlasNotification) => {
        this.handleRealtimeNotification(notification);
      }
    );

    this.subscriptions.set('notifications', notificationSubscriptionId);
  }

  /**
   * Handle real-time notification received via SignalR
   * Requirements: 6.4
   */
  private handleRealtimeNotification(notification: AtlasNotification): void {
    console.log('Received real-time ATLAS notification:', notification);
    
    // Dispatch to store or emit to subscribers
    // This can be extended based on application needs
  }

  /**
   * Handle connectivity notifications from SignalR service
   * Requirements: 6.2, 6.5
   */
  private handleConnectivityNotification(notification: { type: 'error' | 'warning' | 'info'; message: string }): void {
    console.log('SignalR connectivity notification:', notification);
    
    // Only send connectivity alerts for error types (connection issues)
    // Info messages like "Connected to server" during initialization don't need alerts
    if (notification.type !== 'error') {
      return;
    }
    
    // Map connectivity notification types to ATLAS alert types
    let alertType: AtlasConnectivityAlertType;
    
    if (notification.message.includes('lost') || notification.message.includes('disconnected')) {
      alertType = AtlasConnectivityAlertType.ConnectionLost;
    } else if (notification.message.includes('failed')) {
      alertType = AtlasConnectivityAlertType.ReconnectionFailed;
    } else {
      alertType = AtlasConnectivityAlertType.ConnectionDegraded;
    }
    
    // Send connectivity alert notification
    // Note: This will use HTTP fallback if SignalR is disconnected
    this.sendConnectivityAlert(alertType, notification.message).subscribe({
      next: () => console.log('Connectivity alert notification sent'),
      error: (error) => console.error('Failed to send connectivity alert:', error)
    });
  }

  /**
   * Validate that a notification type belongs to the ATLAS domain
   * Requirements: 8.3, 8.4, 8.5
   * 
   * @param type - Notification type to validate
   * @returns True if valid ATLAS notification type
   * @throws Error if type is invalid or belongs to ARK domain
   */
  validateNotificationType(type: string): boolean {
    const validAtlasTypes = Object.values(AtlasNotificationType);
    
    if (!validAtlasTypes.includes(type as AtlasNotificationType)) {
      throw new Error(`Invalid ATLAS notification type: ${type}. Type does not match ATLAS domain.`);
    }
    
    return true;
  }

  /**
   * Send deployment created notification
   * Requirements: 2.5, 6.1
   * 
   * @param deployment - The deployment that was created
   * @returns Observable of the created notification
   */
  sendDeploymentCreatedNotification(deployment: DeploymentDto): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.DeploymentCreated,
      title: 'Deployment Created',
      message: `Deployment "${deployment.title || deployment.id}" has been created`,
      priority: AtlasNotificationPriority.Normal,
      deploymentId: deployment.id,
      metadata: {
        deploymentType: deployment.type,
        createdBy: deployment.createdBy
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send deployment updated notification
   * Requirements: 2.5, 6.1
   * 
   * @param deployment - The deployment that was updated
   * @returns Observable of the created notification
   */
  sendDeploymentUpdatedNotification(deployment: DeploymentDto): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.DeploymentUpdated,
      title: 'Deployment Updated',
      message: `Deployment "${deployment.title || deployment.id}" has been updated`,
      priority: AtlasNotificationPriority.Normal,
      deploymentId: deployment.id,
      metadata: {
        deploymentType: deployment.type,
        updatedAt: deployment.updatedAt
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send deployment status changed notification
   * Requirements: 2.5, 6.1
   * 
   * @param deploymentId - The deployment ID
   * @param oldStatus - The previous status
   * @param newStatus - The new status
   * @returns Observable of the created notification
   */
  sendDeploymentStatusChangedNotification(
    deploymentId: string,
    oldStatus: string,
    newStatus: string
  ): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.DeploymentStatusChanged,
      title: 'Deployment Status Changed',
      message: `Deployment status changed from ${oldStatus} to ${newStatus}`,
      priority: this.determinePriorityForStatusChange(newStatus),
      deploymentId: deploymentId,
      metadata: {
        oldStatus,
        newStatus
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send connectivity alert notification
   * Requirements: 2.5, 6.2
   * 
   * @param alertType - The type of connectivity alert
   * @param message - The alert message
   * @returns Observable of the created notification
   */
  sendConnectivityAlert(
    alertType: AtlasConnectivityAlertType,
    message: string
  ): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.ConnectivityAlert,
      title: this.getConnectivityAlertTitle(alertType),
      message: message,
      priority: this.determinePriorityForConnectivityAlert(alertType),
      metadata: {
        alertType
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send system health alert notification
   * Requirements: 2.5, 6.3
   * 
   * @param severity - The severity level of the health alert
   * @param message - The alert message
   * @param metadata - Additional metadata
   * @returns Observable of the created notification
   */
  sendSystemHealthAlert(
    severity: AtlasHealthSeverity,
    message: string,
    metadata?: Record<string, any>
  ): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.SystemHealthAlert,
      title: `System Health Alert: ${severity}`,
      message: message,
      priority: this.determinePriorityForHealthSeverity(severity),
      metadata: {
        severity,
        ...metadata
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send evidence submitted notification
   * Requirements: 2.5
   * 
   * @param deploymentId - The deployment ID
   * @param evidenceType - The type of evidence submitted
   * @returns Observable of the created notification
   */
  sendEvidenceSubmittedNotification(
    deploymentId: string,
    evidenceType: string
  ): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.EvidenceSubmitted,
      title: 'Evidence Submitted',
      message: `New ${evidenceType} evidence has been submitted`,
      priority: AtlasNotificationPriority.Normal,
      deploymentId: deploymentId,
      metadata: {
        evidenceType
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Send approval requested notification
   * Requirements: 2.5
   * 
   * @param deploymentId - The deployment ID
   * @param approverIds - Array of approver user IDs
   * @returns Observable of the created notification
   */
  sendApprovalRequestedNotification(
    deploymentId: string,
    approverIds: string[]
  ): Observable<AtlasNotification> {
    const notification: Partial<AtlasNotification> = {
      type: AtlasNotificationType.ApprovalRequested,
      title: 'Approval Requested',
      message: 'Your approval is requested for a deployment',
      priority: AtlasNotificationPriority.High,
      deploymentId: deploymentId,
      metadata: {
        approverIds
      }
    };

    return this.sendNotification(notification);
  }

  /**
   * Get notifications for a user with optional filters
   * Requirements: 2.5
   * 
   * @param filters - Optional filters for querying notifications
   * @returns Observable of notifications array
   */
  getNotificationsForUser(filters?: AtlasNotificationFilters): Observable<AtlasNotification[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.type) {
        params = params.set('type', filters.type);
      }
      if (filters.priority) {
        params = params.set('priority', filters.priority);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.deploymentId) {
        params = params.set('deploymentId', filters.deploymentId);
      }
      if (filters.startDate) {
        params = params.set('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params = params.set('endDate', filters.endDate.toISOString());
      }
      if (filters.unreadOnly) {
        params = params.set('unreadOnly', filters.unreadOnly.toString());
      }
    }

    const url = `${this.getBaseUrl()}${this.API_BASE}`;
    
    return this.http.get<AtlasNotification[]>(url, { params }).pipe(
      map(notifications => notifications.map(n => this.parseNotificationDates(n))),
      catchError(this.handleError<AtlasNotification[]>('getNotificationsForUser', []))
    );
  }

  /**
   * Mark a notification as read
   * Requirements: 2.5
   * 
   * @param notificationId - The notification ID to mark as read
   * @returns Observable of the updated notification
   */
  markAsRead(notificationId: string): Observable<AtlasNotification> {
    const url = `${this.getBaseUrl()}${this.API_BASE}/${notificationId}/read`;
    
    return this.http.put<AtlasNotification>(url, {}).pipe(
      map(notification => this.parseNotificationDates(notification)),
      catchError((error) => {
        console.error('markAsRead failed:', error);
        return throwError(() => new Error(`markAsRead failed: ${error.message}`));
      })
    );
  }

  /**
   * Mark all notifications as read for the current user
   * Requirements: 2.5
   * 
   * @returns Observable with count of notifications marked as read
   */
  markAllAsRead(): Observable<{ count: number }> {
    const url = `${this.getBaseUrl()}${this.API_BASE}/read-all`;
    
    return this.http.put<{ count: number }>(url, {}).pipe(
      catchError(this.handleError<{ count: number }>('markAllAsRead', { count: 0 }))
    );
  }

  /**
   * Get notification preferences for a user
   * Requirements: 2.5
   * 
   * @param userId - Optional user ID (defaults to current user)
   * @returns Observable of notification preferences
   */
  getNotificationPreferences(userId?: string): Observable<AtlasNotificationPreferences> {
    const url = userId
      ? `${this.getBaseUrl()}${this.API_BASE}/preferences/${userId}`
      : `${this.getBaseUrl()}${this.API_BASE}/preferences`;
    
    return this.http.get<AtlasNotificationPreferences>(url).pipe(
      catchError((error) => {
        console.error('getNotificationPreferences failed:', error);
        return throwError(() => new Error(`getNotificationPreferences failed: ${error.message}`));
      })
    );
  }

  /**
   * Update notification preferences for the current user
   * Requirements: 2.5
   * 
   * @param preferences - The updated preferences
   * @returns Observable of the updated preferences
   */
  updateNotificationPreferences(
    preferences: AtlasNotificationPreferences
  ): Observable<AtlasNotificationPreferences> {
    const url = `${this.getBaseUrl()}${this.API_BASE}/preferences`;
    
    return this.http.put<AtlasNotificationPreferences>(url, preferences).pipe(
      catchError((error) => {
        console.error('updateNotificationPreferences failed:', error);
        return throwError(() => new Error(`updateNotificationPreferences failed: ${error.message}`));
      })
    );
  }

  /**
   * Subscribe to real-time notifications for a user
   * Requirements: 2.5, 6.4
   * 
   * @param userId - The user ID to subscribe for
   * @returns Subscription ID
   */
  subscribeToNotifications(userId: string): string {
    const subscriptionId = this.signalRService.subscribe(
      `UserNotifications_${userId}`,
      (notification: AtlasNotification) => {
        this.handleRealtimeNotification(notification);
      }
    );

    this.subscriptions.set(`user_${userId}`, subscriptionId);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time notifications
   * Requirements: 2.5, 6.4
   * 
   * @param subscriptionId - The subscription ID to unsubscribe
   */
  unsubscribeFromNotifications(subscriptionId: string): void {
    this.signalRService.unsubscribe(subscriptionId);
    
    // Remove from local subscriptions map
    for (const [key, value] of this.subscriptions.entries()) {
      if (value === subscriptionId) {
        this.subscriptions.delete(key);
        break;
      }
    }
  }

  /**
   * Send a notification (internal method)
   * Checks SignalR connection status and routes accordingly
   * Requirements: 2.4, 6.4, 6.5
   * 
   * @param notification - The notification to send
   * @returns Observable of the created notification
   */
  private sendNotification(notification: Partial<AtlasNotification>): Observable<AtlasNotification> {
    // Validate notification type belongs to ATLAS domain
    // Requirements: 8.3, 8.4, 8.5
    if (notification.type) {
      try {
        this.validateNotificationType(notification.type);
      } catch (error) {
        return throwError(() => error);
      }
    }

    // Check if SignalR is connected for real-time delivery
    // Requirements: 6.4
    if (this.signalRService.isConnected()) {
      console.log('SignalR is connected - sending notification via SignalR');
      return this.sendViaSignalR(notification);
    } else {
      // Fall back to HTTP POST when SignalR is disconnected
      // Requirements: 6.5
      console.log('SignalR is disconnected - falling back to HTTP');
      return this.sendViaHttp(notification);
    }
  }

  /**
   * Send notification via SignalR
   * When SignalR is connected, notifications are sent via SignalR for real-time delivery
   * Requirements: 2.4, 6.4
   * 
   * @param notification - The notification to send
   * @returns Observable of the created notification
   */
  private sendViaSignalR(notification: Partial<AtlasNotification>): Observable<AtlasNotification> {
    const url = `${this.getBaseUrl()}${this.API_BASE}/signalr`;
    
    return this.http.post<AtlasNotification>(url, notification).pipe(
      map(n => this.parseNotificationDates(n)),
      tap(() => console.log('Notification sent via SignalR')),
      catchError(error => {
        console.error('Failed to send via SignalR, falling back to HTTP', error);
        // Automatic fallback to HTTP if SignalR send fails
        // Requirements: 6.5
        return this.sendViaHttp(notification);
      })
    );
  }

  /**
   * Send notification via HTTP
   * Used as fallback when SignalR is disconnected
   * Requirements: 6.5
   * 
   * @param notification - The notification to send
   * @returns Observable of the created notification
   */
  private sendViaHttp(notification: Partial<AtlasNotification>): Observable<AtlasNotification> {
    const url = `${this.getBaseUrl()}${this.API_BASE}`;
    
    return this.http.post<AtlasNotification>(url, notification).pipe(
      map(n => this.parseNotificationDates(n)),
      tap(() => console.log('Notification sent via HTTP (polling fallback)')),
      catchError((error) => {
        console.error('sendViaHttp failed:', error);
        return throwError(() => new Error(`sendViaHttp failed: ${error.message}`));
      })
    );
  }

  /**
   * Determine priority based on status change
   */
  private determinePriorityForStatusChange(newStatus: string): AtlasNotificationPriority {
    const criticalStatuses = ['FAILED', 'REJECTED', 'CANCELLED'];
    const highStatuses = ['PENDING_APPROVAL', 'IN_PROGRESS'];
    
    if (criticalStatuses.includes(newStatus.toUpperCase())) {
      return AtlasNotificationPriority.Critical;
    } else if (highStatuses.includes(newStatus.toUpperCase())) {
      return AtlasNotificationPriority.High;
    }
    
    return AtlasNotificationPriority.Normal;
  }

  /**
   * Determine priority based on connectivity alert type
   */
  private determinePriorityForConnectivityAlert(alertType: AtlasConnectivityAlertType): AtlasNotificationPriority {
    switch (alertType) {
      case AtlasConnectivityAlertType.ConnectionLost:
      case AtlasConnectivityAlertType.ReconnectionFailed:
        return AtlasNotificationPriority.Critical;
      case AtlasConnectivityAlertType.ConnectionDegraded:
        return AtlasNotificationPriority.High;
      case AtlasConnectivityAlertType.ConnectionRestored:
        return AtlasNotificationPriority.Normal;
      default:
        return AtlasNotificationPriority.Normal;
    }
  }

  /**
   * Determine priority based on health severity
   */
  private determinePriorityForHealthSeverity(severity: AtlasHealthSeverity): AtlasNotificationPriority {
    switch (severity) {
      case AtlasHealthSeverity.Critical:
        return AtlasNotificationPriority.Critical;
      case AtlasHealthSeverity.Error:
        return AtlasNotificationPriority.High;
      case AtlasHealthSeverity.Warning:
        return AtlasNotificationPriority.Normal;
      case AtlasHealthSeverity.Info:
        return AtlasNotificationPriority.Low;
      default:
        return AtlasNotificationPriority.Normal;
    }
  }

  /**
   * Get connectivity alert title based on alert type
   */
  private getConnectivityAlertTitle(alertType: AtlasConnectivityAlertType): string {
    switch (alertType) {
      case AtlasConnectivityAlertType.ConnectionLost:
        return 'Connection Lost';
      case AtlasConnectivityAlertType.ConnectionRestored:
        return 'Connection Restored';
      case AtlasConnectivityAlertType.ConnectionDegraded:
        return 'Connection Degraded';
      case AtlasConnectivityAlertType.ReconnectionFailed:
        return 'Reconnection Failed';
      default:
        return 'Connectivity Alert';
    }
  }

  /**
   * Parse date strings to Date objects in notification
   */
  private parseNotificationDates(notification: AtlasNotification): AtlasNotification {
    return {
      ...notification,
      createdAt: new Date(notification.createdAt),
      deliveredAt: notification.deliveredAt ? new Date(notification.deliveredAt) : undefined,
      readAt: notification.readAt ? new Date(notification.readAt) : undefined
    };
  }

  /**
   * Get base URL from config service
   */
  private getBaseUrl(): string {
    return this.configService.getBaseUrl();
  }

  /**
   * Handle HTTP errors
   */
  private handleError<T>(operation: string, defaultValue?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Log error details
      if (error.error instanceof ErrorEvent) {
        console.error('Client-side error:', error.error.message);
      } else {
        console.error(`Server-side error: ${error.status} ${error.statusText}`);
      }
      
      // Return default value if provided, otherwise rethrow
      if (defaultValue !== undefined) {
        return of(defaultValue);
      }
      
      return throwError(() => new Error(`${operation} failed: ${error.message}`));
    };
  }
}
