/**
 * Agent NgRx Effects
 * 
 * Handles side effects for agent actions including:
 * - API calls with loading, success, and error handling
 * - Optimistic updates for user actions
 * - Automatic reload after configuration updates
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7, 3.12
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AgentService } from '../../services/agent.service';
import * as AgentActions from './agent.actions';

@Injectable()
export class AgentEffects {
  constructor(
    private actions$: Actions,
    private agentService: AgentService
  ) {}

  // ============================================================================
  // Load Agents (List)
  // ============================================================================

  /**
   * Load agents from API
   * Triggers on loadAgents and refreshAgents actions
   */
  loadAgents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAgents, AgentActions.refreshAgents),
      switchMap((action) => {
        const params = 'filters' in action ? action.filters : undefined;

        return this.agentService.getAgents(params).pipe(
          map((agents) => AgentActions.loadAgentsSuccess({ agents })),
          catchError((error) =>
            of(AgentActions.loadAgentsFailure({
              error: error.message || 'Failed to load agents'
            }))
          )
        );
      })
    )
  );

  // ============================================================================
  // Load Agent Detail
  // ============================================================================

  /**
   * Load agent detail from API
   */
  loadAgentDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAgentDetail),
      switchMap(({ agentId, version }) =>
        this.agentService.getAgent(agentId, version).pipe(
          map((agent) => AgentActions.loadAgentDetailSuccess({ agent })),
          catchError((error) =>
            of(AgentActions.loadAgentDetailFailure({
              error: error.message || 'Failed to load agent detail'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Agent Versions
  // ============================================================================

  /**
   * Load agent versions from API
   */
  loadAgentVersions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAgentVersions),
      switchMap(({ agentId }) =>
        this.agentService.getAgentVersions(agentId).pipe(
          map((versions) => AgentActions.loadAgentVersionsSuccess({ versions })),
          catchError((error) =>
            of(AgentActions.loadAgentVersionsFailure({
              error: error.message || 'Failed to load agent versions'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Agent Configuration
  // ============================================================================

  /**
   * Load agent configuration from API
   */
  loadAgentConfiguration$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAgentConfiguration),
      switchMap(({ agentId, version }) =>
        this.agentService.getConfiguration(agentId, version).pipe(
          map((configuration) => AgentActions.loadAgentConfigurationSuccess({ configuration })),
          catchError((error) =>
            of(AgentActions.loadAgentConfigurationFailure({
              error: error.message || 'Failed to load agent configuration'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Update Agent Configuration
  // ============================================================================

  /**
   * Update agent configuration via API
   */
  updateAgentConfiguration$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.updateAgentConfiguration),
      switchMap(({ agentId, request }) =>
        this.agentService.updateConfiguration(agentId, request).pipe(
          map((configuration) => AgentActions.updateAgentConfigurationSuccess({ configuration })),
          catchError((error) =>
            of(AgentActions.updateAgentConfigurationFailure({
              error: error.message || 'Failed to update agent configuration'
            }))
          )
        )
      )
    )
  );

  /**
   * After successful configuration update, reload the agent detail
   */
  updateAgentConfigurationSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.updateAgentConfigurationSuccess),
      map(({ configuration }) => {
        const agentId = configuration.agentId || '';
        return AgentActions.loadAgentDetail({ agentId });
      })
    )
  );

  // ============================================================================
  // Execute Agent
  // ============================================================================

  /**
   * Execute agent via API
   */
  executeAgent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.executeAgent),
      switchMap(({ request }) =>
        this.agentService.executeAgent(request).pipe(
          map((result) => AgentActions.executeAgentSuccess({ result })),
          catchError((error) =>
            of(AgentActions.executeAgentFailure({
              error: error.message || 'Failed to execute agent'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Execute Batch
  // ============================================================================

  /**
   * Execute batch via API
   */
  executeBatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.executeBatch),
      switchMap(({ request }) =>
        this.agentService.executeBatch(request).pipe(
          map((results) => AgentActions.executeBatchSuccess({ results })),
          catchError((error) =>
            of(AgentActions.executeBatchFailure({
              error: error.message || 'Failed to execute batch'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Execute Chain
  // ============================================================================

  /**
   * Execute chain via API
   */
  executeChain$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.executeChain),
      switchMap(({ request }) =>
        this.agentService.executeChain(request).pipe(
          map((result) => AgentActions.executeChainSuccess({ result })),
          catchError((error) =>
            of(AgentActions.executeChainFailure({
              error: error.message || 'Failed to execute chain'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Performance Report
  // ============================================================================

  /**
   * Load performance report from API
   */
  loadPerformanceReport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadPerformanceReport),
      switchMap(({ agentId, startDate, endDate }) =>
        this.agentService.getPerformanceReport(agentId, startDate, endDate).pipe(
          map((report) => AgentActions.loadPerformanceReportSuccess({ agentId, report })),
          catchError((error) =>
            of(AgentActions.loadPerformanceReportFailure({
              error: error.message || 'Failed to load performance report'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Health Status
  // ============================================================================

  /**
   * Load health status from API
   */
  loadHealthStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadHealthStatus),
      switchMap(({ agentId }) =>
        this.agentService.getHealthStatus(agentId).pipe(
          map((status) => AgentActions.loadHealthStatusSuccess({ agentId, status })),
          catchError((error) =>
            of(AgentActions.loadHealthStatusFailure({
              error: error.message || 'Failed to load health status'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load All Health Statuses
  // ============================================================================

  /**
   * Load all health statuses from API
   */
  loadAllHealthStatuses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAllHealthStatuses),
      switchMap(() =>
        this.agentService.getAllHealthStatuses().pipe(
          map((statuses) => AgentActions.loadAllHealthStatusesSuccess({ statuses })),
          catchError((error) =>
            of(AgentActions.loadAllHealthStatusesFailure({
              error: error.message || 'Failed to load all health statuses'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Audit Logs
  // ============================================================================

  /**
   * Load audit logs from API
   */
  loadAuditLogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.loadAuditLogs),
      switchMap((params) =>
        this.agentService.queryAuditLogs(params).pipe(
          map((logs) => AgentActions.loadAuditLogsSuccess({ logs })),
          catchError((error) =>
            of(AgentActions.loadAuditLogsFailure({
              error: error.message || 'Failed to load audit logs'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Filter Changes
  // ============================================================================

  /**
   * When filters change, reload agents
   */
  setAgentFilters$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.setAgentFilters),
      map(({ filters }) => AgentActions.loadAgents({ filters }))
    )
  );

  /**
   * When filters are cleared, reload agents
   */
  clearAgentFilters$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AgentActions.clearAgentFilters),
      map(() => AgentActions.loadAgents({ filters: {} }))
    )
  );
}
