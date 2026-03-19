import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AgentService } from './agent.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  AgentMetadata,
  AgentConfiguration,
  ExecuteAgentRequest,
  AgentRecommendation,
  AgentPerformanceReport,
  AgentHealthStatus,
  AgentDomain,
  AgentType,
  AgentExecutionStatus
} from '../models/agent.model';

describe('AgentService', () => {
  let service: AgentService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<AtlasErrorHandlerService>;

  const mockAgentMetadata: AgentMetadata = {
    agentId: 'risk-assessment-agent',
    agentName: 'Risk Assessment Agent',
    version: '2.1.0',
    domain: AgentDomain.Deployment,
    type: AgentType.MLBased,
    description: 'Assesses deployment risks using machine learning',
    capabilities: ['risk-analysis', 'threat-detection', 'mitigation-recommendations'],
    registeredAt: new Date('2024-01-01T00:00:00Z'),
    registeredBy: 'admin-user',
    isActive: true
  };

  const mockAgentConfiguration: AgentConfiguration = {
    agentId: 'risk-assessment-agent',
    version: '2.1.0',
    parameters: {
      maxIterations: 100,
      confidenceThreshold: 0.85
    },
    thresholds: {
      riskLevel: 'HIGH',
      alertThreshold: 0.9
    },
    featureFlags: {
      enableAdvancedAnalysis: true
    },
    lastUpdated: new Date('2024-01-15T10:00:00Z'),
    updatedBy: 'admin-user'
  };

  const mockAgentRecommendation: AgentRecommendation = {
    recommendationId: 'rec-123',
    agentId: 'risk-assessment-agent',
    agentVersion: '2.1.0',
    recommendation: {
      action: 'PROCEED_WITH_CAUTION',
      riskLevel: 'MEDIUM'
    },
    confidenceScore: 0.87,
    reasoning: 'Deployment shows moderate risk factors',
    decisionFactors: ['historical-data', 'current-metrics'],
    timestamp: new Date('2024-01-15T10:00:00Z'),
    executionDuration: '00:00:02.345',
    status: AgentExecutionStatus.Success
  };

  const mockPerformanceReport: AgentPerformanceReport = {
    agentId: 'risk-assessment-agent',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-31T23:59:59Z'),
    totalExecutions: 1000,
    successfulExecutions: 950,
    failedExecutions: 50,
    successRate: 95.0,
    averageConfidenceScore: 0.85,
    averageDuration: '00:00:02.500',
    p95Duration: '00:00:04.000',
    p99Duration: '00:00:05.500'
  };

  const mockHealthStatus: AgentHealthStatus = {
    agentId: 'risk-assessment-agent',
    state: 'Healthy',
    successRate: 95.0,
    averageResponseTime: '00:00:02.500',
    lastExecutionTime: new Date('2024-01-15T10:00:00Z'),
    issues: []
  };

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('AtlasErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AgentService,
        { provide: AtlasErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(AgentService);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(AtlasErrorHandlerService) as jasmine.SpyObj<AtlasErrorHandlerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAgents', () => {
    it('should get all agents without filters', (done) => {
      const mockAgents = [mockAgentMetadata];

      service.getAgents().subscribe(agents => {
        expect(agents.length).toBe(1);
        expect(agents[0]).toEqual(mockAgentMetadata);
        expect(agents[0].agentId).toBe('risk-assessment-agent');
        done();
      });

      const req = httpMock.expectOne('/api/agents');
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });

    it('should filter agents by domain', (done) => {
      const mockAgents = [mockAgentMetadata];

      service.getAgents({ domain: AgentDomain.Deployment }).subscribe(agents => {
        expect(agents.length).toBe(1);
        expect(agents[0].domain).toBe(AgentDomain.Deployment);
        done();
      });

      const req = httpMock.expectOne('/api/agents?domain=Deployment');
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });

    it('should filter agents by type', (done) => {
      const mockAgents = [mockAgentMetadata];

      service.getAgents({ type: AgentType.MLBased }).subscribe(agents => {
        expect(agents.length).toBe(1);
        expect(agents[0].type).toBe(AgentType.MLBased);
        done();
      });

      const req = httpMock.expectOne('/api/agents?type=MLBased');
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });

    it('should filter agents by search term', (done) => {
      const mockAgents = [mockAgentMetadata];

      service.getAgents({ searchTerm: 'risk' }).subscribe(agents => {
        expect(agents.length).toBe(1);
        expect(agents[0].agentName).toContain('Risk');
        done();
      });

      const req = httpMock.expectOne('/api/agents?searchTerm=risk');
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });

    it('should apply multiple filters', (done) => {
      const mockAgents = [mockAgentMetadata];

      service.getAgents({
        domain: AgentDomain.Deployment,
        type: AgentType.MLBased,
        searchTerm: 'risk'
      }).subscribe(agents => {
        expect(agents.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/agents?domain=Deployment&type=MLBased&searchTerm=risk');
      expect(req.request.method).toBe('GET');
      req.flush(mockAgents);
    });
  });

  describe('getAgent', () => {
    it('should get a specific agent by ID', (done) => {
      const agentId = 'risk-assessment-agent';

      service.getAgent(agentId).subscribe(agent => {
        expect(agent).toEqual(mockAgentMetadata);
        expect(agent.agentId).toBe(agentId);
        expect(agent.agentName).toBe('Risk Assessment Agent');
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAgentMetadata);
    });

    it('should get a specific agent version', (done) => {
      const agentId = 'risk-assessment-agent';
      const version = '2.0.0';

      service.getAgent(agentId, version).subscribe(agent => {
        expect(agent.agentId).toBe(agentId);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}?version=${version}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAgentMetadata);
    });
  });

  describe('getAgentVersions', () => {
    it('should get all versions for an agent', (done) => {
      const agentId = 'risk-assessment-agent';
      const mockVersions = ['2.1.0', '2.0.1', '2.0.0', '1.5.0'];

      service.getAgentVersions(agentId).subscribe(versions => {
        expect(versions.length).toBe(4);
        expect(versions).toEqual(mockVersions);
        expect(versions[0]).toBe('2.1.0');
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}/versions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockVersions);
    });
  });

  describe('getConfiguration', () => {
    it('should get agent configuration', (done) => {
      const agentId = 'risk-assessment-agent';

      service.getConfiguration(agentId).subscribe(config => {
        expect(config).toEqual(mockAgentConfiguration);
        expect(config.agentId).toBe(agentId);
        expect(config.parameters).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}/configuration`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAgentConfiguration);
    });

    it('should get configuration for specific version', (done) => {
      const agentId = 'risk-assessment-agent';
      const version = '2.0.0';

      service.getConfiguration(agentId, version).subscribe(config => {
        expect(config.agentId).toBe(agentId);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}/configuration?version=${version}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAgentConfiguration);
    });
  });

  describe('updateConfiguration', () => {
    it('should update agent configuration', (done) => {
      const agentId = 'risk-assessment-agent';
      const configUpdate = {
        parameters: {
          maxIterations: 150,
          confidenceThreshold: 0.90
        }
      };

      service.updateConfiguration(agentId, configUpdate).subscribe(config => {
        expect(config).toEqual(mockAgentConfiguration);
        expect(config.agentId).toBe(agentId);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/${agentId}/configuration`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(configUpdate);
      req.flush(mockAgentConfiguration);
    });
  });

  describe('executeAgent', () => {
    it('should execute a single agent', (done) => {
      const executionRequest: ExecuteAgentRequest = {
        agentId: 'risk-assessment-agent',
        input: {
          deploymentId: 'dep-123',
          deploymentType: 'STANDARD'
        }
      };

      service.executeAgent(executionRequest).subscribe(result => {
        expect(result).toEqual(mockAgentRecommendation);
        expect(result.agentId).toBe('risk-assessment-agent');
        expect(result.status).toBe(AgentExecutionStatus.Success);
        expect(result.confidenceScore).toBe(0.87);
        done();
      });

      const req = httpMock.expectOne('/api/agents/execute');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(executionRequest);
      req.flush(mockAgentRecommendation);
    });

    it('should execute agent with specific version', (done) => {
      const executionRequest: ExecuteAgentRequest = {
        agentId: 'risk-assessment-agent',
        input: { deploymentId: 'dep-123' },
        version: '2.0.0'
      };

      service.executeAgent(executionRequest).subscribe(result => {
        expect(result.agentId).toBe('risk-assessment-agent');
        done();
      });

      const req = httpMock.expectOne('/api/agents/execute');
      expect(req.request.method).toBe('POST');
      req.flush(mockAgentRecommendation);
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple agents in batch', (done) => {
      const batchRequest = {
        executions: [
          {
            agentId: 'risk-assessment-agent',
            input: { deploymentId: 'dep-123' }
          },
          {
            agentId: 'compliance-check-agent',
            input: { deploymentId: 'dep-123' }
          }
        ]
      };
      const mockBatchResults = [
        mockAgentRecommendation,
        { ...mockAgentRecommendation, agentId: 'compliance-check-agent' }
      ];

      service.executeBatch(batchRequest).subscribe(results => {
        expect(results.length).toBe(2);
        expect(results[0].agentId).toBe('risk-assessment-agent');
        expect(results[1].agentId).toBe('compliance-check-agent');
        done();
      });

      const req = httpMock.expectOne('/api/agents/execute-batch');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(batchRequest);
      req.flush(mockBatchResults);
    });
  });

  describe('executeChain', () => {
    it('should execute agent chain', (done) => {
      const chainRequest = {
        chain: [
          { agentId: 'data-extraction-agent' },
          { agentId: 'risk-assessment-agent' },
          { agentId: 'recommendation-agent' }
        ],
        initialInput: { deploymentId: 'dep-123' }
      };
      const mockChainResult = {
        finalResult: { recommendation: 'PROCEED' },
        intermediateResults: [{}, {}, {}],
        totalDuration: '00:00:05.000'
      };

      service.executeChain(chainRequest).subscribe(result => {
        expect(result.finalResult).toBeDefined();
        expect(result.intermediateResults.length).toBe(3);
        expect(result.totalDuration).toBe('00:00:05.000');
        done();
      });

      const req = httpMock.expectOne('/api/agents/execute-chain');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(chainRequest);
      req.flush(mockChainResult);
    });
  });

  describe('getPerformanceReport', () => {
    it('should get performance report without date range', (done) => {
      const agentId = 'risk-assessment-agent';

      service.getPerformanceReport(agentId).subscribe(report => {
        expect(report).toEqual(mockPerformanceReport);
        expect(report.agentId).toBe(agentId);
        expect(report.successRate).toBe(95.0);
        expect(report.totalExecutions).toBe(1000);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/telemetry/performance/${agentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPerformanceReport);
    });

    it('should get performance report with date range', (done) => {
      const agentId = 'risk-assessment-agent';
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      service.getPerformanceReport(agentId, startDate, endDate).subscribe(report => {
        expect(report.agentId).toBe(agentId);
        done();
      });

      const expectedUrl = `/api/agents/telemetry/performance/${agentId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockPerformanceReport);
    });
  });

  describe('getHealthStatus', () => {
    it('should get health status for an agent', (done) => {
      const agentId = 'risk-assessment-agent';

      service.getHealthStatus(agentId).subscribe(health => {
        expect(health).toEqual(mockHealthStatus);
        expect(health.agentId).toBe(agentId);
        expect(health.state).toBe('Healthy');
        expect(health.successRate).toBe(95.0);
        expect(health.issues?.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/telemetry/health/${agentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHealthStatus);
    });

    it('should handle unhealthy agent status', (done) => {
      const agentId = 'risk-assessment-agent';
      const unhealthyStatus: AgentHealthStatus = {
        ...mockHealthStatus,
        state: 'Degraded',
        successRate: 75.0,
        issues: ['High error rate', 'Slow response times']
      };

      service.getHealthStatus(agentId).subscribe(health => {
        expect(health.state).toBe('Degraded');
        expect(health.successRate).toBe(75.0);
        expect(health.issues?.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`/api/agents/telemetry/health/${agentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(unhealthyStatus);
    });
  });

  describe('getAllHealthStatuses', () => {
    it('should get health status for all agents', (done) => {
      const mockAllHealthStatuses = [
        mockHealthStatus,
        { ...mockHealthStatus, agentId: 'compliance-check-agent' },
        { ...mockHealthStatus, agentId: 'readiness-agent', state: 'Degraded' }
      ];

      service.getAllHealthStatuses().subscribe(statuses => {
        expect(statuses.length).toBe(3);
        expect(statuses[0].agentId).toBe('risk-assessment-agent');
        expect(statuses[1].agentId).toBe('compliance-check-agent');
        expect(statuses[2].state).toBe('Degraded');
        done();
      });

      const req = httpMock.expectOne('/api/agents/telemetry/health');
      expect(req.request.method).toBe('GET');
      req.flush(mockAllHealthStatuses);
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs without filters', (done) => {
      const mockAuditResult = {
        items: [{ id: 'log-1', agentId: 'risk-assessment-agent' }],
        totalCount: 1
      };

      service.queryAuditLogs().subscribe(result => {
        expect(result.items.length).toBe(1);
        expect(result.totalCount).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/agent-audit');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });

    it('should query audit logs with agent filter', (done) => {
      const mockAuditResult = {
        items: [{ id: 'log-1', agentId: 'risk-assessment-agent' }],
        totalCount: 1
      };

      service.queryAuditLogs({ agentId: 'risk-assessment-agent' }).subscribe(result => {
        expect(result.items.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/agent-audit?agentId=risk-assessment-agent');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });

    it('should query audit logs with status filter', (done) => {
      const mockAuditResult = {
        items: [{ id: 'log-1', status: AgentExecutionStatus.Failed }],
        totalCount: 1
      };

      service.queryAuditLogs({ status: AgentExecutionStatus.Failed }).subscribe(result => {
        expect(result.items.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/agent-audit?status=Failed');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });

    it('should query audit logs with date range', (done) => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const mockAuditResult = {
        items: [],
        totalCount: 0
      };

      service.queryAuditLogs({ startDate, endDate }).subscribe(result => {
        expect(result.totalCount).toBe(0);
        done();
      });

      const expectedUrl = `/api/agent-audit?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });

    it('should query audit logs with pagination', (done) => {
      const mockAuditResult = {
        items: [],
        totalCount: 100,
        pageNumber: 2,
        pageSize: 50
      };

      service.queryAuditLogs({ pageSize: 50, pageNumber: 2 }).subscribe(result => {
        expect(result.totalCount).toBe(100);
        done();
      });

      const req = httpMock.expectOne('/api/agent-audit?pageSize=50&pageNumber=2');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });

    it('should query audit logs with all filters', (done) => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const mockAuditResult = {
        items: [],
        totalCount: 0
      };

      service.queryAuditLogs({
        agentId: 'risk-assessment-agent',
        userId: 'user-123',
        status: AgentExecutionStatus.Success,
        startDate,
        endDate,
        pageSize: 100,
        pageNumber: 1
      }).subscribe(result => {
        expect(result.totalCount).toBe(0);
        done();
      });

      const expectedUrl = `/api/agent-audit?agentId=risk-assessment-agent&userId=user-123&status=Success&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&pageSize=100&pageNumber=1`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditResult);
    });
  });
});
