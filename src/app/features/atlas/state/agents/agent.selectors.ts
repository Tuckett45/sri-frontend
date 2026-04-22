/**
 * Agent NgRx Selectors
 * 
 * Provides memoized selectors for accessing agent state.
 * Includes base selectors, entity selectors, and derived selectors
 * for filtered and computed data.
 * 
 * Requirements: 3.8, 11.3
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AgentState, agentAdapter, AgentFilters } from './agent.state';
import { AgentMetadata, AgentDomain, AgentType } from '../../models/agent.model';

/**
 * Feature selector for agent state
 */
export const selectAgentState = createFeatureSelector<AgentState>('agents');

/**
 * Entity adapter selectors
 * Provides efficient access to entity collection
 */
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = agentAdapter.getSelectors(selectAgentState);

// ============================================================================
// Base Selectors
// ============================================================================

/**
 * Select all agent IDs
 */
export const selectAgentIds = selectIds;

/**
 * Select agent entities as a dictionary
 */
export const selectAgentEntities = selectEntities;

/**
 * Select all agents as an array
 */
export const selectAllAgents = selectAll;

/**
 * Select total number of agents in state
 */
export const selectAgentTotal = selectTotal;

// ============================================================================
// Selection Selectors
// ============================================================================

/**
 * Select currently selected agent ID
 */
export const selectSelectedAgentId = createSelector(
  selectAgentState,
  (state) => state.selectedId
);

/**
 * Select currently selected agent entity
 */
export const selectSelectedAgent = createSelector(
  selectAgentEntities,
  selectSelectedAgentId,
  (entities: Record<string, AgentMetadata | undefined>, selectedId: string | null) =>
    selectedId ? entities[selectedId] : null
);

/**
 * Select currently selected agent configuration
 */
export const selectSelectedAgentConfiguration = createSelector(
  selectAgentState,
  (state) => state.selectedAgentConfiguration
);

/**
 * Select available versions for selected agent
 */
export const selectSelectedAgentVersions = createSelector(
  selectAgentState,
  (state) => state.selectedAgentVersions
);

// ============================================================================
// Execution Selectors
// ============================================================================

/**
 * Select recent agent executions
 */
export const selectRecentExecutions = createSelector(
  selectAgentState,
  (state) => state.recentExecutions
);

/**
 * Select most recent execution
 */
export const selectMostRecentExecution = createSelector(
  selectRecentExecutions,
  (executions) => executions.length > 0 ? executions[0] : null
);

// ============================================================================
// Telemetry Selectors
// ============================================================================

/**
 * Select all performance reports
 */
export const selectPerformanceReports = createSelector(
  selectAgentState,
  (state) => state.performanceReports
);

/**
 * Select performance report for a specific agent
 */
export const selectPerformanceReportByAgentId = (agentId: string) =>
  createSelector(
    selectPerformanceReports,
    (reports) => reports[agentId]
  );

/**
 * Select all health statuses
 */
export const selectHealthStatuses = createSelector(
  selectAgentState,
  (state) => state.healthStatuses
);

/**
 * Select health status for a specific agent
 */
export const selectHealthStatusByAgentId = (agentId: string) =>
  createSelector(
    selectHealthStatuses,
    (statuses) => statuses[agentId]
  );

/**
 * Select audit logs
 */
export const selectAuditLogs = createSelector(
  selectAgentState,
  (state) => state.auditLogs
);

// ============================================================================
// Loading State Selectors
// ============================================================================

/**
 * Select all loading states
 */
export const selectAgentLoading = createSelector(
  selectAgentState,
  (state) => state.loading
);

/**
 * Select list loading state
 */
export const selectAgentsLoading = createSelector(
  selectAgentLoading,
  (loading) => loading.list
);

/**
 * Select detail loading state
 */
export const selectAgentDetailLoading = createSelector(
  selectAgentLoading,
  (loading) => loading.detail
);

/**
 * Select configuration loading state
 */
export const selectAgentConfigurationLoading = createSelector(
  selectAgentLoading,
  (loading) => loading.configuration
);

/**
 * Select updating configuration loading state
 */
export const selectAgentUpdatingConfiguration = createSelector(
  selectAgentLoading,
  (loading) => loading.updatingConfiguration
);

/**
 * Select executing loading state
 */
