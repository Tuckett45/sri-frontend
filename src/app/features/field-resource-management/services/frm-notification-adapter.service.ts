import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ArkNotificationService } from '../../../services/ark/ark-notification.service';
import { AuthService } from '../../../services/auth.service';
import {
  ArkNotification,
  ArkNotificationType,
  ArkNotificationPriority,
  ArkNotificationChannel,
  ArkNotificationStatus,
  ArkNotificationPreferences
} from '../../../models/ark/notification.model';

/**
 * FRM notification preferences interface
 * Maps FRM-specific notification settings to ARK notification preferences
 */
export interface FrmNotificationPreferences {
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
 * Adapter service for FRM notifications
 * 
 * This service adapts FRM-specific notification needs to the ARK notification system.
 * It handles job-related notifications, certification alerts, and conflict detection
 * while maintaining market-based filtering for CM users and system-wide access for Admins.
 * 
 * All FRM notifications are routed through the ARK notification service to ensure
 * consistent delivery, preferences management, and audit logging.
 */
@Injectable({
  providedIn: 'root'
})
export class FrmNotificationAdapterService {
  constructor(
    private arkNotificationService: ArkNotificationService,
    private authService: AuthService
  ) {}

  /**
   * Send job assigned notification
   * @param jobId Job identifier
   * @param technicianId Technician identifier
   * @returns Observable of created notification
   */
  sendJobAssignedNotification(jobId: string, technicianId: string): Observable<ArkNotification> {
    const user = this.authService.getUser();
    
    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'New Job Assigned',
      message: `You have been assigned to job ${jobId}`,
      type: ArkNotificationType.JobAssigned,
      priority: ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: jobId,
      relatedEntityType: 'job',
      metadata: {
        jobId,
        technicianId,
        assignedBy: user.id,
        assignedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send job reassigned notification
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
    const user = this.authService.getUser();
    
    const notification: Partial<ArkNotification> = {
      userId: newTechnicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Job Reassigned',
      message: `Job ${jobId} has been reassigned to you`,
      type: ArkNotificationType.JobReassigned,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: jobId,
      relatedEntityType: 'job',
      metadata: {
        jobId,
        oldTechnicianId,
        newTechnicianId,
        reassignedBy: user.id,
        reassignedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send job status changed notification
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
    const user = this.authService.getUser();
    
    // Determine priority based on status change
    let priority = ArkNotificationPriority.Normal;
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      priority = ArkNotificationPriority.High;
    }

    const notification: Partial<ArkNotification> = {
      userId: user.id,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Job Status Updated',
      message: `Job ${jobId} status changed from ${oldStatus} to ${newStatus}`,
      type: ArkNotificationType.JobStatusChanged,
      priority,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: jobId,
      relatedEntityType: 'job',
      metadata: {
        jobId,
        oldStatus,
        newStatus,
        changedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send job cancelled notification
   * @param jobId Job identifier
   * @param reason Cancellation reason
   * @returns Observable of created notification
   */
  sendJobCancelledNotification(jobId: string, reason: string): Observable<ArkNotification> {
    const user = this.authService.getUser();
    
    const notification: Partial<ArkNotification> = {
      userId: user.id,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Job Cancelled',
      message: `Job ${jobId} has been cancelled. Reason: ${reason}`,
      type: ArkNotificationType.JobCancelled,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: jobId,
      relatedEntityType: 'job',
      metadata: {
        jobId,
        reason,
        cancelledBy: user.id,
        cancelledAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send certification expiring notification
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
    const user = this.authService.getUser();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Certification Expiring Soon',
      message: `Your ${certificationName} certification will expire in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}`,
      type: ArkNotificationType.CertificationExpiring,
      priority: daysUntilExpiry <= 7 ? ArkNotificationPriority.High : ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: technicianId,
      relatedEntityType: 'technician',
      metadata: {
        technicianId,
        certificationName,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send conflict detected notification
   * @param conflictType Type of conflict (e.g., 'schedule', 'resource', 'location')
   * @param details Conflict details
   * @returns Observable of created notification
   */
  sendConflictDetectedNotification(conflictType: string, details: string): Observable<ArkNotification> {
    const user = this.authService.getUser();
    
    const notification: Partial<ArkNotification> = {
      userId: user.id,
      market: this.authService.isCM() ? user.market : undefined,
      title: `${conflictType} Conflict Detected`,
      message: details,
      type: ArkNotificationType.ConflictDetected,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      metadata: {
        conflictType,
        details,
        detectedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Get FRM notification preferences for a user
   * Maps ARK notification preferences to FRM-specific preferences
   * @param userId User identifier
   * @returns Observable of FRM notification preferences
   */
  getFrmNotificationPreferences(userId: string): Observable<FrmNotificationPreferences> {
    return this.arkNotificationService.getNotificationPreferences(userId).pipe(
      map(arkPreferences => this.mapArkToFrmPreferences(arkPreferences))
    );
  }

  /**
   * Update FRM notification preferences for a user
   * Maps FRM preferences to ARK notification preferences and updates them
   * @param preferences FRM notification preferences
   * @returns Observable of updated FRM notification preferences
   */
  updateFrmNotificationPreferences(preferences: FrmNotificationPreferences): Observable<FrmNotificationPreferences> {
    const arkPreferences = this.mapFrmToArkPreferences(preferences);
    
    return this.arkNotificationService.configureNotificationPreferences(arkPreferences).pipe(
      map(updatedArkPreferences => this.mapArkToFrmPreferences(updatedArkPreferences))
    );
  }

  /**
   * Map ARK notification preferences to FRM preferences
   * @param arkPreferences ARK notification preferences
   * @returns FRM notification preferences
   */
  private mapArkToFrmPreferences(arkPreferences: ArkNotificationPreferences): FrmNotificationPreferences {
    const notificationTypes = arkPreferences.notificationTypes || {} as Record<ArkNotificationType, boolean>;
    
    return {
      userId: arkPreferences.userId,
      emailEnabled: arkPreferences.email,
      inAppEnabled: arkPreferences.inApp,
      jobAssignedEnabled: notificationTypes[ArkNotificationType.JobAssigned] !== false,
      jobReassignedEnabled: notificationTypes[ArkNotificationType.JobReassigned] !== false,
      jobStatusChangedEnabled: notificationTypes[ArkNotificationType.JobStatusChanged] !== false,
      jobCancelledEnabled: notificationTypes[ArkNotificationType.JobCancelled] !== false,
      certificationExpiringEnabled: notificationTypes[ArkNotificationType.CertificationExpiring] !== false,
      conflictDetectedEnabled: notificationTypes[ArkNotificationType.ConflictDetected] !== false
    };
  }

  /**
   * Map FRM notification preferences to ARK preferences
   * @param frmPreferences FRM notification preferences
   * @returns ARK notification preferences
   */
  private mapFrmToArkPreferences(frmPreferences: FrmNotificationPreferences): ArkNotificationPreferences {
    return {
      userId: frmPreferences.userId,
      email: frmPreferences.emailEnabled,
      inApp: frmPreferences.inAppEnabled,
      sms: false, // FRM doesn't use SMS by default
      approvalReminders: true,
      escalationAlerts: true,
      dailyDigest: false,
      notificationTypes: {
        [ArkNotificationType.ApprovalReminder]: true,
        [ArkNotificationType.CriticalIssue]: true,
        [ArkNotificationType.Broadcast]: true,
        [ArkNotificationType.WorkflowUpdate]: true,
        [ArkNotificationType.UserManagement]: true,
        [ArkNotificationType.ResourceAllocation]: true,
        [ArkNotificationType.Reporting]: true,
        [ArkNotificationType.JobAssigned]: frmPreferences.jobAssignedEnabled,
        [ArkNotificationType.JobReassigned]: frmPreferences.jobReassignedEnabled,
        [ArkNotificationType.JobStatusChanged]: frmPreferences.jobStatusChangedEnabled,
        [ArkNotificationType.JobCancelled]: frmPreferences.jobCancelledEnabled,
        [ArkNotificationType.CertificationExpiring]: frmPreferences.certificationExpiringEnabled,
        [ArkNotificationType.ConflictDetected]: frmPreferences.conflictDetectedEnabled
      }
    };
  }
}
