// Workflow Wizard Models

export interface WizardStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  component: string;
  validations: ValidationRule[];
  dependencies: string[];
}

export interface WorkflowData {
  id?: string;
  type: string;
  steps: Map<string, any>;
  metadata: Record<string, any>;
  status: 'draft' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'success' | 'failure' | 'partial';
  results: Map<string, StageResult>;
  errors: WorkflowError[];
  completedAt: Date;
}

export interface StageResult {
  stageId: string;
  status: 'success' | 'failure' | 'skipped';
  output: any;
  error?: Error;
  duration: number;
  timestamp: Date;
}

export interface WorkflowError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  params: Record<string, any>;
  message: string;
}

export interface SaveStatus {
  saving: boolean;
  saved: boolean;
  error?: string;
  lastSavedAt?: Date;
}

export interface WorkflowDraft {
  id: string;
  workflowType: string;
  stepData: Map<string, any>;
  currentStepIndex: number;
  completedSteps: number[];
  createdAt: Date;
  updatedAt: Date;
}

// Pipeline Models

export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  order: number;
  dependencies: string[];
  retryable: boolean;
  maxRetries: number;
  currentRetry: number;
}

export interface JobResult {
  jobId: string;
  status: 'success' | 'failure' | 'partial';
  results: Map<string, StageResult>;
  errors: WorkflowError[];
  completedAt: Date;
}
