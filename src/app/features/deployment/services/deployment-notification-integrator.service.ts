import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, takeUntil, filter } from 'rxjs';
import { DeploymentsSocketService } from './deployments-socket.service';
import { DeploymentPushNotificationService } from './deployment-push-notification.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

/**
 * Service that integrates SignalR events with notifications
 * Listens to deployment events and shows appropriate notifications
 */
@Injectable({ providedIn: 'root' })
export class DeploymentNotificationIntegratorService implements OnDestroy {
  private readonly socket = inject(DeploymentsSocketService);
  private readonly pushService = inject(DeploymentPushNotificationService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);
  
  private destroy$ = new Subject<void>();
  private isInitialized = false;

  /**
   * Initialize notification integration
   * Should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Notification integrator already initialized');
      return;
    }

    // Initialize push notifications if feature flag is enabled
    const notificationsEnabled = this.featureFlags.flagEnabled('notifications')();
    if (notificationsEnabled) {
      try {
        await this.pushService.initialize();
        console.log('✅ Push notifications initialized');
      } catch (error) {
        console.error('❌ Failed to initialize push notifications:', error);
      }
    }

    // Connect to SignalR hub
    await this.socket.connect();

    // Subscribe to all deployment events
    this.subscribeToDeploymentAssigned();
    this.subscribeToDeploymentReadyForSignoff();
    this.subscribeToDeploymentIssueCreated();
    this.subscribeToDeploymentCompleted();
    
    // Also subscribe to other events for in-app notifications
    this.subscribeToPhaseAdvanced();
    this.subscribeToHandoffSigned();

    this.isInitialized = true;
    console.log('✅ Deployment notification integrator initialized');
  }

  /**
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle deployment assigned event
   */
  private subscribeToDeploymentAssigned(): void {
    this.socket.deploymentAssigned$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('📋 Deployment assigned:', event);

        const message = event.assignedTo 
          ? `${event.assignedTo} assigned to deployment`
          : 'You have been assigned to a deployment';

        // Show toastr notification
        this.toastr.info(
          message,
          event.deploymentName || 'Deployment Assigned',
          {
            timeOut: 5000,
            progressBar: true,
            positionClass: 'toast-top-right',
            tapToDismiss: true
          }
        ).onTap.subscribe(() => {
          if (event.deploymentId) {
            this.router.navigate(['/deployments', event.deploymentId]);
          }
        });
      });
  }

  /**
   * Handle deployment ready for sign-off event
   */
  private subscribeToDeploymentReadyForSignoff(): void {
    this.socket.deploymentReadyForSignoff$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('✍️ Deployment ready for sign-off:', event);

        const phaseName = this.getPhaseName(event.phase);
        const message = `${phaseName} is ready for your sign-off`;

        // Show toastr notification with higher priority
        this.toastr.warning(
          message,
          event.deploymentName || 'Sign-Off Required',
          {
            timeOut: 0, // Don't auto-dismiss
            extendedTimeOut: 0,
            closeButton: true,
            progressBar: true,
            positionClass: 'toast-top-right',
            tapToDismiss: true
          }
        ).onTap.subscribe(() => {
          if (event.deploymentId) {
            this.router.navigate(['/deployments', event.deploymentId, 'handoff']);
          }
        });
      });
  }

  /**
   * Handle deployment issue created event
   */
  private subscribeToDeploymentIssueCreated(): void {
    this.socket.deploymentIssueCreated$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('⚠️ Deployment issue created:', event);

        const severity = event.severity || 'Issue';
        const message = event.title || 'A new issue requires attention';

        // Show error toastr for critical issues
        const toastrMethod = severity === 'Critical' ? this.toastr.error : this.toastr.warning;
        
        toastrMethod.call(
          this.toastr,
          message,
          `${severity} Issue Created`,
          {
            timeOut: severity === 'Critical' ? 0 : 8000, // Critical issues don't auto-dismiss
            extendedTimeOut: 0,
            closeButton: true,
            progressBar: true,
            positionClass: 'toast-top-right',
            tapToDismiss: true
          }
        ).onTap.subscribe(() => {
          if (event.deploymentId) {
            this.router.navigate(['/deployments', event.deploymentId, 'issues']);
          }
        });
      });
  }

  /**
   * Handle deployment completed event
   */
  private subscribeToDeploymentCompleted(): void {
    this.socket.deploymentCompleted$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('🎉 Deployment completed:', event);

        const message = event.completedBy 
          ? `Completed by ${event.completedBy}`
          : 'All sign-offs complete!';

        // Show success toastr
        this.toastr.success(
          message,
          event.deploymentName || '🚀 Deployment Complete',
          {
            timeOut: 7000,
            progressBar: true,
            positionClass: 'toast-top-right',
            tapToDismiss: true
          }
        ).onTap.subscribe(() => {
          if (event.deploymentId) {
            this.router.navigate(['/deployments', event.deploymentId]);
          }
        });
      });
  }

  /**
   * Handle phase advanced event (in-app only)
   */
  private subscribeToPhaseAdvanced(): void {
    this.socket.phaseAdvanced$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('📈 Phase advanced:', event);

        const phaseName = this.getPhaseName(event.toPhase);
        
        this.toastr.info(
          `Advanced to ${phaseName}`,
          'Phase Updated',
          {
            timeOut: 4000,
            progressBar: true,
            positionClass: 'toast-top-right'
          }
        );
      });
  }

  /**
   * Handle handoff signed event (in-app only)
   */
  private subscribeToHandoffSigned(): void {
    this.socket.handoffSigned$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.featureFlags.flagEnabled('notifications')())
      )
      .subscribe((event) => {
        console.log('✅ Handoff signed:', event);

        const roleName = this.getRoleName(event.role);
        
        this.toastr.success(
          `${roleName} has signed off`,
          'Sign-Off Received',
          {
            timeOut: 5000,
            progressBar: true,
            positionClass: 'toast-top-right'
          }
        );
      });
  }

  /**
   * Get human-readable phase name
   */
  private getPhaseName(phase?: number): string {
    const phaseNames: Record<number, string> = {
      1: 'Site Survey',
      2: 'Receive & Inventory',
      3: 'Installation',
      4: 'Cabling',
      5: 'Labeling',
      6: 'Handoff'
    };
    return phase ? phaseNames[phase] || `Phase ${phase}` : 'Deployment';
  }

  /**
   * Get human-readable role name
   */
  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      'Technician': 'SRI Technician',
      'Vendor': 'Vendor Representative',
      'ComcastDE': 'Comcast DE',
      'DCOps': 'DC Operations'
    };
    return roleNames[role] || role;
  }
}

