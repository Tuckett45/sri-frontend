import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit action types for tracking operations
 */
export enum AuditAction {
  Create = 'CREATE',
  Read = 'READ',
  Update = 'UPDATE',
  Delete = 'DELETE',
  Adjust = 'ADJUST',
  Access = 'ACCESS',
  Deny = 'DENY',
  Export = 'EXPORT',
  Encrypt = 'ENCRYPT',
  Decrypt = 'DECRYPT',
  Erasure = 'ERASURE'
}

/**
 * Audit resource types
 */
export enum AuditResource {
  Budget = 'BUDGET',
  BudgetAdjustment = 'BUDGET_ADJUSTMENT',
  HomeAddress = 'HOME_ADDRESS',
  TravelProfile = 'TRAVEL_PROFILE',
  Inventory = 'INVENTORY',
  Material = 'MATERIAL',
  PurchaseOrder = 'PURCHASE_ORDER',
  Permission = 'PERMISSION',
  PII = 'PII'
}

/**
 * Audit log entry for sensitive operations
 */
export interface SensitiveAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  complianceFlags: ComplianceFlag[];
}

/**
 * Compliance flags for GDPR/CCPA tracking
 */
export enum ComplianceFlag {
  PIIAccess = 'PII_ACCESS',
  PIIModification = 'PII_MODIFICATION',
  PIIExport = 'PII_EXPORT',
  PIIErasure = 'PII_ERASURE',
  DataRetention = 'DATA_RETENTION',
  ConsentRequired = 'CONSENT_REQUIRED',
  SensitiveData = 'SENSITIVE_DATA'
}

/**
 * Audit log query filters
 */
export interface AuditLogQuery {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  complianceFlag?: ComplianceFlag;
  limit?: number;
}

/**
 * Audit Logging Service
 * 
 * Provides comprehensive audit logging for sensitive operations including
 * budget adjustments, home address access, and permission denials.
 * Supports GDPR/CCPA compliance with data access logging.
 * 
 * Features:
 * - Logs all budget adjustments with full context
 * - Logs home address access and modifications
 * - Logs permission denials for security monitoring
 * - Supports GDPR/CCPA compliance flags
 * - Provides query capabilities for audit trail review
 * 
 * Requirements: 2.3-2.6 (Audit trail), 5.8-5.9 (PII protection)
 */
@Injectable({
  providedIn: 'root'
})
export class AuditLoggingService {
  private auditLog: SensitiveAuditEntry[] = [];
  private readonly MAX_LOG_ENTRIES = 10000;

