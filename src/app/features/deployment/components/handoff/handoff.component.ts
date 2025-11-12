import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { PhotoUploaderComponent } from '../photo-uploader/photo-uploader.component';
import { TestsUploaderComponent } from '../tests-uploader/tests-uploader.component';
import { MessageService } from 'primeng/api';
import { DeploymentService, HandoffUpdateDto } from '../../services/deployment.service';
import { HandoffPackage, DeploymentRole, Deployment, DeploymentStatus, SignOffType } from '../../models/deployment.models';
import { DeploymentRoleService } from '../../services/deployment-role.service';
import { AuthService } from 'src/app/services/auth.service';
import { ToastModule } from 'primeng/toast';
import { DeploymentSignalRService } from '../../services/deployment-signalr.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';

@Component({
  selector: 'ark-handoff',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    ToastModule,
    PhotoUploaderComponent,
    TestsUploaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './handoff.component.html',
  styleUrls: ['./handoff.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoffComponent implements OnInit, OnDestroy {
  protected readonly form = inject(FormBuilder).nonNullable.group({
    cabinetPhotos: [[] as string[]],
    asBuilt: [[] as string[]],
    portTests: [[] as string[]],
    vendorSigned: [false],
    deSigned: [false],
    techSigned: [false],
  });

  // Default to 6, but we’ll prefer the package’s requiredPhotos length if present
  protected readonly defaultRequiredPhotoCount = 6;
  protected readonly loading = signal(true);
  protected readonly pkg = signal<HandoffPackage | null>(null);

  // Role-based signals
  protected readonly currentUserRole = signal<DeploymentRole | null>(null);
  protected readonly canAccess = signal(true);
  protected readonly canSignOff = signal(false);
  protected readonly deployment = signal<Deployment | null>(null);
  protected readonly roleColor = signal('#95A5A6');

  // Sign-off state signals
  protected readonly vendorSignedBy = signal<string | undefined>(undefined);
  protected readonly vendorSignedAt = signal<string | undefined>(undefined);
  protected readonly deSignedBy = signal<string | undefined>(undefined);
  protected readonly deSignedAt = signal<string | undefined>(undefined);
  protected readonly techSignedBy = signal<string | undefined>(undefined);
  protected readonly techSignedAt = signal<string | undefined>(undefined);

  // Computed signals for sign-off validation
  protected readonly isVendorSignedOff = computed(() => !!this.vendorSignedBy());
  protected readonly isTechSignedOff = computed(() => !!this.techSignedBy());
  protected readonly isDeSignedOff = computed(() => !!this.deSignedBy());
  protected readonly isFullySignedOff = computed(() => 
    this.isVendorSignedOff() && this.isTechSignedOff() && this.isDeSignedOff()
  );

  // Determine which role needs to sign off next
  protected readonly nextPendingRole = computed<DeploymentRole | null>(() => {
    if (!this.isVendorSignedOff()) return DeploymentRole.VendorRep;
    if (!this.isTechSignedOff()) return DeploymentRole.SRITech;
    if (!this.isDeSignedOff()) return DeploymentRole.DeploymentEngineer;
    return null;
  });

  // Check if current user can sign off
  protected readonly canUserSignOff = computed(() => {
    const userRole = this.currentUserRole();
    const nextRole = this.nextPendingRole();
    return userRole === nextRole && this.canSignOff();
  });

  private readonly deploymentService = inject(DeploymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly roleService = inject(DeploymentRoleService);
  protected readonly authService = inject(AuthService);
  private readonly signalRService = inject(DeploymentSignalRService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private projectId = '';
  
  // SignalR connection state
  private signalRConnected = false;

  protected package(): HandoffPackage | null {
    return this.pkg();
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.projectId = id;

    // Initialize role-based access control
    this.initializeRoleAccess();

    // Check if user can access handoff phase
    if (!this.canAccess()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Access Denied',
        detail: 'You do not have permission to access the handoff phase'
      });
      this.loading.set(false);
      return;
    }

    // Load deployment and handoff data
    await this.loadDeployment(id);
    void this.loadHandoffPackage(id);

    // Connect to SignalR for real-time updates (if notifications enabled)
    await this.connectToSignalR();
  }

  ngOnDestroy(): void {
    // Disconnect from SignalR when component is destroyed
    if (this.signalRConnected) {
      void this.signalRService.disconnect();
      this.signalRConnected = false;
    }
  }

  /**
   * Initialize role-based access control for handoff phase
   */
  private initializeRoleAccess(): void {
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      this.canAccess.set(false);
      return;
    }

    const userRole = this.authService.getUserRole();
    const userCompany = currentUser.company;

    // Map user role to deployment role
    const deploymentRole = this.roleService.mapUserRoleToDeploymentRole(userRole, userCompany);
    this.currentUserRole.set(deploymentRole);

    // Check handoff phase access
    const hasAccess = this.roleService.canAccessPhase(userRole, userCompany, DeploymentStatus.Handoff);
    this.canAccess.set(hasAccess);

    // Check sign-off permission
    const canSign = this.roleService.canSignOffPhase(userRole, userCompany, DeploymentStatus.Handoff);
    this.canSignOff.set(canSign);

    // Get role color
    if (deploymentRole) {
      this.roleColor.set(this.roleService.getRoleColor(deploymentRole));
    }
  }

  /**
   * Load deployment data and sign-off status
   */
  private async loadDeployment(id: string): Promise<void> {
    try {
      // Load deployment basic info
      const deployment = await this.deploymentService.get(id);
      this.deployment.set(deployment);

      // Load detailed sign-off status from backend
      try {
        const signOffStatus = await this.deploymentService.getSignOffStatus(id);
        
        // Update sign-off state with detailed status
        this.vendorSignedBy.set(signOffStatus.vendorSignedBy);
        this.vendorSignedAt.set(signOffStatus.vendorSignedAt);
        this.techSignedBy.set(signOffStatus.techSignedBy);
        this.techSignedAt.set(signOffStatus.techSignedAt);
        this.deSignedBy.set(signOffStatus.deSignedBy);
        this.deSignedAt.set(signOffStatus.deSignedAt);
      } catch (signOffError) {
        // Fallback to deployment data if sign-off status endpoint fails
        console.warn('Failed to load sign-off status, falling back to deployment data', signOffError);
        this.vendorSignedBy.set(deployment.vendorSignedBy);
        this.vendorSignedAt.set(deployment.vendorSignedAt);
        this.techSignedBy.set(deployment.techSignedBy);
        this.techSignedAt.set(deployment.techSignedAt);
        this.deSignedBy.set(deployment.deSignedBy);
        this.deSignedAt.set(deployment.deSignedAt);
      }
    } catch (error) {
      console.error('Failed to load deployment', error);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Failed to load deployment data', 
        detail: 'Please refresh the page' 
      });
    }
  }

  protected onPhotosChange(ids: string[]) {
    this.form.patchValue({ cabinetPhotos: ids });
  }

  protected onAsBuiltChange(ids: string[]) {
    this.form.patchValue({ asBuilt: ids });
  }

  protected onPortTestsChange(ids: string[]) {
    this.form.patchValue({ portTests: ids });
  }

  protected get requiredPhotoCount(): number {
    const p = this.pkg();
    return p?.requiredPhotos?.length ?? this.defaultRequiredPhotoCount;
  }

  protected canSign(): boolean {
    const { cabinetPhotos, asBuilt, portTests } = this.form.getRawValue();
    const documentsComplete = (
      Array.isArray(cabinetPhotos) && cabinetPhotos.length >= this.requiredPhotoCount &&
      Array.isArray(asBuilt) && asBuilt.length > 0 &&
      Array.isArray(portTests) && portTests.length > 0
    );

    // Must have documents AND user must be able to sign off in the correct sequence
    return documentsComplete && this.canUserSignOff();
  }

  protected async sign(): Promise<void> {
    if (!this.projectId) return;
    if (!this.canSign()) return;

    const currentUser = this.authService.getUser();
    if (!currentUser) return;

    const {
      cabinetPhotos = [],
      asBuilt = [],
      portTests = [],
    } = this.form.getRawValue();

    const userRole = this.currentUserRole();
    const now = new Date().toISOString();

    // Determine which sign-off fields to update based on user's role
    let vendorSignedAt: string | null = null;
    let techSignedAt: string | null = null;
    let deSignedAt: string | null = null;

    if (userRole === DeploymentRole.VendorRep) {
      vendorSignedAt = now;
      this.vendorSignedBy.set(currentUser.id);
      this.vendorSignedAt.set(now);
    } else if (userRole === DeploymentRole.SRITech) {
      techSignedAt = now;
      this.techSignedBy.set(currentUser.id);
      this.techSignedAt.set(now);
    } else if (userRole === DeploymentRole.DeploymentEngineer) {
      deSignedAt = now;
      this.deSignedBy.set(currentUser.id);
      this.deSignedAt.set(now);
    }

    const payload: HandoffUpdateDto = {
      requiredPhotos: cabinetPhotos,
      asBuiltFileId: asBuilt[0] ?? null,
      portTestFileId: portTests[0] ?? null,
      signedVendorAt: vendorSignedAt,
      signedDeAt: deSignedAt,
    };

    this.loading.set(true);
    try {
      const pkg = await this.deploymentService.signHandoff(this.projectId, payload);
      this.applyPackage(pkg);
      
      // Update deployment with sign-off information
      await this.updateDeploymentSignOff(userRole, currentUser.id, now);
      
      const roleName = userRole || 'User';
      this.messageService.add({ 
        severity: 'success', 
        summary: `${roleName} sign-off recorded successfully` 
      });
      
      // Check if all sign-offs are complete
      if (this.isFullySignedOff()) {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'All sign-offs complete!', 
          detail: 'Deployment handoff is ready for completion' 
        });
      }
    } catch (error) {
      console.error('Failed to sign handoff', error);
      this.messageService.add({ severity: 'error', summary: 'Failed to record sign-off.' });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update deployment with sign-off information via backend API
   */
  private async updateDeploymentSignOff(role: DeploymentRole | null, userId: string, timestamp: string): Promise<void> {
    if (!role || !this.projectId) return;

    try {
      // Map deployment role to sign-off type
      let signOffType: SignOffType;
      if (role === DeploymentRole.VendorRep) {
        signOffType = SignOffType.Vendor;
      } else if (role === DeploymentRole.DeploymentEngineer) {
        signOffType = SignOffType.DE;
      } else if (role === DeploymentRole.SRITech) {
        signOffType = SignOffType.Tech;
      } else {
        console.warn('Unknown deployment role for sign-off:', role);
        return;
      }

      // Call backend to record sign-off
      const status = await this.deploymentService.recordSignOff(this.projectId, signOffType, userId);
      
      // Update local state with backend response
      this.vendorSignedBy.set(status.vendorSignedBy);
      this.vendorSignedAt.set(status.vendorSignedAt);
      this.techSignedBy.set(status.techSignedBy);
      this.techSignedAt.set(status.techSignedAt);
      this.deSignedBy.set(status.deSignedBy);
      this.deSignedAt.set(status.deSignedAt);

      // Update deployment object
      const deployment = this.deployment();
      if (deployment) {
        deployment.vendorSignedBy = status.vendorSignedBy;
        deployment.vendorSignedAt = status.vendorSignedAt;
        deployment.techSignedBy = status.techSignedBy;
        deployment.techSignedAt = status.techSignedAt;
        deployment.deSignedBy = status.deSignedBy;
        deployment.deSignedAt = status.deSignedAt;
        deployment.isFullySignedOff = status.isFullySignedOff;
        this.deployment.set(deployment);
      }
    } catch (error) {
      console.error('Failed to record sign-off with backend', error);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Failed to record sign-off', 
        detail: 'Please try again or contact support' 
      });
      throw error; // Re-throw to be handled by the sign() method
    }
  }

  private async loadHandoffPackage(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const pkg = await this.deploymentService.getHandoff(id); // returns HandoffPackage
      this.applyPackage(pkg);
    } catch (error) {
      console.error('Failed to load handoff package', error);
      this.messageService.add({ severity: 'error', summary: 'Unable to load handoff package.' });
    } finally {
      this.loading.set(false);
    }
  }

  private applyPackage(pkg: HandoffPackage): void {
    this.pkg.set(pkg);
    this.form.patchValue(
      {
        cabinetPhotos: pkg.requiredPhotos ?? [],
        asBuilt: pkg.asBuiltFileId ? [pkg.asBuiltFileId] : [],
        portTests: pkg.portTestFileId ? [pkg.portTestFileId] : [],
        vendorSigned: !!pkg.signedVendorAt,
        deSigned: !!pkg.signedDeAt,
      },
      { emitEvent: false }
    );
  }

  // ===========================
  // SignalR Real-Time Updates
  // ===========================

  /**
   * Connect to SignalR hub for real-time sign-off notifications
   */
  private async connectToSignalR(): Promise<void> {
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      console.warn('Cannot connect to SignalR: No user logged in');
      return;
    }

    // Check if deployment notifications feature flag is enabled
    const notificationsEnabled = this.featureFlagService.flagEnabled('deploymentNotifications')();
    if (!notificationsEnabled) {
      console.log('SignalR notifications disabled via feature flag');
      return;
    }

    try {
      // Connect to SignalR hub
      await this.signalRService.connect(currentUser.id);
      this.signalRConnected = true;
      console.log('✅ Connected to SignalR for handoff real-time updates');

      // Set up event listeners for sign-off events
      this.setupSignalRListeners();
    } catch (error) {
      console.error('Failed to connect to SignalR for handoff updates:', error);
      // Don't show error to user - SignalR is enhancement, not critical
    }
  }

  /**
   * Set up SignalR event listeners for sign-off events
   */
  private setupSignalRListeners(): void {
    // Get notifications observable from SignalR service
    const notifications = this.signalRService.getNotifications();

    // Subscribe to notifications and filter for this deployment
    notifications().forEach(notification => {
      // Only process notifications for this deployment
      if (notification.deploymentId !== this.projectId) {
        return;
      }

      // Handle SignOffRecorded event
      if (notification.type === 'signoff_recorded') {
        console.log('📢 SignalR: Sign-off recorded event received', notification);
        this.handleSignOffRecordedEvent(notification);
      }

      // Handle ReadyForSignOff event
      if (notification.type === 'ready_for_signoff') {
        console.log('📢 SignalR: Ready for sign-off event received', notification);
        this.handleReadyForSignOffEvent(notification);
      }

      // Handle DeploymentCompleted event
      if (notification.type === 'completed') {
        console.log('📢 SignalR: Deployment completed event received', notification);
        this.handleDeploymentCompletedEvent(notification);
      }
    });
  }

  /**
   * Handle SignOffRecorded event from SignalR
   */
  private async handleSignOffRecordedEvent(notification: any): Promise<void> {
    try {
      // Refresh sign-off status from backend
      const status = await this.deploymentService.getSignOffStatus(this.projectId);
      
      // Update all sign-off signals with latest data
      this.vendorSignedBy.set(status.vendorSignedBy);
      this.vendorSignedAt.set(status.vendorSignedAt);
      this.techSignedBy.set(status.techSignedBy);
      this.techSignedAt.set(status.techSignedAt);
      this.deSignedBy.set(status.deSignedBy);
      this.deSignedAt.set(status.deSignedAt);

      // Update deployment object
      const deployment = this.deployment();
      if (deployment) {
        deployment.vendorSignedBy = status.vendorSignedBy;
        deployment.vendorSignedAt = status.vendorSignedAt;
        deployment.techSignedBy = status.techSignedBy;
        deployment.techSignedAt = status.techSignedAt;
        deployment.deSignedBy = status.deSignedBy;
        deployment.deSignedAt = status.deSignedAt;
        deployment.isFullySignedOff = status.isFullySignedOff;
        this.deployment.set(deployment);
      }

      console.log('✅ Sign-off status updated from SignalR event');
    } catch (error) {
      console.error('Failed to refresh sign-off status after SignalR event:', error);
    }
  }

  /**
   * Handle ReadyForSignOff event from SignalR
   */
  private handleReadyForSignOffEvent(notification: any): void {
    const currentUserRole = this.currentUserRole();
    const nextPendingRole = this.nextPendingRole();

    // Check if this notification is for the current user's role
    if (currentUserRole === nextPendingRole) {
      this.messageService.add({
        severity: 'info',
        summary: 'Ready for Your Sign-Off',
        detail: notification.message || 'The deployment is ready for your sign-off',
        life: 8000 // Show for 8 seconds
      });
    }
  }

  /**
   * Handle DeploymentCompleted event from SignalR
   */
  private handleDeploymentCompletedEvent(notification: any): void {
    this.messageService.add({
      severity: 'success',
      summary: '🎉 Deployment Complete!',
      detail: notification.message || 'All sign-offs have been completed',
      life: 10000 // Show for 10 seconds
    });
  }
}
