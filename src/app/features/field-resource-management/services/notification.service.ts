import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { Notification } from '../models/notification.model';
import { FrmNotificationAdapterService, FrmNotificationPreferences } from './frm-notification-adapter.service';
import { ArkNotification } from '../../../models/ark/notification.model';

/**
 * Notification preferences
 * @deprecated Use FrmNotificationPreferences from FrmNotificationAdapterService instead
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
 * Service for managing FRM notifications
 * 
 * This service now delegates to FrmNotificationAdapterService which routes
 * notifications through the ARK notification system. This ensures proper
 * domain separation while maintaining backward compatibility.
 * 
 * All notification operations are now handled by the adapter, which provides:
 * - Market-based filtering for CM users
 * - System-wide access for Admin users
 * - Consistent notification delivery and preferences management
 * - Integration with ARK notification audit logging
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = '/api/notifications';
  private readonly retryCount = 2;

  constructor(
    private http: HttpClient,
    private frmNotificationAdapter: FrmNotificationAdapterService
  ) {}

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
   * Delegates to FrmNotificationAdapterService for ARK integration
   * @returns Observable of notification preferences
   */
  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.http.get<{ userId: string }>(`${this.apiUrl}/preferences`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      )
      .pipe(
        map(response => response.userId),
        // Delegate to adapter to get preferences from ARK system
        map(userId => this.frmNotificationAdapter.getFrmNotificationPreferences(userId)),
        // Flatten the nested observable
        map(obs => obs as any)
      ) as Observable<NotificationPreferences>;
  }

  /**
   * Updates notification preferences for the current user
   * Delegates to FrmNotificationAdapterService for ARK integration
   * @param preferences Updated notification preferences
   * @returns Observable of updated preferences
   */
  updateNotificationPreferences(preferences: NotificationPreferences): Observable<NotificationPreferences> {
    // Delegate to adapter to update preferences in ARK system
    return this.frmNotificationAdapter.updateFrmNotificationPreferences(preferences as FrmNotificationPreferences);
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
   * Send job assigned notification
   * Delegates to FrmNotificationAdapterService
   * @param jobId Job identifier
   * @param technicianId Technician identifier
   * @returns Observable of created notification
   */
  sendJobAssignedNotification(jobId: string, technicianId: string): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendJobAssignedNotification(jobId, technicianId);
  }

  /**
   * Send job reassigned notification
   * Delegates to FrmNotificationAdapterService
   * @param jobId Job identifier
   * @param oldTechnicianId Previous technician identifier
   * @param newTechnicianId New technician identifier
   * @returns Observable of created notification
   */
  sendJobReassignedNotification(
    jobId: string,
    oldTechnicianId: string,
    newTechnicianId: string
  ): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendJobReassignedNotification(jobId, oldTechnicianId, newTechnicianId);
  }

  /**
   * Send job status changed notification
   * Delegates to FrmNotificationAdapterService
   * @param jobId Job identifier
   * @param oldStatus Previous job status
   * @param newStatus New job status
   * @returns Observable of created notification
   */
  sendJobStatusChangedNotification(
    jobId: string,
    oldStatus: string,
    newStatus: string
  ): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendJobStatusChangedNotification(jobId, oldStatus, newStatus);
  }

  /**
   * Send job cancelled notification
   * Delegates to FrmNotificationAdapterService
   * @param jobId Job identifier
   * @param reason Cancellation reason
   * @returns Observable of created notification
   */
  sendJobCancelledNotification(jobId: string, reason: string): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendJobCancelledNotification(jobId, reason);
  }

  /**
   * Send certification expiring notification
   * Delegates to FrmNotificationAdapterService
   * @param technicianId Technician identifier
   * @param certificationName Name of the certification
   * @param expiryDate Expiry date of the certification
   * @returns Observable of created notification
   */
  sendCertificationExpiringNotification(
    technicianId: string,
    certificationName: string,
    expiryDate: Date
  ): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendCertificationExpiringNotification(technicianId, certificationName, expiryDate);
  }

  /**
   * Send conflict detected notification
   * Delegates to FrmNotificationAdapterService
   * @param conflictType Type of conflict (e.g., 'schedule', 'resource', 'location')
   * @param details Conflict details
   * @returns Observable of created notification
   */
  sendConflictDetectedNotification(conflictType: string, details: string): Observable<ArkNotification> {
    return this.frmNotificationAdapter.sendConflictDetectedNotification(conflictType, details);
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
