/**
 * Agent NgRx Reducer
 * 
 * Implements pure, immutable state transitions for all agent actions.
 * Uses NgRx Entity adapter for efficient entity management.
 * 
 * Requirements: 3.3
 */

import { createReducer, on } from '@ngrx/store';
import { AgentState, agentAdapter, initialAgentState } from './agent.state';
import * as AgentActions from './agent.actions';

/**
 * Agent reducer
 * 
 * Handles all agent-related actions and produces new immutable state.
 * Uses the entity adapter for normalized entity storage and efficient updates.
 */
export const agentReducer = createReducer(
  initialAgentState,

  // ============================================================================
  // Load Agents (List)
  // ============================================================================

  on(AgentActions.loadAgents, (state, { filters }): AgentState => ({
    ...state,
    loading: { ...state.loading, list: true },
    error: { ...state.error, list: null },
    filters: filters || state.filters
  })),

  on(AgentActions.loadAgentsSuccess, (state, { agents }): AgentState =>
    agentAdapter.setAll(agents, {
      ...state,
      loading: { ...state.loading, list: false },
      error: { ...state.error, list: null },
      lastLoaded: Date.now()
    })
  ),

  on(AgentActions.loadAgentsFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: error }
  })),

  // ============================================================================
  // Load Agent Detail
  // ============================================================================

  on(AgentActions.loadAgentDetail, (state, { agentId }): AgentState => ({
    ...state,
    selectedId: agentId,
    loading: { ...state.loading, detail: true },
    error: { ...state.error, detail: null }
  })),

  on(AgentActions.loadAgentDetailSuccess, (state, { agent }): AgentState => {
    // Update the entity in the list if it exists
    const agentId = agent.agentId || '';
    const entities = (state as any).entities as Record<string, any>;
    const entity = entities[agentId];
    const updatedState = entity
      ? agentAdapter.updateOne(
          {
            id: agentId,
            changes: agent
          },
          state
        )
      : agentAdapter.addOne(agent, state);

    return {
      ...updatedState,
      loading: { ...state.loading, detail: false },
      error: { ...state.error, detail: null }
    };
  }),

  on(AgentActions.loadAgentDetailFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, detail: false },
    error: { ...state.error, detail: error }
  })),

  // ============================================================================
  // Load Agent Versions
  // ============================================================================

  on(AgentActions.loadAgentVersions, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, detail: true },
    error: { ...state.error, detail: null }
  })),

  on(AgentActions.loadAgentVersionsSuccess, (state, { versions }): AgentState => ({
    ...state,
    selectedAgentVersions: versions,
    loading: { ...state.loading, detail: false },
    error: { ...state.error, detail: null }
  })),

  on(AgentActions.loadAgentVersionsFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, detail: false },
    error: { ...state.error, detail: error }
  })),

  // ============================================================================
  // Load Agent Configuration
  // ============================================================================

  on(AgentActions.loadAgentConfiguration, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, configuration: true },
    error: { ...state.error, configuration: null }
  })),

  on(AgentActions.loadAgentConfigurationSuccess, (state, { configuration }): AgentState => ({
    ...state,
    selectedAgentConfiguration: configuration,
    loading: { ...state.loading, configuration: false },
    error: { ...state.error, configuration: null }
  })),

  on(AgentActions.loadAgentConfigurationFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, configuration: false },
    error: { ...state.error, configuration: error }
  })),

  // ============================================================================
  // Update Agent Configuration
  // ============================================================================

  on(AgentActions.updateAgentConfiguration, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, updatingConfiguration: true },
    error: { ...state.error, updatingConfiguration: null }
  })),

  on(AgentActions.updateAgentConfigurationSuccess, (state, { configuration }): AgentState => ({
    ...state,
    selectedAgentConfiguration: configuration,
    loading: { ...state.loading, updatingConfiguration: false },
    error: { ...state.error, updatingConfiguration: null }
  })),

  on(AgentActions.updateAgentConfigurationFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, updatingConfiguration: false },
    error: { ...state.error, updatingConfiguration: error }
  })),

  // ============================================================================
  // Execute Agent
  // ============================================================================

  on(AgentActions.executeAgent, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, executing: true },
    error: { ...state.error, executing: null }
  })),

  on(AgentActions.executeAgentSuccess, (state, { result }): AgentState => ({
    ...state,
    recentExecutions: [result, ...state.recentExecutions].slice(0, 10), // Keep last 10
    loading: { ...state.loading, executing: false },
    error: { ...state.error, executing: null }
  })),

  on(AgentActions.executeAgentFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, executing: false },
    error: { ...state.error, executing: error }
  })),

  // ============================================================================
  // Execute Batch
  // ============================================================================

  on(AgentActions.executeBatch, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, executingBatch: true },
    error: { ...state.error, executingBatch: null }
  })),

  on(AgentActions.executeBatchSuccess, (state, { results }): AgentState => ({
    ...state,
    recentExecutions: [...results, ...state.recentExecutions].slice(0, 10), // Keep last 10
    loading: { ...state.loading, executingBatch: false },
    error: { ...state.error, executingBatch: null }
  })),

  on(AgentActions.executeBatchFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, executingBatch: false },
    error: { ...state.error, executingBatch: error }
  })),

  // ============================================================================
  // Execute Chain
  // ============================================================================

  on(AgentActions.executeChain, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, executingChain: true },
    error: { ...state.error, executingChain: null }
  })),

  on(AgentActions.executeChainSuccess, (state, { result }): AgentState => ({
    ...state,
    loading: { ...state.loading, executingChain: false },
    error: { ...state.error, executingChain: null }
  })),

  on(AgentActions.executeChainFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, executingChain: false },
    error: { ...state.error, executingChain: error }
  })),

  // ============================================================================
  // Load Performance Report
  // ============================================================================

  on(AgentActions.loadPerformanceReport, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingPerformance: true },
    error: { ...state.error, loadingPerformance: null }
  })),

  on(AgentActions.loadPerformanceReportSuccess, (state, { agentId, report }): AgentState => ({
    ...state,
    performanceReports: {
      ...state.performanceReports,
      [agentId]: report
    },
    loading: { ...state.loading, loadingPerformance: false },
    error: { ...state.error, loadingPerformance: null }
  })),

  on(AgentActions.loadPerformanceReportFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingPerformance: false },
    error: { ...state.error, loadingPerformance: error }
  })),

  // ============================================================================
  // Load Health Status
  // ============================================================================

  on(AgentActions.loadHealthStatus, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingHealth: true },
    error: { ...state.error, loadingHealth: null }
  })),

  on(AgentActions.loadHealthStatusSuccess, (state, { agentId, status }): AgentState => ({
    ...state,
    healthStatuses: {
      ...state.healthStatuses,
      [agentId]: status
    },
    loading: { ...state.loading, loadingHealth: false },
    error: { ...state.error, loadingHealth: null }
  })),

  on(AgentActions.loadHealthStatusFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingHealth: false },
    error: { ...state.error, loadingHealth: error }
  })),

  // ============================================================================
  // Load All Health Statuses
  // ============================================================================

  on(AgentActions.loadAllHealthStatuses, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingHealth: true },
    error: { ...state.error, loadingHealth: null }
  })),

  on(AgentActions.loadAllHealthStatusesSuccess, (state, { statuses }): AgentState => {
    const healthStatusesMap: Record<string, any> = {};
    statuses.forEach(status => {
      if (status.agentId) {
        healthStatusesMap[status.agentId] = status;
      }
    });

    return {
      ...state,
      healthStatuses: healthStatusesMap,
      loading: { ...state.loading, loadingHealth: false },
      error: { ...state.error, loadingHealth: null }
    };
  }),

  on(AgentActions.loadAllHealthStatusesFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingHealth: false },
    error: { ...state.error, loadingHealth: error }
  })),

  // ============================================================================
  // Load Audit Logs
  // ============================================================================

  on(AgentActions.loadAuditLogs, (state): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingAuditLogs: true },
    error: { ...state.error, loadingAuditLogs: null }
  })),

  on(AgentActions.loadAuditLogsSuccess, (state, { logs }): AgentState => ({
    ...state,
    auditLogs: logs,
    loading: { ...state.loading, loadingAuditLogs: false },
    error: { ...state.error, loadingAuditLogs: null }
  })),

  on(AgentActions.loadAuditLogsFailure, (state, { error }): AgentState => ({
    ...state,
    loading: { ...state.loading, loadingAuditLogs: false },
    error: { ...state.error, loadingAuditLogs: error }
  })),

  // ============================================================================
  // Filter Management
  // ============================================================================

  on(AgentActions.setAgentFilters, (state, { filters }): AgentState => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  on(AgentActions.clearAgentFilters, (state): AgentState => ({
    ...state,
    filters: {}
  })),

  // ============================================================================
  // Selection Management
  // ============================================================================

  on(AgentActions.selectAgent, (state, { agentId }): AgentState => ({
    ...state,
    selectedId: agentId
  })),

  on(AgentActions.clearAgentSelection, (state): AgentState => ({
    ...state,
    selectedId: null,
    selectedAgentConfiguration: null,
    selectedAgentVersions: []
  })),

  // ============================================================================
  // Cache Management
  // ============================================================================

  on(AgentActions.clearAgentState, (): AgentState => initialAgentState),

  on(AgentActions.refreshAgents, (state): AgentState => ({
    ...state,
    lastLoaded: null
  })),

  on(AgentActions.clearRecentExecutions, (state): AgentState => ({
    ...state,
    recentExecutions: []
  }))
);
