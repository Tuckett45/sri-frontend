import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApprovalService } from './approval.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  ApprovalAuthority,
  ApprovalRequestDto,
  ApprovalDecisionDto,
  ApprovalStatus,
  CriticalGateDefinition,
  LifecycleState,
  PagedResult
} from '../models/approval.model';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<AtlasErrorHandlerService>;

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('AtlasErrorHandlerService', ['handleError']);
    errorHandlerSpy.handleError.and.callFake((error: any) => {
      throw error;
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApprovalService,
        { provide: AtlasErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(ApprovalService);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(AtlasErrorHandlerService) as jasmine.SpyObj<AtlasErrorHandlerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkAuthority', () => {
    it('should check approval authority for a deployment and state', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.READY;
      const mockAuthority: ApprovalAuthority = {
        userId: 'user-456',
        isAuthorized: true,
        authorityLevel: 'Senior',
        roles: ['Engineer', 'Approver'],
        permissions: ['approve:ready'],
        clientId: 'client-789',
        authorizedStates: [LifecycleState.READY, LifecycleState.IN_PROGRESS]
      };

      service.checkAuthority(deploymentId, forState).subscribe(authority => {
        expect(authority).toEqual(mockAuthority);
        expect(authority.isAuthorized).toBe(true);
        expect(authority.roles).toContain('Approver');
      });

      const req = httpMock.expectOne(`/v1/approvals/authority/${deploymentId}/${forState}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAuthority);
    });

    it('should return unauthorized authority when user lacks permissions', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.CLOSED;
      const mockAuthority: ApprovalAuthority = {
        userId: 'user-456',
        isAuthorized: false,
        clientId: 'client-789',
        reason: 'Insufficient permissions for CLOSED state'
      };

      service.checkAuthority(deploymentId, forState).subscribe(authority => {
        expect(authority.isAuthorized).toBe(false);
        expect(authority.reason).toContain('Insufficient permissions');
      });

      const req = httpMock.expectOne(`/v1/approvals/authority/${deploymentId}/${forState}`);
      req.flush(mockAuthority);
    });
  });

  describe('requestApproval', () => {
    it('should request approval for a deployment', () => {
      const request: ApprovalRequestDto = {
        deploymentId: 'dep-123',
        forState: LifecycleState.READY,
        justification: 'All testing completed successfully',
        context: { testsPassed: 42 }
      };

      service.requestApproval(request).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne('/v1/approvals/request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(null);
    });

    it('should request approval without optional fields', () => {
      const request: ApprovalRequestDto = {
        deploymentId: 'dep-456',
        forState: LifecycleState.IN_PROGRESS
      };

      service.requestApproval(request).subscribe();

      const req = httpMock.expectOne('/v1/approvals/request');
      expect(req.request.body.justification).toBeUndefined();
      expect(req.request.body.context).toBeUndefined();
      req.flush(null);
    });
  });

  describe('recordDecision', () => {
    it('should record an approval decision', () => {
      const approvalId = 'appr-789';
      const decision: ApprovalDecisionDto = {
        decision: ApprovalStatus.APPROVED,
        comments: 'Approved after thorough review',
        approverRole: 'Senior Engineer',
        approverAuthority: 'Level 3'
      };

      service.recordDecision(approvalId, decision).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`/v1/approvals/${approvalId}/decision`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(decision);
      req.flush(null);
    });

    it('should record a denial decision', () => {
      const approvalId = 'appr-789';
      const decision: ApprovalDecisionDto = {
        decision: ApprovalStatus.DENIED,
        comments: 'Insufficient evidence provided'
      };

      service.recordDecision(approvalId, decision).subscribe();

      const req = httpMock.expectOne(`/v1/approvals/${approvalId}/decision`);
      expect(req.request.body.decision).toBe(ApprovalStatus.DENIED);
      req.flush(null);
    });
  });

  describe('getPendingApprovals', () => {
    it('should get pending approvals for a deployment', () => {
      const deploymentId = 'dep-123';
      const mockApprovals = [
        { id: 'appr-1', forState: LifecycleState.READY, status: ApprovalStatus.PENDING },
        { id: 'appr-2', forState: LifecycleState.IN_PROGRESS, status: ApprovalStatus.PENDING }
      ];

      service.getPendingApprovals(deploymentId).subscribe(approvals => {
        expect(approvals.length).toBe(2);
        expect(approvals[0].status).toBe(ApprovalStatus.PENDING);
      });

      const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/pending`);
      expect(req.request.method).toBe('GET');
      req.flush(mockApprovals);
    });

    it('should return empty array when no pending approvals exist', () => {
      const deploymentId = 'dep-456';

      service.getPendingApprovals(deploymentId).subscribe(approvals => {
        expect(approvals.length).toBe(0);
      });

      const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/pending`);
      req.flush([]);
    });
  });

  describe('getApprovalsForState', () => {
    it('should get approvals for a specific state', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.READY;
      const mockApprovals = [
        { id: 'appr-1', forState: LifecycleState.READY, status: ApprovalStatus.APPROVED },
        { id: 'appr-2', forState: LifecycleState.READY, status: ApprovalStatus.PENDING }
      ];

      service.getApprovalsForState(deploymentId, forState).subscribe(approvals => {
        expect(approvals.length).toBe(2);
        expect(approvals.every(a => a.forState === LifecycleState.READY)).toBe(true);
      });

      const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/state/${forState}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockApprovals);
    });

    it('should handle different lifecycle states', () => {
      const deploymentId = 'dep-123';
      const states = [LifecycleState.DRAFT, LifecycleState.PLANNING, LifecycleState.CLOSED];

      states.forEach(state => {
        service.getApprovalsForState(deploymentId, state).subscribe();
        const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/state/${state}`);
        req.flush([]);
      });
    });
  });

  describe('checkSufficientApprovals', () => {
    it('should return true when approvals are sufficient', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.READY;

      service.checkSufficientApprovals(deploymentId, forState).subscribe(isSufficient => {
        expect(isSufficient).toBe(true);
      });

      const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/state/${forState}/sufficient`);
      expect(req.request.method).toBe('GET');
      req.flush(true);
    });

    it('should return false when approvals are insufficient', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.CLOSED;

      service.checkSufficientApprovals(deploymentId, forState).subscribe(isSufficient => {
        expect(isSufficient).toBe(false);
      });

      const req = httpMock.expectOne(`/v1/approvals/deployment/${deploymentId}/state/${forState}/sufficient`);
      req.flush(false);
    });
  });

  describe('getCriticalGate', () => {
    it('should get critical gate definition for a state', () => {
      const state = LifecycleState.READY;
      const mockGate: CriticalGateDefinition = {
        state: LifecycleState.READY,
        gateName: 'Ready Gate',
        description: 'Gate before deployment execution',
        isCritical: true,
        requiredAuthority: 'Senior Engineer',
        minimumApprovals: 2,
        requiresUnanimous: false,
        additionalRequirements: ['All tests passed', 'Documentation complete']
      };

      service.getCriticalGate(state).subscribe(gate => {
        expect(gate.state).toBe(LifecycleState.READY);
        expect(gate.isCritical).toBe(true);
        expect(gate.minimumApprovals).toBe(2);
        expect(gate.requiresUnanimous).toBe(false);
      });

      const req = httpMock.expectOne(`/v1/approvals/critical-gate/${state}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockGate);
    });

    it('should get non-critical gate definition', () => {
      const state = LifecycleState.DRAFT;
      const mockGate: CriticalGateDefinition = {
        state: LifecycleState.DRAFT,
        isCritical: false,
        minimumApprovals: 0,
        requiresUnanimous: false
      };

      service.getCriticalGate(state).subscribe(gate => {
        expect(gate.isCritical).toBe(false);
        expect(gate.minimumApprovals).toBe(0);
      });

      const req = httpMock.expectOne(`/v1/approvals/critical-gate/${state}`);
      req.flush(mockGate);
    });
  });

  describe('getUserApprovals', () => {
    it('should get paginated user approvals with default parameters', () => {
      const mockResult: PagedResult<any> = {
        items: [
          { id: 'appr-1', deploymentId: 'dep-1', forState: LifecycleState.READY },
          { id: 'appr-2', deploymentId: 'dep-2', forState: LifecycleState.IN_PROGRESS }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 50,
          totalCount: 2,
          totalPages: 1
        }
      };

      service.getUserApprovals().subscribe(result => {
        expect(result.items.length).toBe(2);
        expect(result.pagination.currentPage).toBe(1);
        expect(result.pagination.pageSize).toBe(50);
      });

      const req = httpMock.expectOne('/v1/approvals/user/approvals?page=1&pageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush(mockResult);
    });

    it('should get paginated user approvals with custom parameters', () => {
      const mockResult: PagedResult<any> = {
        items: [
          { id: 'appr-3', deploymentId: 'dep-3', forState: LifecycleState.CLOSED }
        ],
        pagination: {
          currentPage: 2,
          pageSize: 20,
          totalCount: 25,
          totalPages: 2
        }
      };

      service.getUserApprovals(2, 20).subscribe(result => {
        expect(result.items.length).toBe(1);
        expect(result.pagination.currentPage).toBe(2);
        expect(result.pagination.pageSize).toBe(20);
      });

      const req = httpMock.expectOne('/v1/approvals/user/approvals?page=2&pageSize=20');
      req.flush(mockResult);
    });

    it('should handle empty user approvals', () => {
      const mockResult: PagedResult<any> = {
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0
        }
      };

      service.getUserApprovals().subscribe(result => {
        expect(result.items.length).toBe(0);
        expect(result.pagination.totalCount).toBe(0);
      });

      const req = httpMock.expectOne('/v1/approvals/user/approvals?page=1&pageSize=50');
      req.flush(mockResult);
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors through error handler', () => {
      const deploymentId = 'dep-123';
      const forState = LifecycleState.READY;

      service.checkAuthority(deploymentId, forState).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`/v1/approvals/authority/${deploymentId}/${forState}`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle network errors', () => {
      const request: ApprovalRequestDto = {
        deploymentId: 'dep-123',
        forState: LifecycleState.READY
      };

      service.requestApproval(request).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.error).toBeDefined();
        }
      );

      const req = httpMock.expectOne('/v1/approvals/request');
      req.error(new ProgressEvent('Network error'));
    });
  });
});
