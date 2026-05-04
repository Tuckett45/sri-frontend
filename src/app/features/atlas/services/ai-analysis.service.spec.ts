import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AIAnalysisService, AgentInfo, AgentOperationValidationResponse } from './ai-analysis.service';
import { AtlasConfigService } from './atlas-config.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  AnalysisResult,
  RiskAssessment,
  RecommendationSet,
  ReadinessStatus,
  RiskLevel
} from '../models/ai-analysis.model';

describe('AIAnalysisService', () => {
  let service: AIAnalysisService;
  let httpMock: HttpTestingController;
  let configService: AtlasConfigService;
  let errorHandler: AtlasErrorHandlerService;

  const mockBaseUrl = '/v1/ai-analysis';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AIAnalysisService,
        AtlasConfigService,
        AtlasErrorHandlerService
      ]
    });

    service = TestBed.inject(AIAnalysisService);
    httpMock = TestBed.inject(HttpTestingController);
    configService = TestBed.inject(AtlasConfigService);
    errorHandler = TestBed.inject(AtlasErrorHandlerService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('analyzeDeployment', () => {
    it('should trigger AI analysis for a deployment without target state', (done) => {
      const deploymentId = 'test-deployment-123';
      const mockAnalysisResult: AnalysisResult = {
        analysisId: 'analysis-456',
        deploymentId,
        readinessAssessment: {
          status: ReadinessStatus.Ready,
          score: 85
        },
        confidenceLevel: 0.9,
        completedAt: new Date(),
        analysisDuration: '00:00:05'
      };

      service.analyzeDeployment(deploymentId).subscribe(result => {
        expect(result).toEqual(mockAnalysisResult);
        expect(result.deploymentId).toBe(deploymentId);
        expect(result.readinessAssessment.status).toBe(ReadinessStatus.Ready);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/analyze`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(mockAnalysisResult);
    });

    it('should trigger AI analysis with target state parameter', (done) => {
      const deploymentId = 'test-deployment-123';
      const targetState = 'READY';
      const mockAnalysisResult: AnalysisResult = {
        analysisId: 'analysis-456',
        deploymentId,
        readinessAssessment: {
          status: ReadinessStatus.Ready,
          score: 85
        },
        confidenceLevel: 0.9,
        completedAt: new Date(),
        analysisDuration: '00:00:05'
      };

      service.analyzeDeployment(deploymentId, targetState).subscribe(result => {
        expect(result).toEqual(mockAnalysisResult);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/analyze?targetState=${targetState}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('targetState')).toBe(targetState);
      req.flush(mockAnalysisResult);
    });

    it('should handle analysis errors', (done) => {
      const deploymentId = 'test-deployment-123';
      const errorMessage = 'Analysis failed';

      service.analyzeDeployment(deploymentId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/analyze`);
      req.flush({ message: errorMessage }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('assessRisk', () => {
    it('should perform risk assessment for a deployment', (done) => {
      const deploymentId = 'test-deployment-123';
      const mockRiskAssessment: RiskAssessment = {
        assessmentId: 'risk-789',
        deploymentId,
        overallRiskLevel: RiskLevel.Medium,
        overallRiskScore: 55,
        identifiedRisks: [],
        confidenceLevel: 0.85,
        completedAt: new Date(),
        assessmentDuration: '00:00:03'
      };

      service.assessRisk(deploymentId).subscribe(result => {
        expect(result).toEqual(mockRiskAssessment);
        expect(result.deploymentId).toBe(deploymentId);
        expect(result.overallRiskLevel).toBe(RiskLevel.Medium);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/risk-assessment`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(mockRiskAssessment);
    });

    it('should handle risk assessment errors', (done) => {
      const deploymentId = 'test-deployment-123';

      service.assessRisk(deploymentId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/risk-assessment`);
      req.flush({ message: 'Risk assessment failed' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for a deployment', (done) => {
      const deploymentId = 'test-deployment-123';
      const mockRecommendationSet: RecommendationSet = {
        recommendationSetId: 'rec-set-101',
        deploymentId,
        recommendations: [
          {
            id: 'rec-1',
            title: 'Add more test coverage',
            category: 'Quality',
            priority: 'High',
            type: 'Improvement',
            confidence: 0.9
          }
        ],
        confidenceLevel: 0.88,
        generatedAt: new Date(),
        generationDuration: '00:00:02'
      };

      service.generateRecommendations(deploymentId).subscribe(result => {
        expect(result).toEqual(mockRecommendationSet);
        expect(result.deploymentId).toBe(deploymentId);
        expect(result.recommendations?.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/recommendations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(mockRecommendationSet);
    });

    it('should handle recommendation generation errors', (done) => {
      const deploymentId = 'test-deployment-123';

      service.generateRecommendations(deploymentId).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/recommendations`);
      req.flush({ message: 'Recommendation generation failed' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getAvailableAgents', () => {
    it('should retrieve list of available AI agents', (done) => {
      const mockAgents: AgentInfo[] = [
        {
          agentId: 'agent-1',
          agentName: 'Deployment Analyzer',
          version: '1.0.0',
          domain: 'Deployment',
          type: 'MLBased',
          description: 'Analyzes deployment readiness',
          capabilities: ['analysis', 'risk-assessment'],
          isActive: true
        },
        {
          agentId: 'agent-2',
          agentName: 'Risk Assessor',
          version: '2.1.0',
          domain: 'Deployment',
          type: 'Hybrid',
          description: 'Assesses deployment risks',
          capabilities: ['risk-assessment', 'mitigation'],
          isActive: true
        }
      ];

      service.getAvailableAgents().subscribe(agents => {
        expect(agents).toEqual(mockAgents);
        expect(agents.length).toBe(2);
        expect(agents[0].agentName).toBe('Deployment Analyzer');
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/agents`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });

    it('should handle errors when retrieving agents', (done) => {
      service.getAvailableAgents().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/agents`);
      req.flush({ message: 'Failed to retrieve agents' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('validateAgentOperation', () => {
    it('should validate an agent operation', (done) => {
      const agentId = 'agent-1';
      const operation = 'analyze-deployment';
      const mockValidationResponse: AgentOperationValidationResponse = {
        isValid: true,
        message: 'Operation is valid',
        supportedOperations: ['analyze-deployment', 'assess-risk']
      };

      service.validateAgentOperation(agentId, operation).subscribe(result => {
        expect(result).toEqual(mockValidationResponse);
        expect(result.isValid).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/agents/${agentId}/validate-operation`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(operation);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockValidationResponse);
    });

    it('should handle invalid operation validation', (done) => {
      const agentId = 'agent-1';
      const operation = 'invalid-operation';
      const mockValidationResponse: AgentOperationValidationResponse = {
        isValid: false,
        message: 'Operation not supported',
        validationErrors: ['Operation "invalid-operation" is not supported'],
        supportedOperations: ['analyze-deployment', 'assess-risk']
      };

      service.validateAgentOperation(agentId, operation).subscribe(result => {
        expect(result.isValid).toBe(false);
        expect(result.validationErrors?.length).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne(`${mockBaseUrl}/agents/${agentId}/validate-operation`);
      req.flush(mockValidationResponse);
    });
  });

  describe('request cancellation', () => {
    it('should cancel an ongoing request', () => {
      const deploymentId = 'test-deployment-123';
      let completed = false;
      
      service.analyzeDeployment(deploymentId).subscribe({
        next: () => completed = true,
        error: () => {} // Expected to error when cancelled
      });

      // Verify the request was made
      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/analyze`);
      
      // Cancel the request before it completes
      service.cancelRequest(`analyzeDeployment-${deploymentId}`);
      
      // Verify the request was not completed
      expect(completed).toBe(false);
    });

    it('should cancel all ongoing requests', () => {
      const deploymentId1 = 'test-deployment-1';
      const deploymentId2 = 'test-deployment-2';
      let completed1 = false;
      let completed2 = false;
      
      service.analyzeDeployment(deploymentId1).subscribe({
        next: () => completed1 = true,
        error: () => {}
      });

      service.assessRisk(deploymentId2).subscribe({
        next: () => completed2 = true,
        error: () => {}
      });

      // Verify both requests were made
      const req1 = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId1}/analyze`);
      const req2 = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId2}/risk-assessment`);

      // Cancel all requests
      service.cancelAllRequests();
      
      // Verify neither request was completed
      expect(completed1).toBe(false);
      expect(completed2).toBe(false);
    });

    it('should track active operations', () => {
      const deploymentId = 'test-deployment-123';
      
      service.analyzeDeployment(deploymentId).subscribe();

      const activeOps = service.getActiveOperations();
      expect(activeOps).toContain(`analyzeDeployment-${deploymentId}`);

      const req = httpMock.expectOne(`${mockBaseUrl}/deployments/${deploymentId}/analyze`);
      req.flush({
        analysisId: 'test',
        deploymentId,
        readinessAssessment: { status: ReadinessStatus.Ready, score: 85 },
        confidenceLevel: 0.9,
        completedAt: new Date(),
        analysisDuration: '00:00:05'
      });
    });
  });
});
