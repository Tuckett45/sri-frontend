import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { PipelineStage, StageResult, JobResult } from '../../models/workflow.models';
import { PipelineExecutionService } from '../../services/pipeline-execution.service';

/**
 * JobProcessingPipelineComponent
 * 
 * Orchestrates end-to-end job processing from creation through assignment,
 * execution, and completion.
 * 
 * Features:
 * - Pipeline visualization with stages
 * - Stage execution controls
 * - Stage results and error display
 * - Retry and skip functionality
 * 
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.6
 */
@Component({
  selector: 'app-job-processing-pipeline',
  templateUrl: './job-processing-pipeline.component.html',
  styleUrls: ['./job-processing-pipeline.component.scss']
})
export class JobProcessingPipelineComponent implements OnInit, OnDestroy {
  @Input() jobId: string = '';
  @Output() pipelineComplete = new EventEmitter<JobResult>();

  // Pipeline stages
  stages: PipelineStage[] = [
    { 
      id: 'creation', 
      name: 'Job Creation', 
      status: 'pending', 
      order: 0, 
      dependencies: [], 
      retryable: false, 
      maxRetries: 0, 
      currentRetry: 0 
    },
    { 
      id: 'validation', 
      name: 'Validation', 
      status: 'pending', 
      order: 1, 
      dependencies: ['creation'], 
      retryable: true, 
      maxRetries: 3, 
      currentRetry: 0 
    },
    { 
      id: 'assignment', 
      name: 'Technician Assignment', 
      status: 'pending', 
      order: 2, 
      dependencies: ['validation'], 
      retryable: true, 
      maxRetries: 3, 
      currentRetry: 0 
    },
    { 
      id: 'scheduling', 
      name: 'Scheduling', 
      status: 'pending', 
      order: 3, 
      dependencies: ['assignment'], 
      retryable: true, 
      maxRetries: 3, 
      currentRetry: 0 
    },
    { 
      id: 'execution', 
      name: 'Execution', 
      status: 'pending', 
      order: 4, 
      dependencies: ['scheduling'], 
      retryable: true, 
      maxRetries: 2, 
      currentRetry: 0 
    },
    { 
      id: 'completion', 
      name: 'Completion', 
      status: 'pending', 
      order: 5, 
      dependencies: ['execution'], 
      retryable: false, 
      maxRetries: 0, 
      currentRetry: 0 
    }
  ];

  // Stage results
  stageResults: Map<string, StageResult> = new Map();

  // Current stage
  currentStageId: string | null = null;

  // Loading and error states
  loading: boolean = false;
  error: string | null = null;