export const selectAgentExecuting = createSelector(
  selectAgentLoading,
  (loading) => loading.executing
);

/**
 * Select executing batch loading state
 */
export const selectAgentExecutingBatch = createSelector(
  selectAgentLoading,
  (loading) => loading.executingBatch
);

/**
 * Select executing chain loading state
 */
export const selectAgentExecutingChain = createSelector(
  selectAgentLoading,
  (loading) => loading.executingChain
);

/**
 * Select loading performance loading state
 */
export const selectAgentLoadingPerformance = createSelector(
  selectAgentLoading,
  (loading) => loading.loadingPerformance
);

/**
 * Select loading health loading state
 */
export const selectAgentLoadingHealth = createSelector(
  selectAgentLoading,
  (loading) => loading.loadingHealth
);

/**
 * Select loading audit logs loading state
 */
export const selectAgentLoadingAuditLogs = createSelector(
  selectAgentLoading,
  (loading) => loading.loadingAuditLogs
);

/**
 * Select if any operation is in progress
 */
export const selectAgentAnyLoading = createSelector(
  selectAgentLoading,
  (loading) => Object.values(loading).some(value => value === true)
);

// ============================================================================
// Error State Selectors
// ============================================================================

/**
 * Select all error states
 */
export const selectAgentErrors = createSelector(
  selectAgentState,
  (state) => state.error
);

/**
 * Select list error
 */
export const selectAgentsError = createSelector(
  selectAgentErrors,
  (errors) => errors.list
);

/**
 * Select detail error
 */
export const selectAgentDetailError = createSelector(
  selectAgentErrors,
  (errors) => errors.detail
);

/**
 * Select configuration error
 */
export const selectAgentConfigurationError = createSelector(
  selectAgentErrors,
  (errors) => errors.configuration
);

/**
 * Select updating configuration error
 */
export const selectAgentUpdatingConfigurationError = createSelector(
  selectAgentErrors,
  (errors) => errors.updatingConfiguration
);

/**
 * Select executing error
 */
export const selectAgentExecutingError = createSelector(
  selectAgentErrors,
  (errors) => errors.executing
);

/**
 * Select executing batch error
 */
export const selectAgentExecutingBatchError = createSelector(
  selectAgentErrors,
  (errors) => errors.executingBatch
);

/**
 * Select executing chain error
 */
export const selectAgentExecutingChainError = createSelector(
  selectAgentErrors,
  (errors) => errors.executingChain
);

/**
 * Select loading performance error
 */
export const selectAgentLoadingPerformanceError = createSelector(
  selectAgentErrors,
  (errors) => errors.loadingPerformance
);

/**
 * Select loading health error
 */
export const selectAgentLoadingHealthError = createSelector(
  selectAgentErrors,
  (errors) => errors.loadingHealth
);

/**
 * Select loading audit logs error
 */
export const selectAgentLoadingAuditLogsError = createSelector(
  selectAgentErrors,
  (errors) => errors.loadingAuditLogs
);

/**
 * Select if any error exists
 */
export const selectAgentAnyError = createSelector(
  selectAgentErrors,
  (errors) => Object.values(errors).some(value => value !== null)
);

// ============================================================================
// Filter Selectors
// ============================================================================

/**
 * Select current filters
 */
export const selectAgentFilters = createSelector(
  selectAgentState,
  (state) => state.filters
);

/**
 * Select domain filter
 */
export const selectAgentDomainFilter = createSelector(
  selectAgentFilters,
  (filters) => filters.domain
);

/**
 * Select type filter
 */
export const selectAgentTypeFilter = createSelector(
  selectAgentFilters,
  (filters) => filters.type
);

/**
 * Select search term filter
 */
export const selectAgentSearchTerm = createSelector(
  selectAgentFilters,
  (filters) => filters.searchTerm
);

/**
 * Select active status filter
 */
export const selectAgentIsActiveFilter = createSelector(
  selectAgentFilters,
  (filters) => filters.isActive
);

/**
 * Select if any filters are active
 */
export const selectAgentHasActiveFilters = createSelector(
  selectAgentFilters,
  (filters) => Object.keys(filters).length > 0
);

// ============================================================================
// Cache Selectors
// ============================================================================

/**
 * Select last loaded timestamp
 */
