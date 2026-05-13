/**
 * Agent NgRx Actions
 * 
 * Defines all actions for agent state management including:
 * - Load operations (list, detail, configuration, versions)
 * - Configuration management
 * - Agent execution (single, batch, chain)
 * - Telemetry operations (performance, health, audit logs)
 * - Filter management
 * 
 * Each operation has corresponding success and failure actions.
 * 
 * Requirements: 3.2
 */

import { createAction, props } from '@ngrx/store';
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
} from '../../models/agent.model';
import { AgentFilters } from './agent.state';

// ============================================================================
// Load Agents (List)
// ============================================================================

/**
 * Load agents with optional filters
 */
export const loadAgents = createAction(
  '[Agent] Load Agents',
  props<{ filters?: AgentFilters }>()
);

/**
 * Agents loaded successfully
 */
export const loadAgentsSuccess = createAction(
  '[Agent] Load Agents Success',
  props<{ agents: AgentMetadata[] }>()
);

/**
 * Failed to load agents
 */
export const loadAgentsFailure = createAction(
  '[Agent] Load Agents Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Agent Detail
// ============================================================================

/**
 * Load detailed agent information
 */
export const loadAgentDetail = createAction(
  '[Agent] Load Agent Detail',
  props<{ agentId: string; version?: string }>()
);

/**
 * Agent detail loaded successfully
 */
export const loadAgentDetailSuccess = createAction(
  '[Agent] Load Agent Detail Success',
  props<{ agent: AgentMetadata }>()
);

/**
 * Failed to load agent detail
 */
export const loadAgentDetailFailure = createAction(
  '[Agent] Load Agent Detail Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Agent Versions
// ============================================================================

/**
 * Load available versions for an agent
 */
export const loadAgentVersions = createAction(
  '[Agent] Load Agent Versions',
  props<{ agentId: string }>()
);

/**
 * Agent versions loaded successfully
 */
export const loadAgentVersionsSuccess = createAction(
  '[Agent] Load Agent Versions Success',
  props<{ versions: string[] }>()
);

/**
 * Failed to load agent versions
 */
export const loadAgentVersionsFailure = createAction(
  '[Agent] Load Agent Versions Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Agent Configuration
// ============================================================================

/**
 * Load agent configuration
 */
export const loadAgentConfiguration = createAction(
  '[Agent] Load Agent Configuration',
  props<{ agentId: string; version?: string }>()
);

/**
 * Agent configuration loaded successfully
 */
export const loadAgentConfigurationSuccess = createAction(
  '[Agent] Load Agent Configuration Success',
  props<{ configuration: AgentConfiguration }>()
);

/**
 * Failed to load agent configuration
 */
export const loadAgentConfigurationFailure = createAction(
  '[Agent] Load Agent Configuration Failure',
  props<{ error: string }>()
);

// ============================================================================
// Update Agent Configuration
// ============================================================================

/**
 * Update agent configuration
 */
export const updateAgentConfiguration = createAction(
  '[Agent] Update Agent Configuration',
  props<{ agentId: string; request: any }>()
);

/**
 * Agent configuration updated successfully
 */
export const updateAgentConfigurationSuccess = createAction(
  '[Agent] Update Agent Configuration Success',
  props<{ configuration: AgentConfiguration }>()
);

/**
 * Failed to update agent configuration
 */
export const updateAgentConfigurationFailure = createAction(
  '[Agent] Update Agent Configuration Failure',
  props<{ error: string }>()
);

// ============================================================================
// Execute Agent
// ============================================================================

/**
 * Execute a single agent
 */
export const executeAgent = createAction(
  '[Agent] Execute Agent',
  props<{ request: ExecuteAgentRequest }>()
);

/**
 * Agent executed successfully
 */
export const executeAgentSuccess = createAction(
  '[Agent] Execute Agent Success',
  props<{ result: AgentRecommendation }>()
);

/**
 * Failed to execute agent
 */
export const executeAgentFailure = createAction(
  '[Agent] Execute Agent Failure',
  props<{ error: string }>()
);

// ============================================================================
// Execute Batch
// ============================================================================

/**
 * Execute multiple agents in batch
 */
export const executeBatch = createAction(
  '[Agent] Execute Batch',
  props<{ request: any }>()
);

/**
 * Batch executed successfully
 */
export const executeBatchSuccess = createAction(
  '[Agent] Execute Batch Success',
  props<{ results: AgentRecommendation[] }>()
);

/**
 * Failed to execute batch
 */
export const executeBatchFailure = createAction(
  '[Agent] Execute Batch Failure',
  props<{ error: string }>()
);

// ============================================================================
// Execute Chain
// ============================================================================

/**
 * Execute agent chain
 */
export const executeChain = createAction(
  '[Agent] Execute Chain',
  props<{ request: any }>()
);

/**
 * Chain executed successfully
 */
export const executeChainSuccess = createAction(
  '[Agent] Execute Chain Success',
  props<{ result: any }>()
);

/**
 * Failed to execute chain
 */
export const executeChainFailure = createAction(
  '[Agent] Execute Chain Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Performance Report
// ============================================================================

/**
 * Load agent performance report
 */
export const loadPerformanceReport = createAction(
  '[Agent] Load Performance Report',
  props<{ agentId: string; startDate?: Date; endDate?: Date }>()
);

/**
 * Performance report loaded successfully
 */
export const loadPerformanceReportSuccess = createAction(
  '[Agent] Load Performance Report Success',
  props<{ agentId: string; report: AgentPerformanceReport }>()
);

/**
 * Failed to load performance report
 */
export const loadPerformanceReportFailure = createAction(
  '[Agent] Load Performance Report Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Health Status
// ============================================================================

/**
 * Load health status for a specific agent
 */
export const loadHealthStatus = createAction(
  '[Agent] Load Health Status',
  props<{ agentId: string }>()
);

/**
 * Health status loaded successfully
 */
export const loadHealthStatusSuccess = createAction(
  '[Agent] Load Health Status Success',
  props<{ agentId: string; status: AgentHealthStatus }>()
);

/**
 * Failed to load health status
 */
export const loadHealthStatusFailure = createAction(
  '[Agent] Load Health Status Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load All Health Statuses
// ============================================================================

/**
 * Load health statuses for all agents
 */
export const loadAllHealthStatuses = createAction(
  '[Agent] Load All Health Statuses'
);

/**
 * All health statuses loaded successfully
 */
export const loadAllHealthStatusesSuccess = createAction(
  '[Agent] Load All Health Statuses Success',
  props<{ statuses: AgentHealthStatus[] }>()
);

/**
 * Failed to load all health statuses
 */
export const loadAllHealthStatusesFailure = createAction(
  '[Agent] Load All Health Statuses Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Audit Logs
// ============================================================================

/**
 * Load agent audit logs
 */
export const loadAuditLogs = createAction(
  '[Agent] Load Audit Logs',
  props<{
    agentId?: string;
    userId?: string;
    status?: AgentExecutionStatus;
    startDate?: Date;
    endDate?: Date;
    pageSize?: number;
    pageNumber?: number;
  }>()
);

/**
 * Audit logs loaded successfully
 */
export const loadAuditLogsSuccess = createAction(
  '[Agent] Load Audit Logs Success',
  props<{ logs: any[] }>()
);

/**
 * Failed to load audit logs
 */
export const loadAuditLogsFailure = createAction(
  '[Agent] Load Audit Logs Failure',
  props<{ error: string }>()
);

// ============================================================================
// Filter Management
// ============================================================================

/**
 * Set agent filters
 */
export const setAgentFilters = createAction(
  '[Agent] Set Filters',
  props<{ filters: AgentFilters }>()
);

/**
 * Clear all agent filters
 */
export const clearAgentFilters = createAction(
  '[Agent] Clear Filters'
);

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Select an agent by ID
 */
export const selectAgent = createAction(
  '[Agent] Select Agent',
  props<{ agentId: string }>()
);

/**
 * Clear agent selection
 */
export const clearAgentSelection = createAction(
  '[Agent] Clear Selection'
);

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all agent state (useful for logout or reset)
 */
export const clearAgentState = createAction(
  '[Agent] Clear State'
);

/**
 * Refresh agents (force reload)
 */
export const refreshAgents = createAction(
  '[Agent] Refresh Agents'
);

/**
 * Clear recent executions
 */
export const clearRecentExecutions = createAction(
  '[Agent] Clear Recent Executions'
);
