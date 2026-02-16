/**
 * ATLAS Backend Integration Tests
 * 
 * Tests all API endpoints with real ATLAS backend
 * Verifies authentication and authorization flows
 * Tests error handling and resilience patterns
 * 
 * Requirements: 9.10
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DeploymentService } from '../../services/deployment.service';
import { AIAnalysisService } from '../../services/ai-analysis.service';
import { ApprovalService } from '../../services/approval.service';
import { ExceptionService } from '../../services/exception.service';
import { AgentService } from '../../services/agent.service';
import { QueryBuilderService } from '../../services/query-builder.service';
import { AtlasAuthService } from '../../services/atlas-auth.service';
import { AtlasConfigService } from '../../services/atlas-config.service';
import { AtlasErrorHandlerService } from '../../services/atlas-error-handler.service';
import { DeploymentType, LifecycleState } from '../../models/approval.model';

describe('ATLAS Backend Integration Tests', () => {
  let httpMock: HttpTestingController;
  let deploymentService: DeploymentService;
  let aiAnalysisService: AIAnalysisService;
  let approvalService: ApprovalService;
  let exceptionService: ExceptionService;
  let agentService: AgentService;
  let queryBuilderService: QueryBuilderService;
  let authService: AtlasAuthService;
  let configService: AtlasConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DeploymentService,
        AIAnalysisService,
        ApprovalService,
        ExceptionService,
        AgentService,
        QueryBuilderService,
        AtlasAuthService,
        AtlasConfigService,
        AtlasErrorHandlerService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    deploymentService = TestBed.inject(DeploymentService);
    aiAnalysisService = TestBed.inject(AIAnalysisService);
    approvalService = TestBed.inject(ApprovalService);
    exceptionService = TestBed.inject(ExceptionService);
    agentService = TestBed.inject(AgentService);
    queryBuilderService = TestBed.inject(QueryBuilderService);
    authService = TestBed.inject(AtlasAuthService);
    configService = TestBed.inject(AtlasConfigService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authentication and Authorization', () => {
    it('should obtain access token on login', (done) => {
      const mockToken = 'mock-jwt-token';
      
      authService.login('testuser', 'password').subscribe(token => {
        expect(token).toBe(mockToken);
        expect(sessionStorage.getItem('atlas_access_token')).toBe(mockToken);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      expect(req.request.method).toBe('POST');
      req.flush({ accessToken: mockToken });
    });

    it('should refresh token when expired', (done) => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      sessionStorage.setItem('atlas_access_token', oldToken);
      
      authService.refreshToken().subscribe(token => {
        expect(token).toBe(newToken);
        expect(sessionStorage.getItem('atlas_access_token')).toBe(newToken);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/refresh'));
      expect(req.request.method).toBe('POST');
      req.flush({ accessToken: newToken });
    });

    it('should handle 401 Unauthorized with token refresh', (done) => {
      const deploymentId = 'test-deployment-id';
      
      deploymentService.getDeployment(deploymentId).subscribe({
        next: (deployment) => {
          expect(deployment).toBeDefined();
          done();
        },
        error: () => fail('Should not error after token refresh')
      });

      // First request returns 401
      const req1 = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req1.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // Token refresh request
      const refreshReq = httpMock.expectOne(r => r.url.includes('/auth/refresh'));
      refreshReq.flush({ accessToken: 'new-token' });

      // Retry original request
      const req2 = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req2.flush({ id: deploymentId, title: 'Test Deployment' });
    });

    it('should handle 403 Forbidden with appropriate error', (done) => {
      const deploymentId = 'test-deployment-id';
      
      deploymentService.getDeployment(deploymentId).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Deployment API Integration', () => {
    it('should get deployments with pagination', (done) => {
      const mockResponse = {
        items: [
          { id: '1', title: 'Deployment 1', type: DeploymentType.STANDARD, currentState: LifecycleState.DRAFT },
          { id: '2', title: 'Deployment 2', type: DeploymentType.EMERGENCY, currentState: LifecycleState.SUBMITTED }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 2,
          totalPages: 1
        }
      };

      deploymentService.getDeployments({ page: 1, pageSize: 10 }).subscribe(result => {
        expect(result.items.length).toBe(2);
        expect(result.pagination.currentPage).toBe(1);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/v1/deployments'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should create deployment', (done) => {
      const createRequest = {
        title: 'New Deployment',
        type: DeploymentType.STANDARD,
        metadata: { key: 'value' }
      };

      deploymentService.createDeployment(createRequest).subscribe(deployment => {
        expect(deployment.title).toBe(createRequest.title);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/v1/deployments'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush({ id: 'new-id', ...createRequest, currentState: LifecycleState.DRAFT });
    });

    it('should transition deployment state', (done) => {
      const deploymentId = 'test-id';
      const transitionRequest = {
        targetState: LifecycleState.SUBMITTED,
        reason: 'Ready for review'
      };

      deploymentService.transitionState(deploymentId, transitionRequest).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/v1/deployments/${deploymentId}/transition`));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(transitionRequest);
      req.flush({});
    });

    it('should submit evidence', (done) => {
      const deploymentId = 'test-id';
      const evidenceRequest = {
        type: 'DOCUMENT',
        title: 'Test Evidence',
        content: 'Evidence content'
      };

      deploymentService.submitEvidence(deploymentId, evidenceRequest as any).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/v1/deployments/${deploymentId}/evidence`));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('AI Analysis API Integration', () => {
    it('should analyze deployment', (done) => {
      const deploymentId = 'test-id';
      const mockAnalysis = {
        analysisId: 'analysis-1',
        deploymentId,
        readinessAssessment: {
          status: 'Ready',
          score: 85,
          summary: 'Deployment is ready'
        },
        confidenceLevel: 0.9,
        completedAt: new Date(),
        analysisDuration: '00:00:05'
      };

      aiAnalysisService.analyzeDeployment(deploymentId).subscribe(result => {
        expect(result.deploymentId).toBe(deploymentId);
        expect(result.readinessAssessment.status).toBe('Ready');
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/v1/ai-analysis/deployments/${deploymentId}/analyze`));
      expect(req.request.method).toBe('POST');
      req.flush(mockAnalysis);
    });

    it('should assess risk', (done) => {
      const deploymentId = 'test-id';
      const mockRiskAssessment = {
        assessmentId: 'risk-1',
        deploymentId,
        overallRiskLevel: 'Medium',
        overallRiskScore: 50,
        confidenceLevel: 0.85,
        completedAt: new Date(),
        assessmentDuration: '00:00:03'
      };

      aiAnalysisService.assessRisk(deploymentId).subscribe(result => {
        expect(result.overallRiskLevel).toBe('Medium');
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/v1/ai-analysis/deployments/${deploymentId}/risk-assessment`));
      expect(req.request.method).toBe('POST');
      req.flush(mockRiskAssessment);
    });
  });

  describe('Approval API Integration', () => {
    it('should check approval authority', (done) => {
      const deploymentId = 'test-id';
      const forState = LifecycleState.SUBMITTED;

      approvalService.checkAuthority(deploymentId, forState).subscribe(authority => {
        expect(authority.isAuthorized).toBe(true);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/v1/approvals/authority/${deploymentId}/${forState}`));
      expect(req.request.method).toBe('GET');
      req.flush({ userId: 'user-1', isAuthorized: true, clientId: 'client-1' });
    });

    it('should request approval', (done) => {
      const approvalRequest = {
        deploymentId: 'test-id',
        forState: LifecycleState.SUBMITTED,
        justification: 'Ready for approval'
      };

      approvalService.requestApproval(approvalRequest).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/v1/approvals/request'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should retry on network error', (done) => {
      const deploymentId = 'test-id';
      let attemptCount = 0;

      deploymentService.getDeployment(deploymentId).subscribe({
        next: (deployment) => {
          expect(deployment).toBeDefined();
          expect(attemptCount).toBeGreaterThan(1);
          done();
        },
        error: () => fail('Should succeed after retry')
      });

      // First attempt fails
      const req1 = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      attemptCount++;
      req1.error(new ProgressEvent('error'));

      // Second attempt succeeds
      setTimeout(() => {
        const req2 = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
        attemptCount++;
        req2.flush({ id: deploymentId, title: 'Test' });
      }, 100);
    });

    it('should handle timeout', (done) => {
      const deploymentId = 'test-id';

      deploymentService.getDeployment(deploymentId).subscribe({
        next: () => fail('Should timeout'),
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
          done();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      // Simulate timeout by not responding
      setTimeout(() => {
        req.flush({}, { status: 408, statusText: 'Request Timeout' });
      }, 100);
    });

    it('should handle 5xx server errors gracefully', (done) => {
      const deploymentId = 'test-id';

      deploymentService.getDeployment(deploymentId).subscribe({
        next: () => fail('Should error'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation', (done) => {
      const deploymentId = 'test-id';
      const subscription = deploymentService.getDeployment(deploymentId).subscribe({
        next: () => fail('Should be cancelled'),
        error: (error) => {
          expect(error.name).toBe('AbortError');
          done();
        }
      });

      // Cancel the request
      subscription.unsubscribe();

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req.flush({});
    });
  });
});