  // Skip reason
  skipReason: string = '';
  showSkipDialog: boolean = false;
  stageToSkip: string | null = null;

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private pipelineService: PipelineExecutionService
  ) {}

  ngOnInit(): void {
    if (this.jobId) {
      this.loadPipelineState();
      this.startPipeline();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load pipeline state from store or backend
   */
  loadPipelineState(): void {
    // In a real implementation, this would load the pipeline state from the store
    // For now, we'll initialize with default stages
    this.currentStageId = 'creation';
  }

  /**
   * Start pipeline execution
   * Requirement 6.1: Execute stages in order
   */
  startPipeline(): void {
    this.executeNextStage();
  }

  /**
   * Execute next stage in pipeline
   * Requirement 6.1: Execute stages in order according to their order property
   * Requirement 6.2: Check stage dependencies before execution
   */
  private executeNextStage(): void {
    // Find next pending stage using service
    const nextStage = this.pipelineService.getNextStage(this.stages);
    
    if (!nextStage) {
      // All stages complete or failed
      this.completePipeline();
      return;
    }

    // Validate stage execution
    const validation = this.pipelineService.validateStageExecution(nextStage, this.stages);
    if (!validation.valid) {
      this.error = validation.error || 'Cannot execute stage';
      return;
    }

    // Execute stage
    this.currentStageId = nextStage.id;
    this.executeStage(nextStage.id).subscribe({
      next: (result) => {
        this.handleStageSuccess(nextStage.id, result);
      },
      error: (error) => {
        this.handleStageError(nextStage.id, error);
      }
    });
  }

  /**
   * Check if stage dependencies are met
   * Requirement 6.2: Check stage dependencies before execution
   */
  private areDependenciesMet(stage: PipelineStage): boolean {
    return this.pipelineService.checkDependencies(stage, this.stages);
  }

  /**
   * Execute a specific stage
   * Requirement 6.1: Execute stages in order
   */
  executeStage(stageId: string): Observable<StageResult> {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    // Update stage status to running
    stage.status = 'running';
    this.loading = true;

    // Use service to execute stage
    return this.pipelineService.executeStage(this.jobId, stageId);
  }

  /**
   * Handle stage success
   * Requirement 6.3: Update stage status to "completed" on success and proceed to next stage
   */
  private handleStageSuccess(stageId: string, result: StageResult): void {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.status = 'completed';
      this.stageResults.set(stageId, result);
    }
    
    this.loading = false;
    this.error = null;
    
    // Proceed to next stage
    this.executeNextStage();
  }

  /**
   * Handle stage error
   * Requirement 6.4: Update stage status to "failed" and halt pipeline execution on failure
   */
  handleStageError(stageId: string, error: Error): void {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.status = 'failed';
      
      const result: StageResult = {
        stageId: stageId,
        status: 'failure',
        output: null,
        error: error,
        duration: 0,
        timestamp: new Date()
      };
      this.stageResults.set(stageId, result);
    }
    
    this.loading = false;
    this.error = error.message;
    
    // Halt pipeline execution (don't proceed to next stage)
  }

  /**
   * Retry a failed stage
   * Requirement 6.5: Allow manual retry up to maximum retry count for failed stages
   */
  retryStage(stageId: string): void {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) {
      return;
    }

    // Increment retry count
    stage.currentRetry++;
    stage.status = 'pending';
    this.error = null;

    // Use service to retry stage
    this.currentStageId = stageId;
    this.pipelineService.retryStage(this.jobId, stage).subscribe({
      next: (result) => {
        this.handleStageSuccess(stageId, result);
      },
      error: (error) => {
        this.handleStageError(stageId, error);
      }
    });
  }

  /**
   * Show skip dialog for a stage
   */
  showSkipStageDialog(stageId: string): void {
    this.stageToSkip = stageId;
    this.skipReason = '';
    this.showSkipDialog = true;
  }

  /**
   * Cancel skip dialog
   */
  cancelSkip(): void {
    this.showSkipDialog = false;
    this.stageToSkip = null;
    this.skipReason = '';
  }

  /**
   * Skip a stage with reason
   * Requirement 6.6: Record skip reason and proceed to next stage when manually skipped
   */
  skipStage(): void {
    if (!this.stageToSkip || !this.skipReason.trim()) {
      return;
    }

    const stage = this.stages.find(s => s.id === this.stageToSkip);
    if (!stage) {
      return;
    }

    // Use service to skip stage
    this.pipelineService.skipStage(this.stageToSkip, this.skipReason).subscribe({
      next: (result) => {
        // Update stage status to skipped
        stage.status = 'skipped';
        this.stageResults.set(this.stageToSkip!, result);

        // Close dialog
        this.showSkipDialog = false;
        this.stageToSkip = null;
        this.skipReason = '';
        this.error = null;

        // Proceed to next stage
        this.executeNextStage();
      },
      error: (error) => {
        this.error = error.message;
      }
    });
  }

  /**
   * Complete pipeline
   * Requirement 6.7: Emit completion event with aggregated results when all stages complete
   */
  private completePipeline(): void {
    // Use service to aggregate results
    const result = this.pipelineService.aggregateResults(
      this.jobId,
      this.stages,
      this.stageResults
    );

    this.pipelineComplete.emit(result);
  }

  /**
   * Get stage by ID
   */
  getStage(stageId: string): PipelineStage | undefined {
    return this.stages.find(s => s.id === stageId);
  }

  /**
   * Get stage result
   */
  getStageResult(stageId: string): StageResult | undefined {
    return this.stageResults.get(stageId);
  }

  /**
   * Check if stage can be retried
   */
  canRetryStage(stageId: string): boolean {
    const stage = this.stages.find(s => s.id === stageId);
    return stage ? 
      stage.status === 'failed' && 
      stage.retryable && 
      stage.currentRetry < stage.maxRetries : 
      false;
  }

  /**
   * Check if stage can be skipped
   */
  canSkipStage(stageId: string): boolean {
    const stage = this.stages.find(s => s.id === stageId);
    return stage ? stage.status === 'failed' || stage.status === 'pending' : false;
  }

  /**
   * Get pipeline progress percentage
   */
  getPipelineProgress(): number {
    const completedCount = this.stages.filter(s => 
      s.status === 'completed' || s.status === 'skipped'
    ).length;
    return (completedCount / this.stages.length) * 100;
  }

  /**
   * Monitor pipeline progress
   */
  monitorProgress(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Update UI with current progress
        // This could be used to update a progress bar or status display
      });
  }
}
