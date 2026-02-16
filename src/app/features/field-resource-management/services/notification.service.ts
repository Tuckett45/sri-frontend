import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Notification } from '../models/notification.model';

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  jobAssignedEnabled: boolean;
  jobReassignedEnabled: boolean;
  jobStatusChangedEnabled: boolean;
  jobCancelledEnabled: boolean;
  certificationExpiringEnabled: boolean;
  conflictDetectedEnabled: boolean;
}

/**
 * Service for managing notifications
 * Handles HTTP communication with the backend API for notification operations
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = '/api/notifications';
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves all notifications for the current user
   * @param includeRead Whether to include read notifications (default: true)
   * @param page Optional page number for pagination
   * @param pageSize Optional page size for pagination
   * @returns Observable of notification array
   */
  getNotifications(includeRead: boolean = true, page?: number, pageSize?: number): Observable<Notification[]> {
    let params = new HttpParams().set('includeRead', includeRead.toString());
    
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (pageSize !== undefined) {
      params = params.set('pageSize', pageSize.toString());
    }

    return this.http.get<Notification[]>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Marks a notification as read
   * @param id Notification ID
   * @returns Observable of void
   */
  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Marks all notifications as read for the current user
   * @returns Observable of void
   */
  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves the count of unread notifications for the current user
   * @returns Observable of unread count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread-count`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves notification preferences for the current user
   * @returns Observable of notification preferences
   */
  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Updates notification preferences for the current user
   * @param preferences Updated notification preferences
   * @returns Observable of updated preferences
   */
  updateNotificationPreferences(preferences: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/preferences`, preferences)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Deletes a notification
   * @param id Notification ID
   * @returns Observable of void
   */
  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Notification not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
