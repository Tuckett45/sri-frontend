/**
 * Agent Detail Component
 * 
 * Displays detailed agent information including configuration and performance metrics.
 * Provides "Execute Agent" button to trigger agent execution.
 * 
 * Requirements: 7.1, 7.2
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';

// Models
import {
  AgentMetadata,
  AgentConfiguration,
  AgentPerformanceReport,
  AgentHealthStatus,
  AgentDomain,
  AgentType
} from '../../models/agent.model';

// State
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TabViewModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    BadgeModule,
    DividerModule,
    PanelModule,
    TableModule
  ],
  templateUrl: './agent-detail.component.html',
  styleUrls: ['./agent-detail.component.scss']
})
export class AgentDetailComponent implements OnInit, OnDestroy {
  // Observables from store
  agent$: Observable<AgentMetadata | null | undefined>;
  configuration$: Observable<AgentConfiguration | null>;
  performanceReport$: Observable<AgentPerformanceReport | null>;
  healthStatus$: Observable<AgentHealthStatus | null>;
  versions$: Observable<string[]>;
  loading$: Observable<boolean>;
  loadingConfiguration$: Observable<boolean>;
  loadingPerformance$: Observable<boolean>;
  loadingHealth$: Observable<boolean>;
  error$: Observable<string | null>;

  // Local state
  agentId: string | null = null;
  agent: AgentMetadata | null | undefined = null;
  configuration: AgentConfiguration | null = null;
  performanceReport: AgentPerformanceReport | null = null;
  healthStatus: AgentHealthStatus | null = null;
  versions: string[] = [];
  loading = false;
  loadingConfiguration = false;
  loadingPerformance = false;
  loadingHealth = false;
  error: string | null = null;

  // Enums for template
  AgentDomain = AgentDomain;
  AgentType = AgentType;

  // Active tab index
  activeTabIndex = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Initialize observables - will be set after we get agentId
    this.agent$ = this.store.select(AgentSelectors.selectSelectedAgent);
    this.configuration$ = this.store.select(AgentSelectors.selectSelectedAgentConfiguration);
    this.versions$ = this.store.select(AgentSelectors.selectSelectedAgentVersions);
    this.loading$ = this.store.select(AgentSelectors.selectAgentDetailLoading);
    this.loadingConfiguration$ = this.store.select(AgentSelectors.selectAgentConfigurationLoading);
    this.loadingPerformance$ = this.store.select(AgentSelectors.selectAgentLoadingPerformance);
    this.loadingHealth$ = this.store.select(AgentSelectors.selectAgentLoadingHealth);
    this.error$ = this.store.select(AgentSelectors.selectAgentDetailError);

    // Performance report and health status will be set after we get agentId
    this.performanceReport$ = new Observable();
    this.healthStatus$ = new Observable();
  }

  ngOnInit(): void {
    // Get agent ID from route
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.agentId = params['id'];
        if (this.agentId) {
          this.loadAgentData();
          
          // Set up performance and health selectors with agentId
          this.performanceReport$ = this.store.select(
            AgentSelectors.selectPerformanceReportByAgentId(this.agentId)
          );
          this.healthStatus$ = this.store.select(
            AgentSelectors.selectHealthStatusByAgentId(this.agentId)
          );
        }
      });

    // Subscribe to store observables
    this.agent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agent => this.agent = agent);

    this.configuration$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => this.configuration = config);

    this.performanceReport$
      .pipe(takeUntil(this.destroy$))
      .subscribe(report => this.performanceReport = report);

    this.healthStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => this.healthStatus = status);

    this.versions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(versions => this.versions = versions);

    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.loadingConfiguration$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loadingConfiguration = loading);

    this.loadingPerformance$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loadingPerformance = loading);

    this.loadingHealth$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loadingHealth = loading);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all agent data
   */
  private loadAgentData(): void {
    if (!this.agentId) return;

    this.store.dispatch(AgentActions.loadAgentDetail({ agentId: this.agentId }));
    this.store.dispatch(AgentActions.loadAgentConfiguration({ agentId: this.agentId }));
    this.store.dispatch(AgentActions.loadAgentVersions({ agentId: this.agentId }));
    this.store.dispatch(AgentActions.loadPerformanceReport({ agentId: this.agentId }));
    this.store.dispatch(AgentActions.loadHealthStatus({ agentId: this.agentId }));
  }

  /**
   * Navigate to execute agent
   */
  onExecuteAgent(): void {
    if (this.agentId) {
      this.router.navigate(['/atlas/agents', this.agentId, 'execute']);
    }
  }

  /**
   * Navigate back to agent list
   */
  onBack(): void {
    this.router.navigate(['/atlas/agents']);
  }

  /**
   * Retry loading agent data
   */
  onRetry(): void {
    this.loadAgentData();
  }

  /**
   * Refresh agent data
   */
  onRefresh(): void {
    this.loadAgentData();
  }

  /**
   * Get severity class for domain tag
   */
  getDomainSeverity(domain: AgentDomain): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (domain) {
      case AgentDomain.Deployment:
        return 'info';
      case AgentDomain.Dispatch:
        return 'success';
      case AgentDomain.CRM:
        return 'warn';
      case AgentDomain.CrossCutting:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Get severity class for type tag
   */
  getTypeSeverity(type: AgentType): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (type) {
      case AgentType.RuleBased:
        return 'info';
      case AgentType.MLBased:
        return 'success';
      case AgentType.Hybrid:
        return 'warn';
      default:
        return 'secondary';
    }
  }

  /**
   * Get severity class for health status
   */
  getHealthSeverity(state: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case 'Healthy':
        return 'success';
      case 'Degraded':
        return 'warn';
      case 'Unhealthy':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  /**
   * Get icon for health status
   */
  getHealthIcon(state: string): string {
    switch (state) {
      case 'Healthy':
        return 'pi pi-check-circle';
      case 'Degraded':
        return 'pi pi-exclamation-triangle';
      case 'Unhealthy':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-question-circle';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Format success rate as percentage
   */
  formatSuccessRate(rate: number | undefined): string {
    if (rate === undefined) return 'N/A';
    return `${(rate * 100).toFixed(1)}%`;
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number | undefined): string {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  }

  /**
   * Get configuration parameters as array for display
   */
  getConfigurationParameters(): { key: string; value: any }[] {
    if (!this.configuration?.parameters) return [];
    return Object.entries(this.configuration.parameters).map(([key, value]) => ({
      key,
      value
    }));
  }

  /**
   * Format JSON value for display
   */
  formatJsonValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  /**
   * Check if agent is active
   */
  isAgentActive(): boolean {
    return this.agent?.isActive || false;
  }

  /**
   * Check if agent is healthy
   */
  isAgentHealthy(): boolean {
    return this.healthStatus?.state === 'Healthy';
  }
}
