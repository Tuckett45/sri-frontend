/**
 * Agent List Component
 * 
 * Displays available agents with filtering by domain, type, and search.
 * Shows agent metadata and health status in a table format.
 * 
 * Requirements: 7.1, 7.2
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';

// Models
import { 
  AgentMetadata, 
  AgentDomain, 
  AgentType,
  AgentHealthStatus 
} from '../../models/agent.model';

// State
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';
import { AgentFilters } from '../../state/agents/agent.state';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    BadgeModule
  ],
  templateUrl: './agent-list.component.html',
  styleUrls: ['./agent-list.component.scss']
})
export class AgentListComponent implements OnInit, OnDestroy {
  // Observables from store
  agents$: Observable<AgentMetadata[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  filters$: Observable<AgentFilters>;
  healthStatuses$: Observable<Record<string, AgentHealthStatus>>;
  loadingHealth$: Observable<boolean>;

  // Local state
  agents: AgentMetadata[] = [];
  loading = false;
  error: string | null = null;
  currentFilters: AgentFilters = {};
  healthStatuses: Record<string, AgentHealthStatus> = {};
  loadingHealth = false;

  // Filter options
  domainOptions: { label: string; value: AgentDomain | '' }[] = [];
  typeOptions: { label: string; value: AgentType | '' }[] = [];
  activeOptions: { label: string; value: boolean | undefined }[] = [];

  // Enums for template
  AgentDomain = AgentDomain;
  AgentType = AgentType;

  // Search term
  searchTerm = '';

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router
  ) {
    // Initialize observables
    this.agents$ = this.store.select(AgentSelectors.selectFilteredAgents);
    this.loading$ = this.store.select(AgentSelectors.selectAgentsLoading);
    this.error$ = this.store.select(AgentSelectors.selectAgentsError);
    this.filters$ = this.store.select(AgentSelectors.selectAgentFilters);
    this.healthStatuses$ = this.store.select(AgentSelectors.selectHealthStatuses);
    this.loadingHealth$ = this.store.select(AgentSelectors.selectAgentLoadingHealth);
  }

  ngOnInit(): void {
    // Initialize filter options
    this.initializeFilterOptions();

    // Subscribe to store observables
    this.agents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agents => this.agents = agents);

    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    this.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.currentFilters = filters;
        this.searchTerm = filters.searchTerm || '';
      });

    this.healthStatuses$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => this.healthStatuses = statuses);

    this.loadingHealth$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loadingHealth = loading);

    // Load initial data
    this.loadAgents();
    this.loadHealthStatuses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize filter dropdown options
   */
  private initializeFilterOptions(): void {
    // Domain filter options
    this.domainOptions = [
      { label: 'All Domains', value: '' },
      { label: 'Deployment', value: AgentDomain.Deployment },
      { label: 'Dispatch', value: AgentDomain.Dispatch },
      { label: 'CRM', value: AgentDomain.CRM },
      { label: 'Cross-Cutting', value: AgentDomain.CrossCutting }
    ];

    // Type filter options
    this.typeOptions = [
      { label: 'All Types', value: '' },
      { label: 'Rule-Based', value: AgentType.RuleBased },
      { label: 'ML-Based', value: AgentType.MLBased },
      { label: 'Hybrid', value: AgentType.Hybrid }
    ];

    // Active status filter options
    this.activeOptions = [
      { label: 'All Agents', value: undefined },
      { label: 'Active Only', value: true },
      { label: 'Inactive Only', value: false }
    ];
  }

  /**
   * Load agents with current filters
   */
  loadAgents(): void {
    this.store.dispatch(AgentActions.loadAgents({ filters: this.currentFilters }));
  }

  /**
   * Load health statuses for all agents
   */
  loadHealthStatuses(): void {
    this.store.dispatch(AgentActions.loadAllHealthStatuses());
  }

  /**
   * Handle domain filter change
   */
  onDomainFilterChange(domain: AgentDomain | ''): void {
    const filters: AgentFilters = { ...this.currentFilters };
    
    if (domain) {
      filters.domain = domain;
    } else {
      delete filters.domain;
    }

    this.store.dispatch(AgentActions.setAgentFilters({ filters }));
    this.loadAgents();
  }

  /**
   * Handle type filter change
   */
  onTypeFilterChange(type: AgentType | ''): void {
    const filters: AgentFilters = { ...this.currentFilters };
    
    if (type) {
      filters.type = type;
    } else {
      delete filters.type;
    }

    this.store.dispatch(AgentActions.setAgentFilters({ filters }));
    this.loadAgents();
  }

  /**
   * Handle active status filter change
   */
  onActiveFilterChange(isActive: boolean | undefined): void {
    const filters: AgentFilters = { ...this.currentFilters };
    
    if (isActive !== undefined) {
      filters.isActive = isActive;
    } else {
      delete filters.isActive;
    }

    this.store.dispatch(AgentActions.setAgentFilters({ filters }));
  }

  /**
   * Handle search term change
   */
  onSearchChange(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    const filters: AgentFilters = { ...this.currentFilters };
    
    if (searchTerm) {
      filters.searchTerm = searchTerm;
    } else {
      delete filters.searchTerm;
    }

    this.store.dispatch(AgentActions.setAgentFilters({ filters }));
  }

  /**
   * Handle row click - navigate to detail view
   */
  onRowClick(agent: AgentMetadata): void {
    if (agent.agentId) {
      this.store.dispatch(AgentActions.selectAgent({ agentId: agent.agentId }));
      this.router.navigate(['/atlas/agents', agent.agentId]);
    }
  }

  /**
   * Retry loading agents after error
   */
  onRetry(): void {
    this.loadAgents();
  }

  /**
   * Clear all filters
   */
  onClearFilters(): void {
    this.store.dispatch(AgentActions.clearAgentFilters());
    this.loadAgents();
  }

  /**
   * Refresh agents and health statuses
   */
  onRefresh(): void {
    this.store.dispatch(AgentActions.refreshAgents());
    this.loadHealthStatuses();
  }

  /**
   * Get health status for an agent
   */
  getHealthStatus(agentId: string | undefined): AgentHealthStatus | null {
    if (!agentId) return null;
    return this.healthStatuses[agentId] || null;
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
   * Check if agent has any filters active
   */
  hasActiveFilters(): boolean {
    return Object.keys(this.currentFilters).length > 0;
  }
}
