import { Injectable } from '@angular/core';
import {
  WorkflowTemplate,
  TemplateCustomization,
  TemplateStep,
  ValidationResult,
  ValidationError
} from '../models/template.models';

/**
 * TemplateCustomizationService
 * 
 * Handles template customization logic including step modifications,
 * additions, and removals while maintaining template integrity.
 * 
 * Requirements: 11.2, 11.3, 11.4, 11.5
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateCustomizationService {

  /**
   * Validate template customization
   * Ensures required steps are not removed and added/modified steps are valid
   * 
   * Requirements: 11.2, 11.3, 11.4
   */
  validateTemplateCustomization(
    template: WorkflowTemplate,
    customizations: TemplateCustomization
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    // Get required steps from template configuration
    const requiredStepIds = this.getRequiredStepIds(template);

    // Validate removed steps (Requirement: 11.2)
    this.validateRemovedSteps(customizations.removedSteps, requiredStepIds, errors);

    // Validate added steps (Requirement: 11.3)
    this.validateAddedSteps(customizations.addedSteps, template, errors);

    // Validate modified steps (Requirement: 11.4)
    this.validateModifiedSteps(customizations.modifiedSteps, template, requiredStepIds, errors);

    // Validate overrides
    this.validateOverrides(customizations.overrides, template, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        templateId: customizations.templateId,
        addedStepsCount: customizations.addedSteps.length,
        removedStepsCount: customizations.removedSteps.length,
        modifiedStepsCount: customizations.modifiedSteps.size,
        overridesCount: Object.keys(customizations.overrides).length
      }
    };
  }

  /**
   * Apply customizations to a template
   * Creates a new workflow configuration based on template and customizations
   * Ensures template immutability (Requirement: 11.5)
   */
  applyCustomizations(
    template: WorkflowTemplate,
    customizations: TemplateCustomization
  ): WorkflowTemplate {
    // Deep clone template to ensure immutability (Requirement: 11.5)
    const customizedTemplate = this.deepCloneTemplate(template);

    // Apply step removals
    customizedTemplate.steps = customizedTemplate.steps.filter(
      step => !customizations.removedSteps.includes(step.id)
    );

    // Apply step modifications
    customizedTemplate.steps = customizedTemplate.steps.map(step => {
      const modifications = customizations.modifiedSteps.get(step.id);
      if (modifications) {
        return { ...step, ...modifications };
      }
      return step;
    });

    // Apply step additions
    customizedTemplate.steps = [
      ...customizedTemplate.steps,
      ...customizations.addedSteps
    ];

    // Re-sort steps by order
    customizedTemplate.steps.sort((a, b) => a.order - b.order);

    // Apply configuration overrides
    if (Object.keys(customizations.overrides).length > 0) {
      customizedTemplate.configuration = {
        ...customizedTemplate.configuration,
        defaultValues: {
          ...customizedTemplate.configuration.defaultValues,
          ...customizations.overrides
        }
      };
    }

    return customizedTemplate;
  }

  /**
   * Add a step to customizations
   * Requirement: 11.3
   */
  addStep(
    customizations: TemplateCustomization,
    step: TemplateStep
  ): TemplateCustomization {
    return {
      ...customizations,
      addedSteps: [...customizations.addedSteps, step]
    };
  }

  /**
   * Remove a step from customizations
   * Requirement: 11.2
   */
  removeStep(
    customizations: TemplateCustomization,
    stepId: string
  ): TemplateCustomization {
    return {
      ...customizations,
      removedSteps: [...customizations.removedSteps, stepId]
    };
  }

  /**
   * Modify a step in customizations
   * Requirement: 11.4
   */
  modifyStep(
    customizations: TemplateCustomization,
    stepId: string,
    modifications: Partial<TemplateStep>
  ): TemplateCustomization {
    const newModifiedSteps = new Map(customizations.modifiedSteps);
    
    // Merge with existing modifications for this step
    const existingMods = newModifiedSteps.get(stepId) || {};
    newModifiedSteps.set(stepId, { ...existingMods, ...modifications });

    return {
      ...customizations,
      modifiedSteps: newModifiedSteps
    };
  }

  /**
   * Get required step IDs from template
   */
  private getRequiredStepIds(template: WorkflowTemplate): string[] {
    if (!template.configuration || !template.configuration.requiredFields) {
      return [];
    }

    // Required fields might reference step IDs or be marked in steps
    const requiredFromConfig = template.configuration.requiredFields;
    const requiredSteps = template.steps
      .filter(step => requiredFromConfig.includes(step.id))
      .map(step => step.id);

    return requiredSteps;
  }

  /**
   * Validate removed steps
   * Requirement: 11.2 - Required steps cannot be removed
   */
  private validateRemovedSteps(
    removedSteps: string[],
    requiredStepIds: string[],
    errors: ValidationError[]
  ): void {
    const removedRequiredSteps = removedSteps.filter(stepId =>
      requiredStepIds.includes(stepId)
    );

    if (removedRequiredSteps.length > 0) {
      errors.push({
        field: 'removedSteps',
        message: `Cannot remove required steps: ${removedRequiredSteps.join(', ')}`,
        code: 'REQUIRED_STEP_REMOVED',
        severity: 'error'
      });
    }
  }

  /**
   * Validate added steps
   * Requirement: 11.3 - Added steps must have valid configurations
   */
  private validateAddedSteps(
    addedSteps: TemplateStep[],
    template: WorkflowTemplate,
    errors: ValidationError[]
  ): void {
    const existingStepIds = new Set(template.steps.map(s => s.id));

    addedSteps.forEach((step, index) => {
      // Check required fields
      if (!step.id || !step.name || !step.component) {
        errors.push({
          field: `addedSteps[${index}]`,
          message: `Added step must have id, name, and component`,
          code: 'INVALID_ADDED_STEP',
          severity: 'error'
        });
      }

      // Check for duplicate IDs
      if (existingStepIds.has(step.id)) {
        errors.push({
          field: `addedSteps[${index}].id`,
          message: `Added step ID '${step.id}' conflicts with existing step`,
          code: 'DUPLICATE_STEP_ID',
          severity: 'error'
        });
      }

      // Validate order
      if (typeof step.order !== 'number' || step.order < 0) {
        errors.push({
          field: `addedSteps[${index}].order`,
          message: `Step order must be a non-negative number`,
          code: 'INVALID_STEP_ORDER',
          severity: 'error'
        });
      }

      // Validate component
      if (typeof step.component !== 'string' || step.component.trim() === '') {
        errors.push({
          field: `addedSteps[${index}].component`,
          message: `Step component must be a non-empty string`,
          code: 'INVALID_COMPONENT',
          severity: 'error'
        });
      }
    });
  }

  /**
   * Validate modified steps
   * Requirement: 11.4 - Modified steps must maintain required fields
   */
  private validateModifiedSteps(
    modifiedSteps: Map<string, Partial<TemplateStep>>,
    template: WorkflowTemplate,
    requiredStepIds: string[],
    errors: ValidationError[]
  ): void {
    modifiedSteps.forEach((modifications, stepId) => {
      // Check if step exists
      const originalStep = template.steps.find(s => s.id === stepId);
      
      if (!originalStep) {
        errors.push({
          field: `modifiedSteps.${stepId}`,
          message: `Cannot modify non-existent step: ${stepId}`,
          code: 'STEP_NOT_FOUND',
          severity: 'error'
        });
        return;
      }

      // If this is a required step, ensure required fields are not removed
      if (requiredStepIds.includes(stepId)) {
        const requiredFields: (keyof TemplateStep)[] = ['id', 'name', 'component', 'order'];
        
        requiredFields.forEach(field => {
          if (modifications.hasOwnProperty(field)) {
            const value = modifications[field];
            
            // Check if field is being set to null/undefined/empty
            if (value === null || value === undefined || value === '') {
              errors.push({
                field: `modifiedSteps.${stepId}.${field}`,
                message: `Cannot remove required field '${field}' from required step`,
                code: 'REQUIRED_FIELD_REMOVED',
                severity: 'error'
              });
            }
          }
        });
      }

      // Validate order if modified
      if (modifications.hasOwnProperty('order')) {
        const order = modifications.order;
        if (typeof order !== 'number' || order < 0) {
          errors.push({
            field: `modifiedSteps.${stepId}.order`,
            message: `Step order must be a non-negative number`,
            code: 'INVALID_STEP_ORDER',
            severity: 'error'
          });
        }
      }

      // Validate component if modified
      if (modifications.hasOwnProperty('component')) {
        const component = modifications.component;
        if (typeof component !== 'string' || component.trim() === '') {
          errors.push({
            field: `modifiedSteps.${stepId}.component`,
            message: `Step component must be a non-empty string`,
            code: 'INVALID_COMPONENT',
            severity: 'error'
          });
        }
      }
    });
  }

  /**
   * Validate configuration overrides
   */
  private validateOverrides(
    overrides: Record<string, any>,
    template: WorkflowTemplate,
    warnings: any[]
  ): void {
    // Check if overrides reference valid fields
    const validFields = new Set([
      ...template.configuration.requiredFields,
      ...template.configuration.optionalFields
    ]);

    Object.keys(overrides).forEach(key => {
      if (!validFields.has(key)) {
        warnings.push({
          field: `overrides.${key}`,
          message: `Override field '${key}' is not defined in template configuration`,
          code: 'UNKNOWN_OVERRIDE_FIELD',
          severity: 'warning'
        });
      }
    });
  }

  /**
   * Deep clone a template to ensure immutability
   * Requirement: 11.5
   */
  private deepCloneTemplate(template: WorkflowTemplate): WorkflowTemplate {
    return {
      ...template,
      steps: template.steps.map(step => ({
        ...step,
        defaultValues: { ...step.defaultValues },
        validations: [...step.validations],
        conditional: step.conditional ? { ...step.conditional } : undefined
      })),
      configuration: {
        ...template.configuration,
        requiredFields: [...template.configuration.requiredFields],
        optionalFields: [...template.configuration.optionalFields],
        defaultValues: { ...template.configuration.defaultValues },
        validations: [...template.configuration.validations],
        permissions: template.configuration.permissions.map(p => ({ ...p }))
      },
      metadata: { ...template.metadata }
    };
  }

  /**
   * Create an empty customization object
   */
  createEmptyCustomization(templateId: string): TemplateCustomization {
    return {
      templateId,
      overrides: {},
      addedSteps: [],
      removedSteps: [],
      modifiedSteps: new Map()
    };
  }

  /**
   * Merge multiple customizations
   */
  mergeCustomizations(
    base: TemplateCustomization,
    ...customizations: TemplateCustomization[]
  ): TemplateCustomization {
    let merged = { ...base };

    customizations.forEach(custom => {
      // Merge overrides
      merged.overrides = { ...merged.overrides, ...custom.overrides };

      // Merge added steps (avoid duplicates)
      const existingAddedIds = new Set(merged.addedSteps.map(s => s.id));
      custom.addedSteps.forEach(step => {
        if (!existingAddedIds.has(step.id)) {
          merged.addedSteps.push(step);
        }
      });

      // Merge removed steps (avoid duplicates)
      const removedSet = new Set([...merged.removedSteps, ...custom.removedSteps]);
      merged.removedSteps = Array.from(removedSet);

      // Merge modified steps
      custom.modifiedSteps.forEach((mods, stepId) => {
        const existingMods = merged.modifiedSteps.get(stepId) || {};
        merged.modifiedSteps.set(stepId, { ...existingMods, ...mods });
      });
    });

    return merged;
  }
}
