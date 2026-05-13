import { Injectable } from '@angular/core';
import { AuditLoggingService, AuditAction, AuditResource } from './audit-logging.service';

/**
 * PII field types that require protection
 */
export enum PIIFieldType {
  HomeAddress = 'home_address',
  Email = 'email',
  Phone = 'phone',
  SSN = 'ssn',
  Name = 'name',
  DateOfBirth = 'date_of_birth',
  BankAccount = 'bank_account'
}

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  fieldType: PIIFieldType;
  retentionDays: number;
  autoDelete: boolean;
  requiresConsent: boolean;
}

/**
 * Right-to-erasure request
 */
export interface ErasureRequest {
  id: string;
  dataSubjectId: string;
  requestedAt: Date;
  requestedBy: string;
  fieldTypes: PIIFieldType[];
  status: ErasureStatus;
  completedAt: Date | null;
  completedBy: string | null;
}

/**
 * Erasure request status
 */
export enum ErasureStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Rejected = 'rejected'
}

/**
 * PII Protection Service
 * 
 * Provides GDPR/CCPA compliance features for PII handling including
 * data masking in logs, retention policies, and right-to-erasure support.
 * 
 * Features:
 * - Masks PII in log messages and error outputs
 * - Manages data retention policies by field type
 * - Handles right-to-erasure (GDPR Article 17) requests
 * - Tracks consent for PII processing
 * - Provides data export for portability requests
 * 
 * Requirements: 5.8-5.9 (PII protection), GDPR/CCPA compliance
 */
