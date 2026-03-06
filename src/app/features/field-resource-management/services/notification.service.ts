/**
 * Notification Service
 * Handles API calls for notification management
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Notification, NotificationPreferences } from '../models/notification.model';
import { environment } from '../../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Get notifications for a user
   * @param userId User ID
   * @param unreadOnly Optional flag to get only unread notifications
   * @returns Observable of notifications array
   */
  getNotifications(userId: string, unreadOnly: boolean = false): Observable<Notification[]> {
    let params = new HttpParams();
    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }

    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`, { params }).pipe(
      map(notifications => notifications.map(n => this.mapNotification(n)))
    );
  }

  /**
   * Get a single notification by ID
   * @param id Notification ID
   * @returns Observable of notification
   */
  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`).pipe(
      map(n => this.mapNotification(n))
    );
  }

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Observable of void
   */
  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }

  /**
   * Mark all notifications as read for a user
   * @param userId User ID
   * @returns Observable of void
   */
  markAllAsRead(userId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/user/${userId}/read-all`, {});
  }

  /**
   * Delete a notification
   * @param id Notification ID
   * @returns Observable of void
   */
  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete all notifications for a user
   * @param userId User ID
   * @returns Observable of void
   */
  deleteAllNotifications(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/${userId}/all`);
  }

  /**
   * Get unread notification count for a user
   * @param userId User ID
   * @returns Observable of count
   */
  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/user/${userId}/unread-count`).pipe(
      map(response => response.count)
    );
  }

  /**
   * Get notification preferences for a user
   * @param userId User ID
   * @returns Observable of notification preferences
   */
  getPreferences(userId: string): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/user/${userId}/preferences`);
  }

  /**
   * Update notification preferences for a user
   * @param userId User ID
   * @param preferences Notification preferences
   * @returns Observable of updated preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/user/${userId}/preferences`, preferences);
  }

  /**
   * Send a test notification (for testing purposes)
   * @param userId User ID
   * @param type Notification type
   * @returns Observable of created notification
   */
  sendTestNotification(userId: string, type: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/test`, { userId, type }).pipe(
      map(n => this.mapNotification(n))
    );
  }

  /**
   * Map notification from API response to ensure Date objects
   * @param notification Raw notification from API
   * @returns Mapped notification with Date objects
   */
  private mapNotification(notification: any): Notification {
    return {
      ...notification,
      createdAt: new Date(notification.createdAt),
      timestamp: new Date(notification.timestamp || notification.createdAt)
    };
  }
}
