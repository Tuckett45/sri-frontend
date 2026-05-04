/**
 * Pipeline Models
 * Models for job processing pipeline stages and execution
 */

export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  status: PipelineStageStatus;
  dependencies?: string[];
  retryable?: boolean;
  maxRetries?: number;
  currentRetries?: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

export type PipelineStageStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'retrying';

export interface StageResult {
  stageId: string;
  status: PipelineStageStatus;
  success: boolean;
  output?: any;
  error?: StageError;
  startTime: Date;
  endTime: Date;
  duration: number;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface StageError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  retryable: boolean;
}

export interface PipelineExecution {
  id: string;
  jobId: string;
  stages: PipelineStage[];
  currentStage?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  results: Map<string, StageResult>;
}

export interface PipelineConfig {
  stages: PipelineStageDefinition[];
  parallelExecution?: boolean;
  stopOnError?: boolean;
  timeout?: number;
}

export interface PipelineStageDefinition {
  id: string;
  name: string;
  handler: string;
  dependencies?: string[];
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
}
