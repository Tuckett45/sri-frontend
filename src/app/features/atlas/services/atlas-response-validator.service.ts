import { Injectable } from '@angular/core';

/**
 * Response validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * Schema definition for response validation
 */
export interface ResponseSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, ResponseSchema>;
  items?: ResponseSchema;
  required?: string[];
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: any[];
}

/**
 * AtlasResponseValidatorService
 * 
 * Validates all ATLAS API responses to prevent injection attacks and ensure
 * data integrity. Validates response structure, types, and content against
 * expected schemas.
 * 
 * Requirements: 12.3
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasResponseValidatorService {
  // Patterns for detecting malicious content in responses
  private readonly XSS_PATTERN = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|javascript:|onerror=|onload=|onclick=/gi;
  private readonly SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(-{2})|(\*\/)/gi;

  /**
   * Validate response data against a schema
   * Requirements: 12.3
   * 
   * @param data - Response data to validate
   * @param schema - Expected schema
   * @returns Validation result
   */
  validateResponse(data: any, schema: ResponseSchema): ValidationResult {
    const errors: string[] = [];

    try {
      // Validate data against schema
      this.validateAgainstSchema(data, schema, '', errors);

      // Check for malicious content
      this.checkForMaliciousContent(data, errors);

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? data : undefined
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Validate response structure without strict schema
   * Requirements: 12.3
   * 
   * @param data - Response data to validate
   * @returns Validation result
   */
  validateBasicResponse(data: any): ValidationResult {
    const errors: string[] = [];

    try {
      // Check for null or undefined
      if (data === null || data === undefined) {
        return {
          isValid: true,
          errors: [],
          sanitizedData: data
        };
      }

      // Check for malicious content
      this.checkForMaliciousContent(data, errors);

      // Validate common response patterns
      if (typeof data === 'object' && !Array.isArray(data)) {
        // Check for error responses
        if (data.error && typeof data.error === 'string') {
          this.validateString(data.error, 'error', errors);
        }

        // Check for message responses
        if (data.message && typeof data.message === 'string') {
          this.validateString(data.message, 'message', errors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? data : undefined
      };
    } catch (error) {
      errors.push(`Basic validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Validate paginated response structure
   * Requirements: 12.3
   * 
   * @param data - Paginated response data
   * @returns Validation result
   */
  validatePaginatedResponse(data: any): ValidationResult {
    const errors: string[] = [];

    try {
      // Check if data is an object
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Paginated response must be an object');
        return { isValid: false, errors };
      }

      // Validate items array
      if (!Array.isArray(data.items)) {
        errors.push('Paginated response must have an items array');
      }

      // Validate pagination metadata
      if (!data.pagination || typeof data.pagination !== 'object') {
        errors.push('Paginated response must have pagination metadata');
      } else {
        const pagination = data.pagination;

        // Validate pagination fields
        if (typeof pagination.currentPage !== 'number' || pagination.currentPage < 1) {
          errors.push('Invalid currentPage in pagination');
        }
        if (typeof pagination.pageSize !== 'number' || pagination.pageSize < 1) {
          errors.push('Invalid pageSize in pagination');
        }
        if (typeof pagination.totalCount !== 'number' || pagination.totalCount < 0) {
          errors.push('Invalid totalCount in pagination');
        }
        if (typeof pagination.totalPages !== 'number' || pagination.totalPages < 0) {
          errors.push('Invalid totalPages in pagination');
        }
      }

      // Check for malicious content
      this.checkForMaliciousContent(data, errors);

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? data : undefined
      };
    } catch (error) {
      errors.push(`Paginated response validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Validate error response structure
   * Requirements: 12.3
   * 
   * @param data - Error response data
   * @returns Validation result
   */
  validateErrorResponse(data: any): ValidationResult {
    const errors: string[] = [];

    try {
      // Check if data is an object
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Error response must be an object');
        return { isValid: false, errors };
      }

      // Validate ProblemDetails structure (RFC 7807)
      if (data.type && typeof data.type !== 'string') {
        errors.push('Error type must be a string');
      }
      if (data.title && typeof data.title !== 'string') {
        errors.push('Error title must be a string');
      }
      if (data.status && typeof data.status !== 'number') {
        errors.push('Error status must be a number');
      }
      if (data.detail && typeof data.detail !== 'string') {
        errors.push('Error detail must be a string');
      }
      if (data.instance && typeof data.instance !== 'string') {
        errors.push('Error instance must be a string');
      }

      // Check for malicious content in error messages
      this.checkForMaliciousContent(data, errors);

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: errors.length === 0 ? data : undefined
      };
    } catch (error) {
      errors.push(`Error response validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Validate data against schema recursively
   * 
   * @param data - Data to validate
   * @param schema - Schema to validate against
   * @param path - Current path in data structure
   * @param errors - Array to collect errors
   */
  private validateAgainstSchema(
    data: any,
    schema: ResponseSchema,
    path: string,
    errors: string[]
  ): void {
    const currentPath = path || 'root';

    // Check type
    const actualType = this.getType(data);
    if (actualType !== schema.type) {
      errors.push(`Type mismatch at ${currentPath}: expected ${schema.type}, got ${actualType}`);
      return;
    }

    // Validate based on type
    switch (schema.type) {
      case 'object':
        this.validateObject(data, schema, currentPath, errors);
        break;
      case 'array':
        this.validateArray(data, schema, currentPath, errors);
        break;
      case 'string':
        this.validateStringSchema(data, schema, currentPath, errors);
        break;
      case 'number':
        this.validateNumber(data, schema, currentPath, errors);
        break;
    }
  }

  /**
   * Validate object against schema
   */
  private validateObject(
    data: any,
    schema: ResponseSchema,
    path: string,
    errors: string[]
  ): void {
    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in data)) {
          errors.push(`Missing required property at ${path}.${requiredProp}`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in data) {
          this.validateAgainstSchema(
            data[propName],
            propSchema,
            `${path}.${propName}`,
            errors
          );
        }
      }
    }
  }

  /**
   * Validate array against schema
   */
  private validateArray(
    data: any[],
    schema: ResponseSchema,
    path: string,
    errors: string[]
  ): void {
    if (schema.items) {
      data.forEach((item, index) => {
        this.validateAgainstSchema(
          item,
          schema.items!,
          `${path}[${index}]`,
          errors
        );
      });
    }
  }

  /**
   * Validate string against schema
   */
  private validateStringSchema(
    data: string,
    schema: ResponseSchema,
    path: string,
    errors: string[]
  ): void {
    if (schema.pattern && !schema.pattern.test(data)) {
      errors.push(`String at ${path} does not match pattern`);
    }
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`String at ${path} is shorter than minimum length ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`String at ${path} is longer than maximum length ${schema.maxLength}`);
    }
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`String at ${path} is not one of allowed values`);
    }
  }

  /**
   * Validate number against schema
   */
  private validateNumber(
    data: number,
    schema: ResponseSchema,
    path: string,
    errors: string[]
  ): void {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`Number at ${path} is less than minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`Number at ${path} is greater than maximum ${schema.maximum}`);
    }
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`Number at ${path} is not one of allowed values`);
    }
  }

  /**
   * Check for malicious content in response data
   * Requirements: 12.3
   * 
   * @param data - Data to check
   * @param errors - Array to collect errors
   */
  private checkForMaliciousContent(data: any, errors: string[]): void {
    if (data === null || data === undefined) {
      return;
    }

    if (typeof data === 'string') {
      this.validateString(data, 'string', errors);
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        this.checkForMaliciousContent(item, errors);
      });
    } else if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        this.checkForMaliciousContent(value, errors);
      }
    }
  }

  /**
   * Validate string for malicious patterns
   * 
   * @param value - String to validate
   * @param fieldName - Field name for error messages
   * @param errors - Array to collect errors
   */
  private validateString(value: string, fieldName: string, errors: string[]): void {
    // Check for XSS patterns
    if (this.XSS_PATTERN.test(value)) {
      errors.push(`Potential XSS detected in ${fieldName}`);
    }

    // Check for SQL injection patterns
    if (this.SQL_INJECTION_PATTERN.test(value)) {
      errors.push(`Potential SQL injection detected in ${fieldName}`);
    }
  }

  /**
   * Get the type of a value
   * 
   * @param value - Value to check
   * @returns Type string
   */
  private getType(value: any): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    return typeof value;
  }
}
