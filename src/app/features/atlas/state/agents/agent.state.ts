/**
 * Agent NgRx State Management
 * 
 * This module defines the state structure for agent management in the ATLAS feature.
 * It uses NgRx for predictable state management with entities, loading states, errors,
 * filters, and telemetry data.
 * 
 * Requirements: 3.1, 3.9
 */

import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import {
  AgentMetadata,
  AgentConfiguration,
  AgentRecommendation,
  AgentPerformanceReport,
  AgentHealthStatus,
  AgentDomain,
  AgentType,
  AgentExecutionStatus
} from '../../models/agent.model';

/**
 * Filter criteria for agent queries
 */
export interface AgentFilters {
  /** Filter by agent domain */
  domain?: AgentDomain;
  
  /** Filter by agent type */
  type?: AgentType;
  
  /** Search by name or ID */
  searchTerm?: string;
  
  /** Filter by active status */
  isActive?: boolean;
}

/**
 * Loading state for different operations
 */
export interface LoadingState {
  /** Loading agent list */
  list: boolean;
  
  /** Loading agent detail */
  detail: boolean;
  
  /** Loading agent configuration */
  configuration: boolean;
  
  /** Updating agent configuration */
  updatingConfiguration: boolean;
  
  /** Executing agent */
  executing: boolean;
  
  /** Executing batch */
  executingBatch: boolean;
  
  /** Executing chain */
  executingChain: boolean;
  
  /** Loading performance report */
  loadingPerformance: boolean;
  
  /** Loading health status */
  loadingHealth: boolean;
  
  /** Loading audit logs */
  loadingAuditLogs: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  /** Error loading list */
  list: string | null;
  
  /** Error loading detail */
  detail: string | null;
  
  /** Error loading configuration */
  configuration: string | null;
  
  /** Error updating configuration */
  updatingConfiguration: string | null;
  
  /** Error executing agent */
  executing: string | null;
  
  /** Error executing batch */
  executingBatch: string | null;
  
  /** Error executing chain */
  executingChain: string | null;
  
  /** Error loading performance */
  loadingPerformance: string | null;
  
  /** Error loading health */
  loadingHealth: string | null;
  
  /** Error loading audit logs */
  loadingAuditLogs: string | null;
}

/**
 * Agent state interface
 * 
 * Manages agent entities using NgRx Entity for normalized storage,
 * along with loading states, errors, filters, and telemetry data.
 */
export interface AgentState extends EntityState<AgentMetadata> {
  /** Currently selected agent ID */
  selectedId: string | null;
  
  /** Agent configuration for selected agent */
  selectedAgentConfiguration: AgentConfiguration | null;
  
  /** Available versions for selected agent */
  selectedAgentVersions: string[];
  
  /** Recent execution results */
  recentExecutions: AgentRecommendation[];
  
  /** Performance reports by agent ID */
  performanceReports: Record<string, AgentPerformanceReport>;
  
  /** Health statuses by agent ID */
  healthStatuses: Record<string, AgentHealthStatus>;
  
  /** Audit logs */
  auditLogs: any[];
  
  /** Loading states for various operations */
  loading: LoadingState;
  
  /** Error states for various operations */
  error: ErrorState;
  
  /** Current filter criteria */
  filters: AgentFilters;
  
  /** Timestamp of last successful load */
  lastLoaded: number | null;
}

/**
 * Entity adapter for agent management
 * Provides methods for CRUD operations on the entity collection
 */
export const agentAdapter: EntityAdapter<AgentMetadata> = createEntityAdapter<AgentMetadata>({
  selectId: (agent: AgentMetadata) => agent.agentId || '',
  sortComparer: (a: AgentMetadata, b: AgentMetadata) => {
    // Sort by agent name alphabetically
    const nameA = a.agentName || '';
    const nameB = b.agentName || '';
    return nameA.localeCompare(nameB);
  }
});

/**
 * Initial loading state
 */
const initialLoadingState: LoadingState = {
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
};

/**
 * Initial error state
 */
const initialErrorState: ErrorState = {
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
};

/**
 * Initial agent state
 * 
 * Provides the default state structure with empty entities,
 * no selection, no loading, no errors, and default filters.
 */
export const initialAgentState: AgentState = agentAdapter.getInitialState({
  selectedId: null,
  selectedAgentConfiguration: null,
  selectedAgentVersions: [],
  recentExecutions: [],
  performanceReports: {},
  healthStatuses: {},
  auditLogs: [],
  loading: initialLoadingState,
  error: initialErrorState,
  filters: {},
  lastLoaded: null
});
