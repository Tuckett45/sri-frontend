/**
 * Agent Execution Component
 * 
 * Provides a form for executing an agent with input parameters.
 * Displays execution results including recommendations and metadata.
 * 
 * Requirements: 7.1, 7.5
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';

// Models
import {
  AgentMetadata,
  AgentRecommendation,
  ExecuteAgentRequest,
  AgentExecutionStatus
} from '../../models/agent.model';

// State
import * as AgentActions from '../../state/agents/agent.actions';
import * as AgentSelectors from '../../state/agents/agent.selectors';

@Component({
  selector: 'app-agent-execution',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextarea,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    DividerModule,
    PanelModule
  ],
  templateUrl: './agent-execution.component.html',
  styleUrls: ['./agent-execution.component.scss']
})
export class AgentExecutionComponent implements OnInit, OnDestroy {
  // Observables from store
  agent$: Observable<AgentMetadata | null | undefined>;
  executing$: Observable<boolean>;
  executionError$: Observable<string | null>;
  recentExecutions$: Observable<AgentRecommendation[]>;

  // Local state
  agentId: string | null = null;
  agent: AgentMetadata | null | undefined = null;
  executing = false;
  executionError: string | null = null;
  recentExecutions: AgentRecommendation[] = [];
  lastExecution: AgentRecommendation | null = null;

  // Form
  executionForm: FormGroup;

  // Enums for template
  AgentExecutionStatus = AgentExecutionStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Initialize observables
    this.agent$ = this.store.select(AgentSelectors.selectSelectedAgent);
    this.executing$ = this.store.select(AgentSelectors.selectAgentExecuting);
    this.executionError$ = this.store.select(AgentSelectors.selectAgentExecutingError);
    this.recentExecutions$ = this.store.select(AgentSelectors.selectRecentExecutions);

    // Initialize form
    this.executionForm = this.fb.group({
      inputJson: ['', [Validators.required]],
      version: ['']
    });
  }

  ngOnInit(): void {
    // Get agent ID from route
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.agentId = params['id'];
        if (this.agentId) {
          this.loadAgentData();
        }
      });

    // Subscribe to store observables
    this.agent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agent => {
        this.agent = agent;
        if (agent?.version) {
          this.executionForm.patchValue({ version: agent.version });
        }
      });

    this.executing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(executing => this.executing = executing);

    this.executionError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.executionError = error);

    this.recentExecutions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(executions => {
        this.recentExecutions = executions;
        if (executions.length > 0) {
          this.lastExecution = executions[0];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load agent data
   */
  private loadAgentData(): void {
    if (!this.agentId) return;
    this.store.dispatch(AgentActions.loadAgentDetail({ agentId: this.agentId }));
  }

  /**
   * Execute agent with form input
   */
  onExecute(): void {
    if (this.executionForm.invalid || !this.agentId) return;

    const formValue = this.executionForm.value;
    
    try {
      // Parse JSON input
      const input = JSON.parse(formValue.inputJson);
      
      const request: ExecuteAgentRequest = {
        agentId: this.agentId,
        input,
        version: formValue.version || undefined
      };

      this.store.dispatch(AgentActions.executeAgent({ request }));
    } catch (error) {
      this.executionError = 'Invalid JSON input. Please check your input format.';
    }
  }

  /**
   * Clear execution results
   */
  onClearResults(): void {
    this.lastExecution = null;
    this.store.dispatch(AgentActions.clearRecentExecutions());
  }

  /**
   * Load example input
   */
  onLoadExample(): void {
    const exampleInput = {
      deploymentId: 'example-deployment-123',
      targetState: 'READY',
      metadata: {
        environment: 'production',
        priority: 'high'
      }
    };

    this.executionForm.patchValue({
      inputJson: JSON.stringify(exampleInput, null, 2)
    });
  }

  /**
   * Navigate back to agent detail
   */
  onBack(): void {
    if (this.agentId) {
      this.router.navigate(['/atlas/agents', this.agentId]);
    } else {
      this.router.navigate(['/atlas/agents']);
    }
  }

  /**
   * Get severity class for execution status
   */
  getStatusSeverity(status: AgentExecutionStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case AgentExecutionStatus.Success:
        return 'success';
      case AgentExecutionStatus.PartialSuccess:
        return 'warn';
      case AgentExecutionStatus.Failed:
        return 'danger';
      case AgentExecutionStatus.Timeout:
        return 'warn';
      default:
        return 'secondary';
    }
  }

  /**
   * Get icon for execution status
   */
  getStatusIcon(status: AgentExecutionStatus): string {
    switch (status) {
      case AgentExecutionStatus.Success:
        return 'pi pi-check-circle';
      case AgentExecutionStatus.PartialSuccess:
        return 'pi pi-exclamation-triangle';
      case AgentExecutionStatus.Failed:
        return 'pi pi-times-circle';
      case AgentExecutionStatus.Timeout:
        return 'pi pi-clock';
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
   * Format confidence score as percentage
   */
  formatConfidence(score: number | undefined): string {
    if (score === undefined) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  }

  /**
   * Format JSON for display
   */
  formatJson(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return this.executionForm.valid && !this.executing;
  }

  /**
   * Check if agent is active
   */
  isAgentActive(): boolean {
    return this.agent?.isActive || false;
  }

  /**
   * Get decision factors as array
   */
  getDecisionFactors(): any[] {
    return this.lastExecution?.decisionFactors || [];
  }

  /**
   * Get data sources as array
   */
  getDataSources(): any[] {
    return this.lastExecution?.dataSources || [];
  }

  /**
   * Get feature importance entries
   */
  getFeatureImportance(): { feature: string; importance: number }[] {
    if (!this.lastExecution?.featureImportance) return [];
    return Object.entries(this.lastExecution.featureImportance).map(([feature, importance]) => ({
      feature,
      importance
    }));
  }
}
