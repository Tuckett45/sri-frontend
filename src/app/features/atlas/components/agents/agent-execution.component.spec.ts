/**
 * Agent Execution Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { AgentExecutionComponent } from './agent-execution.component';
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';
import {
  AgentMetadata,
  AgentRecommendation,
  AgentDomain,
  AgentType,
  AgentExecutionStatus
} from '../../models/agent.model';

describe('AgentExecutionComponent', () => {
  let component: AgentExecutionComponent;
  let fixture: ComponentFixture<AgentExecutionComponent>;
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

  const mockExecution: AgentRecommendation = {
    recommendationId: 'rec-1',
    agentId: 'agent-1',
    agentVersion: '1.0.0',
    recommendation: { action: 'approve', confidence: 0.95 },
    confidenceScore: 0.95,
    reasoning: 'All checks passed',
    decisionFactors: [{ factor: 'test-coverage', value: 0.9 }],
    dataSources: [{ source: 'deployment-db' }],
    featureImportance: { 'test-coverage': 0.8, 'code-quality': 0.7 },
    timestamp: new Date('2024-02-01'),
    executionDuration: '150ms',
    status: AgentExecutionStatus.Success
  };

  const initialState = {
    agents: {
      ids: ['agent-1'],
      entities: {
        'agent-1': mockAgent
      },
      selectedId: 'agent-1',
      selectedAgentConfiguration: null,
      selectedAgentVersions: [],
      recentExecutions: [mockExecution],
      performanceReports: {},
      healthStatuses: {},
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
      imports: [AgentExecutionComponent, ReactiveFormsModule],
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
    store.overrideSelector(AgentSelectors.selectAgentExecuting, false);
    store.overrideSelector(AgentSelectors.selectAgentExecutingError, null);
    store.overrideSelector(AgentSelectors.selectRecentExecutions, [mockExecution]);

    fixture = TestBed.createComponent(AgentExecutionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    fixture.detectChanges();

    expect(component.executionForm.get('inputJson')?.value).toBe('');
    expect(component.executionForm.get('version')?.value).toBe('');
  });

  it('should load agent data on init', () => {
    spyOn(store, 'dispatch');

    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgentDetail({ agentId: 'agent-1' })
    );
  });

  it('should subscribe to agent from store', () => {
    fixture.detectChanges();

    expect(component.agent).toEqual(mockAgent);
  });

  it('should subscribe to recent executions from store', () => {
    fixture.detectChanges();

    expect(component.recentExecutions).toEqual([mockExecution]);
    expect(component.lastExecution).toEqual(mockExecution);
  });

  it('should set agent version in form when agent is loaded', () => {
    fixture.detectChanges();

    expect(component.executionForm.get('version')?.value).toBe('1.0.0');
  });

  it('should execute agent with valid form data', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    const inputData = { deploymentId: 'test-123' };
    component.executionForm.patchValue({
      inputJson: JSON.stringify(inputData),
      version: '1.0.0'
    });

    component.onExecute();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.executeAgent({
        request: {
          agentId: 'agent-1',
          input: inputData,
          version: '1.0.0'
        }
      })
    );
  });

  it('should not execute agent with invalid form', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.executionForm.patchValue({
      inputJson: '',
      version: ''
    });

    component.onExecute();

    expect(store.dispatch).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Agent] Execute Agent' })
    );
  });

  it('should handle invalid JSON input', () => {
    fixture.detectChanges();

    component.executionForm.patchValue({
      inputJson: 'invalid json',
      version: ''
    });

    component.onExecute();

    expect(component.executionError).toContain('Invalid JSON');
  });

  it('should load example input', () => {
    fixture.detectChanges();

    component.onLoadExample();

    const inputValue = component.executionForm.get('inputJson')?.value;
    expect(inputValue).toContain('deploymentId');
    expect(inputValue).toContain('example-deployment-123');
  });

  it('should clear execution results', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.lastExecution = mockExecution;
    component.onClearResults();

    expect(component.lastExecution).toBeNull();
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.clearRecentExecutions()
    );
  });

  it('should navigate back to agent detail', () => {
    component.agentId = 'agent-1';
    fixture.detectChanges();

    component.onBack();

    expect(router.navigate).toHaveBeenCalledWith(['/atlas/agents', 'agent-1']);
  });

  it('should navigate back to agent list if no agentId', () => {
    component.agentId = null;
    fixture.detectChanges();

    component.onBack();

    expect(router.navigate).toHaveBeenCalledWith(['/atlas/agents']);
  });

  it('should get correct status severity', () => {
    expect(component.getStatusSeverity(AgentExecutionStatus.Success)).toBe('success');
    expect(component.getStatusSeverity(AgentExecutionStatus.PartialSuccess)).toBe('warning');
    expect(component.getStatusSeverity(AgentExecutionStatus.Failed)).toBe('danger');
    expect(component.getStatusSeverity(AgentExecutionStatus.Timeout)).toBe('warning');
  });

  it('should get correct status icon', () => {
    expect(component.getStatusIcon(AgentExecutionStatus.Success)).toBe('pi pi-check-circle');
    expect(component.getStatusIcon(AgentExecutionStatus.PartialSuccess)).toBe('pi pi-exclamation-triangle');
    expect(component.getStatusIcon(AgentExecutionStatus.Failed)).toBe('pi pi-times-circle');
    expect(component.getStatusIcon(AgentExecutionStatus.Timeout)).toBe('pi pi-clock');
  });

  it('should format confidence correctly', () => {
    expect(component.formatConfidence(0.95)).toBe('95.0%');
    expect(component.formatConfidence(0.5)).toBe('50.0%');
    expect(component.formatConfidence(undefined)).toBe('N/A');
  });

  it('should format JSON correctly', () => {
    expect(component.formatJson(null)).toBe('null');
    expect(component.formatJson(undefined)).toBe('null');
    expect(component.formatJson('test')).toBe('test');
    expect(component.formatJson({ key: 'value' })).toContain('"key"');
  });

  it('should check if form is valid', () => {
    fixture.detectChanges();

    component.executionForm.patchValue({
      inputJson: '{"test": "data"}',
      version: ''
    });

    expect(component.isFormValid()).toBe(true);

    component.executionForm.patchValue({
      inputJson: '',
      version: ''
    });

    expect(component.isFormValid()).toBe(false);
  });

  it('should check if agent is active', () => {
    component.agent = mockAgent;
    expect(component.isAgentActive()).toBe(true);

    component.agent = { ...mockAgent, isActive: false };
    expect(component.isAgentActive()).toBe(false);
  });

  it('should get decision factors', () => {
    component.lastExecution = mockExecution;
    fixture.detectChanges();

    const factors = component.getDecisionFactors();

    expect(factors.length).toBe(1);
    expect(factors[0]).toEqual({ factor: 'test-coverage', value: 0.9 });
  });

  it('should get data sources', () => {
    component.lastExecution = mockExecution;
    fixture.detectChanges();

    const sources = component.getDataSources();

    expect(sources.length).toBe(1);
    expect(sources[0]).toEqual({ source: 'deployment-db' });
  });

  it('should get feature importance', () => {
    component.lastExecution = mockExecution;
    fixture.detectChanges();

    const importance = component.getFeatureImportance();

    expect(importance.length).toBe(2);
    expect(importance[0]).toEqual({ feature: 'test-coverage', importance: 0.8 });
    expect(importance[1]).toEqual({ feature: 'code-quality', importance: 0.7 });
  });

  it('should handle executing state', () => {
    store.overrideSelector(AgentSelectors.selectAgentExecuting, true);
    store.refreshState();
    fixture.detectChanges();

    expect(component.executing).toBe(true);
  });

  it('should handle execution error', () => {
    const errorMessage = 'Execution failed';
    store.overrideSelector(AgentSelectors.selectAgentExecutingError, errorMessage);
    store.refreshState();
    fixture.detectChanges();

    expect(component.executionError).toBe(errorMessage);
  });
});