  /**
   * Log a budget adjustment
   * @param userId - User who made the adjustment
   * @param userName - Display name of the user
   * @param jobId - Job ID for the budget
   * @param amount - Adjustment amount
   * @param reason - Reason for adjustment
   * @param previousBudget - Budget before adjustment
   * @param newBudget - Budget after adjustment
   */
  logBudgetAdjustment(
    userId: string,
    userName: string,
    jobId: string,
    amount: number,
    reason: string,
    previousBudget: number,
    newBudget: number
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      AuditAction.Adjust,
      AuditResource.BudgetAdjustment,
      jobId,
      {
        amount,
        reason,
        previousBudget,
        newBudget,
        adjustmentType: amount > 0 ? 'increase' : 'decrease'
      },
      []
    );
  }

  /**
   * Log home address access
   * @param userId - User accessing the address
   * @param userName - Display name of the user
   * @param technicianId - Technician whose address was accessed
   * @param accessType - Type of access (view, edit)
   */
  logHomeAddressAccess(
    userId: string,
    userName: string,
    technicianId: string,
    accessType: 'view' | 'edit'
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      accessType === 'view' ? AuditAction.Read : AuditAction.Update,
      AuditResource.HomeAddress,
      technicianId,
      { accessType },
      [ComplianceFlag.PIIAccess, ComplianceFlag.SensitiveData]
    );
  }

  /**
   * Log home address modification
   * @param userId - User modifying the address
   * @param userName - Display name of the user
   * @param technicianId - Technician whose address was modified
   * @param fieldsChanged - List of fields that were changed
   */
  logHomeAddressModification(
    userId: string,
    userName: string,
    technicianId: string,
    fieldsChanged: string[]
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      AuditAction.Update,
      AuditResource.HomeAddress,
      technicianId,
      { fieldsChanged },
      [ComplianceFlag.PIIModification, ComplianceFlag.SensitiveData]
    );
  }

  /**
   * Log permission denial
   * @param userId - User who was denied
   * @param userName - Display name of the user
   * @param resource - Resource that was denied
   * @param action - Action that was denied
   * @param reason - Reason for denial
   */
  logPermissionDenial(
    userId: string,
    userName: string,
    resource: AuditResource,
    action: AuditAction,
    reason: string
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      AuditAction.Deny,
      AuditResource.Permission,
      `${resource}:${action}`,
      { deniedResource: resource, deniedAction: action, reason },
      []
    );
  }

  /**
   * Log PII data access for GDPR/CCPA compliance
   * @param userId - User accessing PII
   * @param userName - Display name of the user
   * @param dataSubjectId - ID of the data subject
   * @param dataType - Type of PII accessed
   * @param purpose - Purpose of access
   */
  logPIIAccess(
    userId: string,
    userName: string,
    dataSubjectId: string,
    dataType: string,
    purpose: string
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      AuditAction.Access,
      AuditResource.PII,
      dataSubjectId,
      { dataType, purpose },
      [ComplianceFlag.PIIAccess]
    );
  }

  /**
   * Log PII data erasure for right-to-erasure requests
   * @param userId - User performing erasure
   * @param userName - Display name of the user
   * @param dataSubjectId - ID of the data subject
   * @param dataTypes - Types of data erased
   * @param requestId - Erasure request ID
   */
  logPIIErasure(
    userId: string,
    userName: string,
    dataSubjectId: string,
    dataTypes: string[],
    requestId: string
  ): SensitiveAuditEntry {
    return this.createEntry(
      userId,
      userName,
      AuditAction.Erasure,
      AuditResource.PII,
      dataSubjectId,
      { dataTypes, requestId },
      [ComplianceFlag.PIIErasure]
    );
  }

  /**
   * Query audit log entries
   * @param query - Query filters
   * @returns Filtered audit log entries
   */
  queryAuditLog(query: AuditLogQuery): SensitiveAuditEntry[] {
    let results = [...this.auditLog];

    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }
    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }
    if (query.resource) {
      results = results.filter(e => e.resource === query.resource);
    }
    if (query.resourceId) {
      results = results.filter(e => e.resourceId === query.resourceId);
    }
    if (query.startDate) {
      results = results.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(e => e.timestamp <= query.endDate!);
    }
    if (query.complianceFlag) {
      results = results.filter(e =>
        e.complianceFlags.includes(query.complianceFlag!)
      );
    }

    const limit = query.limit || 100;
    return results.slice(-limit);
  }

  /**
   * Get all entries for a specific resource
   * @param resource - Resource type
   * @param resourceId - Resource ID
   * @returns Audit entries for the resource
   */
  getResourceAuditTrail(
    resource: AuditResource,
    resourceId: string
  ): SensitiveAuditEntry[] {
    return this.auditLog.filter(
      e => e.resource === resource && e.resourceId === resourceId
    );
  }

  /**
   * Get all PII access entries for a data subject (GDPR compliance)
   * @param dataSubjectId - Data subject ID
   * @returns PII access audit entries
   */
  getPIIAccessLog(dataSubjectId: string): SensitiveAuditEntry[] {
    return this.auditLog.filter(
      e => e.resourceId === dataSubjectId &&
        e.complianceFlags.some(f =>
          f === ComplianceFlag.PIIAccess ||
          f === ComplianceFlag.PIIModification ||
          f === ComplianceFlag.PIIExport
        )
    );
  }

  /**
   * Clear audit log (for testing only)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get total audit log count
   * @returns Number of entries in the audit log
   */
  getAuditLogCount(): number {
    return this.auditLog.length;
  }

  /**
   * Create an audit log entry
   */
  private createEntry(
    userId: string,
    userName: string,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    details: Record<string, unknown>,
    complianceFlags: ComplianceFlag[]
  ): SensitiveAuditEntry {
    const entry: SensitiveAuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      userId,
      userName,
      action,
      resource,
      resourceId,
      details,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      correlationId: null,
      complianceFlags
    };

    // Add to in-memory log (circular buffer)
    this.auditLog.push(entry);
    if (this.auditLog.length > this.MAX_LOG_ENTRIES) {
      this.auditLog.shift();
    }

    return entry;
  }

  /**
   * Get client IP address (best effort)
   */
  private getClientIP(): string | null {
    // In a real application, this would be obtained from the server
    // or a dedicated IP detection service
    return null;
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string | null {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return null;
  }
}