export const selectAgentLastLoaded = createSelector(
  selectAgentState,
  (state) => state.lastLoaded
);

/**
 * Select if data is stale (older than 5 minutes)
 */
export const selectAgentIsStale = createSelector(
  selectAgentLastLoaded,
  (lastLoaded) => {
    if (!lastLoaded) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastLoaded > fiveMinutes;
  }
);

// ============================================================================
// Derived Selectors (Filtered and Computed)
// Requirement 11.3: Memoized selectors to prevent unnecessary re-renders
// ============================================================================

/**
 * Select agents filtered by current filters
 * This is a client-side filter for additional filtering beyond API filters
 */
export const selectFilteredAgents = createSelector(
  selectAllAgents,
  selectAgentFilters,
  (agents: AgentMetadata[], filters: AgentFilters) => {
    let filtered: AgentMetadata[] = agents;

    // Apply search term filter (client-side)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((a: AgentMetadata) =>
        (a.agentName?.toLowerCase().includes(term) || false) ||
        (a.agentId?.toLowerCase().includes(term) || false) ||
        (a.description?.toLowerCase().includes(term) || false)
      );
    }

    // Apply active status filter (client-side)
    if (filters.isActive !== undefined) {
      filtered = filtered.filter((a: AgentMetadata) => a.isActive === filters.isActive);
    }

    return filtered;
  }
);

/**
 * Select agents by domain
 */
export const selectAgentsByDomain = (domain: AgentDomain) =>
  createSelector(
    selectAllAgents,
    (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => a.domain === domain)
  );

/**
 * Select agents by type
 */
export const selectAgentsByType = (type: AgentType) =>
  createSelector(
    selectAllAgents,
    (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => a.type === type)
  );

/**
 * Select active agents
 */
export const selectActiveAgents = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => a.isActive)
);

/**
 * Select inactive agents
 */
export const selectInactiveAgents = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => !a.isActive)
);

/**
 * Select deployment domain agents
 */
export const selectDeploymentAgents = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => a.domain === AgentDomain.Deployment)
);

/**
 * Select ML-based agents
 */
export const selectMLBasedAgents = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => agents.filter((a: AgentMetadata) => a.type === AgentType.MLBased)
);

/**
 * Select agent by ID (factory selector)
 */
export const selectAgentById = (agentId: string) =>
  createSelector(
    selectAgentEntities,
    (entities: Record<string, AgentMetadata | undefined>) => entities[agentId]
  );

/**
 * Select count of agents by domain
 */
export const selectAgentCountByDomain = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => {
    const counts: Record<string, number> = {};
    agents.forEach((a: AgentMetadata) => {
      counts[a.domain] = (counts[a.domain] || 0) + 1;
    });
    return counts;
  }
);

/**
 * Select count of agents by type
 */
export const selectAgentCountByType = createSelector(
  selectAllAgents,
  (agents: AgentMetadata[]) => {
    const counts: Record<string, number> = {};
    agents.forEach((a: AgentMetadata) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return counts;
  }
);

/**
 * Select healthy agents (based on health statuses)
 */
export const selectHealthyAgents = createSelector(
  selectAllAgents,
  selectHealthStatuses,
  (agents: AgentMetadata[], statuses) => {
    return agents.filter((a: AgentMetadata) => {
      const agentId = a.agentId || '';
      const status = statuses[agentId];
      return status && status.state === 'Healthy';
    });
  }
);

/**
 * Select unhealthy agents (based on health statuses)
 */
export const selectUnhealthyAgents = createSelector(
  selectAllAgents,
  selectHealthStatuses,
  (agents: AgentMetadata[], statuses) => {
    return agents.filter((a: AgentMetadata) => {
      const agentId = a.agentId || '';
      const status = statuses[agentId];
      return status && (status.state === 'Unhealthy' || status.state === 'Degraded');
    });
  }
);

/**
 * Select successful executions from recent executions
 */
export const selectSuccessfulExecutions = createSelector(
  selectRecentExecutions,
  (executions) => executions.filter(e => e.status === 'Success')
);

/**
 * Select failed executions from recent executions
 */
export const selectFailedExecutions = createSelector(
  selectRecentExecutions,
  (executions) => executions.filter(e => e.status === 'Failed')
);
