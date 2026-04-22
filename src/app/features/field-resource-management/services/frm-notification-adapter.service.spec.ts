import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FrmNotificationAdapterService, FrmNotificationPreferences } from './frm-notification-adapter.service';
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

describe('FrmNotificationAdapterService', () => {
  let service: FrmNotificationAdapterService;
  let arkNotificationService: jasmine.SpyObj<ArkNotificationService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    market: 'market-1',
    role: 'CM'
  };

  beforeEach(() => {
    const arkNotificationServiceSpy = jasmine.createSpyObj('ArkNotificationService', [
      'sendNotification',
      'getNotificationPreferences',
      'configureNotificationPreferences'
    ]);

    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'isCM',
      'isAdmin'
    ]);

    TestBed.configureTestingModule({
      providers: [
        FrmNotificationAdapterService,
        { provide: ArkNotificationService, useValue: arkNotificationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(FrmNotificationAdapterService);
    arkNotificationService = TestBed.inject(ArkNotificationService) as jasmine.SpyObj<ArkNotificationService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Default auth service behavior
    authService.getUser.and.returnValue(mockUser);
    authService.isCM.and.returnValue(true);
    authService.isAdmin.and.returnValue(false);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendJobAssignedNotification', () => {
    it('should send job assigned notification with correct parameters', (done) => {
      const jobId = 'job-123';
      const technicianId = 'tech-456';
      const mockNotification: ArkNotification = {
        id: 'notif-1',
        userId: technicianId,
        market: 'market-1',
        title: 'New Job Assigned',
        message: `You have been assigned to job ${jobId}`,
        type: ArkNotificationType.JobAssigned,
        priority: ArkNotificationPriority.Normal,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date(),
        relatedEntityId: jobId,
        relatedEntityType: 'job'
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobAssignedNotification(jobId, technicianId).subscribe(notification => {
        expect(notification).toEqual(mockNotification);
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            userId: technicianId,
            type: ArkNotificationType.JobAssigned,
            relatedEntityId: jobId,
            relatedEntityType: 'job'
          })
        );
        done();
      });
    });

    it('should include market for CM users', (done) => {
      const jobId = 'job-123';
      const technicianId = 'tech-456';
      const mockNotification: ArkNotification = {
        id: 'notif-1',
        userId: technicianId,
        market: 'market-1',
        title: 'New Job Assigned',
        message: `You have been assigned to job ${jobId}`,
        type: ArkNotificationType.JobAssigned,
        priority: ArkNotificationPriority.Normal,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobAssignedNotification(jobId, technicianId).subscribe(() => {
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            market: 'market-1'
          })
        );
        done();
      });
    });
  });

  describe('sendJobReassignedNotification', () => {
    it('should send job reassigned notification with high priority', (done) => {
      const jobId = 'job-123';
      const oldTechnicianId = 'tech-old';
      const newTechnicianId = 'tech-new';
      const mockNotification: ArkNotification = {
        id: 'notif-2',
        userId: newTechnicianId,
        market: 'market-1',
        title: 'Job Reassigned',
        message: `Job ${jobId} has been reassigned to you`,
        type: ArkNotificationType.JobReassigned,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobReassignedNotification(jobId, oldTechnicianId, newTechnicianId).subscribe(notification => {
        expect(notification.priority).toBe(ArkNotificationPriority.High);
        expect(notification.type).toBe(ArkNotificationType.JobReassigned);
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            userId: newTechnicianId,
            priority: ArkNotificationPriority.High
          })
        );
        done();
      });
    });
  });

  describe('sendJobStatusChangedNotification', () => {
    it('should send job status changed notification with normal priority for regular status', (done) => {
      const jobId = 'job-123';
      const oldStatus = 'pending';
      const newStatus = 'in-progress';
      const mockNotification: ArkNotification = {
        id: 'notif-3',
        userId: mockUser.id,
        market: 'market-1',
        title: 'Job Status Updated',
        message: `Job ${jobId} status changed from ${oldStatus} to ${newStatus}`,
        type: ArkNotificationType.JobStatusChanged,
        priority: ArkNotificationPriority.Normal,
        channels: [ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobStatusChangedNotification(jobId, oldStatus, newStatus).subscribe(notification => {
        expect(notification.priority).toBe(ArkNotificationPriority.Normal);
        expect(notification.type).toBe(ArkNotificationType.JobStatusChanged);
        done();
      });
    });

    it('should send job status changed notification with high priority for completed status', (done) => {
      const jobId = 'job-123';
      const oldStatus = 'in-progress';
      const newStatus = 'completed';
      const mockNotification: ArkNotification = {
        id: 'notif-4',
        userId: mockUser.id,
        market: 'market-1',
        title: 'Job Status Updated',
        message: `Job ${jobId} status changed from ${oldStatus} to ${newStatus}`,
        type: ArkNotificationType.JobStatusChanged,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobStatusChangedNotification(jobId, oldStatus, newStatus).subscribe(() => {
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            priority: ArkNotificationPriority.High
          })
        );
        done();
      });
    });
  });

  describe('sendJobCancelledNotification', () => {
    it('should send job cancelled notification with high priority', (done) => {
      const jobId = 'job-123';
      const reason = 'Client request';
      const mockNotification: ArkNotification = {
        id: 'notif-5',
        userId: mockUser.id,
        market: 'market-1',
        title: 'Job Cancelled',
        message: `Job ${jobId} has been cancelled. Reason: ${reason}`,
        type: ArkNotificationType.JobCancelled,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendJobCancelledNotification(jobId, reason).subscribe(notification => {
        expect(notification.priority).toBe(ArkNotificationPriority.High);
        expect(notification.type).toBe(ArkNotificationType.JobCancelled);
        expect(notification.message).toContain(reason);
        done();
      });
    });
  });

  describe('sendCertificationExpiringNotification', () => {
    it('should send certification expiring notification with normal priority for distant expiry', (done) => {
      const technicianId = 'tech-123';
      const certificationName = 'Safety Certification';
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const mockNotification: ArkNotification = {
        id: 'notif-6',
        userId: technicianId,
        market: 'market-1',
        title: 'Certification Expiring Soon',
        message: `Your ${certificationName} certification will expire in 30 days`,
        type: ArkNotificationType.CertificationExpiring,
        priority: ArkNotificationPriority.Normal,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendCertificationExpiringNotification(technicianId, certificationName, expiryDate).subscribe(() => {
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            priority: ArkNotificationPriority.Normal,
            type: ArkNotificationType.CertificationExpiring
          })
        );
        done();
      });
    });

    it('should send certification expiring notification with high priority for imminent expiry', (done) => {
      const technicianId = 'tech-123';
      const certificationName = 'Safety Certification';
      const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const mockNotification: ArkNotification = {
        id: 'notif-7',
        userId: technicianId,
        market: 'market-1',
        title: 'Certification Expiring Soon',
        message: `Your ${certificationName} certification will expire in 5 days`,
        type: ArkNotificationType.CertificationExpiring,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendCertificationExpiringNotification(technicianId, certificationName, expiryDate).subscribe(() => {
        expect(arkNotificationService.sendNotification).toHaveBeenCalledWith(
          jasmine.objectContaining({
            priority: ArkNotificationPriority.High
          })
        );
        done();
      });
    });
  });

  describe('sendConflictDetectedNotification', () => {
    it('should send conflict detected notification with high priority', (done) => {
      const conflictType = 'schedule';
      const details = 'Overlapping job assignments detected';
      const mockNotification: ArkNotification = {
        id: 'notif-8',
        userId: mockUser.id,
        market: 'market-1',
        title: 'schedule Conflict Detected',
        message: details,
        type: ArkNotificationType.ConflictDetected,
        priority: ArkNotificationPriority.High,
        channels: [ArkNotificationChannel.Email, ArkNotificationChannel.InApp],
        status: ArkNotificationStatus.Pending,
        createdAt: new Date()
      };

      arkNotificationService.sendNotification.and.returnValue(of(mockNotification));

      service.sendConflictDetectedNotification(conflictType, details).subscribe(notification => {
        expect(notification.priority).toBe(ArkNotificationPriority.High);
        expect(notification.type).toBe(ArkNotificationType.ConflictDetected);
        expect(notification.message).toBe(details);
        done();
      });
    });
  });

  describe('getFrmNotificationPreferences', () => {
    it('should map ARK preferences to FRM preferences', (done) => {
      const userId = 'user-123';
      const arkPreferences: ArkNotificationPreferences = {
        userId,
        email: true,
        inApp: true,
        sms: false,
        approvalReminders: true,
        escalationAlerts: true,
        dailyDigest: false,
        notificationTypes: {
          [ArkNotificationType.JobAssigned]: true,
          [ArkNotificationType.JobReassigned]: false,
          [ArkNotificationType.JobStatusChanged]: true,
          [ArkNotificationType.JobCancelled]: true,
          [ArkNotificationType.CertificationExpiring]: false,
          [ArkNotificationType.ConflictDetected]: true,
          [ArkNotificationType.ApprovalReminder]: true,
          [ArkNotificationType.CriticalIssue]: true,
          [ArkNotificationType.Broadcast]: true,
          [ArkNotificationType.WorkflowUpdate]: true,
          [ArkNotificationType.UserManagement]: true,
          [ArkNotificationType.ResourceAllocation]: true,
          [ArkNotificationType.Reporting]: true
        }
      };

      arkNotificationService.getNotificationPreferences.and.returnValue(of(arkPreferences));

      service.getFrmNotificationPreferences(userId).subscribe(frmPreferences => {
        expect(frmPreferences.userId).toBe(userId);
        expect(frmPreferences.emailEnabled).toBe(true);
        expect(frmPreferences.inAppEnabled).toBe(true);
        expect(frmPreferences.jobAssignedEnabled).toBe(true);
        expect(frmPreferences.jobReassignedEnabled).toBe(false);
        expect(frmPreferences.jobStatusChangedEnabled).toBe(true);
        expect(frmPreferences.jobCancelledEnabled).toBe(true);
        expect(frmPreferences.certificationExpiringEnabled).toBe(false);
        expect(frmPreferences.conflictDetectedEnabled).toBe(true);
        done();
      });
    });
  });

  describe('updateFrmNotificationPreferences', () => {
    it('should map FRM preferences to ARK preferences and update', (done) => {
      const frmPreferences: FrmNotificationPreferences = {
        userId: 'user-123',
        emailEnabled: true,
        inAppEnabled: false,
        jobAssignedEnabled: true,
        jobReassignedEnabled: false,
        jobStatusChangedEnabled: true,
        jobCancelledEnabled: false,
        certificationExpiringEnabled: true,
        conflictDetectedEnabled: false
      };

      const updatedArkPreferences: ArkNotificationPreferences = {
        userId: 'user-123',
        email: true,
        inApp: false,
        sms: false,
        approvalReminders: true,
        escalationAlerts: true,
        dailyDigest: false,
        notificationTypes: {
          [ArkNotificationType.JobAssigned]: true,
          [ArkNotificationType.JobReassigned]: false,
          [ArkNotificationType.JobStatusChanged]: true,
          [ArkNotificationType.JobCancelled]: false,
          [ArkNotificationType.CertificationExpiring]: true,
          [ArkNotificationType.ConflictDetected]: false,
          [ArkNotificationType.ApprovalReminder]: true,
          [ArkNotificationType.CriticalIssue]: true,
          [ArkNotificationType.Broadcast]: true,
          [ArkNotificationType.WorkflowUpdate]: true,
          [ArkNotificationType.UserManagement]: true,
          [ArkNotificationType.ResourceAllocation]: true,
          [ArkNotificationType.Reporting]: true
        }
      };

      arkNotificationService.configureNotificationPreferences.and.returnValue(of(updatedArkPreferences));

      service.updateFrmNotificationPreferences(frmPreferences).subscribe(result => {
        expect(result.emailEnabled).toBe(true);
        expect(result.inAppEnabled).toBe(false);
        expect(result.jobAssignedEnabled).toBe(true);
        expect(result.jobReassignedEnabled).toBe(false);
        expect(arkNotificationService.configureNotificationPreferences).toHaveBeenCalledWith(
          jasmine.objectContaining({
            email: true,
            inApp: false,
            notificationTypes: jasmine.objectContaining({
              [ArkNotificationType.JobAssigned]: true,
              [ArkNotificationType.JobReassigned]: false
            })
          })
        );
        done();
      });
    });
  });
});
