import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WorkflowService } from './workflow.service';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import { environment } from '../../environments/environments';
import {
  ApprovalTask,
  ApprovalTaskType,
  ApprovalTaskStatus,
  WorkflowConfiguration,
  ApprovalTaskFilters
} from '../models/workflow.model';
import { UserRole } from '../models/role.enum';
import { User } from '../models/user.model';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;

  const mockCMUser: User = new User(
    'cm-user-1',
    'CM User',
    'cm@example.com',
    'password',
    UserRole.CM,
    'Market-A',
    'Company A',
    new Date(),
    true
  );

  const mockAdminUser: User = new User(
    'admin-user-1',
    'Admin User',
    'admin@example.com',
    'password',
    UserRole.Admin,
    'All',
    'Company A',
    new Date(),
    true
  );

  const mockApprovalTask: ApprovalTask = {
    id: 'task-1',
    type: 'street_sheet',
    entityId: 'entity-1',
    submittedBy: 'user-1',
    submittedByName: 'Test User',
    submittedAt: new Date('2024-01-15T10:00:00Z'),
    currentApprover: 'cm-user-1',
    currentApproverName: 'CM User',
    approvalLevel: 1,
    status: 'pending',
    market: 'Market-A',
    comments: []
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'isAdmin',
      'isCM'
    ]);
    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', [
      'getRoleBasedQueryParams',
      'applyMarketFilter'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WorkflowService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy }
      ]
    });

    service = TestBed.inject(WorkflowService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getMyApprovalTasks', () => {
    it('should retrieve approval tasks for CM user with market filtering', (done) => {
      authService.getUser.and.returnValue(mockCMUser);
      authService.isAdmin.and.returnValue(false);
      roleBasedDataService.getRoleBasedQueryParams.and.returnValue(
        new URLSearchParams({ approverId: 'cm-user-1', market: 'Market-A' }) as any
      );
      roleBasedDataService.applyMarketFilter.and.returnValue([mockApprovalTask]);

      service.getMyApprovalTasks().subscribe(tasks => {
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe('task-1');
        expect(tasks[0].market).toBe('Market-A');
        expect(roleBasedDataService.getRoleBasedQueryParams).toHaveBeenCalledWith({
          approverId: 'cm-user-1'
        });
        expect(roleBasedDataService.applyMarketFilter).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`${environment.apiUrl}/workflow/my-tasks`)
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockApprovalTask]);
    });

    it('should retrieve approval tasks for Admin user without market filtering', (done) => {
      authService.getUser.and.returnValue(mockAdminUser);
      authService.isAdmin.and.returnValue(true);
      roleBasedDataService.getRoleBasedQueryParams.and.returnValue(
        new URLSearchParams({ approverId: 'admin-user-1' }) as any
      );

      const adminTask = { ...mockApprovalTask, market: 'Market-B' };

      service.getMyApprovalTasks().subscribe(tasks => {
        expect(tasks.length).toBe(1);
        expect(roleBasedDataService.getRoleBasedQueryParams).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`${environment.apiUrl}/workflow/my-tasks`)
      );
      req.flush([adminTask]);
    });

    it('should throw error when user is not authenticated', () => {
      authService.getUser.and.returnValue(null);

      expect(() => service.getMyApprovalTasks().subscribe()).toThrowError(
        'User not authenticated'
      );
    });

    it('should map date strings to Date objects', (done) => {
      authService.getUser.and.returnValue(mockCMUser);
      authService.isAdmin.and.returnValue(false);
      roleBasedDataService.getRoleBasedQueryParams.and.returnValue(
        new URLSearchParams() as any
      );
      roleBasedDataService.applyMarketFilter.and.callFake((tasks) => tasks);

      const taskWithStringDate = {
        ...mockApprovalTask,
        submittedAt: '2024-01-15T10:00:00Z' as any,
        comments: [
          {
            userId: 'user-1',
            userName: 'User',
            comment: 'Test',
            timestamp: '2024-01-15T11:00:00Z' as any,
            action: 'comment' as const
          }
        ]
      };

      service.getMyApprovalTasks().subscribe(tasks => {
        expect(tasks[0].submittedAt instanceof Date).toBe(true);
        expect(tasks[0].comments[0].timestamp instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes(`${environment.apiUrl}/workflow/my-tasks`)
      );
      req.flush([taskWithStringDate]);
    });
  });

  describe('getAllApprovalTasks', () => {
    it('should retrieve all approval tasks for Admin user', (done) => {
      authService.isAdmin.and.returnValue(true);

      const tasks = [
        mockApprovalTask,
        { ...mockApprovalTask, id: 'task-2', market: 'Market-B' }
      ];

      service.getAllApprovalTasks().subscribe(result => {
        expect(result.length).toBe(2);
        expect(result[0].market).toBe('Market-A');
        expect(result[1].market).toBe('Market-B');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/all-tasks`);
      expect(req.request.method).toBe('GET');
      req.flush(tasks);
    });

    it('should apply filters when provided', (done) => {
      authService.isAdmin.and.returnValue(true);

      const filters: ApprovalTaskFilters = {
        type: 'street_sheet',
        status: 'pending',
        market: 'Market-A',
        submittedBy: 'user-1',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      };

      service.getAllApprovalTasks(filters).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${environment.apiUrl}/workflow/all-tasks` &&
          request.params.get('type') === 'street_sheet' &&
          request.params.get('status') === 'pending' &&
          request.params.get('market') === 'Market-A' &&
          request.params.get('submittedBy') === 'user-1' &&
          request.params.has('dateFrom') &&
          request.params.has('dateTo')
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush([mockApprovalTask]);
    });

    it('should throw error when non-Admin user attempts to access', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getAllApprovalTasks().subscribe()).toThrowError(
        'Only Admin users can access all approval tasks'
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit item for approval with user metadata', (done) => {
      authService.getUser.and.returnValue(mockCMUser);

      const type: ApprovalTaskType = 'street_sheet';
      const entityId = 'entity-123';
      const metadata = { priority: 'high' };

      service.submitForApproval(type, entityId, metadata).subscribe(task => {
        expect(task.id).toBe('task-1');
        expect(task.type).toBe('street_sheet');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/submit`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.type).toBe(type);
      expect(req.request.body.entityId).toBe(entityId);
      expect(req.request.body.metadata.submittedBy).toBe('cm-user-1');
      expect(req.request.body.metadata.submittedByName).toBe('CM User');
      expect(req.request.body.metadata.market).toBe('Market-A');
      expect(req.request.body.metadata.priority).toBe('high');
      req.flush(mockApprovalTask);
    });

    it('should throw error when user is not authenticated', () => {
      authService.getUser.and.returnValue(null);

      expect(() =>
        service.submitForApproval('street_sheet', 'entity-1').subscribe()
      ).toThrowError('User not authenticated');
    });
  });

  describe('approveTask', () => {
    it('should approve task with comment', (done) => {
      authService.getUser.and.returnValue(mockCMUser);

      const taskId = 'task-1';
      const comment = 'Looks good, approved';

      service.approveTask(taskId, comment).subscribe(task => {
        expect(task.id).toBe(taskId);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.taskId).toBe(taskId);
      expect(req.request.body.comment).toBe(comment);
      req.flush({ ...mockApprovalTask, status: 'approved' });
    });

    it('should approve task without comment', (done) => {
      authService.getUser.and.returnValue(mockCMUser);

      service.approveTask('task-1').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/approve`);
      expect(req.request.body.comment).toBeUndefined();
      req.flush({ ...mockApprovalTask, status: 'approved' });
    });

    it('should throw error when user is not authenticated', () => {
      authService.getUser.and.returnValue(null);

      expect(() => service.approveTask('task-1').subscribe()).toThrowError(
        'User not authenticated'
      );
    });
  });

  describe('rejectTask', () => {
    it('should reject task with reason', (done) => {
      authService.getUser.and.returnValue(mockCMUser);

      const taskId = 'task-1';
      const reason = 'Missing required information';

      service.rejectTask(taskId, reason).subscribe(task => {
        expect(task.id).toBe(taskId);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.taskId).toBe(taskId);
      expect(req.request.body.reason).toBe(reason);
      req.flush({ ...mockApprovalTask, status: 'rejected' });
    });

    it('should throw error when reason is empty', () => {
      authService.getUser.and.returnValue(mockCMUser);

      expect(() => service.rejectTask('task-1', '').subscribe()).toThrowError(
        'Rejection reason is required'
      );
    });

    it('should throw error when reason is whitespace only', () => {
      authService.getUser.and.returnValue(mockCMUser);

      expect(() => service.rejectTask('task-1', '   ').subscribe()).toThrowError(
        'Rejection reason is required'
      );
    });

    it('should throw error when user is not authenticated', () => {
      authService.getUser.and.returnValue(null);

      expect(() =>
        service.rejectTask('task-1', 'reason').subscribe()
      ).toThrowError('User not authenticated');
    });
  });

  describe('requestChanges', () => {
    it('should request changes with description', (done) => {
      authService.getUser.and.returnValue(mockCMUser);

      const taskId = 'task-1';
      const changes = 'Please update the cost estimates';

      service.requestChanges(taskId, changes).subscribe(task => {
        expect(task.id).toBe(taskId);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/request-changes`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.taskId).toBe(taskId);
      expect(req.request.body.changes).toBe(changes);
      req.flush({ ...mockApprovalTask, status: 'changes_requested' });
    });

    it('should throw error when changes description is empty', () => {
      authService.getUser.and.returnValue(mockCMUser);

      expect(() =>
        service.requestChanges('task-1', '').subscribe()
      ).toThrowError('Change request description is required');
    });

    it('should throw error when user is not authenticated', () => {
      authService.getUser.and.returnValue(null);

      expect(() =>
        service.requestChanges('task-1', 'changes').subscribe()
      ).toThrowError('User not authenticated');
    });
  });

  describe('escalateTask', () => {
    it('should escalate task with reason (Admin only)', (done) => {
      authService.isAdmin.and.returnValue(true);

      const taskId = 'task-1';
      const reason = 'Requires executive approval';

      service.escalateTask(taskId, reason).subscribe(task => {
        expect(task.id).toBe(taskId);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/workflow/escalate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.taskId).toBe(taskId);
      expect(req.request.body.reason).toBe(reason);
      req.flush({ ...mockApprovalTask, status: 'escalated' });
    });

    it('should throw error when non-Admin user attempts to escalate', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() =>
        service.escalateTask('task-1', 'reason').subscribe()
      ).toThrowError('Only Admin users can escalate tasks');
    });

    it('should throw error when escalation reason is empty', () => {
      authService.isAdmin.and.returnValue(true);

      expect(() => service.escalateTask('task-1', '').subscribe()).toThrowError(
        'Escalation reason is required'
      );
    });
  });

  describe('getWorkflowConfiguration', () => {
    it('should retrieve workflow configuration (Admin only)', (done) => {
      authService.isAdmin.and.returnValue(true);

      const mockConfig: WorkflowConfiguration = {
        id: 'config-1',
        workflowType: 'street_sheet',
        name: 'Street Sheet Approval',
        approvalLevels: [
          {
            level: 1,
            requiredRole: UserRole.CM,
            marketScoped: true,
            timeoutHours: 24
          }
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      };

      service.getWorkflowConfiguration('street_sheet').subscribe(config => {
        expect(config.workflowType).toBe('street_sheet');
        expect(config.approvalLevels.length).toBe(1);
        expect(config.createdAt instanceof Date).toBe(true);
        expect(config.updatedAt instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/workflow/configuration/street_sheet`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockConfig);
    });

    it('should throw error when non-Admin user attempts to access', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() =>
        service.getWorkflowConfiguration('street_sheet').subscribe()
      ).toThrowError('Only Admin users can access workflow configuration');
    });
  });

  describe('updateWorkflowConfiguration', () => {
    it('should update workflow configuration (Admin only)', (done) => {
      authService.isAdmin.and.returnValue(true);

      const config: WorkflowConfiguration = {
        workflowType: 'street_sheet',
        name: 'Updated Street Sheet Approval',
        approvalLevels: [
          {
            level: 1,
            requiredRole: UserRole.CM,
            marketScoped: true
          }
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      service.updateWorkflowConfiguration(config).subscribe(result => {
        expect(result.name).toBe('Updated Street Sheet Approval');
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/workflow/configuration/street_sheet`
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.name).toBe('Updated Street Sheet Approval');
      req.flush(config);
    });

    it('should throw error when non-Admin user attempts to update', () => {
      authService.isAdmin.and.returnValue(false);

      const config: WorkflowConfiguration = {
        workflowType: 'street_sheet',
        name: 'Test',
        approvalLevels: [],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      expect(() =>
        service.updateWorkflowConfiguration(config).subscribe()
      ).toThrowError('Only Admin users can update workflow configuration');
    });

    it('should throw error when workflow type is missing', () => {
      authService.isAdmin.and.returnValue(true);

      const config: WorkflowConfiguration = {
        workflowType: '',
        name: 'Test',
        approvalLevels: [],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      expect(() =>
        service.updateWorkflowConfiguration(config).subscribe()
      ).toThrowError('Workflow type is required');
    });
  });
});
