import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HandoffComponent } from './handoff.component';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentRoleService } from '../../services/deployment-role.service';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { DeploymentRole, DeploymentStatus, SignOffType, SignOffStatus, HandoffPackage } from '../../models/deployment.models';
import { signal } from '@angular/core';
import { DeploymentSignalRService } from '../../services/deployment-signalr.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { UserRole } from 'src/app/models/role.enum';

describe('HandoffComponent', () => {
  let component: HandoffComponent;
  let fixture: ComponentFixture<HandoffComponent>;
  let mockDeploymentService: jasmine.SpyObj<DeploymentService>;
  let mockRoleService: jasmine.SpyObj<DeploymentRoleService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockSignalRService: jasmine.SpyObj<DeploymentSignalRService>;
  let mockFeatureFlagService: jasmine.SpyObj<FeatureFlagService>;
  const createHandoffPackage = (overrides: Partial<HandoffPackage> = {}): HandoffPackage => ({
    id: 'handoff-123',
    deploymentId: 'deploy-123',
    requiredPhotos: [],
    asBuiltFileId: null,
    portTestFileId: null,
    signedVendorBy: undefined,
    signedVendorAt: null,
    signedDeBy: undefined,
    signedDeAt: null,
    packageUrl: undefined,
    ...overrides
  });

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    company: 'SRI',
    role: UserRole.SRITech
  };

  const mockDeployment = {
    id: 'deploy-123',
    name: 'Test Deployment',
    dataCenter: 'DC1',
    vendorName: 'Vendor A',
    status: DeploymentStatus.Handoff,
    vendorSignedBy: undefined,
    vendorSignedAt: undefined,
    techSignedBy: undefined,
    techSignedAt: undefined,
    deSignedBy: undefined,
    deSignedAt: undefined,
    isFullySignedOff: false
  };

  const mockSignOffStatus: SignOffStatus = {
    deploymentId: 'deploy-123',
    deploymentName: 'Test Deployment',
    vendorSigned: false,
    vendorSignedBy: undefined,
    vendorSignerName: undefined,
    vendorSignedAt: undefined,
    deSigned: false,
    deSignedBy: undefined,
    deSignerName: undefined,
    deSignedAt: undefined,
    techSigned: false,
    techSignedBy: undefined,
    techSignerName: undefined,
    techSignedAt: undefined,
    isFullySignedOff: false,
    pendingSignOffFrom: 'Vendor',
    completedSignOffs: [],
    pendingSignOffs: ['Vendor', 'Tech', 'DE']
  };

  beforeEach(async () => {
    mockDeploymentService = jasmine.createSpyObj('DeploymentService', [
      'get',
      'getHandoff',
      'signHandoff',
      'recordSignOff',
      'getSignOffStatus'
    ]);

    mockRoleService = jasmine.createSpyObj('DeploymentRoleService', [
      'mapUserRoleToDeploymentRole',
      'canAccessPhase',
      'canSignOffPhase',
      'getRoleColor'
    ]);

    mockAuthService = jasmine.createSpyObj('AuthService', ['getUser', 'getUserRole']);

    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);

    mockSignalRService = jasmine.createSpyObj('DeploymentSignalRService', [
      'connect',
      'disconnect',
      'getNotifications',
      'getConnectionState'
    ]);

    mockFeatureFlagService = jasmine.createSpyObj('FeatureFlagService', ['flagEnabled']);

    await TestBed.configureTestingModule({
      imports: [HandoffComponent],
      providers: [
        { provide: DeploymentService, useValue: mockDeploymentService },
        { provide: DeploymentRoleService, useValue: mockRoleService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: DeploymentSignalRService, useValue: mockSignalRService },
        { provide: FeatureFlagService, useValue: mockFeatureFlagService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: jasmine.createSpy('get').and.returnValue('deploy-123')
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HandoffComponent);
    component = fixture.componentInstance;

    // Setup default mock returns
    mockAuthService.getUser.and.returnValue(mockUser);
    mockAuthService.getUserRole.and.returnValue(UserRole.SRITech);
    mockDeploymentService.get.and.returnValue(Promise.resolve(mockDeployment));
    mockDeploymentService.getSignOffStatus.and.returnValue(Promise.resolve(mockSignOffStatus));
    mockDeploymentService.getHandoff.and.returnValue(Promise.resolve(createHandoffPackage()));
    mockRoleService.mapUserRoleToDeploymentRole.and.returnValue(DeploymentRole.SRITech);
    mockRoleService.canAccessPhase.and.returnValue(true);
    mockRoleService.canSignOffPhase.and.returnValue(true);
    mockRoleService.getRoleColor.and.returnValue('#95A5A6');
    
    // Setup SignalR and FeatureFlag mocks
    mockSignalRService.connect.and.returnValue(Promise.resolve());
    mockSignalRService.disconnect.and.returnValue(Promise.resolve());
    mockSignalRService.getNotifications.and.returnValue(signal([]));
    mockSignalRService.getConnectionState.and.returnValue(signal('Connected' as any));
    mockFeatureFlagService.flagEnabled.and.returnValue(signal(true));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Role-Based Access Control', () => {
    it('should initialize user role on component init', async () => {
      await component.ngOnInit();
      expect(mockRoleService.mapUserRoleToDeploymentRole).toHaveBeenCalledWith(UserRole.SRITech, 'SRI');
      expect(component['currentUserRole']()).toBe(DeploymentRole.SRITech);
    });

    it('should deny access when user has no permission', async () => {
      mockRoleService.canAccessPhase.and.returnValue(false);
      await component.ngOnInit();
      expect(component['canAccess']()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'warn',
          summary: 'Access Denied'
        })
      );
    });

    it('should grant access when user has permission', async () => {
      await component.ngOnInit();
      expect(component['canAccess']()).toBe(true);
    });
  });

  describe('Sign-Off Sequence Validation', () => {
    it('should determine next pending role correctly when no sign-offs', () => {
      component['vendorSignedBy'].set(undefined);
      component['techSignedBy'].set(undefined);
      component['deSignedBy'].set(undefined);
      expect(component['nextPendingRole']()).toBe(DeploymentRole.VendorRep);
    });

    it('should determine next pending role after vendor signs', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set(undefined);
      component['deSignedBy'].set(undefined);
      expect(component['nextPendingRole']()).toBe(DeploymentRole.SRITech);
    });

    it('should determine next pending role after vendor and tech sign', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      component['deSignedBy'].set(undefined);
      expect(component['nextPendingRole']()).toBe(DeploymentRole.DeploymentEngineer);
    });

    it('should return null when all sign-offs complete', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      component['deSignedBy'].set('de-123');
      expect(component['nextPendingRole']()).toBeNull();
    });

    it('should only allow user to sign when their turn in sequence', () => {
      component['currentUserRole'].set(DeploymentRole.SRITech);
      component['canSignOff'].set(true);
      component['vendorSignedBy'].set(undefined);
      
      // Tech cannot sign before Vendor
      expect(component['canUserSignOff']()).toBe(false);
      
      // After Vendor signs, Tech can sign
      component['vendorSignedBy'].set('vendor-123');
      expect(component['canUserSignOff']()).toBe(true);
    });
  });

  describe('Sign-Off Recording', () => {
    beforeEach(() => {
      component['projectId'] = 'deploy-123';
      component['currentUserRole'].set(DeploymentRole.VendorRep);
      component['canSignOff'].set(true);
      component['form'].patchValue({
        cabinetPhotos: ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6'],
        asBuilt: ['asbuilt1'],
        portTests: ['porttest1']
      });
    });

    it('should call backend to record vendor sign-off', async () => {
      const mockStatus: SignOffStatus = {
        ...mockSignOffStatus,
        vendorSigned: true,
        vendorSignedBy: 'user-123',
        vendorSignedAt: new Date().toISOString()
      };
      
      mockDeploymentService.recordSignOff.and.returnValue(Promise.resolve(mockStatus));
      mockDeploymentService.signHandoff.and.returnValue(
        Promise.resolve(
          createHandoffPackage({
            requiredPhotos: ['photo1'],
            asBuiltFileId: 'asbuilt1',
            portTestFileId: 'porttest1',
            signedVendorAt: new Date().toISOString(),
            signedDeAt: null
          })
        )
      );

      await component['sign']();

      expect(mockDeploymentService.recordSignOff).toHaveBeenCalledWith(
        'deploy-123',
        SignOffType.Vendor,
        'user-123'
      );
      expect(component['vendorSignedBy']()).toBe('user-123');
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: jasmine.stringContaining('sign-off recorded successfully')
        })
      );
    });

    it('should call backend to record tech sign-off', async () => {
      component['currentUserRole'].set(DeploymentRole.SRITech);
      component['vendorSignedBy'].set('vendor-123'); // Vendor already signed
      
      const mockStatus: SignOffStatus = {
        ...mockSignOffStatus,
        vendorSigned: true,
        vendorSignedBy: 'vendor-123',
        techSigned: true,
        techSignedBy: 'user-123',
        techSignedAt: new Date().toISOString()
      };
      
      mockDeploymentService.recordSignOff.and.returnValue(Promise.resolve(mockStatus));
      mockDeploymentService.signHandoff.and.returnValue(
        Promise.resolve(
          createHandoffPackage({
            requiredPhotos: ['photo1'],
            asBuiltFileId: 'asbuilt1',
            portTestFileId: 'porttest1',
            signedVendorAt: new Date().toISOString(),
            signedDeAt: null
          })
        )
      );

      await component['sign']();

      expect(mockDeploymentService.recordSignOff).toHaveBeenCalledWith(
        'deploy-123',
        SignOffType.Tech,
        'user-123'
      );
      expect(component['techSignedBy']()).toBe('user-123');
    });

    it('should call backend to record DE sign-off', async () => {
      component['currentUserRole'].set(DeploymentRole.DeploymentEngineer);
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      
      const mockStatus: SignOffStatus = {
        ...mockSignOffStatus,
        vendorSigned: true,
        vendorSignedBy: 'vendor-123',
        techSigned: true,
        techSignedBy: 'tech-123',
        deSigned: true,
        deSignedBy: 'user-123',
        deSignedAt: new Date().toISOString(),
        isFullySignedOff: true
      };
      
      mockDeploymentService.recordSignOff.and.returnValue(Promise.resolve(mockStatus));
      mockDeploymentService.signHandoff.and.returnValue(
        Promise.resolve(
          createHandoffPackage({
            requiredPhotos: ['photo1'],
            asBuiltFileId: 'asbuilt1',
            portTestFileId: 'porttest1',
            signedVendorAt: new Date().toISOString(),
            signedDeAt: new Date().toISOString()
          })
        )
      );

      await component['sign']();

      expect(mockDeploymentService.recordSignOff).toHaveBeenCalledWith(
        'deploy-123',
        SignOffType.DE,
        'user-123'
      );
      expect(component['deSignedBy']()).toBe('user-123');
      expect(component['isFullySignedOff']()).toBe(true);
    });

    it('should show completion message when all sign-offs complete', async () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      component['deSignedBy'].set('de-123');

      expect(component['isFullySignedOff']()).toBe(true);
    });

    it('should handle backend errors gracefully', async () => {
      mockDeploymentService.recordSignOff.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      await expectAsync(component['sign']()).toBeRejected();

      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: jasmine.stringContaining('Failed')
        })
      );
    });
  });

  describe('Data Loading', () => {
    it('should load deployment and sign-off status on init', async () => {
      await component.ngOnInit();

      expect(mockDeploymentService.get).toHaveBeenCalledWith('deploy-123');
      expect(mockDeploymentService.getSignOffStatus).toHaveBeenCalledWith('deploy-123');
    });

    it('should fallback to deployment data if sign-off status fails', async () => {
      mockDeploymentService.getSignOffStatus.and.returnValue(
        Promise.reject(new Error('Service unavailable'))
      );

      const deploymentWithSignOffs = {
        ...mockDeployment,
        vendorSignedBy: 'vendor-123',
        vendorSignedAt: '2024-01-01T00:00:00Z'
      };
      mockDeploymentService.get.and.returnValue(Promise.resolve(deploymentWithSignOffs));

      await component.ngOnInit();

      expect(component['vendorSignedBy']()).toBe('vendor-123');
      expect(component['vendorSignedAt']()).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('isFullySignedOff computed signal', () => {
    it('should be false when no sign-offs', () => {
      component['vendorSignedBy'].set(undefined);
      component['techSignedBy'].set(undefined);
      component['deSignedBy'].set(undefined);
      expect(component['isFullySignedOff']()).toBe(false);
    });

    it('should be false when only vendor signed', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set(undefined);
      component['deSignedBy'].set(undefined);
      expect(component['isFullySignedOff']()).toBe(false);
    });

    it('should be false when vendor and tech signed', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      component['deSignedBy'].set(undefined);
      expect(component['isFullySignedOff']()).toBe(false);
    });

    it('should be true when all three signed', () => {
      component['vendorSignedBy'].set('vendor-123');
      component['techSignedBy'].set('tech-123');
      component['deSignedBy'].set('de-123');
      expect(component['isFullySignedOff']()).toBe(true);
    });
  });
});
