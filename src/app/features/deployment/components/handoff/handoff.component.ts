import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { HandoffPackage, DeploymentRole, Deployment, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentRoleService } from '../../services/deployment-role.service';
import { AuthService } from 'src/app/services/auth.service';
import { ToastModule } from 'primeng/toast';

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
export class HandoffComponent implements OnInit {
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
  private projectId = '';

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
   * Load deployment data to get sign-off information
   */
  private async loadDeployment(id: string): Promise<void> {
    try {
      const deployment = await this.deploymentService.get(id);
      this.deployment.set(deployment);

      // Update sign-off state from deployment data
      if (deployment.vendorSignedBy) {
        this.vendorSignedBy.set(deployment.vendorSignedBy);
        this.vendorSignedAt.set(deployment.vendorSignedAt);
      }
      if (deployment.techSignedBy) {
        this.techSignedBy.set(deployment.techSignedBy);
        this.techSignedAt.set(deployment.techSignedAt);
      }
      if (deployment.deSignedBy) {
        this.deSignedBy.set(deployment.deSignedBy);
        this.deSignedAt.set(deployment.deSignedAt);
      }
    } catch (error) {
      console.error('Failed to load deployment', error);
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
   * Update deployment with sign-off information
   */
  private async updateDeploymentSignOff(role: DeploymentRole | null, userId: string, timestamp: string): Promise<void> {
    if (!role || !this.projectId) return;

    try {
      // This would call a backend endpoint to update deployment sign-off fields
      // For now, we update local state
      const deployment = this.deployment();
      if (!deployment) return;

      if (role === DeploymentRole.VendorRep) {
        deployment.vendorSignedBy = userId;
        deployment.vendorSignedAt = timestamp;
      } else if (role === DeploymentRole.SRITech) {
        deployment.techSignedBy = userId;
        deployment.techSignedAt = timestamp;
      } else if (role === DeploymentRole.DeploymentEngineer) {
        deployment.deSignedBy = userId;
        deployment.deSignedAt = timestamp;
      }

      this.deployment.set(deployment);
    } catch (error) {
      console.error('Failed to update deployment sign-off', error);
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
}
