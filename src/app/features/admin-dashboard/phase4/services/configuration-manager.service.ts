import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
  Configuration,
  ConfigSchema,
  TemplateConfigData,
  ValidationResult,
  ValidationError
} from '../models/template.models';
import { ApiHeadersService } from '../../../../services/api-headers.service';
import { CacheService } from '../../../field-resource-management/services/cache.service';

/**
 * ConfigurationManagerService
 * 
 * Manages dynamic configuration for workflow templates and system settings.
 * Provides configuration retrieval, updates, validation, and caching.
 * 
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.5, 16.5, 16.3, 16.4**
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigurationManagerService {
  private readonly baseUrl = '/api/configurations';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes (Requirement 16.5)

  constructor(
    private http: HttpClient,
    private apiHeaders: ApiHeadersService,
    private cacheService: CacheService
  ) {}

  /**
   * Get a configuration value by key
   * Returns cached value if available and not expired (Requirement 16.5)
   * Fetches fresh data when cache expired (Requirement 16.3)
   * 
   * **Validates: Requirements 12.1, 16.3, 16.5**
   */
  getConfiguration(key: string): Observable<any> {
    const cacheKey = `config_${key}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        return this.apiHeaders.getApiHeaders().pipe(
          switchMap(headers =>
            this.http.get<Configuration>(`${this.baseUrl}/${key}`, { headers }).pipe(
              map(config => config.value),
              catchError(error => {
                console.error(`Error fetching configuration ${key}:`, error);
                return throwError(() => error);
              })
            )
          )
        );
      },
      this.CACHE_TTL
    );
  }

  /**
   * Get multiple configurations in a single batch request
   * Uses caching for performance (Requirement 16.5)
   * 
   * **Validates: Requirements 12.6, 16.5**
   */
  getConfigurationBatch(keys: string[]): Observable<Map<string, any>> {
    if (keys.length === 0) {
      return of(new Map());
    }

    // Check cache for all keys
    const result = new Map<string, any>();
    const uncachedKeys: string[] = [];

    keys.forEach(key => {
      const cacheKey = `config_${key}`;
      if (this.cacheService.has(cacheKey)) {
        // Will be fetched from cache
        this.getConfiguration(key).subscribe(value => result.set(key, value));
      } else {
        uncachedKeys.push(key);
      }
    });

    // If all keys are cached, return immediately
    if (uncachedKeys.length === 0) {
      return of(result);
    }

    // Fetch uncached keys
    const keysParam = uncachedKeys.join(',');
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<Configuration[]>(
          `${this.baseUrl}/batch?keys=${keysParam}`,
          { headers }
        ).pipe(
          map(configs => {
            configs.forEach(config => {
              result.set(config.key, config.value);
              // Cache each value
              const cacheKey = `config_${config.key}`;
              this.cacheService.get(
                cacheKey,
                () => of(config.value),
                this.CACHE_TTL
              ).subscribe();
            });
            return result;
          }),
          catchError(error => {
            console.error('Error fetching configuration batch:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get all configurations
   * Caches all configurations for performance (Requirement 16.5)
   * 
   * **Validates: Requirements 12.1, 16.5**
   */
  getAllConfigurations(): Observable<Configuration[]> {
    const cacheKey = 'config_all';
    
    return this.cacheService.get(
      cacheKey,
      () => {
        return this.apiHeaders.getApiHeaders().pipe(
          switchMap(headers =>
            this.http.get<Configuration[]>(this.baseUrl, { headers }).pipe(
              tap(configs => {
                // Cache individual configurations
                configs.forEach(config => {
                  const key = `config_${config.key}`;
                  this.cacheService.get(
                    key,
                    () => of(config.value),
                    this.CACHE_TTL
                  ).subscribe();
                });
              }),
              catchError(error => {
                console.error('Error fetching all configurations:', error);
                return throwError(() => error);
              })
            )
          )
        );
      },
      this.CACHE_TTL
    );
  }

  /**
   * Update a configuration value
   * Validates against schema before updating
   * Clears cache on update (Requirement 16.4)
   * 
   * **Validates: Requirements 12.2, 12.3, 12.4, 16.4**
   */
  updateConfiguration(key: string, value: any): Observable<void> {
    // First, get the configuration to validate against its schema
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<Configuration>(`${this.baseUrl}/${key}`, { headers }).pipe(
          switchMap(config => {
            // Validate the new value (Requirement: 12.2)
            const validationResult = this.validateConfiguration(key, value, config.validationSchema);
            
            if (!validationResult.valid) {
              // Reject with descriptive errors (Requirement: 12.3)
              const errorMessages = validationResult.errors.map(e => e.message).join('; ');
              return throwError(() => new Error(`Configuration validation failed: ${errorMessages}`));
            }

            // Update the configuration
            return this.http.put<void>(
              `${this.baseUrl}/${key}`,
              { value },
              { headers }
            ).pipe(
              tap(() => {
                // Clear cache for this key (Requirement: 12.4, 16.4)
                this.cacheService.invalidate(`config_${key}`);
                this.cacheService.invalidate('config_all');
              }),
              catchError(error => {
                console.error(`Error updating configuration ${key}:`, error);
                return throwError(() => error);
              })
            );
          }),
          catchError(error => {
            console.error(`Error fetching configuration ${key} for validation:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Update multiple configurations in a batch
   * Clears cache for all updated keys (Requirement 16.4)
   * 
   * **Validates: Requirements 12.6, 16.4**
   */
  updateConfigurationBatch(updates: Map<string, any>): Observable<void> {
    if (updates.size === 0) {
      return of(undefined);
    }

    // Convert Map to array of updates
    const updateArray = Array.from(updates.entries()).map(([key, value]) => ({
      key,
      value
    }));

    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.put<void>(
          `${this.baseUrl}/batch`,
          { updates: updateArray },
          { headers }
        ).pipe(
          tap(() => {
            // Clear cache for all updated keys (Requirement 16.4)
            updates.forEach((_, key) => {
              this.cacheService.invalidate(`config_${key}`);
            });
            this.cacheService.invalidate('config_all');
          }),
          catchError(error => {
            console.error('Error updating configuration batch:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Reset a configuration to its default value
   * Clears cache on reset (Requirement 16.4)
   * 
   * **Validates: Requirement 16.4**
   */
  resetConfiguration(key: string): Observable<void> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.post<void>(
          `${this.baseUrl}/${key}/reset`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Clear cache for this key (Requirement 16.4)
            this.cacheService.invalidate(`config_${key}`);
            this.cacheService.invalidate('config_all');
          }),
          catchError(error => {
            console.error(`Error resetting configuration ${key}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Get template-specific configuration
   * Uses caching for performance (Requirement 16.5)
   * 
   * **Validates: Requirements 12.5, 16.5**
   */
  getTemplateConfiguration(templateId: string): Observable<TemplateConfigData> {
    const cacheKey = `config_template_${templateId}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        return this.apiHeaders.getApiHeaders().pipe(
          switchMap(headers =>
            this.http.get<TemplateConfigData>(
              `${this.baseUrl}/templates/${templateId}`,
              { headers }
            ).pipe(
              catchError(error => {
                console.error(`Error fetching template configuration for ${templateId}:`, error);
                return throwError(() => error);
              })
            )
          )
        );
      },
      this.CACHE_TTL
    );
  }

  /**
   * Update template-specific configuration
   * Clears cache on update (Requirement 16.4)
   * 
   * **Validates: Requirements 12.5, 16.4**
   */
  updateTemplateConfiguration(
    templateId: string,
    config: Partial<TemplateConfigData>
  ): Observable<void> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.put<void>(
          `${this.baseUrl}/templates/${templateId}`,
          config,
          { headers }
        ).pipe(
          tap(() => {
            // Clear cache for this template (Requirement 16.4)
            this.cacheService.invalidate(`config_template_${templateId}`);
          }),
          catchError(error => {
            console.error(`Error updating template configuration for ${templateId}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Validate a configuration value against its schema
   * Requirement: 12.2
   */
  validateConfiguration(
    key: string,
    value: any,
    schema?: ConfigSchema
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!schema) {
      // No schema means no validation required
      return {
        valid: true,
        errors: [],
        warnings: [],
        metadata: { key }
      };
    }

    // Check required
    if (schema.required && (value === null || value === undefined)) {
      errors.push({
        field: key,
        message: `Configuration '${key}' is required`,
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
      return {
        valid: false,
        errors,
        warnings: [],
        metadata: { key }
      };
    }

    // If value is null/undefined and not required, it's valid
    if (value === null || value === undefined) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        metadata: { key }
      };
    }

    // Check type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type && actualType !== schema.type) {
      errors.push({
        field: key,
        message: `Configuration '${key}' must be of type ${schema.type}, got ${actualType}`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }

    // Check enum
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: key,
        message: `Configuration '${key}' must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
        severity: 'error'
      });
    }

    // Check min/max for numbers
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push({
          field: key,
          message: `Configuration '${key}' must be at least ${schema.min}`,
          code: 'VALUE_TOO_SMALL',
          severity: 'error'
        });
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push({
          field: key,
          message: `Configuration '${key}' must be at most ${schema.max}`,
          code: 'VALUE_TOO_LARGE',
          severity: 'error'
        });
      }
    }

    // Check pattern for strings
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: key,
          message: `Configuration '${key}' does not match required pattern`,
          code: 'PATTERN_MISMATCH',
          severity: 'error'
        });
      }
    }

    // Check properties for objects
    if (schema.type === 'object' && schema.properties && typeof value === 'object') {
      Object.entries(schema.properties).forEach(([propKey, propSchema]) => {
        const propValue = value[propKey];
        const propValidation = this.validateConfiguration(
          `${key}.${propKey}`,
          propValue,
          propSchema
        );
        errors.push(...propValidation.errors);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      metadata: { key, schema }
    };
  }

  /**
   * Get the validation schema for a configuration key
   */
  getConfigurationSchema(key: string): Observable<ConfigSchema> {
    return this.apiHeaders.getApiHeaders().pipe(
      switchMap(headers =>
        this.http.get<Configuration>(`${this.baseUrl}/${key}`, { headers }).pipe(
          map(config => {
            if (!config.validationSchema) {
              throw new Error(`No validation schema found for configuration '${key}'`);
            }
            return config.validationSchema;
          }),
          catchError(error => {
            console.error(`Error fetching schema for configuration ${key}:`, error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /**
   * Clear all cached configurations
   * 
   * **Validates: Requirement 16.4**
   */
  clearConfigurationCache(): void {
    this.cacheService.invalidatePattern(/^config_/);
  }

  /**
   * Refresh a specific configuration from the server
   * Clears cache before fetching (Requirement 16.3)
   * 
   * **Validates: Requirement 16.3**
   */
  refreshConfiguration(key: string): Observable<any> {
    // Clear cache first (Requirement 16.3)
    this.cacheService.invalidate(`config_${key}`);
    
    // Fetch fresh data
    return this.getConfiguration(key);
  }

  /**
   * Check if a configuration is cached
   */
  isCached(key: string): boolean {
    return this.cacheService.has(`config_${key}`);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    const stats = this.cacheService.getStats();
    const configKeys = this.cacheService.getKeys().filter(k => k.startsWith('config_'));
    
    return {
      size: configKeys.length,
      keys: configKeys
    };
  }
}
