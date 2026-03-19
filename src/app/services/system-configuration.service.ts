import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';
import { AuthService } from './auth.service';
import {
  SystemConfiguration,
  ConfigurationUpdateRequest,
  MarketDefinition,
  MarketDefinitionUpdateRequest,
  ConfigurationHistoryEntry,
  ConfigurationExport,
  ConfigurationValidationResult,
  ConfigurationFilters
} from '../models/system-configuration.model';
import { WorkflowConfiguration } from '../models/workflow.model';

/**
 * Service for managing system configuration (Admin only).
 * Provides methods for retrieving and updating system settings,
 * market definitions, and approval workflows with validation and audit trail.
 */
@Injectable({
  providedIn: 'root'
})
export class SystemConfigurationService {
  private readonly apiUrl = `${environment.apiUrl}/system-configuration`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get system configuration settings
   * Admin only
   */
  getConfiguration(filters?: ConfigurationFilters): Observable<SystemConfiguration[]> {
    this.validateAdminAccess();

    let url = `${this.apiUrl}/settings`;
    const params: string[] = [];

    if (filters?.category) {
      params.push(`category=${encodeURIComponent(filters.category)}`);
    }
    if (filters?.isEditable !== undefined) {
      params.push(`isEditable=${filters.isEditable}`);
    }
    if (filters?.searchTerm) {
      params.push(`search=${encodeURIComponent(filters.searchTerm)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<SystemConfiguration[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update system configuration with validation
   * Supports immediate or scheduled application
   * Admin only
   */
  updateConfiguration(request: ConfigurationUpdateRequest): Observable<SystemConfiguration> {
    this.validateAdminAccess();

    // Validate the request
    if (!request.key || request.value === undefined) {
      return throwError(() => new Error('Configuration key and value are required'));
    }

    return this.http.put<SystemConfiguration>(
      `${this.apiUrl}/settings/${encodeURIComponent(request.key)}`,
      request
    ).pipe(
      tap(config => {
        console.log(`Configuration updated: ${config.key}`, config);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get market definitions
   * Admin only
   */
  getMarketDefinitions(): Observable<MarketDefinition[]> {
    this.validateAdminAccess();

    return this.http.get<MarketDefinition[]>(`${this.apiUrl}/markets`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update market definitions with filtering rule updates
   * Admin only
   */
  updateMarketDefinitions(request: MarketDefinitionUpdateRequest): Observable<MarketDefinition> {
    this.validateAdminAccess();

    if (!request.marketCode) {
      return throwError(() => new Error('Market code is required'));
    }

    return this.http.put<MarketDefinition>(
      `${this.apiUrl}/markets/${encodeURIComponent(request.marketCode)}`,
      request
    ).pipe(
      tap(market => {
        console.log(`Market definition updated: ${market.marketCode}`, market);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get approval workflow configurations
   * Admin only
   */
  getApprovalWorkflows(): Observable<WorkflowConfiguration[]> {
    this.validateAdminAccess();

    return this.http.get<WorkflowConfiguration[]>(`${this.apiUrl}/workflows`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update approval workflow configuration with validation
   * Validates workflow logic before applying
   * Admin only
   */
  updateApprovalWorkflows(config: WorkflowConfiguration): Observable<WorkflowConfiguration> {
    this.validateAdminAccess();

    // Validate workflow configuration
    const validationResult = this.validateWorkflowConfiguration(config);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(e => e.message).join(', ');
      return throwError(() => new Error(`Workflow validation failed: ${errorMessages}`));
    }

    const url = config.id
      ? `${this.apiUrl}/workflows/${config.id}`
      : `${this.apiUrl}/workflows`;

    const method = config.id ? 'put' : 'post';

    return this.http.request<WorkflowConfiguration>(method, url, { body: config }).pipe(
      tap(workflow => {
        console.log(`Workflow configuration ${config.id ? 'updated' : 'created'}: ${workflow.workflowType}`, workflow);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Export configuration for backup
   * Admin only
   */
  exportConfiguration(): Observable<ConfigurationExport> {
    this.validateAdminAccess();

    const user = this.authService.getUser();

    return this.http.get<ConfigurationExport>(`${this.apiUrl}/export`).pipe(
      map(exportData => ({
        ...exportData,
        exportedAt: new Date(),
        exportedBy: user?.id || 'unknown'
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration history for audit trail
   * Includes timestamps and admin identification
   * Admin only
   */
  getConfigurationHistory(
    configurationKey?: string,
    fromDate?: Date,
    toDate?: Date
  ): Observable<ConfigurationHistoryEntry[]> {
    this.validateAdminAccess();

    let url = `${this.apiUrl}/history`;
    const params: string[] = [];

    if (configurationKey) {
      params.push(`key=${encodeURIComponent(configurationKey)}`);
    }
    if (fromDate) {
      params.push(`from=${fromDate.toISOString()}`);
    }
    if (toDate) {
      params.push(`to=${toDate.toISOString()}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<ConfigurationHistoryEntry[]>(url).pipe(
      map(entries => entries.map(entry => ({
        ...entry,
        changedAt: new Date(entry.changedAt)
      }))),
      catchError(this.handleError)
    );
  }

  /**
   * Validate workflow configuration
   * Private helper method for workflow validation
   */
  private validateWorkflowConfiguration(config: WorkflowConfiguration): ConfigurationValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!config.workflowType) {
      errors.push({
        field: 'workflowType',
        message: 'Workflow type is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!config.name) {
      errors.push({
        field: 'name',
        message: 'Workflow name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate approval levels
    if (!config.approvalLevels || config.approvalLevels.length === 0) {
      errors.push({
        field: 'approvalLevels',
        message: 'At least one approval level is required',
        code: 'REQUIRED_FIELD'
      });
    } else {
      // Validate level sequence
      const levels = config.approvalLevels.map(l => l.level).sort((a, b) => a - b);
      for (let i = 0; i < levels.length; i++) {
        if (levels[i] !== i + 1) {
          errors.push({
            field: 'approvalLevels',
            message: `Approval levels must be sequential starting from 1. Missing level ${i + 1}`,
            code: 'INVALID_SEQUENCE'
          });
          break;
        }
      }

      // Validate each level
      config.approvalLevels.forEach((level, index) => {
        if (!level.requiredRole) {
          errors.push({
            field: `approvalLevels[${index}].requiredRole`,
            message: `Required role is missing for level ${level.level}`,
            code: 'REQUIRED_FIELD'
          });
        }

        if (level.timeoutHours && level.timeoutHours < 1) {
          warnings.push({
            field: `approvalLevels[${index}].timeoutHours`,
            message: `Timeout hours for level ${level.level} is very short`,
            severity: 'medium' as const
          });
        }
      });
    }

    // Validate escalation rules
    if (config.escalationRules) {
      config.escalationRules.forEach((rule, index) => {
        if (!rule.escalateToRole) {
          errors.push({
            field: `escalationRules[${index}].escalateToRole`,
            message: 'Escalation target role is required',
            code: 'REQUIRED_FIELD'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate admin access
   * Throws error if current user is not an admin
   */
  private validateAdminAccess(): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      if (error.status === 403) {
        errorMessage = 'Unauthorized: Admin access required';
      } else if (error.status === 404) {
        errorMessage = 'Configuration not found';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Invalid configuration data';
      }
    }

    console.error('SystemConfigurationService error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
