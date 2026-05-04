/**
 * System configuration models for admin-level system management.
 * These models support configuration of system settings, market definitions,
 * and approval workflows with audit trail capabilities.
 */

/**
 * System configuration setting
 */
export interface SystemConfiguration {
  id?: string;
  key: string;
  value: any;
  category: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isEditable: boolean;
  requiresRestart?: boolean;
  validationRules?: ValidationRule[];
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

/**
 * Validation rule for configuration values
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message?: string;
}

/**
 * Market definition with filtering rules
 */
export interface MarketDefinition {
  id?: string;
  marketCode: string;
  marketName: string;
  region?: string;
  isActive: boolean;
  filteringRules: MarketFilteringRule[];
  allowedRoles?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Market filtering rule
 */
export interface MarketFilteringRule {
  ruleType: 'include' | 'exclude';
  entityType: string;
  conditions: Record<string, any>;
  priority: number;
}

/**
 * Configuration update request
 */
export interface ConfigurationUpdateRequest {
  key: string;
  value: any;
  reason?: string;
  applyImmediately?: boolean;
  scheduledFor?: Date;
}

/**
 * Market definition update request
 */
export interface MarketDefinitionUpdateRequest {
  marketCode: string;
  updates: Partial<MarketDefinition>;
  reason?: string;
}

/**
 * Configuration history entry for audit trail
 */
export interface ConfigurationHistoryEntry {
  id: string;
  configurationKey: string;
  previousValue: any;
  newValue: any;
  changedBy: string;
  changedByName?: string;
  changedAt: Date;
  reason?: string;
  changeType: 'create' | 'update' | 'delete';
}

/**
 * Configuration export format
 */
export interface ConfigurationExport {
  exportedAt: Date;
  exportedBy: string;
  version: string;
  configurations: SystemConfiguration[];
  marketDefinitions: MarketDefinition[];
  workflowConfigurations?: any[];
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Configuration filters for querying
 */
export interface ConfigurationFilters {
  category?: string;
  isEditable?: boolean;
  searchTerm?: string;
}
