/**
 * Agent Detail Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { AgentDetailComponent } from './agent-detail.component';
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';
import {
  AgentMetadata,
  AgentConfiguration,
  AgentPerformanceReport,
  AgentHealthStatus,
  AgentDomain,
  AgentType
} from '../../models/agent.model';

describe('AgentDetailComponent', () => {
  let component: AgentDetailComponent;
  let fixture: ComponentFixture<AgentDetailComponent>;
  let store: MockStore;
  let router: Router;
  let activatedRoute: ActivatedRoute;

  const mockAgent: AgentMetadata = {
    agentId: 'agent-1',
    agentName: 'Deployment Analyzer',
    version: '1.0.0',
    domain: AgentDomain.Deployment,
    type: AgentType.MLBased,
    description: 'Analyzes deployment readiness',
    capabilities: ['analysis', 'risk-assessment'],
    registeredAt: new Date('2024-01-01'),
    registeredBy: 'admin',
    isActive: true
  };

  const mockConfiguration: AgentConfiguration = {
    agentId: 'agent-1',
    version: '1.0.0',
    parameters: {
      threshold: 0.8,
      maxRetries: 3
    },
    thresholds: { confidence: 0.7 },
    featureFlags: { enableAdvancedAnalysis: true },
    lastUpdated: new Date('2024-02-01'),
    updatedBy: 'admin'
  };

  const mockPerformanceReport: AgentPerformanceReport = {
    agentId: 'agent-1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-02-01'),
    totalExecutions: 100,
    successfulExecutions: 95,
    failedExecutions: 5,
    successRate: 95,
    averageConfidenceScore: 0.85,
    averageDuration: '150ms',
    p95Duration: '200ms',
    p99Duration: '250ms'
  };

  const mockHealthStatus: AgentHealthStatus = {
    agentId: 'agent-1',
    state: 'Healthy',
    successRate: 0.95,
    averageResponseTime: '150ms',
    lastExecutionTime: new Date('2024-02-01'),
    issues: []
  };

  const initialState = {
    agents: {
      ids: ['agent-1'],
      entities: {
        'agent-1': mockAgent
      },
      selectedId: 'agent-1',
      selectedAgentConfiguration: mockConfiguration,
      selectedAgentVersions: ['1.0.0', '1.1.0'],
      recentExecutions: [],
      performanceReports: {
        'agent-1': mockPerformanceReport
      },
      healthStatuses: {
        'agent-1': mockHealthStatus
      },
      auditLogs: [],
      filters: {},
      loading: {
        list: false,
        detail: false,
        configuration: false,
        updatingConfiguration: false,
        executing: false,
        executingBatch: false,
        executingChain: false,
        loadingPerformance: false,
        loadingHealth: false,
        loadingAuditLogs: false
      },
      error: {
        list: null,
        detail: null,
        configuration: null,
        updatingConfiguration: null,
        executing: null,
        executingBatch: null,
        executingChain: null,
        loadingPerformance: null,
        loadingHealth: null,
        loadingAuditLogs: null
      },
      lastLoaded: null
    }
  };

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteSpy = {
      params: of({ id: 'agent-1' })
    };

    await TestBed.configureTestingModule({
      imports: [AgentDetailComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    activatedRoute = TestBed.inject(ActivatedRoute);

    // Setup selectors
    store.overrideSelector(AgentSelectors.selectSelectedAgent, mockAgent);
    store.overrideSelector(AgentSelectors.selectSelectedAgentConfiguration, mockConfiguration);
    store.overrideSelector(AgentSelectors.selectSelectedAgentVersions, ['1.0.0', '1.1.0']);
    store.overrideSelector(AgentSelectors.selectAgentDetailLoading, false);
    store.overrideSelector(AgentSelectors.selectAgentConfigurationLoading, false);
    store.overrideSelector(AgentSelectors.selectAgentLoadingPerformance, false);
    store.overrideSelector(AgentSelectors.selectAgentLoadingHealth, false);
    store.overrideSelector(AgentSelectors.selectAgentDetailError, null);
    store.overrideSelector(
      AgentSelectors.selectPerformanceReportByAgentId('agent-1'),
      mockPerformanceReport
    );
    store.overrideSelector(
      AgentSelectors.selectHealthStatusByAgentId('agent-1'),
      mockHealthStatus
    );

    fixture = TestBed.createComponent(AgentDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load agent data on init', () => {
    spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgentDetail({ agentId: 'agent-1' })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgentConfiguration({ agentId: 'agent-1' })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgentVersions({ agentId: 'agent-1' })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadPerformanceReport({ agentId: 'agent-1' })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadHealthStatus({ agentId: 'agent-1' })
    );
  });

  it('should subscribe to agent from store', () => {
    fixture.detectChanges();

    expect(component.agent).toEqual(mockAgent);
  });

  it('should subscribe to configuration from store', () => {
    fixture.detectChanges();

    expect(component.configuration).toEqual(mockConfiguration);
  });

  it('should subscribe to performance report from store', () => {
    fixture.detectChanges();

    expect(component.performanceReport).toEqual(mockPerformanceReport);
  });

  it('should subscribe to health status from store', () => {
    fixture.detectChanges();

    expect(component.healthStatus).toEqual(mockHealthStatus);
  });

  it('should subscribe to versions from store', () => {
    fixture.detectChanges();

    expect(component.versions).toEqual(['1.0.0', '1.1.0']);
  });

  it('should navigate to execute agent', () => {
    component.agentId = 'agent-1';
    fixture.detectChanges();

    component.onExecuteAgent();

    expect(router.navigate).toHaveBeenCalledWith(['/atlas/agents', 'agent-1', 'execute']);
  });

  it('should navigate back to agent list', () => {
    fixture.detectChanges();

    component.onBack();

    expect(router.navigate).toHaveBeenCalledWith(['/atlas/agents']);
  });

  it('should refresh agent data', () => {
    spyOn(store, 'dispatch');
    component.agentId = 'agent-1';
    fixture.detectChanges();

    component.onRefresh();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgentDetail({ agentId: 'agent-1' })
    );
  });

  it('should get correct domain severity', () => {
    expect(component.getDomainSeverity(AgentDomain.Deployment)).toBe('info');
    expect(component.getDomainSeverity(AgentDomain.Dispatch)).toBe('success');
    expect(component.getDomainSeverity(AgentDomain.CRM)).toBe('warning');
    expect(component.getDomainSeverity(AgentDomain.CrossCutting)).toBe('secondary');
  });

  it('should get correct type severity', () => {
    expect(component.getTypeSeverity(AgentType.RuleBased)).toBe('info');
    expect(component.getTypeSeverity(AgentType.MLBased)).toBe('success');
    expect(component.getTypeSeverity(AgentType.Hybrid)).toBe('warning');
  });

  it('should get correct health severity', () => {
    expect(component.getHealthSeverity('Healthy')).toBe('success');
    expect(component.getHealthSeverity('Degraded')).toBe('warning');
    expect(component.getHealthSeverity('Unhealthy')).toBe('danger');
    expect(component.getHealthSeverity('Unknown')).toBe('secondary');
  });

  it('should format success rate correctly', () => {
    expect(component.formatSuccessRate(0.95)).toBe('95.0%');
    expect(component.formatSuccessRate(0.5)).toBe('50.0%');
    expect(component.formatSuccessRate(undefined)).toBe('N/A');
  });

  it('should format percentage correctly', () => {
    expect(component.formatPercentage(95.5)).toBe('95.5%');
    expect(component.formatPercentage(undefined)).toBe('N/A');
  });

  it('should get configuration parameters as array', () => {
    component.configuration = mockConfiguration;
    fixture.detectChanges();

    const params = component.getConfigurationParameters();

    expect(params.length).toBe(2);
    expect(params[0]).toEqual({ key: 'threshold', value: 0.8 });
    expect(params[1]).toEqual({ key: 'maxRetries', value: 3 });
  });

  it('should format JSON value correctly', () => {
    expect(component.formatJsonValue(null)).toBe('null');
    expect(component.formatJsonValue(undefined)).toBe('null');
    expect(component.formatJsonValue('test')).toBe('test');
    expect(component.formatJsonValue({ key: 'value' })).toContain('"key"');
  });

  it('should check if agent is active', () => {
    component.agent = mockAgent;
    expect(component.isAgentActive()).toBe(true);

    component.agent = { ...mockAgent, isActive: false };
    expect(component.isAgentActive()).toBe(false);
  });

  it('should check if agent is healthy', () => {
    component.healthStatus = mockHealthStatus;
    expect(component.isAgentHealthy()).toBe(true);

    component.healthStatus = { ...mockHealthStatus, state: 'Degraded' };
    expect(component.isAgentHealthy()).toBe(false);
  });

  it('should handle loading state', () => {
    store.overrideSelector(AgentSelectors.selectAgentDetailLoading, true);
    store.refreshState();
    fixture.detectChanges();

    expect(component.loading).toBe(true);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load agent';
    store.overrideSelector(AgentSelectors.selectAgentDetailError, errorMessage);
    store.refreshState();
    fixture.detectChanges();

    expect(component.error).toBe(errorMessage);
  });
});
