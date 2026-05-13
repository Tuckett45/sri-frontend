/**
 * Phase 4: Workflow Template Models
 * Data structures for workflow template management and customization
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  workflowType: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  steps: TemplateStep[];
  configuration: TemplateConfig;
  metadata: Record<string, any>;
}

export interface TemplateStep {
  id: string;
  name: string;
  description: string;
  order: number;
  component: string;
  defaultValues: Record<string, any>;
  validations: ValidationRule[];
  conditional?: StepCondition;
}

export interface StepCondition {
  field: string;
  operator: string;
  value: any;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templateCount: number;
}

export interface TemplateConfig {
  allowCustomization: boolean;
  requiredFields: string[];
  optionalFields: string[];
  defaultValues: Record<string, any>;
  validations: ValidationRule[];
  permissions: TemplatePermission[];
}

export interface TemplatePermission {
  role: string;
  canView: boolean;
  canUse: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AppliedTemplate {
  templateId: string;
  workflowId: string;
  appliedAt: Date;
  customizations: TemplateCustomization;
  status: 'applied' | 'in-progress' | 'completed';
}

export interface TemplateCustomization {
  templateId: string;
  overrides: Record<string, any>;
  addedSteps: TemplateStep[];
  removedSteps: string[];
  modifiedSteps: Map<string, Partial<TemplateStep>>;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface TemplateDiff {
  version1: string;
  version2: string;
  addedSteps: TemplateStep[];
  removedSteps: TemplateStep[];
  modifiedSteps: StepDiff[];
  configChanges: Record<string, any>;
}

export interface StepDiff {
  stepId: string;
  changes: Record<string, { old: any; new: any }>;
}

export interface UsageStats {
  templateId: string;
  totalUsage: number;
  successRate: number;
  averageCompletionTime: number;
  popularCustomizations: TemplateCustomization[];
  userRatings: number[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  params: Record<string, any>;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning';
}

/**
 * Configuration Management Models
 * Data structures for system and template configuration management
 */

export interface Configuration {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  category: string;
  isEditable: boolean;
  validationSchema?: ConfigSchema;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface ConfigSchema {
  type: string;
  required: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  properties?: Record<string, ConfigSchema>;
}

export interface TemplateConfigData {
  templateId: string;
  configurations: Record<string, any>;
  updatedAt: Date;
  updatedBy: string;
}
