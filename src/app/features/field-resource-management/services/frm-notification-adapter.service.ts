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
import { SyncConflict, Contract } from '../../../models/time-payroll.model';

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
   * Send timecard not submitted reminder — 24-hour deadline reminder
   * Notifies a technician that their timecard period lock deadline is within 24 hours
   * and the timecard is still in Draft status.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @param deadlineDate The lock deadline date
   * @returns Observable of created notification
   */
  sendTimecardNotSubmittedReminder(
    technicianId: string,
    periodId: string,
    deadlineDate: Date
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Not Submitted',
      message: `Your timecard is due within 24 hours. Please submit before ${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString()}.`,
      type: ArkNotificationType.TimecardNotSubmitted,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        deadlineDate: deadlineDate.toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send timecard locked notification — period locked notification
   * Notifies a technician that their timecard period has been locked.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @returns Observable of created notification
   */
  sendTimecardLockedNotification(
    technicianId: string,
    periodId: string
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Locked',
      message: 'Your timecard period has been locked. No further changes can be made.',
      type: ArkNotificationType.TimecardLocked,
      priority: ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        lockedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send timecard not started reminder — no entries in first 24 hours
   * Notifies a technician that a new pay period has started and they have not
   * created any time entries within the first 24 hours.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @param periodStartDate The start date of the pay period
   * @returns Observable of created notification
   */
  sendTimecardNotStartedReminder(
    technicianId: string,
    periodId: string,
    periodStartDate: Date
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Not Started',
      message: `A new pay period started on ${periodStartDate.toLocaleDateString()} and you have not logged any time entries yet.`,
      type: ArkNotificationType.TimecardNotStarted,
      priority: ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        periodStartDate: periodStartDate.toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send timecard rejected notification — includes rejection reason
   * Notifies a technician that their timecard has been rejected with the reason.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @param reason Rejection reason
   * @returns Observable of created notification
   */
  sendTimecardRejectedNotification(
    technicianId: string,
    periodId: string,
    reason: string
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Rejected',
      message: `Your timecard has been rejected. Reason: ${reason}`,
      type: ArkNotificationType.TimecardRejected,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        reason,
        rejectedBy: user.id,
        rejectedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send timecard approved notification — approval confirmation
   * Notifies a technician that their timecard has been approved.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @returns Observable of created notification
   */
  sendTimecardApprovedNotification(
    technicianId: string,
    periodId: string
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Approved',
      message: 'Your timecard has been approved.',
      type: ArkNotificationType.TimecardApproved,
      priority: ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        approvedBy: user.id,
        approvedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send timecard auto-submitted notification — auto-submit notification
   * Notifies a technician that their timecard was automatically submitted
   * because the deadline was reached while the timecard was still in Draft status.
   * @param technicianId Technician identifier
   * @param periodId Timecard period identifier
   * @returns Observable of created notification
   */
  sendTimecardAutoSubmittedNotification(
    technicianId: string,
    periodId: string
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();

    const notification: Partial<ArkNotification> = {
      userId: technicianId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Timecard Auto-Submitted',
      message: 'Your timecard was automatically submitted because the submission deadline was reached.',
      type: ArkNotificationType.TimecardAutoSubmitted,
      priority: ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: periodId,
      relatedEntityType: 'timecard-period',
      metadata: {
        technicianId,
        periodId,
        autoSubmittedAt: new Date().toISOString()
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send contract expiring notification — 30-day contract expiration warning
   * Notifies a manager that a contract is approaching its expiration date (within 30 days).
   * @param managerId Manager identifier to notify
   * @param contractId Contract identifier
   * @param contractName Contract name
   * @param endDate Contract end date
   * @returns Observable of created notification
   */
  sendContractExpiringNotification(
    managerId: string,
    contractId: string,
    contractName: string,
    endDate: Date
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const notification: Partial<ArkNotification> = {
      userId: managerId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'Contract Expiring Soon',
      message: `Contract "${contractName}" will expire in ${daysUntilExpiry} days on ${endDate.toLocaleDateString()}.`,
      type: ArkNotificationType.ContractExpiring,
      priority: daysUntilExpiry <= 7 ? ArkNotificationPriority.High : ArkNotificationPriority.Normal,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: contractId,
      relatedEntityType: 'contract',
      metadata: {
        managerId,
        contractId,
        contractName,
        endDate: endDate.toISOString(),
        daysUntilExpiry
      }
    };

    return this.arkNotificationService.sendNotification(notification);
  }

  /**
   * Send sync conflict notification — ATLAS sync conflict alert
   * Notifies a dispatcher that a payload mismatch was detected between
   * the local time entry and the ATLAS API response.
   * @param dispatcherId Dispatcher identifier to notify
   * @param conflict SyncConflict details including mismatched fields
   * @returns Observable of created notification
   */
  sendSyncConflictNotification(
    dispatcherId: string,
    conflict: SyncConflict
  ): Observable<ArkNotification> {
    const user = this.authService.getUser();
    const fieldList = conflict.mismatchedFields.join(', ');

    const notification: Partial<ArkNotification> = {
      userId: dispatcherId,
      market: this.authService.isCM() ? user.market : undefined,
      title: 'ATLAS Sync Conflict',
      message: `A sync conflict was detected for time entry ${conflict.entryId}. Mismatched fields: ${fieldList}.`,
      type: ArkNotificationType.SyncConflict,
      priority: ArkNotificationPriority.High,
      channels: [ArkNotificationChannel.InApp],
      status: ArkNotificationStatus.Pending,
      createdAt: new Date(),
      relatedEntityId: conflict.entryId,
      relatedEntityType: 'time-entry',
      metadata: {
        dispatcherId,
        entryId: conflict.entryId,
        mismatchedFields: conflict.mismatchedFields,
        localValues: conflict.localValues,
        remoteValues: conflict.remoteValues,
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
        [ArkNotificationType.ConflictDetected]: frmPreferences.conflictDetectedEnabled,
        [ArkNotificationType.TimecardNotSubmitted]: true,
        [ArkNotificationType.TimecardLocked]: true,
        [ArkNotificationType.TimecardNotStarted]: true,
        [ArkNotificationType.TimecardRejected]: true,
        [ArkNotificationType.TimecardApproved]: true,
        [ArkNotificationType.TimecardAutoSubmitted]: true,
        [ArkNotificationType.ContractExpiring]: true,
        [ArkNotificationType.SyncConflict]: true
      }
    };
  }
}
