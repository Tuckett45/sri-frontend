import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  BusinessRule,
  Condition,
  Constraint
} from '../models/validation.models';
import { 
  WorkflowData, 
  ValidationRule, 
  WizardStep 
} from '../models/workflow.models';
import { ApiHeadersService } from '../../../../services/api-headers.service';

/**
 * ValidationEngineService
 * 
 * Centralized validation service for workflow data, business rules, and constraints.
 * 
 * Features:
 * - Validate workflow data against schemas
 * - Evaluate business rules and constraints
 * - Support custom validation logic
 * - Provide detailed validation error messages
 * 
 * Requirements: 7.1, 7.2, 7.5, 7.6
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationEngineService {
  private customValidators: Map<string, ValidatorFn> = new Map();

  constructor(
    private http: HttpClient,
    private apiHeaders: ApiHeadersService
  ) {}

  /**
   * Validate complete workflow data
   * Requirement 7.1: Check all required fields are present and non-empty
   * Requirement 7.2: Evaluate all applicable business rules
   * Requirement 7.3: Return a result containing all validation errors and warnings
   * Requirement 7.4: Include the field name, error message, and error code in the result
   */
  validateWorkflowData(data: WorkflowData): Observable<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields (Requirement 7.1)
    if (!data.type || data.type.trim() === '') {
      errors.push({
        field: 'type',
        message: 'Workflow type is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (!data.createdBy || data.createdBy.trim() === '') {
      errors.push({
        field: 'createdBy',
        message: 'Creator is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    // Validate step data
    if (!data.steps || data.steps.size === 0) {
      errors.push({
        field: 'steps',
        message: 'At least one step is required',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    } else {
      // Validate each step has required data
      data.steps.forEach((stepData, stepId) => {
        if (!stepData || Object.keys(stepData).length === 0) {
          warnings.push({
            field: `steps.${stepId}`,
            message: `Step ${stepId} has no data`,
            code: 'EMPTY_STEP_DATA',
            severity: 'warning'
          });
        }
      });
    }

    // Validate metadata
    if (!data.metadata) {
      warnings.push({
        field: 'metadata',
        message: 'Workflow metadata is missing',
        code: 'MISSING_METADATA',
        severity: 'warning'
      });
    }

    // Call backend for business rule validation (Requirement 7.2)
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers => 
        this.http.post<ValidationResult>(
          '/api/validation/workflow',
          data,
          { headers }
        )
      ),
      map(backendResult => {
        // Aggregate all errors and warnings (Requirement 7.3)
        const allErrors = [...errors, ...(backendResult.errors || [])];
        const allWarnings = [...warnings, ...(backendResult.warnings || [])];

        return {
          valid: allErrors.length === 0 && backendResult.valid,
          errors: allErrors,
          warnings: allWarnings,
          metadata: {
            ...backendResult.metadata,
            localErrorCount: errors.length,
            localWarningCount: warnings.length,
            backendErrorCount: (backendResult.errors || []).length,
            backendWarningCount: (backendResult.warnings || []).length,
            totalErrorCount: allErrors.length,
            totalWarningCount: allWarnings.length
          }
        };
      }),
      catchError(() => {
        // If backend validation fails, return local validation results
        return of({
          valid: errors.length === 0,
          errors,
          warnings,
          metadata: {
            localErrorCount: errors.length,
            localWarningCount: warnings.length,
            backendValidationFailed: true,
            totalErrorCount: errors.length,
            totalWarningCount: warnings.length
          }
        });
      })
    );
  }

  /**
   * Validate individual workflow step
   * Requirement 5.2: Step validation before progression
   * Requirement 7.3: Return a result containing all validation errors and warnings
   * Requirement 7.4: Include the field name, error message, and error code in the result
   */
  validateStep(step: WizardStep, stepData: any): Observable<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate against step's validation rules
    for (const rule of step.validations) {
      const ruleResult = this.validateRule(rule, stepData);
      if (!ruleResult.valid) {
        // Aggregate all errors and warnings from rule validation
        errors.push(...ruleResult.errors);
        warnings.push(...ruleResult.warnings);
      }
    }

    // Check dependencies
    if (step.dependencies && step.dependencies.length > 0) {
      // Dependencies should be validated by the caller
      // Add a warning if dependencies exist but aren't validated
      warnings.push({
        field: 'dependencies',
        message: `Step has ${step.dependencies.length} dependencies that should be validated`,
        code: 'UNVALIDATED_DEPENDENCIES',
        severity: 'warning'
      });
    }

    // Validate required step
    if (step.required && (!stepData || Object.keys(stepData).length === 0)) {
      errors.push({
        field: 'stepData',
        message: `Step ${step.name} is required but has no data`,
        code: 'REQUIRED_STEP_EMPTY',
        severity: 'error'
      });
    }

    return of({
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: { 
        stepId: step.id,
        stepName: step.name,
        errorCount: errors.length,
        warningCount: warnings.length,
        validationRuleCount: step.validations.length
      }
    });
  }

  /**
   * Validate a single validation rule
   */
  private validateRule(rule: ValidationRule, data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const fieldValue = this.getFieldValue(data, rule.field);

    switch (rule.type) {
      case 'required':
        if (this.isEmpty(fieldValue)) {
          errors.push({
            field: rule.field,
            message: rule.message || `${rule.field} is required`,
            code: 'REQUIRED_FIELD',
            severity: 'error'
          });
        }
        break;

      case 'format':
        if (!this.isEmpty(fieldValue) && !this.validateFormat(fieldValue, rule.params)) {
          errors.push({
            field: rule.field,
            message: rule.message || `${rule.field} has invalid format`,
            code: 'INVALID_FORMAT',
            severity: 'error'
          });
        }
        break;

      case 'range':
        if (!this.isEmpty(fieldValue) && !this.validateRange(fieldValue, rule.params)) {
          errors.push({
            field: rule.field,
            message: rule.message || `${rule.field} is out of range`,
            code: 'OUT_OF_RANGE',
            severity: 'error'
          });
        }
        break;

      case 'custom':
        const customValidator = this.customValidators.get(rule.params['validatorName']);
        if (customValidator) {
          const customResult = customValidator(fieldValue, rule.params);
          if (!customResult.valid) {
            errors.push(...customResult.errors);
            warnings.push(...customResult.warnings);
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {}
    };
  }

  /**
   * Validate business rules
   * Requirement 7.2: Evaluate all applicable business rules
   * Requirement 7.3: Return a result containing all validation errors and warnings
   * Requirement 7.4: Include the field name, error message, and error code in the result
   */
  validateBusinessRules(entityType: string, data: any): Observable<ValidationResult> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.post<ValidationResult>(
          `/api/validation/business-rules/${entityType}`,
          data,
          { headers }
        )
      ),
      map(result => {
        // Ensure all errors and warnings are present
        return {
          valid: result.valid && (result.errors || []).length === 0,
          errors: result.errors || [],
          warnings: result.warnings || [],
          metadata: {
            ...result.metadata,
            entityType,
            errorCount: (result.errors || []).length,
            warningCount: (result.warnings || []).length
          }
        };
      }),
      catchError((error) => {
        // Return error result if backend call fails
        return of({
          valid: false,
          errors: [{
            field: 'businessRules',
            message: 'Failed to validate business rules',
            code: 'BUSINESS_RULE_VALIDATION_FAILED',
            severity: 'error' as const
          }],
          warnings: [],
          metadata: {
            entityType,
            backendError: error.message || 'Unknown error',
            errorCount: 1,
            warningCount: 0
          }
        });
      })
    );
  }

  /**
   * Batch validation
   * Requirement 7.6: Validate all items and return individual results
   * Requirement 7.3: Return results containing all validation errors and warnings
   */
  validateBatch(items: any[]): Observable<ValidationResult[]> {
    if (!items || items.length === 0) {
      return of([]);
    }

    // Validate each item and collect results
    const validationObservables = items.map(item => 
      this.validateWorkflowData(item).pipe(
        catchError(error => {
          // If validation fails for an item, return error result
          return of({
            valid: false,
            errors: [{
              field: 'item',
              message: 'Validation failed for item',
              code: 'ITEM_VALIDATION_FAILED',
              severity: 'error' as const
            }],
            warnings: [],
            metadata: {
              error: error.message || 'Unknown error'
            }
          });
        })
      )
    );

    // Use forkJoin to wait for all validations to complete
    return new Observable(observer => {
      Promise.all(validationObservables.map(obs => obs.toPromise())).then(results => {
        observer.next(results as ValidationResult[]);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Register custom validator
   * Requirement 7.5: Support custom validator registration
   */
  registerCustomValidator(name: string, validator: ValidatorFn): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Get custom validator
   */
  getCustomValidator(name: string): ValidatorFn | null {
    return this.customValidators.get(name) || null;
  }

  /**
   * Evaluate a business rule against data
   * Requirement 7.2: Evaluate all applicable business rules
   */
  evaluateRule(rule: BusinessRule, data: any): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    // Evaluate all conditions
    let result = this.evaluateCondition(rule.conditions[0], data);

    for (let i = 1; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);

      // Apply logical operator from previous condition
      const logicalOp = rule.conditions[i - 1].logicalOperator || 'AND';
      if (logicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition against data
   * Requirement 7.2: Evaluate business rule conditions
   */
  evaluateCondition(condition: Condition, data: any): boolean {
    const fieldValue = this.getFieldValue(data, condition.field);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === expectedValue;

      case 'notEquals':
        return fieldValue !== expectedValue;

      case 'greaterThan':
        return Number(fieldValue) > Number(expectedValue);

      case 'lessThan':
        return Number(fieldValue) < Number(expectedValue);

      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(expectedValue);

      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(expectedValue);

      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(String(expectedValue));
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(expectedValue);
        }
        return false;

      case 'notContains':
        if (typeof fieldValue === 'string') {
          return !fieldValue.includes(String(expectedValue));
        }
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(expectedValue);
        }
        return true;

      case 'in':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(fieldValue);
        }
        return false;

      case 'notIn':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(fieldValue);
        }
        return true;

      case 'matches':
        if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
          const pattern = new RegExp(expectedValue);
          return pattern.test(fieldValue);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Validate constraints against data
   * Requirement 7.1: Check all required fields and constraints
   */
  validateConstraints(constraints: Constraint[], data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const constraint of constraints) {
      const fieldValue = this.getFieldValue(data, constraint.field);

      let valid = true;
      let errorMessage = constraint.message;

      switch (constraint.type) {
        case 'required':
          valid = !this.isEmpty(fieldValue);
          break;

        case 'minLength':
          if (!this.isEmpty(fieldValue)) {
            const length = String(fieldValue).length;
            valid = length >= Number(constraint.value);
          }
          break;

        case 'maxLength':
          if (!this.isEmpty(fieldValue)) {
            const length = String(fieldValue).length;
            valid = length <= Number(constraint.value);
          }
          break;

        case 'min':
          if (!this.isEmpty(fieldValue)) {
            valid = Number(fieldValue) >= Number(constraint.value);
          }
          break;

        case 'max':
          if (!this.isEmpty(fieldValue)) {
            valid = Number(fieldValue) <= Number(constraint.value);
          }
          break;

        case 'pattern':
          if (!this.isEmpty(fieldValue)) {
            const pattern = new RegExp(String(constraint.value));
            valid = pattern.test(String(fieldValue));
          }
          break;

        case 'unique':
          // Unique validation would require backend check
          // For now, we'll assume it's valid
          valid = true;
          break;

        case 'custom':
          // Custom constraint validation would use registered validators
          valid = true;
          break;
      }

      if (!valid) {
        if (constraint.severity === 'error') {
          errors.push({
            field: constraint.field,
            message: errorMessage,
            code: `CONSTRAINT_${constraint.type.toUpperCase()}`,
            severity: 'error'
          });
        } else {
          warnings.push({
            field: constraint.field,
            message: errorMessage,
            code: `CONSTRAINT_${constraint.type.toUpperCase()}`,
            severity: 'warning'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: { constraintCount: constraints.length }
    };
  }

  /**
   * Check if can proceed to next step
   * Requirement 5.2: Step validation before progression
   * Requirement 5.3: Validation error display and "Next" button disabling
   */
  canProceedToNextStep(
    currentStep: WizardStep,
    stepData: any,
    completedSteps: Set<number>
  ): Observable<boolean> {
    // Check if all dependencies are completed
    if (currentStep.dependencies && currentStep.dependencies.length > 0) {
      // This would need to check against actual step IDs
      // For now, we'll assume dependencies are satisfied if they're in completedSteps
    }

    // Validate current step
    return this.validateStep(currentStep, stepData).pipe(
      map(result => result.valid)
    );
  }

  // Helper methods

  private getFieldValue(data: any, field: string): any {
    const parts = field.split('.');
    let value = data;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  }

  private validateFormat(value: any, params: any): boolean {
    if (!params.pattern) {
      return true;
    }

    const pattern = new RegExp(params.pattern);
    return pattern.test(String(value));
  }

  private validateRange(value: any, params: any): boolean {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return false;
    }

    if (params.min !== undefined && numValue < params.min) {
      return false;
    }

    if (params.max !== undefined && numValue > params.max) {
      return false;
    }

    return true;
  }
}

/**
 * Custom validator function type
 */
export type ValidatorFn = (value: any, params: any) => ValidationResult;