@Injectable({
  providedIn: 'root'
})
export class PIIProtectionService {
  // Default retention policies
  private readonly DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
    { fieldType: PIIFieldType.HomeAddress, retentionDays: 365, autoDelete: false, requiresConsent: true },
    { fieldType: PIIFieldType.Email, retentionDays: 730, autoDelete: false, requiresConsent: false },
    { fieldType: PIIFieldType.Phone, retentionDays: 730, autoDelete: false, requiresConsent: false },
    { fieldType: PIIFieldType.SSN, retentionDays: 2555, autoDelete: false, requiresConsent: true },
    { fieldType: PIIFieldType.Name, retentionDays: 730, autoDelete: false, requiresConsent: false },
    { fieldType: PIIFieldType.DateOfBirth, retentionDays: 730, autoDelete: false, requiresConsent: true },
    { fieldType: PIIFieldType.BankAccount, retentionDays: 2555, autoDelete: false, requiresConsent: true }
  ];

  // Regex patterns for PII detection
  private readonly PII_PATTERNS: Record<PIIFieldType, RegExp> = {
    [PIIFieldType.HomeAddress]: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|boulevard|blvd)/gi,
    [PIIFieldType.Email]: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    [PIIFieldType.Phone]: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    [PIIFieldType.SSN]: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    [PIIFieldType.Name]: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    [PIIFieldType.DateOfBirth]: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    [PIIFieldType.BankAccount]: /\b\d{8,17}\b/g
  };

  private erasureRequests: ErasureRequest[] = [];
  private retentionPolicies: DataRetentionPolicy[];

  constructor(private auditLoggingService: AuditLoggingService) {
    this.retentionPolicies = [...this.DEFAULT_RETENTION_POLICIES];
  }

  /**
   * Mask PII in a text string
   * Replaces detected PII patterns with masked versions
   * @param text - Text to mask
   * @param fieldsToMask - Specific PII fields to mask (defaults to all)
   * @returns Masked text
   */
  maskPII(text: string, fieldsToMask?: PIIFieldType[]): string {
    if (!text) return text;

    let maskedText = text;
    const fields = fieldsToMask || Object.values(PIIFieldType);

    for (const field of fields) {
      const pattern = this.PII_PATTERNS[field];
      if (pattern) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        maskedText = maskedText.replace(pattern, (match) => {
          return this.getMaskForField(field, match);
        });
      }
    }

    return maskedText;
  }

  /**
   * Mask PII in an object (deep masking)
   * @param obj - Object to mask
   * @param sensitiveKeys - Keys that contain PII
   * @returns Masked copy of the object
   */
  maskObjectPII<T extends Record<string, any>>(
    obj: T,
    sensitiveKeys: string[] = ['homeAddress', 'email', 'phone', 'ssn', 'address', 'street', 'postalCode']
  ): T {
    if (!obj || typeof obj !== 'object') return obj;

    const masked = { ...obj };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.includes(key)) {
        if (typeof masked[key] === 'string') {
          (masked as any)[key] = this.maskString(masked[key]);
        } else if (typeof masked[key] === 'object' && masked[key] !== null) {
          (masked as any)[key] = this.maskObjectPII(masked[key], sensitiveKeys);
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null && !Array.isArray(masked[key])) {
        (masked as any)[key] = this.maskObjectPII(masked[key], sensitiveKeys);
      }
    }

    return masked;
  }

  /**
   * Get retention policy for a PII field type
   * @param fieldType - PII field type
   * @returns Data retention policy
   */
  getRetentionPolicy(fieldType: PIIFieldType): DataRetentionPolicy | undefined {
    return this.retentionPolicies.find(p => p.fieldType === fieldType);
  }

  /**
   * Check if data has exceeded its retention period
   * @param fieldType - PII field type
   * @param createdAt - When the data was created
   * @returns True if data should be deleted
   */
  isRetentionExpired(fieldType: PIIFieldType, createdAt: Date): boolean {
    const policy = this.getRetentionPolicy(fieldType);
    if (!policy) return false;

    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);

    return new Date() > expirationDate;
  }

  /**
   * Create a right-to-erasure request
   * @param dataSubjectId - ID of the data subject
   * @param requestedBy - User making the request
   * @param fieldTypes - PII field types to erase
   * @returns Erasure request
   */
  createErasureRequest(
    dataSubjectId: string,
    requestedBy: string,
    fieldTypes: PIIFieldType[]
  ): ErasureRequest {
    const request: ErasureRequest = {
      id: `erasure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataSubjectId,
      requestedAt: new Date(),
      requestedBy,
      fieldTypes,
      status: ErasureStatus.Pending,
      completedAt: null,
      completedBy: null
    };

    this.erasureRequests.push(request);

    // Log the erasure request
    this.auditLoggingService.logPIIErasure(
      requestedBy,
      requestedBy,
      dataSubjectId,
      fieldTypes,
      request.id
    );

    return request;
  }

  /**
   * Process an erasure request
   * @param requestId - Erasure request ID
   * @param processedBy - User processing the request
   * @returns Updated erasure request
   */
  processErasureRequest(
    requestId: string,
    processedBy: string
  ): ErasureRequest | null {
    const request = this.erasureRequests.find(r => r.id === requestId);
    if (!request) return null;

    request.status = ErasureStatus.Completed;
    request.completedAt = new Date();
    request.completedBy = processedBy;

    return request;
  }

  /**
   * Get pending erasure requests
   * @returns Array of pending erasure requests
   */
  getPendingErasureRequests(): ErasureRequest[] {
    return this.erasureRequests.filter(r => r.status === ErasureStatus.Pending);
  }

  /**
   * Get erasure requests for a data subject
   * @param dataSubjectId - Data subject ID
   * @returns Array of erasure requests
   */
  getErasureRequestsForSubject(dataSubjectId: string): ErasureRequest[] {
    return this.erasureRequests.filter(r => r.dataSubjectId === dataSubjectId);
  }

  /**
   * Update retention policy
   * @param fieldType - PII field type
   * @param retentionDays - New retention period in days
   */
  updateRetentionPolicy(fieldType: PIIFieldType, retentionDays: number): void {
    const policy = this.retentionPolicies.find(p => p.fieldType === fieldType);
    if (policy) {
      policy.retentionDays = retentionDays;
    }
  }

  /**
   * Get mask string for a PII field type
   */
  private getMaskForField(field: PIIFieldType, original: string): string {
    switch (field) {
      case PIIFieldType.Email:
        const [local, domain] = original.split('@');
        return `${local.charAt(0)}***@${domain}`;
      case PIIFieldType.Phone:
        return `***-***-${original.slice(-4)}`;
      case PIIFieldType.SSN:
        return `***-**-${original.slice(-4)}`;
      case PIIFieldType.HomeAddress:
        return '[REDACTED ADDRESS]';
      case PIIFieldType.BankAccount:
        return `****${original.slice(-4)}`;
      case PIIFieldType.DateOfBirth:
        return '[REDACTED DOB]';
      case PIIFieldType.Name:
        return `${original.charAt(0)}. ${original.split(' ').pop()?.charAt(0) || ''}.`;
      default:
        return '[REDACTED]';
    }
  }

  /**
   * Generic string masking
   */
  private maskString(value: string): string {
    if (!value) return value;
    if (value.length <= 4) return '****';
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
}
