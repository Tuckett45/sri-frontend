// Validation Models

export interface ValidationResult {
  isValid: boolean;
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
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  entityType: string;
  conditions: Condition[];
  action: 'allow' | 'deny' | 'warn';
  message: string;
  priority: number;
}

export interface Condition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'contains' | 'notContains' | 'in' | 'notIn' | 'matches';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface Constraint {
  id: string;
  field: string;
  type: 'required' | 'unique' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  severity: 'error' | 'warning';
}
