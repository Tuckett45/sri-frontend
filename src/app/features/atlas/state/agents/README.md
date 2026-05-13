# Agent State Management

This directory contains the NgRx state management implementation for ATLAS AI agents.

## Overview

The agent state management module provides a complete NgRx implementation for managing AI agent execution, configuration, telemetry, and monitoring within the ATLAS feature.

## Architecture

The state management follows the standard NgRx pattern with:

- **State**: Defines the shape of the agent state including entities, loading states, errors, filters, and telemetry data
- **Actions**: Defines all possible actions that can modify agent state
- **Reducer**: Pure functions that handle state transitions based on actions
- **Effects**: Side effects that handle API calls and asynchronous operations
- **Selectors**: Memoized functions for efficiently accessing state data

## State Structure

```typescript
interface AgentState {
  // Entity storage (normalized)
  ids: string[];
  entities: { [id: string]: AgentMetadata };
  
  // Selection
  selectedId: string | null;
  selectedAgentConfiguration: AgentConfiguration | null;
  selectedAgentVersions: string[];
  
  // Execution tracking
  recentExecutions: AgentRecommendation[];
  
  // Telemetry
  performanceReports: Record<string, AgentPerformanceReport>;
  healthStatuses: Record<string, AgentHealthStatus>;
  auditLogs: any[];
  
  // UI state
  loading: LoadingState;
  error: ErrorState;
  filters: AgentFilters;
  lastLoaded: number | null;
}
```

## Key Features

### Entity Management
- Normalized storage using NgRx Entity adapter
- Efficient CRUD operations
- Automatic sorting by agent name

### Loading States
- Granular loading indicators for each operation
- List, detail, configuration, execution, telemetry operations
- Prevents duplicate API calls

### Error Handling
- Operation-specific error messages
- Automatic error recovery through effects
- User-friendly error notifications

### Filtering
- Domain-based filtering (Deployment, Dispatch, CRM, CrossCutting)
- Type-based filtering (RuleBased, MLBased, Hybrid)
- Search by name or ID
- Active/inactive status filtering

### Telemetry & Monitoring
- Performance reports by agent
- Health status tracking
- Audit log queries
- Recent execution history

## Usage Examples

### Loading Agents

```typescript
// In component
constructor(private store: Store) {}

ngOnInit() {
  // Load all agents
  this.store.dispatch(loadAgents({ filters: {} }));
  
  // Subscribe to agents
  this.agents$ = this.store.select(selectAllAgents);
  this.loading$ = this.store.select(selectAgentsLoading);
}
```

### Executing an Agent

```typescript
executeAgent(agentId: string, input: any) {
  const request: ExecuteAgentRequest = {
    agentId,
    input
  };
  
  this.store.dispatch(executeAgent({ request }));
  
  // Subscribe to result
  this.store.select(selectMostRecentExecution).pipe(
    filter(result => result !== null),
    take(1)
  ).subscribe(result => {
    console.log('Agent execution result:', result);
  });
}
```

### Filtering Agents

```typescript
filterByDomain(domain: AgentDomain) {
  this.store.dispatch(setAgentFilters({ 
    filters: { domain } 
  }));
}

// Or use derived selectors
this.deploymentAgents$ = this.store.select(selectDeploymentAgents);
this.mlBasedAgents$ = this.store.select(selectMLBasedAgents);
```

### Loading Agent Configuration

```typescript
loadConfiguration(agentId: string) {
  this.store.dispatch(loadAgentConfiguration({ agentId }));
  
  this.configuration$ = this.store.select(selectSelectedAgentConfiguration);
}
```

### Monitoring Agent Health

```typescript
loadHealthStatus(agentId: string) {
  this.store.dispatch(loadHealthStatus({ agentId }));
  
  this.healthStatus$ = this.store.select(
    selectHealthStatusByAgentId(agentId)
  );
}

// Or load all health statuses
loadAllHealthStatuses() {
  this.store.dispatch(loadAllHealthStatuses());
  
  this.healthyAgents$ = this.store.select(selectHealthyAgents);
  this.unhealthyAgents$ = this.store.select(selectUnhealthyAgents);
}
```

## Selectors

### Base Selectors
- `selectAllAgents` - All agents as array
- `selectAgentEntities` - Agents as dictionary
- `selectAgentTotal` - Total count

### Selection Selectors
- `selectSelectedAgent` - Currently selected agent
- `selectSelectedAgentConfiguration` - Agent configuration
- `selectSelectedAgentVersions` - Available versions

### Loading Selectors
- `selectAgentsLoading` - List loading state
- `selectAgentExecuting` - Execution loading state
- `selectAgentAnyLoading` - Any operation in progress

### Error Selectors
- `selectAgentsError` - List error
- `selectAgentExecutingError` - Execution error
- `selectAgentAnyError` - Any error exists

### Derived Selectors
- `selectFilteredAgents` - Agents filtered by current filters
- `selectActiveAgents` - Only active agents
- `selectDeploymentAgents` - Deployment domain agents
- `selectHealthyAgents` - Agents with healthy status
- `selectSuccessfulExecutions` - Recent successful executions

## Effects

### API Effects
- `loadAgents$` - Fetch agents from API
- `loadAgentDetail$` - Fetch agent detail
- `executeAgent$` - Execute single agent
- `executeBatch$` - Execute multiple agents
- `executeChain$` - Execute agent chain
- `loadPerformanceReport$` - Fetch performance metrics
- `loadHealthStatus$` - Fetch health status
- `loadAuditLogs$` - Query audit logs

### Automatic Effects
- `updateAgentConfigurationSuccess$` - Reload agent after config update
- `setAgentFilters$` - Reload agents when filters change
- `clearAgentFilters$` - Reload agents when filters cleared

## Requirements Satisfied

- **3.1**: NgRx Store for state management
- **3.2**: Actions for all state mutations
- **3.3**: Pure, immutable reducers
- **3.4**: Effects for asynchronous operations
- **3.5**: Loading state management
- **3.6**: Success action handling
- **3.7**: Error action handling
- **3.8**: Memoized selectors
- **3.9**: Separate state slices
- **11.3**: Performance optimization through memoization

## Testing

Unit tests should cover:
- Reducer state transitions
- Selector memoization
- Effect API calls and error handling
- Action creators

Integration tests should verify:
- Complete user workflows
- State synchronization with API
- Error recovery scenarios

## Related Files

- `agent.service.ts` - API service for agent operations
- `agent.model.ts` - TypeScript interfaces for agent data
- Agent components (to be implemented)
