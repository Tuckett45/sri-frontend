import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { WorkflowService } from '../services/workflow.service';
import { UserManagementService } from '../services/user-management.service';
import { SystemConfigurationService } from '../services/system-configuration.service';
import { ResourceAllocationService } from '../services/resource-allocation.service';
import { NotificationService } from '../services/notification.service';
import { EnhancedRoleGuard } from '../guards/enhanced-role.guard';
import { UserRole } from '../models/role.enum';
import { User } from '../models/user.model';
import { NotificationPriority, NotificationChannel } from '../models/notification.model';
import { environment } from '../../environments/environments';

/**
 * Admin Workflow Integration Tests
 * 
 * These tests validate end-to-end scenarios for Administrator workflows:
 * - Login and dashboard access
 * - Viewing all markets data including RG markets
 * - User management operations
 * - System configuration management
 * - Approval override and escalation
 * - Resource reallocation between markets
 * - Broadcast notifications
 * 
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.3, 11.1, 11.2, 12.1, 14.2, 20.6
 */
describe('Admin Workflow Integration Tests', () => {
  let authService: AuthService;
  let roleBasedDataService: RoleBasedDataService;
  let workflowService: WorkflowService;
  let userManagementService: UserManagementService;
  let systemConfigurationService: SystemConfigurationService;
  let resourceAllocationService: ResourceAllocationService;
  let notificationService: NotificationService;
  let enhancedRoleGuard: EnhancedRoleGuard;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockAdminUser: User = {
    id: 'admin-user-1',
    name: 'Jane Admin',
    email: 'jane.admin@example.com',
    password: 'hashed_password',
    role: UserRole.Admin,
    market: 'ALL',
    company: 'Test Company',
    createdDate: new Date('2024-01-01'),
    isApproved: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        RoleBasedDataService,
        WorkflowService,
        UserManagementService,
        SystemConfigurationService,
        ResourceAllocationService,
        NotificationService,
        EnhancedRoleGuard,
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        }
      ]
    });

    authService = TestBed.inject(AuthService);
    roleBasedDataService = TestBed.inject(RoleBasedDataService);
    workflowService = TestBed.inject(WorkflowService);
    userManagementService = TestBed.inject(UserManagementService);
    systemConfigurationService = TestBed.inject(SystemConfigurationService);
    resourceAllocationService = TestBed.inject(ResourceAllocationService);
    notificationService = TestBed.inject(NotificationService);
    enhancedRoleGuard = TestBed.inject(EnhancedRoleGuard);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    // Set up Admin user authentication
    spyOn(authService, 'getUser').and.returnValue(mockAdminUser);
    spyOn(authService, 'isCM').and.returnValue(false);
    spyOn(authService, 'isAdmin').and.returnValue(true);
    spyOn(authService, 'isUserInRole').and.callFake((roles: UserRole[]) => {
      return roles.includes(UserRole.Admin);
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Scenario 1: Admin Login and Dashboard Access', () => {
    it('should allow Admin to access admin dashboard', () => {
      // Requirement 2.1: Admin dashboard displays system-wide data
      
      const route = {
        data: {
          roleGuard: {
            allowedRoles: [UserRole.Admin],
            requireMarketMatch: false
          }
        }
      } as any;

      const canActivate = enhancedRoleGuard.canActivate(route, { url: '/admin/dashboard' } as any);
      
      expect(canActivate).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should allow Admin to access all routes including CM routes', () => {
      // Requirement: Admin can access all routes
      
      const cmRoute = {
        data: {
          roleGuard: {
            allowedRoles: [UserRole.CM, UserRole.Admin],
            requireMarketMatch: false
          }
        }
      } as any;

      const canActivate = enhancedRoleGuard.canActivate(cmRoute, { url: '/cm/dashboard' } as any);
      
      expect(canActivate).toBe(true);
    });
  });

  describe('Scenario 2: Admin Viewing All Markets Data Including RG', () => {
    it('should return all street sheets including RG markets for Admin', () => {
      // Requirement 2.2: Admin views street sheets from all markets including RG
      
      const allStreetSheets = [
        { id: '1', market: 'MARKET_A', title: 'Sheet A1' },
        { id: '2', market: 'MARKET_B', title: 'Sheet B1' },
        { id: '3', market: 'MARKET_A_RG', title: 'Sheet RG1' },
        { id: '4', market: 'RG_MARKET', title: 'Sheet RG2' }
      ];

      const filtered = roleBasedDataService.applyMarketFilter(allStreetSheets, {
        excludeRGMarkets: true  // This option should be ignored for Admin
      });
      
      // Admin sees all markets even with excludeRGMarkets option
      expect(filtered.length).toBe(4);
      expect(filtered).toEqual(allStreetSheets);
    });

    it('should return all punch lists from all markets for Admin', () => {
      // Requirement 2.3: Admin views punch lists from all markets
      
      const allPunchLists = [
        { id: '1', market: 'MARKET_A', description: 'Punch A1' },
        { id: '2', market: 'MARKET_B', description: 'Punch B1' },
        { id: '3', market: 'MARKET_C', description: 'Punch C1' }
      ];

      const filtered = roleBasedDataService.applyMarketFilter(allPunchLists);
      
      expect(filtered.length).toBe(3);
      expect(filtered).toEqual(allPunchLists);
    });

    it('should return all daily reports from all markets for Admin', () => {
      // Requirement 2.4: Admin views daily reports from all markets
      
      const allReports = [
        { id: '1', market: 'MARKET_A', date: '2024-01-15' },
        { id: '2', market: 'MARKET_B', date: '2024-01-15' },
        { id: '3', market: 'MARKET_C', date: '2024-01-16' }
      ];

      const filtered = roleBasedDataService.applyMarketFilter(allReports);
      
      expect(filtered.length).toBe(3);
      expect(filtered).toEqual(allReports);
    });

    it('should allow Admin to access any market via route', () => {
      // Requirement: Admin can access routes for any market
      
      const route = {
        params: { market: 'MARKET_B' },
        data: {
          roleGuard: {
            allowedRoles: [UserRole.CM, UserRole.Admin],
            requireMarketMatch: true,
            marketParam: 'market'
          }
        }
      } as any;

      const canActivate = enhancedRoleGuard.canActivate(route, { url: '/projects/MARKET_B' } as any);
      
      expect(canActivate).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Admin User Management', () => {
    it('should create new user with role and market assignment', (done) => {
      // Requirement 11.1: Admin creates user with required role and market
      
      const newUser = {
        name: 'New User',
        email: 'new.user@example.com',
        role: UserRole.CM,
        market: 'MARKET_B',
        company: 'Test Company'
      };

      userManagementService.createUser(newUser).subscribe(user => {
        expect(user.id).toBeDefined();
        expect(user.role).toBe(UserRole.CM);
        expect(user.market).toBe('MARKET_B');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user-management/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      
      req.flush({
        id: 'user-new',
        ...newUser,
        password: 'hashed',
        createdDate: new Date().toISOString(),
        isApproved: true
      });
    });

    it('should update user role and apply new permissions immediately', (done) => {
      // Requirement 11.2: Admin updates user role with immediate permission application
      
      const updateRequest = {
        userId: 'user-123',
        updates: {
          role: UserRole.Admin,
          market: 'ALL'
        },
        reason: 'Promotion to Admin role'
      };

      userManagementService.updateUser(updateRequest).subscribe(user => {
        expect(user.role).toBe(UserRole.Admin);
        expect(user.market).toBe('ALL');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user-management/users/user-123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.updates.role).toBe(UserRole.Admin);
      
      req.flush({
        id: 'user-123',
        name: 'Updated User',
        email: 'user@example.com',
        password: 'hashed',
        role: UserRole.Admin,
        market: 'ALL',
        company: 'Test Company',
        createdDate: new Date().toISOString(),
        isApproved: true
      });
    });

    it('should deactivate user with required reason', (done) => {
      // Requirement 11.3: Admin deactivates user with logged reason
      
      const userId = 'user-123';
      const reason = 'User left company';

      userManagementService.deactivateUser(userId, reason).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user-management/users/${userId}/deactivate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.reason).toBe(reason);
      
      req.flush({});
    });

    it('should reset user password and generate secure temporary password', (done) => {
      // Requirement 11.4: Admin resets password with secure temporary password
      
      const userId = 'user-123';

      userManagementService.resetUserPassword(userId).subscribe(response => {
        expect(response.temporaryPassword).toBeDefined();
        expect(response.temporaryPassword.length).toBeGreaterThan(8);
        expect(response.expiresAt).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user-management/users/${userId}/reset-password`);
      expect(req.request.method).toBe('POST');
      
      req.flush({
        temporaryPassword: 'TempPass123!@#',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    });

    it('should execute bulk user operations with confirmation', (done) => {
      // Requirement: Admin performs bulk operations with confirmation
      
      const bulkOp = {
        operation: 'change_market' as const,
        userIds: ['user-1', 'user-2', 'user-3'],
        newValue: 'MARKET_C',
        reason: 'Market reorganization'
      };

      userManagementService.executeBulkOperation(bulkOp).subscribe(result => {
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user-management/users/bulk`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(bulkOp);
      
      req.flush({
        successCount: 3,
        failureCount: 0,
        results: [
          { userId: 'user-1', success: true },
          { userId: 'user-2', success: true },
          { userId: 'user-3', success: true }
        ]
      });
    });
  });

  describe('Scenario 4: Admin System Configuration', () => {
    it('should retrieve and update system configuration', (done) => {
      // Requirement 12.1: Admin modifies system configuration with validation
      
      const configUpdate = {
        key: 'approval_timeout',
        value: { hours: 48 },
        applyImmediately: true,
        reason: 'Increase approval timeout for better flexibility'
      };

      systemConfigurationService.updateConfiguration(configUpdate).subscribe(config => {
        expect(config.key).toBe('approval_timeout');
        expect(config.value).toEqual({ hours: 48 });
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/system-configuration/settings/approval_timeout')
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(configUpdate);
      
      req.flush({
        id: 'config-1',
        key: 'approval_timeout',
        value: { hours: 48 },
        category: 'workflow',
        description: 'Approval timeout in hours',
        dataType: 'object',
        isEditable: true,
        lastModifiedBy: 'admin-user-1',
        lastModifiedAt: new Date().toISOString()
      });
    });

    it('should update market definitions and filtering rules', (done) => {
      // Requirement 12.3: Admin configures market definitions
      
      const marketUpdate = {
        marketCode: 'MARKET_D',
        updates: {
          marketName: 'Market D - Updated',
          isActive: true,
          filteringRules: [
            {
              ruleType: 'exclude' as const,
              entityType: 'street_sheet',
              conditions: { excludeRG: false },
              priority: 1
            }
          ]
        }
      };

      systemConfigurationService.updateMarketDefinitions(marketUpdate).subscribe(market => {
        expect(market.marketCode).toBe('MARKET_D');
        expect(market.marketName).toBe('Market D - Updated');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/markets/${marketUpdate.marketCode}`);
      expect(req.request.method).toBe('PUT');
      
      req.flush({
        id: 'market-d',
        marketCode: 'MARKET_D',
        marketName: 'Market D - Updated',
        isActive: true,
        filteringRules: marketUpdate.updates.filteringRules
      });
    });

    it('should update approval workflow configuration with validation', (done) => {
      // Requirement 12.4: Admin configures approval workflows with validation
      
      const workflowConfig = {
        id: 'workflow-1',
        workflowType: 'street_sheet',
        name: 'Street Sheet Approval',
        description: 'Standard street sheet approval process',
        approvalLevels: [
          {
            level: 1,
            requiredRole: UserRole.CM,
            marketScoped: true,
            timeoutHours: 24
          },
          {
            level: 2,
            requiredRole: UserRole.Admin,
            marketScoped: false,
            timeoutHours: 48
          }
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true,
          reminderIntervalHours: 24
        },
        isActive: true,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      workflowService.updateWorkflowConfiguration(workflowConfig).subscribe(config => {
        expect(config.workflowType).toBe('street_sheet');
        expect(config.approvalLevels.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/configuration/street_sheet`);
      expect(req.request.method).toBe('PUT');
      
      req.flush(workflowConfig);
    });
  });

  describe('Scenario 5: Admin Approval Override', () => {
    it('should retrieve all approval tasks across all markets', (done) => {
      // Requirement 6.1: Admin views all pending approvals across all markets
      
      workflowService.getAllApprovalTasks().subscribe(tasks => {
        expect(tasks.length).toBe(4);
        const markets = [...new Set(tasks.map(t => t.market))];
        expect(markets.length).toBeGreaterThan(1);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/all-tasks`);
      expect(req.request.method).toBe('GET');
      
      req.flush([
        {
          id: 'task-1',
          type: 'street_sheet',
          entityId: 'sheet-1',
          submittedBy: 'user-1',
          submittedAt: '2024-01-15T10:00:00Z',
          currentApprover: 'cm-1',
          approvalLevel: 1,
          status: 'pending',
          market: 'MARKET_A',
          comments: []
        },
        {
          id: 'task-2',
          type: 'daily_report',
          entityId: 'report-1',
          submittedBy: 'user-2',
          submittedAt: '2024-01-15T11:00:00Z',
          currentApprover: 'cm-2',
          approvalLevel: 1,
          status: 'pending',
          market: 'MARKET_B',
          comments: []
        },
        {
          id: 'task-3',
          type: 'punch_list',
          entityId: 'punch-1',
          submittedBy: 'user-3',
          submittedAt: '2024-01-15T12:00:00Z',
          currentApprover: 'cm-1',
          approvalLevel: 1,
          status: 'pending',
          market: 'MARKET_A',
          comments: []
        },
        {
          id: 'task-4',
          type: 'resource_allocation',
          entityId: 'alloc-1',
          submittedBy: 'user-4',
          submittedAt: '2024-01-15T13:00:00Z',
          currentApprover: 'cm-3',
          approvalLevel: 1,
          status: 'pending',
          market: 'MARKET_C',
          comments: []
        }
      ]);
    });

    it('should escalate task with reason and notification', (done) => {
      // Requirement 6.3: Admin overrides workflow with logging
      
      const taskId = 'task-1';
      const reason = 'Urgent project deadline requires immediate approval';

      workflowService.escalateTask(taskId, reason).subscribe(task => {
        expect(task.status).toBe('escalated');
        expect(task.id).toBe(taskId);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/escalate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ taskId, reason });
      
      req.flush({
        id: taskId,
        type: 'street_sheet',
        entityId: 'sheet-1',
        submittedBy: 'user-1',
        submittedAt: '2024-01-15T10:00:00Z',
        currentApprover: 'admin-user-1',
        approvalLevel: 2,
        status: 'escalated',
        market: 'MARKET_A',
        comments: [
          {
            userId: 'admin-user-1',
            userName: 'Jane Admin',
            comment: reason,
            timestamp: new Date().toISOString(),
            action: 'escalate'
          }
        ]
      });
    });

    it('should approve escalated task and close workflow', (done) => {
      // Requirement 10.3: Admin makes final approval decision
      
      const taskId = 'task-escalated';
      const comment = 'Final approval granted';

      workflowService.approveTask(taskId, comment).subscribe(task => {
        expect(task.status).toBe('approved');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/approve`);
      req.flush({
        id: taskId,
        type: 'street_sheet',
        entityId: 'sheet-1',
        submittedBy: 'user-1',
        submittedAt: '2024-01-15T10:00:00Z',
        currentApprover: 'admin-user-1',
        approvalLevel: 2,
        status: 'approved',
        market: 'MARKET_A',
        comments: []
      });
    });
  });

  describe('Scenario 6: Admin Resource Reallocation Between Markets', () => {
    it('should reallocate technician from one market to another', (done) => {
      // Requirement 14.2: Admin reassigns resources between markets
      
      const reallocation = {
        technicianId: 'tech-1',
        fromMarket: 'MARKET_A',
        toMarket: 'MARKET_B',
        effectiveDate: new Date('2024-02-01'),
        reason: 'Balancing workload across markets',
        requestedBy: 'admin-user-1'
      };

      resourceAllocationService.reallocateResourceBetweenMarkets(reallocation).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.newMarket).toBe('MARKET_B');
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/resource-allocation/reallocate')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(reallocation);
      
      req.flush({
        success: true,
        technicianId: 'tech-1',
        newMarket: 'MARKET_B',
        effectiveDate: '2024-02-01'
      });
    });

    it('should view resource utilization across all markets', (done) => {
      // Requirement 14.1: Admin views allocation across all markets
      
      resourceAllocationService.getResourceUtilization().subscribe(utilization => {
        expect(utilization.totalTechnicians).toBeGreaterThan(0);
        expect(utilization.technicianUtilization.length).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/resource-allocation/utilization')
      );
      expect(req.request.method).toBe('GET');
      
      req.flush({
        totalTechnicians: 47,
        availableTechnicians: 15,
        utilizationPercentage: 68,
        technicianUtilization: [
          {
            technicianId: 'tech-1',
            technicianName: 'Tech One',
            assignedHours: 35,
            availableHours: 40,
            utilizationPercentage: 87.5
          },
          {
            technicianId: 'tech-2',
            technicianName: 'Tech Two',
            assignedHours: 28,
            availableHours: 40,
            utilizationPercentage: 70
          }
        ],
        equipmentUtilization: []
      });
    });
  });

  describe('Scenario 7: Admin Broadcast Notifications', () => {
    it('should send broadcast notification to all users', (done) => {
      // Requirement 20.6: Admin broadcasts message to all users
      
      const broadcast = {
        title: 'System Maintenance',
        message: 'System will be down for maintenance on Saturday',
        type: 'system_announcement',
        priority: NotificationPriority.High,
        targetRoles: [UserRole.CM, UserRole.Technician, UserRole.Admin],
        channels: [NotificationChannel.Email, NotificationChannel.InApp]
      };

      notificationService.sendBroadcast(broadcast).subscribe(result => {
        expect(result.id).toBeDefined();
        expect(result.recipientCount).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/broadcast`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.title).toBe(broadcast.title);
      
      req.flush({
        id: 'broadcast-1',
        ...broadcast,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        recipientCount: 45
      });
    });

    it('should send broadcast to specific market', (done) => {
      // Requirement: Admin sends targeted broadcast to specific market
      
      const broadcast = {
        title: 'Market A Update',
        message: 'New procedures for Market A',
        type: 'market_announcement',
        priority: NotificationPriority.Normal,
        targetMarkets: ['MARKET_A'],
        channels: [NotificationChannel.Email, NotificationChannel.InApp]
      };

      notificationService.sendBroadcast(broadcast).subscribe(result => {
        expect(result.id).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/notifications/broadcast`);
      req.flush({
        id: 'broadcast-2',
        ...broadcast,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        recipientCount: 15
      });
    });
  });

  describe('Scenario 8: Admin Query Parameters Do Not Include Market Filter', () => {
    it('should not add market parameter to Admin query params', () => {
      // Requirement: Admin requests are not market-filtered by default
      
      const params = roleBasedDataService.getRoleBasedQueryParams({
        status: 'active',
        limit: 10
      });

      expect(params.get('market')).toBeNull();
      expect(params.get('status')).toBe('active');
      expect(params.get('limit')).toBe('10');
    });

    it('should return empty array for accessible markets (indicating all)', () => {
      // Requirement: Admin has access to all markets
      
      const markets = roleBasedDataService.getAccessibleMarkets();
      
      // Empty array for Admin indicates access to all markets
      expect(markets.length).toBe(0);
    });

    it('should allow Admin to access any market', () => {
      // Requirement: Admin can access all markets
      
      expect(roleBasedDataService.canAccessMarket('MARKET_A')).toBe(true);
      expect(roleBasedDataService.canAccessMarket('MARKET_B')).toBe(true);
      expect(roleBasedDataService.canAccessMarket('MARKET_C')).toBe(true);
      expect(roleBasedDataService.canAccessMarket('RG_MARKET')).toBe(true);
    });
  });

  describe('Scenario 9: Complete Admin Workflow - User Creation and Assignment', () => {
    it('should complete full user creation and approval workflow', (done) => {
      // Integration test: Create user → Assign role and market → Activate account
      // Requirements: 11.1, 11.2, 11.6
      
      const newUser = {
        name: 'Test CM User',
        email: 'test.cm@example.com',
        role: UserRole.CM,
        market: 'MARKET_B',
        company: 'Test Company'
      };

      // Step 1: Create user
      userManagementService.createUser(newUser).subscribe(createdUser => {
        expect(createdUser.id).toBeDefined();
        expect(createdUser.role).toBe(UserRole.CM);
        expect(createdUser.market).toBe('MARKET_B');
        expect(createdUser.isApproved).toBe(true);
        
        // Step 2: Reset password for new user
        userManagementService.resetUserPassword(createdUser.id).subscribe(resetResponse => {
          expect(resetResponse.temporaryPassword).toBeDefined();
          done();
        });

        const resetReq = httpMock.expectOne(
          `${environment.apiUrl}/user-management/users/${createdUser.id}/reset-password`
        );
        resetReq.flush({
          temporaryPassword: 'TempPass456!@#',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      });

      const createReq = httpMock.expectOne(`${environment.apiUrl}/user-management/users`);
      createReq.flush({
        id: 'user-new-cm',
        ...newUser,
        password: 'hashed',
        createdDate: new Date().toISOString(),
        isApproved: true
      });
    });
  });

  describe('Scenario 10: Admin Cross-Market Data Access', () => {
    it('should filter data to specific market when requested', () => {
      // Requirement: Admin can filter to specific market for focused analysis
      
      const allData = [
        { id: '1', market: 'MARKET_A', value: 100 },
        { id: '2', market: 'MARKET_B', value: 200 },
        { id: '3', market: 'MARKET_A', value: 150 }
      ];

      const filtered = roleBasedDataService.applyMarketFilter(allData, {
        specificMarket: 'MARKET_A'
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(item => item.market === 'MARKET_A')).toBe(true);
    });

    it('should access all markets without filtering by default', () => {
      // Requirement 2.1: Admin sees all markets by default
      
      const allData = [
        { id: '1', market: 'MARKET_A', value: 100 },
        { id: '2', market: 'MARKET_B', value: 200 },
        { id: '3', market: 'MARKET_C', value: 300 }
      ];

      const filtered = roleBasedDataService.applyMarketFilter(allData);
      
      expect(filtered.length).toBe(3);
      expect(filtered).toEqual(allData);
    });
  });
});

