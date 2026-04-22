import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
  WorkflowTemplate,
  TemplateCategory,
  AppliedTemplate,
  TemplateCustomization,
  ValidationResult,
  TemplateVersion,
  TemplateDiff,
  UsageStats,
  TemplateStep
} from '../models/template.models';
import { ApiHeadersService } from '../../../../services/api-headers.service';

/**
 * TemplateEngineService
 * 
 * Manages workflow template loading, parsing, and application.
 * Supports template customization, validation, and usage tracking.
 * 
 * Requirements: 10.1, 11.1, 11.6
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateEngineService {
  private readonly baseUrl = '/api/templates';
  private templateCache = new Map<string, WorkflowTemplate>();

  constructor(
    private http: HttpClient,
    private apiHeaders: ApiHeadersService
  ) {}

  /**
   * Get all templates, optionally filtered by workflow type
   * Requirement: 10.1
   */
  getTemplates(workflowType?: string): Observable<WorkflowTemplate[]> {
    const url = workflowType 
      ? `${this.baseUrl}?workflowType=${workflowType}`
      : this.baseUrl;
    
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers => 
        this.http.get<WorkflowTemplate[]>(url, { headers }).pipe(
          map(templates => templates.map(t => this.parseTemplate(t))),
          catchError(error => {
            console.error('Error fetching templates:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get a specific template by ID
   * Requirement: 10.1
   */
  getTemplateById(id: string): Observable<WorkflowTemplate> {
    // Check cache first
    if (this.templateCache.has(id)) {
      return of(this.templateCache.get(id)!);
    }

    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<WorkflowTemplate>(`${this.baseUrl}/${id}`, { headers }).pipe(
          map(template => this.parseTemplate(template)),
          tap(template => this.templateCache.set(id, template)),
          catchError(error => {
            console.error(`Error fetching template ${id}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get template categories
   * Requirement: 10.1
   */
  getTemplateCategories(): Observable<TemplateCategory[]> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<TemplateCategory[]>(`${this.baseUrl}/categories`, { headers }).pipe(
          catchError(error => {
            console.error('Error fetching template categories:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Apply a template to create a workflow with optional customizations
   * Requirement: 11.1
   */
  applyTemplate(
    templateId: string,
    customizations?: TemplateCustomization
  ): Observable<AppliedTemplate> {
    return this.getTemplateById(templateId).pipe(
      map(template => {
        // Validate customizations if provided
        if (customizations) {
          const validationResult = this.validateTemplateCustomization(template, customizations);
          if (!validationResult.valid) {
            throw new Error(`Invalid customizations: ${validationResult.errors.map(e => e.message).join(', ')}`);
          }
        }

        // Create a deep copy to ensure immutability (Requirement: 11.5)
        const appliedTemplate: AppliedTemplate = {
          templateId: template.id,
          workflowId: this.generateWorkflowId(),
          appliedAt: new Date(),
          customizations: customizations || {
            templateId: template.id,
            overrides: {},
            addedSteps: [],
            removedSteps: [],
            modifiedSteps: new Map()
          },
          status: 'applied'
        };

        // Increment usage count (Requirement: 11.6)
        this.incrementUsageCount(templateId).subscribe();

        return appliedTemplate;
      }),
      catchError(error => {
        console.error(`Error applying template ${templateId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate a template structure
   * Requirement: 11.1
   */
  validateTemplate(template: WorkflowTemplate): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!template.id || !template.name || !template.version) {
      errors.push({
        field: 'template',
        message: 'Template must have id, name, and version',
        code: 'MISSING_REQUIRED_FIELDS',
        severity: 'error'
      });
    }

    // Validate steps
    if (!template.steps || template.steps.length === 0) {
      errors.push({
        field: 'steps',
        message: 'Template must have at least one step',
        code: 'NO_STEPS',
        severity: 'error'
      });
    } else {
      // Check for duplicate step IDs
      const stepIds = new Set<string>();
      template.steps.forEach(step => {
        if (stepIds.has(step.id)) {
          errors.push({
            field: 'steps',
            message: `Duplicate step ID: ${step.id}`,
            code: 'DUPLICATE_STEP_ID',
            severity: 'error'
          });
        }
        stepIds.add(step.id);

        // Validate step order
        if (step.order < 0) {
          errors.push({
            field: `steps.${step.id}.order`,
            message: 'Step order must be non-negative',
            code: 'INVALID_STEP_ORDER',
            severity: 'error'
          });
        }
      });

      // Check for gaps in step order
      const orders = template.steps.map(s => s.order).sort((a, b) => a - b);
      for (let i = 0; i < orders.length - 1; i++) {
        if (orders[i + 1] - orders[i] > 1) {
          warnings.push({
            field: 'steps',
            message: `Gap in step order between ${orders[i]} and ${orders[i + 1]}`,
            code: 'STEP_ORDER_GAP'
          });
        }
      }
    }

    // Validate configuration
    if (!template.configuration) {
      warnings.push({
        field: 'configuration',
        message: 'Template has no configuration',
        code: 'NO_CONFIGURATION'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        templateId: template.id,
        stepCount: template.steps?.length || 0
      }
    };
  }

  /**
   * Validate template customizations
   * Requirement: 11.2, 11.3, 11.4
   */
  validateTemplateCustomization(
    template: WorkflowTemplate,
    customizations: TemplateCustomization
  ): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Get required steps from template configuration
    const requiredStepIds = template.steps
      .filter(step => template.configuration.requiredFields.includes(step.id))
      .map(step => step.id);

    // Check that required steps are not removed (Requirement: 11.2)
    const removedRequiredSteps = customizations.removedSteps.filter(stepId =>
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

    // Validate added steps have valid configurations (Requirement: 11.3)
    customizations.addedSteps.forEach(step => {
      if (!step.id || !step.name || !step.component) {
        errors.push({
          field: 'addedSteps',
          message: `Added step must have id, name, and component`,
          code: 'INVALID_ADDED_STEP',
          severity: 'error'
        });
      }

      // Check for duplicate IDs with existing steps
      if (template.steps.some(s => s.id === step.id)) {
        errors.push({
          field: 'addedSteps',
          message: `Added step ID ${step.id} conflicts with existing step`,
          code: 'DUPLICATE_STEP_ID',
          severity: 'error'
        });
      }
    });

    // Validate modified steps maintain required fields (Requirement: 11.4)
    customizations.modifiedSteps.forEach((modifications, stepId) => {
      const originalStep = template.steps.find(s => s.id === stepId);
      
      if (!originalStep) {
        errors.push({
          field: 'modifiedSteps',
          message: `Cannot modify non-existent step: ${stepId}`,
          code: 'STEP_NOT_FOUND',
          severity: 'error'
        });
        return;
      }

      // Check that required fields are not removed
      if (requiredStepIds.includes(stepId)) {
        const requiredFields = ['id', 'name', 'component', 'order'];
        requiredFields.forEach(field => {
          if (modifications.hasOwnProperty(field) && !modifications[field as keyof TemplateStep]) {
            errors.push({
              field: `modifiedSteps.${stepId}.${field}`,
              message: `Cannot remove required field ${field} from required step`,
              code: 'REQUIRED_FIELD_REMOVED',
              severity: 'error'
            });
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        templateId: customizations.templateId,
        addedStepsCount: customizations.addedSteps.length,
        removedStepsCount: customizations.removedSteps.length,
        modifiedStepsCount: customizations.modifiedSteps.size
      }
    };
  }

  /**
   * Increment template usage count
   * Requirement: 11.6
   */
  private incrementUsageCount(templateId: string): Observable<void> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.post<void>(
          `${this.baseUrl}/${templateId}/usage`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Update cache if template is cached
            const cachedTemplate = this.templateCache.get(templateId);
            if (cachedTemplate) {
              cachedTemplate.usageCount++;
            }
          }),
          catchError(error => {
            console.error(`Error incrementing usage count for template ${templateId}:`, error);
            // Don't fail the operation if usage tracking fails
            return of(undefined);
          })
        )
      )
    );
  }

  /**
   * Parse template data from API response
   * Converts date strings to Date objects
   */
  private parseTemplate(template: any): WorkflowTemplate {
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    };
  }

  /**
   * Generate a unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get template versions
   */
  getTemplateVersions(templateId: string): Observable<TemplateVersion[]> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<TemplateVersion[]>(
          `${this.baseUrl}/${templateId}/versions`,
          { headers }
        ).pipe(
          map(versions => versions.map(v => ({
            ...v,
            createdAt: new Date(v.createdAt)
          }))),
          catchError(error => {
            console.error(`Error fetching versions for template ${templateId}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Compare two template versions
   */
  compareVersions(version1: string, version2: string): Observable<TemplateDiff> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<TemplateDiff>(
          `${this.baseUrl}/compare?v1=${version1}&v2=${version2}`,
          { headers }
        ).pipe(
          catchError(error => {
            console.error(`Error comparing versions ${version1} and ${version2}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get template usage statistics
   */
  getTemplateUsageStats(templateId: string): Observable<UsageStats> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<UsageStats>(
          `${this.baseUrl}/${templateId}/stats`,
          { headers }
        ).pipe(
          catchError(error => {
            console.error(`Error fetching stats for template ${templateId}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 10): Observable<WorkflowTemplate[]> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<WorkflowTemplate[]>(
          `${this.baseUrl}/popular?limit=${limit}`,
          { headers }
        ).pipe(
          map(templates => templates.map(t => this.parseTemplate(t))),
          catchError(error => {
            console.error('Error fetching popular templates:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}
