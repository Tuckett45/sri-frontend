import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import { UserRole } from '../models/role.enum';
import {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  NotificationLog,
  BroadcastNotification,
  NotificationFilters,
  NotificationSummary,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
} from '../models/notification.model';
import { environment } from '../../environments/environments';

/**
 * Service for managing role-based notifications
 * 
 * This service handles notification delivery, preferences, templates, and logging
 * with role-based filtering. CM users receive notifications filtered to their market,
 * while Admin users can access all notifications system-wide.
 * 
 * Features:
 * - Individual notification sending with multi-channel delivery
 * - Market-based filtering for CM users
 * - System-wide access for Admin users
 * - User notification preferences management
 * - Admin template management
 * - Broadcast notifications for Admin
 * - Notification audit logs
 * - High-priority notification handling
 * - 24-hour approval reminder notifications
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  /**
   * Send individual notification
   * @param notification Notification to send
   * @returns Observable of created notification
   */
  sendNotification(notification: Partial<Notification>): Observable<Notification> {
    // Validate user has permission to send notifications
    if (!this.canSendNotifications()) {
      return throwError(() => new Error('User does not have permission to send notifications'));
    }

    // For CM users, ensure notification is for their market
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (notification.market && notification.market !== user.market) {
        return throwError(() => new Error('CM users can only send notifications within their market'));
      }
      // Auto-assign market if not specified
      if (!notification.market) {
        notification.market = user.market;
      }
    }

    return this.http.post<Notification>(`${this.apiUrl}`, notification);
  }

  /**
   * Get notifications for current user with market filtering
   * @param filters Optional filters
   * @returns Observable of notifications
   */
  getNotificationsForUser(filters?: NotificationFilters): Observable<Notification[]> {
    let params = new HttpParams();

    // Apply role-based filtering
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (user && user.market) {
        params = params.set('market', user.market);
      }
      params = params.set('userId', user.id);
    } else if (filters?.userId) {
      params = params.set('userId', filters.userId);
    }

    // Apply additional filters
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate.toISOString());
      if (filters.endDate) params = params.set('endDate', filters.endDate.toISOString());
      if (filters.unreadOnly) params = params.set('unreadOnly', 'true');
      if (filters.market && this.authService.isAdmin()) {
        params = params.set('market', filters.market);
      }
    }

    return this.http.get<Notification[]>(`${this.apiUrl}`, { params }).pipe(
      map(notifications => this.applyMarketFilter(notifications))
    );
  }

  /**
   * Get notification by ID
   * @param notificationId Notification ID
   * @returns Observable of notification
   */
  getNotificationById(notificationId: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${notificationId}`).pipe(
      map(notification => {
        // Validate market access for CM users
        if (this.authService.isCM() && !this.canAccessNotification(notification)) {
          throw new Error('Access denied to notification from different market');
        }
        return notification;
      })
    );
  }

  /**
   * Mark notification as read
   * @param notificationId Notification ID
   * @returns Observable of updated notification
   */
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  /**
   * Mark all notifications as read for current user
   * @returns Observable of update result
   */
  markAllAsRead(): Observable<{ count: number }> {
    const user = this.authService.getUser();
    let params = new HttpParams().set('userId', user.id);

    if (this.authService.isCM() && user.market) {
      params = params.set('market', user.market);
    }

    return this.http.patch<{ count: number }>(`${this.apiUrl}/mark-all-read`, {}, { params });
  }

  /**
   * Delete notification
   * @param notificationId Notification ID
   * @returns Observable of void
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
  }

  /**
   * Get notification summary for current user
   * @returns Observable of notification summary
   */
  getNotificationSummary(): Observable<NotificationSummary> {
    const user = this.authService.getUser();
    let params = new HttpParams().set('userId', user.id);

    if (this.authService.isCM() && user.market) {
      params = params.set('market', user.market);
    }

    return this.http.get<NotificationSummary>(`${this.apiUrl}/summary`, { params });
  }

  /**
   * Configure notification preferences for user
   * @param preferences Notification preferences
   * @returns Observable of updated preferences
   */
  configureNotificationPreferences(preferences: NotificationPreferences): Observable<NotificationPreferences> {
    const user = this.authService.getUser();
    
    // Ensure user can only update their own preferences unless Admin
    if (!this.authService.isAdmin() && preferences.userId !== user.id) {
      return throwError(() => new Error('Users can only update their own notification preferences'));
    }

    return this.http.put<NotificationPreferences>(`${this.apiUrl}/preferences`, preferences);
  }

  /**
   * Get notification preferences for user
   * @param userId Optional user ID (defaults to current user)
   * @returns Observable of notification preferences
   */
  getNotificationPreferences(userId?: string): Observable<NotificationPreferences> {
    const user = this.authService.getUser();
    const targetUserId = userId || user.id;

    // Non-admin users can only get their own preferences
    if (!this.authService.isAdmin() && targetUserId !== user.id) {
      return throwError(() => new Error('Users can only view their own notification preferences'));
    }

    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences/${targetUserId}`);
  }

  /**
   * Send broadcast notification (Admin only)
   * @param broadcast Broadcast notification details
   * @returns Observable of broadcast result
   */
  sendBroadcast(broadcast: Partial<BroadcastNotification>): Observable<BroadcastNotification> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can send broadcast notifications'));
    }

    const user = this.authService.getUser();
    broadcast.createdBy = user.id;
    broadcast.createdAt = new Date();

    return this.http.post<BroadcastNotification>(`${this.apiUrl}/broadcast`, broadcast);
  }

  /**
   * Get notification logs (Admin only)
   * @param filters Optional filters
   * @returns Observable of notification logs
   */
  getNotificationLogs(filters?: NotificationFilters): Observable<NotificationLog[]> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can access notification logs'));
    }

    let params = new HttpParams();

    if (filters) {
      if (filters.userId) params = params.set('userId', filters.userId);
      if (filters.market) params = params.set('market', filters.market);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate.toISOString());
      if (filters.endDate) params = params.set('endDate', filters.endDate.toISOString());
    }

    return this.http.get<NotificationLog[]>(`${this.apiUrl}/logs`, { params });
  }

  /**
   * Configure notification templates (Admin only)
   * @param template Notification template
   * @returns Observable of created/updated template
   */
  configureNotificationTemplates(template: NotificationTemplate): Observable<NotificationTemplate> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can configure notification templates'));
    }

    const user = this.authService.getUser();
    
    if (template.id) {
      // Update existing template
      template.updatedAt = new Date();
      return this.http.put<NotificationTemplate>(`${this.apiUrl}/templates/${template.id}`, template);
    } else {
      // Create new template
      template.createdBy = user.id;
      template.createdAt = new Date();
      template.updatedAt = new Date();
      return this.http.post<NotificationTemplate>(`${this.apiUrl}/templates`, template);
    }
  }

  /**
   * Get notification templates (Admin only)
   * @param activeOnly Optional flag to get only active templates
   * @returns Observable of notification templates
   */
  getNotificationTemplates(activeOnly: boolean = false): Observable<NotificationTemplate[]> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can access notification templates'));
    }

    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }

    return this.http.get<NotificationTemplate[]>(`${this.apiUrl}/templates`, { params });
  }

  /**
   * Delete notification template (Admin only)
   * @param templateId Template ID
   * @returns Observable of void
   */
  deleteNotificationTemplate(templateId: string): Observable<void> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admin users can delete notification templates'));
    }

    return this.http.delete<void>(`${this.apiUrl}/templates/${templateId}`);
  }

  /**
   * Send approval reminder notifications
   * Sends reminders for approvals pending more than 24 hours
   * @returns Observable of reminder count
   */
  sendApprovalReminders(): Observable<{ count: number }> {
    if (!this.canSendNotifications()) {
      return throwError(() => new Error('User does not have permission to send approval reminders'));
    }

    let params = new HttpParams();

    // CM users can only send reminders for their market
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (user && user.market) {
        params = params.set('market', user.market);
      }
    }

    return this.http.post<{ count: number }>(`${this.apiUrl}/approval-reminders`, {}, { params });
  }

  /**
   * Send high-priority notification with multi-channel delivery
   * @param notification Notification details
   * @param channels Channels to use for delivery
   * @returns Observable of notification
   */
  sendHighPriorityNotification(
    notification: Partial<Notification>,
    channels: NotificationChannel[] = [NotificationChannel.Email, NotificationChannel.InApp, NotificationChannel.SMS]
  ): Observable<Notification> {
    notification.priority = NotificationPriority.Critical;
    notification.channels = channels;

    return this.sendNotification(notification);
  }

  /**
   * Send critical issue notification
   * @param title Notification title
   * @param message Notification message
   * @param market Optional market (for CM users, defaults to their market)
   * @param metadata Optional metadata
   * @returns Observable of notification
   */
  sendCriticalIssueNotification(
    title: string,
    message: string,
    market?: string,
    metadata?: Record<string, any>
  ): Observable<Notification> {
    const user = this.authService.getUser();
    
    const notification: Partial<Notification> = {
      userId: user.id,
      market: market || (this.authService.isCM() ? user.market : undefined),
      title,
      message,
      type: 'critical_issue',
      priority: NotificationPriority.Critical,
      channels: [NotificationChannel.Email, NotificationChannel.InApp, NotificationChannel.SMS],
      status: NotificationStatus.Pending,
      createdAt: new Date(),
      metadata
    };

    return this.sendHighPriorityNotification(notification);
  }

  /**
   * Apply market-based filtering to notifications
   * @param notifications Array of notifications
   * @returns Filtered notifications
   */
  private applyMarketFilter(notifications: Notification[]): Notification[] {
    if (this.authService.isAdmin()) {
      return notifications;
    }

    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (!user || !user.market) {
        return [];
      }

      return notifications.filter(notification => 
        !notification.market || notification.market === user.market
      );
    }

    return notifications;
  }

  /**
   * Check if user can access a specific notification
   * @param notification Notification to check
   * @returns True if user can access the notification
   */
  private canAccessNotification(notification: Notification): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }

    const user = this.authService.getUser();
    
    // User can access their own notifications
    if (notification.userId === user.id) {
      return true;
    }

    // CM can access notifications in their market
    if (this.authService.isCM() && notification.market === user.market) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can send notifications
   * @returns True if user can send notifications
   */
  private canSendNotifications(): boolean {
    return this.authService.isCM() || this.authService.isAdmin();
  }
}
