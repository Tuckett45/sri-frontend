import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';

export interface NotificationDto {
  id: string;
  userId: string;
  market?: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  channels: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdBy?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface NotificationSummary {
  totalCount: number;
  unreadCount: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface NotificationPreferencesDto {
  id: string;
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  approvalReminders: boolean;
  escalationAlerts: boolean;
  jobAssignments: boolean;
  timecardReminders: boolean;
  dailyDigest: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Service for the new notifications API endpoints (/v1/notifications).
 * Handles CRUD, user preferences, mark-as-read, and broadcast.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationApiService {
  private readonly baseUrl = `${environment.atlasApiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Get current user's notifications with optional filters.
   */
  getMyNotifications(userId: string, options?: {
    type?: string;
    priority?: string;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: NotificationDto[], totalCount: number, unreadCount: number }> {
    let params = new HttpParams().set('userId', userId);
    if (options?.type) params = params.set('type', options.type);
    if (options?.priority) params = params.set('priority', options.priority);
    if (options?.unreadOnly) params = params.set('unreadOnly', 'true');
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.pageSize) params = params.set('pageSize', options.pageSize.toString());
    return this.http.get<{ items: NotificationDto[], totalCount: number, unreadCount: number }>(
      `${this.baseUrl}/my`, { params }
    );
  }

  /**
   * Get notification summary (counts by type/priority/status).
   */
  getSummary(userId: string): Observable<NotificationSummary> {
    return this.http.get<NotificationSummary>(`${this.baseUrl}/summary`, {
      params: { userId }
    });
  }

  /**
   * Mark a single notification as read.
   */
  markAsRead(notificationId: string): Observable<{ id: string, readAt: string }> {
    return this.http.patch<{ id: string, readAt: string }>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  /**
   * Mark all notifications as read for a user.
   */
  markAllAsRead(userId: string): Observable<{ markedCount: number, markedAt: string }> {
    return this.http.post<{ markedCount: number, markedAt: string }>(
      `${this.baseUrl}/mark-all-read`, { userId }
    );
  }

  /**
   * Get user notification preferences.
   */
  getPreferences(userId: string): Observable<NotificationPreferencesDto> {
    return this.http.get<NotificationPreferencesDto>(`${this.baseUrl}/preferences/${userId}`);
  }

  /**
   * Update user notification preferences.
   */
  updatePreferences(userId: string, prefs: Partial<NotificationPreferencesDto>): Observable<NotificationPreferencesDto> {
    return this.http.put<NotificationPreferencesDto>(`${this.baseUrl}/preferences/${userId}`, prefs);
  }

  /**
   * Delete a notification.
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${notificationId}`);
  }
}
