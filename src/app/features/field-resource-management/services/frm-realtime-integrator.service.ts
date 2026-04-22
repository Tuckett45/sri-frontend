import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FrmSignalRService, JobStatusUpdate, Reassignment } from './frm-signalr.service';
import { Assignment } from '../models/assignment.model';
import { Notification } from '../models/notification.model';
import * as JobActions from '../state/jobs/job.actions';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import * as NotificationActions from '../state/notifications/notification.actions';

/**
 * Service for integrating SignalR real-time updates with the application
 * Handles connection initialization and toast notifications for real-time events
 */
@Injectable({
  providedIn: 'root'
})
export class FrmRealtimeIntegratorService {
  private isInitialized = false;

  constructor(
    private signalRService: FrmSignalRService,
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Initializes SignalR connection and sets up event handlers
   * Should be called once on application initialization
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('FRM Real-time integrator already initialized');
      return;
    }

    try {
      // Connect to SignalR hub
      await this.signalRService.connect();
      
      // Set up event handlers
      this.setupJobAssignedHandler();
      this.setupJobStatusChangedHandler();
      this.setupJobReassignedHandler();
      this.setupNotificationHandler();
      
      this.isInitialized = true;
      console.log('FRM Real-time integrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FRM real-time integrator', error);
      // Don't throw - allow app to function without real-time updates
    }
  }

  /**
   * Disconnects from SignalR hub
   */
  async disconnect(): Promise<void> {
    try {
      await this.signalRService.disconnect();
      this.isInitialized = false;
      console.log('FRM Real-time integrator disconnected');
    } catch (error) {
      console.error('Error disconnecting FRM real-time integrator', error);
    }
  }

  /**
   * Subscribes to updates for a specific technician
   * @param technicianId Technician ID
   */
  subscribeToTechnician(technicianId: string): void {
    this.signalRService.subscribeToTechnicianUpdates(technicianId);
  }

  /**
   * Unsubscribes from updates for a specific technician
   * @param technicianId Technician ID
   */
  unsubscribeFromTechnician(technicianId: string): void {
    this.signalRService.unsubscribeFromTechnicianUpdates(technicianId);
  }

  /**
   * Sets up handler for job assigned events
   */
  private setupJobAssignedHandler(): void {
    this.signalRService.onJobAssigned((assignment: Assignment) => {
      console.log('Job assigned event received', assignment);
      
      // Dispatch action to update store
      this.store.dispatch(AssignmentActions.assignTechnicianSuccess({ assignment }));
      
      // Show toast notification
      this.snackBar.open(
        `Job ${assignment.jobId} assigned to technician`,
        'View',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        }
      );
    });
  }

  /**
   * Sets up handler for job status changed events
   */
  private setupJobStatusChangedHandler(): void {
    this.signalRService.onJobStatusChanged((update: JobStatusUpdate) => {
      console.log('Job status changed event received', update);
      
      // Note: We need to load the full job to update the store properly
      // For now, we'll trigger a reload of jobs
      // In a real implementation, the SignalR event should include the full job object
      // or we should fetch it from the API
      this.store.dispatch(JobActions.loadJobs({ filters: {} }));
      
      // Show toast notification
      const statusText = this.getStatusDisplayText(update.job.status);
      this.snackBar.open(
        `Job ${update.job.jobId} status changed to ${statusText}`,
        'View',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['info-snackbar']
        }
      );
    });
  }

  /**
   * Sets up handler for job reassigned events
   */
  private setupJobReassignedHandler(): void {
    this.signalRService.onJobReassigned((reassignment: Reassignment) => {
      console.log('Job reassigned event received', reassignment);
      
      // Note: We need the old assignment ID and new assignment object
      // For now, we'll trigger a reload of assignments
      // In a real implementation, the SignalR event should include these details
      this.store.dispatch(AssignmentActions.loadAssignments({}));
      
      // Show toast notification
      this.snackBar.open(
        `Job ${reassignment.jobId} reassigned to new technician`,
        'View',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar']
        }
      );
    });
  }

  /**
   * Sets up handler for notification events
   */
  private setupNotificationHandler(): void {
    this.signalRService.onNotification((notification: Notification) => {
      console.log('Notification event received', notification);
      
      // Dispatch action to add notification to store
      this.store.dispatch(NotificationActions.addNotification({ notification }));
      
      // Show toast notification
      this.snackBar.open(
        notification.message,
        'View',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['notification-snackbar']
        }
      );
    });
  }

  /**
   * Gets display text for job status
   * @param status Job status
   * @returns Display text
   */
  private getStatusDisplayText(status: string): string {
    const statusMap: Record<string, string> = {
      'NotStarted': 'Not Started',
      'EnRoute': 'En Route',
      'OnSite': 'On Site',
      'Completed': 'Completed',
      'Issue': 'Issue',
      'Cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }
}
