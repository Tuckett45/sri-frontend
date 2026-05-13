import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';

import { PipelineStage, StageResult, JobResult } from '../models/workflow.models';

/**
 * PipelineExecutionService
 * 
 * Handles pipeline stage execution with dependency checking, retry logic,
 * and result aggregation.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5, 6.7
 */
@Injectable({
  providedIn: 'root'
})
export class PipelineExecutionService {
  private readonly apiUrl = '/api/pipeline';

  constructor(private http: HttpClient) {}

  /**
   * Execute a pipeline stage
   * Requirement 6.1: Execute stages in order according to their order property
   * 
   * @param jobId - The job ID
   * @param stageId - The stage ID to execute
   * @returns Observable of stage result
   */
  executeStage(jobId: string, stageId: string): Observable<StageResult> {
    const startTime = Date.now();

    // In a real implementation, this would call the backend API
    // For now, we simulate the execution
    return this.http.post<any>(`${this.apiUrl}/execute`, { jobId, stageId })
      .pipe(
        map(response => {
          const duration = Date.now() - startTime;
          return {
            stageId: stageId,
            status: 'completed' as const,
            output: response.data,
            duration: duration,
            timestamp: new Date()
          };
        }),
        catchError(error => {
          const duration = Date.now() - startTime;
          const result: StageResult = {
            stageId: stageId,
            status: 'failed' as const,
            output: null,
            error: error,
            duration: duration,
            timestamp: new Date()
          };
          return throwError(() => result);
        })
      );
  }

  /**
   * Check if stage dependencies are met
   * Requirement 6.2: Check stage dependencies before execution
   * 
   * @param stage - The stage to check
   * @param allStages - All pipeline stages
   * @returns True if dependencies are met, false otherwise
   */
  checkDependencies(stage: PipelineStage, allStages: PipelineStage[]): boolean {
    if (stage.dependencies.length === 0) {
      return true;
    }

    return stage.dependencies.every(depId => {
      const depStage = allStages.find(s => s.id === depId);
      if (!depStage) {
        return false;
      }
      // Dependency is met if the stage is completed or skipped
      return depStage.status === 'completed' || depStage.status === 'skipped';
    });
  }

  /**
   * Retry a failed stage
   * Requirement 6.5: Allow manual retry up to maximum retry count for failed stages
   * 
   * @param jobId - The job ID
   * @param stage - The stage to retry
   * @returns Observable of stage result
   */
  retryStage(jobId: string, stage: PipelineStage): Observable<StageResult> {
    // Check if stage is retryable
    if (!stage.retryable) {
      return throwError(() => new Error(`Stage ${stage.name} is not retryable`));
    }

    // Check retry count
    if (stage.currentRetries >= stage.maxRetries) {
      return throwError(() => new Error(
        `Stage ${stage.name} has reached maximum retry count (${stage.maxRetries})`
      ));
    }

    // Execute stage with retry
    return this.executeStage(jobId, stage.id);
  }

  /**
   * Skip a stage with reason
   * Requirement 6.6: Record skip reason and proceed to next stage when manually skipped
   * 
   * @param stageId - The stage ID to skip
   * @param reason - The reason for skipping
   * @returns Observable of stage result
   */
  skipStage(stageId: string, reason: string): Observable<StageResult> {
    if (!reason || reason.trim().length === 0) {
      return throwError(() => new Error('Skip reason is required'));
    }

    const result: StageResult = {
      stageId: stageId,
      status: 'skipped' as const,
      output: { skipReason: reason },
      duration: 0,
      timestamp: new Date()
    };

    return of(result);
  }

  /**
   * Aggregate results from all stages
   * Requirement 6.7: Emit completion event with aggregated results when all stages complete
   * 
   * @param jobId - The job ID
   * @param stages - All pipeline stages
   * @param stageResults - Map of stage results
   * @returns Job result with aggregated data
   */
  aggregateResults(
    jobId: string,
    stages: PipelineStage[],
    stageResults: Map<string, StageResult>
  ): JobResult {
    // Check if any stages failed
    const hasFailures = stages.some(s => s.status === 'failed');
    
    // Check if all stages are completed or skipped
    const allCompleted = stages.every(s => 
      s.status === 'completed' || s.status === 'skipped'
    );

    // Determine overall status
    let status: 'success' | 'failure' | 'partial';
    if (hasFailures) {
      status = 'failure';
    } else if (allCompleted) {
      status = 'success';
    } else {
      status = 'partial';
    }

    // Collect errors from failed stages
    const errors: any[] = [];
    stageResults.forEach((result, stageId) => {
      if (result.error) {
        errors.push({
          code: 'STAGE_ERROR',
          message: result.error.message || 'Stage execution failed',
          field: stageId,
          severity: 'error' as const
        });
      }
    });

    return {
      jobId: jobId,
      status: status,
      results: stageResults,
      errors: errors,
      completedAt: new Date()
    };
  }

  /**
   * Get next stage to execute
   * Requirement 6.1: Execute stages in order according to their order property
   * 
   * @param stages - All pipeline stages
   * @returns Next stage to execute or null if none
   */
  getNextStage(stages: PipelineStage[]): PipelineStage | null {
    // Sort stages by order
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    
    // Find first pending stage
    return sortedStages.find(s => s.status === 'pending') || null;
  }

  /**
   * Validate stage execution prerequisites
   * Requirement 6.2: Check stage dependencies before execution
   * 
   * @param stage - The stage to validate
   * @param allStages - All pipeline stages
   * @returns Validation result with error message if invalid
   */
  validateStageExecution(
    stage: PipelineStage,
    allStages: PipelineStage[]
  ): { valid: boolean; error?: string } {
    // Check if stage is already running or completed
    if (stage.status === 'running') {
      return { valid: false, error: 'Stage is already running' };
    }
    if (stage.status === 'completed') {
      return { valid: false, error: 'Stage is already completed' };
    }
    if (stage.status === 'skipped') {
      return { valid: false, error: 'Stage has been skipped' };
    }

    // Check dependencies
    if (!this.checkDependencies(stage, allStages)) {
      const unmetDeps = stage.dependencies.filter(depId => {
        const depStage = allStages.find(s => s.id === depId);
        return !depStage || (depStage.status !== 'completed' && depStage.status !== 'skipped');
      });
      return { 
        valid: false, 
        error: `Dependencies not met: ${unmetDeps.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Calculate pipeline progress
   * 
   * @param stages - All pipeline stages
   * @returns Progress percentage (0-100)
   */
  calculateProgress(stages: PipelineStage[]): number {
    if (stages.length === 0) {
      return 0;
    }

    const completedCount = stages.filter(s => 
      s.status === 'completed' || s.status === 'skipped'
    ).length;

    return (completedCount / stages.length) * 100;
  }

  /**
   * Get pipeline status summary
   * 
   * @param stages - All pipeline stages
   * @returns Status summary object
   */
  getStatusSummary(stages: PipelineStage[]): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    skipped: number;
  } {
    return {
      total: stages.length,
      pending: stages.filter(s => s.status === 'pending').length,
      running: stages.filter(s => s.status === 'running').length,
      completed: stages.filter(s => s.status === 'completed').length,
      failed: stages.filter(s => s.status === 'failed').length,
      skipped: stages.filter(s => s.status === 'skipped').length
    };
  }
}
