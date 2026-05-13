/**
 * Agent List Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { AgentListComponent } from './agent-list.component';
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';
import { AgentMetadata, AgentDomain, AgentType, AgentHealthStatus } from '../../models/agent.model';

describe('AgentListComponent', () => {
  let component: AgentListComponent;
  let fixture: ComponentFixture<AgentListComponent>;
  let store: MockStore;
  let router: Router;

  const mockAgents: AgentMetadata[] = [
    {
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
    },
    {
      agentId: 'agent-2',
      agentName: 'Dispatch Optimizer',
      version: '2.1.0',
      domain: AgentDomain.Dispatch,
      type: AgentType.Hybrid,
      description: 'Optimizes dispatch routes',
      capabilities: ['routing', 'optimization'],
      registeredAt: new Date('2024-01-15'),
      registeredBy: 'admin',
      isActive: false
    }
  ];

  const mockHealthStatuses: Record<string, AgentHealthStatus> = {
    'agent-1': {
      agentId: 'agent-1',
      state: 'Healthy',
      successRate: 0.95,
      averageResponseTime: '150ms',
      lastExecutionTime: new Date('2024-02-01'),
      issues: []
    },
    'agent-2': {
      agentId: 'agent-2',
      state: 'Degraded',
      successRate: 0.75,
      averageResponseTime: '300ms',
      lastExecutionTime: new Date('2024-02-01'),
      issues: ['High latency']
    }
  };

  const initialState = {
    agents: {
      ids: ['agent-1', 'agent-2'],
      entities: {
        'agent-1': mockAgents[0],
        'agent-2': mockAgents[1]
      },
      selectedId: null,
      selectedAgentConfiguration: null,
      selectedAgentVersions: [],
      recentExecutions: [],
      performanceReports: {},
      healthStatuses: mockHealthStatuses,
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

    await TestBed.configureTestingModule({
      imports: [AgentListComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    
    // Setup selectors
    store.overrideSelector(AgentSelectors.selectFilteredAgents, mockAgents);
    store.overrideSelector(AgentSelectors.selectAgentsLoading, false);
    store.overrideSelector(AgentSelectors.selectAgentsError, null);
    store.overrideSelector(AgentSelectors.selectAgentFilters, {});
    store.overrideSelector(AgentSelectors.selectHealthStatuses, mockHealthStatuses);
    store.overrideSelector(AgentSelectors.selectAgentLoadingHealth, false);

    fixture = TestBed.createComponent(AgentListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load agents on init', () => {
    spyOn(store, 'dispatch');
    
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgents({ filters: {} })
    );
  });

  it('should load health statuses on init', () => {
    spyOn(store, 'dispatch');
    
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAllHealthStatuses()
    );
  });

  it('should subscribe to agents from store', () => {
    fixture.detectChanges();

    expect(component.agents).toEqual(mockAgents);
  });

  it('should subscribe to health statuses from store', () => {
    fixture.detectChanges();

    expect(component.healthStatuses).toEqual(mockHealthStatuses);
  });

  it('should dispatch domain filter change', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onDomainFilterChange(AgentDomain.Deployment);

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.setAgentFilters({ 
        filters: { domain: AgentDomain.Deployment } 
      })
    );
  });

  it('should dispatch type filter change', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onTypeFilterChange(AgentType.MLBased);

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.setAgentFilters({ 
        filters: { type: AgentType.MLBased } 
      })
    );
  });

  it('should dispatch active status filter change', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onActiveFilterChange(true);

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.setAgentFilters({ 
        filters: { isActive: true } 
      })
    );
  });

  it('should dispatch search term change', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    const event = { target: { value: 'test' } } as any;
    component.onSearchChange(event);

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.setAgentFilters({ 
        filters: { searchTerm: 'test' } 
      })
    );
  });

  it('should clear filters', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onClearFilters();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.clearAgentFilters()
    );
  });

  it('should navigate to agent detail on row click', () => {
    fixture.detectChanges();

    component.onRowClick(mockAgents[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/atlas/agents', 'agent-1']);
  });

  it('should dispatch select agent on row click', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onRowClick(mockAgents[0]);

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.selectAgent({ agentId: 'agent-1' })
    );
  });

  it('should refresh agents and health statuses', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onRefresh();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.refreshAgents()
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAllHealthStatuses()
    );
  });

  it('should get health status for agent', () => {
    fixture.detectChanges();

    const health = component.getHealthStatus('agent-1');

    expect(health).toEqual(mockHealthStatuses['agent-1']);
  });

  it('should return null for unknown agent health', () => {
    fixture.detectChanges();

    const health = component.getHealthStatus('unknown');

    expect(health).toBeNull();
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

  it('should detect active filters', () => {
    component.currentFilters = {};
    expect(component.hasActiveFilters()).toBe(false);

    component.currentFilters = { domain: AgentDomain.Deployment };
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('should handle loading state', () => {
    store.overrideSelector(AgentSelectors.selectAgentsLoading, true);
    store.refreshState();
    fixture.detectChanges();

    expect(component.loading).toBe(true);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load agents';
    store.overrideSelector(AgentSelectors.selectAgentsError, errorMessage);
    store.refreshState();
    fixture.detectChanges();

    expect(component.error).toBe(errorMessage);
  });

  it('should retry loading on error', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    component.onRetry();

    expect(store.dispatch).toHaveBeenCalledWith(
      AgentActions.loadAgents({ filters: {} })
    );
  });
});
