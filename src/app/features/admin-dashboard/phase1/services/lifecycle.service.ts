import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  LifecycleState,
  LifecycleTransition,
  StateTransition,
  ApprovalRequest,
  TransitionRequest,
  ValidationResult,
  ValidationError
} from '../models/lifecycle.models';

/**
 * LifecycleService
 * 
 * Manages lifecycle state transitions with validation and approval workflows.
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@Injectable({
  providedIn: 'root'
})
export class LifecycleService {
  private readonly apiUrl = '/api/lifecycle';

  constructor(private http: HttpClient) {}

  /**
   * Get current lifecycle state for an entity
   * Requirement: 4.1
   */
  getLifecycleState(entityType: string, entityId: string): Observable<LifecycleState> {
    return this.http.get<LifecycleState>(
      `${this.apiUrl}/${entityType}/${entityId}/state`
    );
  }

  /**
   * Get available transitions from current state
   * Requirement: 4.1, 4.2
   */
  getAvailableTransitions(
    entityType: string,
    entityId: string
  ): Observable<LifecycleTransition[]> {
    return this.http.get<LifecycleTransition[]>(
      `${this.apiUrl}/${entityType}/${entityId}/transitions`
    );
  }

  /**
   * Get transition history for an entity
   * Requirement: 4.7
   */
  getTransitionHistory(
    entityType: string,
    entityId: string
  ): Observable<StateTransition[]> {
    return this.http.get<StateTransition[]>(
      `${this.apiUrl}/${entityType}/${entityId}/history`
    ).pipe(
      map(transitions => transitions.map(t => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })))
    );
  }

  /**
   * Get pending approval requests
   * Requirement: 4.4, 4.5
   */
  getPendingApprovals(
    entityType: string,
    entityId: string
  ): Observable<ApprovalRequest[]> {
    return this.http.get<ApprovalRequest[]>(
      `${this.apiUrl}/${entityType}/${entityId}/approvals`
    ).pipe(
      map(approvals => approvals.map(a => ({
        ...a,
        requestedAt: new Date(a.requestedAt),
        approvalDate: a.approvalDate ? new Date(a.approvalDate) : undefined
      })))
    );
  }

  /**
   * Validate a state transition
   * 
   * Validates:
   * - Target state is in allowed transitions list (Requirement 4.2)
   * - All prerequisite conditions are met (Requirement 4.3)
   * - Required fields are present
   * 
   * Preconditions:
   * - currentState and targetState are valid LifecycleState objects
   * - targetState.id is in currentState.allowedTransitions array
   * 
   * Postconditions:
   * - Returns ValidationResult with isValid true if all validations pass
   * - All validation errors are included in ValidationResult.errors
   * - No mutations to currentState, targetState, or data
   */
  validateTransition(
    currentState: LifecycleState,
    targetState: LifecycleState,
    transition: LifecycleTransition,
    data: any
  ): Observable<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate target state is in allowed transitions (Requirement 4.2)
    if (!currentState.allowedTransitions.includes(targetState.id)) {
      errors.push({
        field: 'targetState',
        message: `Transition to ${targetState.name} is not allowed from ${currentState.name}`,
        code: 'INVALID_TRANSITION',
        severity: 'error'
      });
    }

    // Validate required fields (Requirement 4.3)
    for (const field of targetState.requiredFields) {
      if (!data[field] || data[field] === '') {
        errors.push({
          field,
          message: `${field} is required for this transition`,
          code: 'REQUIRED_FIELD',
          severity: 'error'
        });
      }
    }

    // Validate transition-specific rules (Requirement 4.3)
    for (const rule of transition.validations) {
      const ruleError = this.validateRule(rule, data);
      if (ruleError) {
        errors.push(ruleError);
      }
    }

    // Validate state-specific rules
    for (const rule of targetState.validations) {
      const ruleError = this.validateRule(rule, data);
      if (ruleError) {
        errors.push(ruleError);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      metadata: {
        currentState: currentState.id,
        targetState: targetState.id,
        transitionId: transition.id
      }
    };

    return of(result);
  }

  /**
   * Execute a state transition
   * 
   * Creates audit log entry and updates entity state (Requirements 4.6, 4.7)
   * 
   * Preconditions:
   * - Transition has been validated
   * - User has permission to execute transition
   * - If requiresApproval, approval has been granted
   * 
   * Postconditions:
   * - Audit log entry created with user ID, timestamp, and metadata
   * - Entity state updated to target state
   * - Transition added to state history
   */
  executeTransition(
    entityType: string,
    entityId: string,
    request: TransitionRequest
  ): Observable<StateTransition> {
    return this.http.post<StateTransition>(
      `${this.apiUrl}/${entityType}/${entityId}/execute`,
      request
    ).pipe(
      map(transition => ({
        ...transition,
        timestamp: new Date(transition.timestamp)
      })),
      catchError(error => {
        console.error('Error executing transition:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create an approval request for a restricted transition
   * Requirement: 4.4
   */
  createApprovalRequest(
    entityType: string,
    entityId: string,
    transitionId: string,
    reason: string,
    metadata?: Record<string, any>
  ): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(
      `${this.apiUrl}/${entityType}/${entityId}/approvals`,
      {
        transitionId,
        reason,
        metadata
      }
    ).pipe(
      map(approval => ({
        ...approval,
        requestedAt: new Date(approval.requestedAt)
      }))
    );
  }

  /**
   * Approve a transition request
   * Requirement: 4.5
   */
  approveTransition(
    approvalId: string,
    reason: string
  ): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(
      `${this.apiUrl}/approvals/${approvalId}/approve`,
      { reason }
    ).pipe(
      map(approval => ({
        ...approval,
        requestedAt: new Date(approval.requestedAt),
        approvalDate: approval.approvalDate ? new Date(approval.approvalDate) : undefined
      }))
    );
  }

  /**
   * Reject a transition request
   * Requirement: 4.5
   */
  rejectTransition(
    approvalId: string,
    reason: string
  ): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(
      `${this.apiUrl}/approvals/${approvalId}/reject`,
      { reason }
    ).pipe(
      map(approval => ({
        ...approval,
        requestedAt: new Date(approval.requestedAt),
        approvalDate: approval.approvalDate ? new Date(approval.approvalDate) : undefined
      }))
    );
  }

  /**
   * Validate a single validation rule
   * Private helper method
   */
  private validateRule(rule: any, data: any): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (!data[rule.field] || data[rule.field] === '') {
          return {
            field: rule.field,
            message: rule.message || `${rule.field} is required`,
            code: 'REQUIRED_FIELD',
            severity: 'error'
          };
        }
        break;

      case 'format':
        if (data[rule.field]) {
          const pattern = new RegExp(rule.params.pattern);
          if (!pattern.test(data[rule.field])) {
            return {
              field: rule.field,
              message: rule.message || `${rule.field} format is invalid`,
              code: 'INVALID_FORMAT',
              severity: 'error'
            };
          }
        }
        break;

      case 'range':
        if (data[rule.field] !== undefined) {
          const value = Number(data[rule.field]);
          if (rule.params.min !== undefined && value < rule.params.min) {
            return {
              field: rule.field,
              message: rule.message || `${rule.field} must be at least ${rule.params.min}`,
              code: 'OUT_OF_RANGE',
              severity: 'error'
            };
          }
          if (rule.params.max !== undefined && value > rule.params.max) {
            return {
              field: rule.field,
              message: rule.message || `${rule.field} must be at most ${rule.params.max}`,
              code: 'OUT_OF_RANGE',
              severity: 'error'
            };
          }
        }
        break;

      case 'custom':
        // Custom validation would be handled by backend
        break;
    }

    return null;
  }
}
