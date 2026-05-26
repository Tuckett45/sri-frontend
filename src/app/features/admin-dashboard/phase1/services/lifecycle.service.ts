import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';
import {
  LifecycleState,
  LifecycleTransition,
  StateTransition,
  ApprovalRequest,
  TransitionRequest,
  ValidationResult,
  ValidationError
} from '../models/lifecycle.models';
import {
  PROJECT_LIFECYCLE_ENDPOINTS,
  ACTIVITY_ENDPOINTS
} from '../../../field-resource-management/api/atlas-lifecycle-endpoints';
import {
  ProjectDetailDto,
  PhaseChecklist,
  ChecklistActivity,
  PhaseTransitionRequest,
  PhaseTransitionResult,
  AuditEvent,
  ProjectPhase,
  ActivityStatus,
  ProjectDto,
  ProjectListResponse
} from '../../../field-resource-management/models/atlas-lifecycle.models';

/**
 * LifecycleService
 *
 * Manages project lifecycle state transitions with validation and approval workflows.
 * Now aligned to the actual SRI Project Lifecycle API backend endpoints:
 * - POST /api/Projects/:projectId/transition (phase transitions with gate evaluations)
 * - GET /api/Projects/:projectId/checklist (phase-specific activity checklists)
 * - GET /api/Projects/:projectId/audit (audit trail)
 * - GET /api/Projects (project listing with filters)
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@Injectable({
  providedIn: 'root'
})
export class LifecycleService {
  private readonly retryCount = 1;

  constructor(private http: HttpClient) {}

  // ─── Project Retrieval ──────────────────────────────────────────────────────

  /**
   * Get all projects with optional phase/status filtering and pagination.
   */
  getProjects(
    phase?: ProjectPhase,
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<ProjectListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (phase !== undefined) params = params.set('phase', phase.toString());
    if (status) params = params.set('status', status);

    return this.http.get<ProjectListResponse>(
      PROJECT_LIFECYCLE_ENDPOINTS.getProjects(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getProjects'))
    );
  }

  /**
   * Get detailed project including phase history, activities, documents, milestones.
   */
  getProjectDetail(projectId: string): Observable<ProjectDetailDto> {
    return this.http.get<ProjectDetailDto>(
      PROJECT_LIFECYCLE_ENDPOINTS.getProject(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getProjectDetail'))
    );
  }

  // ─── Phase Transitions (Aligned to Actual Backend) ──────────────────────────

  /**
   * Get current lifecycle state for a project.
   * Fetches the project and maps to LifecycleState format.
   * Requirement: 4.1
   */
  getLifecycleState(entityType: string, entityId: string): Observable<LifecycleState> {
    return this.http.get<ProjectDetailDto>(
      PROJECT_LIFECYCLE_ENDPOINTS.getProject(entityId)
    ).pipe(
      map(project => this.mapProjectToLifecycleState(project)),
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getLifecycleState'))
    );
  }

  /**
   * Get available transitions from current phase using the lifecycle state machine.
   * Requirement: 4.1, 4.2
   */
  getAvailableTransitions(
    entityType: string,
    entityId: string
  ): Observable<LifecycleTransition[]> {
    return this.http.get<ProjectDetailDto>(
      PROJECT_LIFECYCLE_ENDPOINTS.getProject(entityId)
    ).pipe(
      map(project => this.getValidTransitionsForPhase(project.currentPhase)),
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getAvailableTransitions'))
    );
  }

  /**
   * Get transition history (audit trail) for a project.
   * Requirement: 4.7
   */
  getTransitionHistory(
    entityType: string,
    entityId: string
  ): Observable<StateTransition[]> {
    return this.http.get<AuditEvent[]>(
      PROJECT_LIFECYCLE_ENDPOINTS.getAuditTrail(entityId)
    ).pipe(
      map(events => events
        .filter(e => e.eventType === 'PhaseTransition' || e.action?.includes('transition'))
        .map(e => ({
          id: e.id,
          fromState: e.eventData?.['fromPhase'] ?? '',
          toState: e.eventData?.['toPhase'] ?? '',
          trigger: e.action,
          timestamp: new Date(e.timestamp),
          userId: e.actorId,
          userName: e.eventData?.['actorName'] ?? e.actorId,
          reason: e.eventData?.['reason'] ?? '',
          metadata: e.eventData
        }))
      ),
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getTransitionHistory'))
    );
  }

  /**
   * Get the phase checklist for a project's current phase.
   * This uses the actual backend gate evaluation system.
   */
  getPhaseChecklist(projectId: string): Observable<PhaseChecklist> {
    return this.http.get<PhaseChecklist>(
      PROJECT_LIFECYCLE_ENDPOINTS.getChecklist(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPhaseChecklist'))
    );
  }

  /**
   * Get pending approval requests.
   * Requirement: 4.4, 4.5
   */
  getPendingApprovals(
    entityType: string,
    entityId: string
  ): Observable<ApprovalRequest[]> {
    // Fetch audit trail and filter for pending approval events
    return this.http.get<AuditEvent[]>(
      PROJECT_LIFECYCLE_ENDPOINTS.getAuditTrail(entityId)
    ).pipe(
      map(events => events
        .filter(e => e.eventType === 'ApprovalRequest' && e.eventData?.['status'] === 'pending')
        .map(e => ({
          id: e.id,
          transitionId: e.eventData?.['transitionId'] ?? '',
          entityId: entityId,
          entityType: entityType,
          requestedBy: e.actorId,
          requestedAt: new Date(e.timestamp),
          status: 'pending' as const,
          approver: e.eventData?.['approver'],
          approvalDate: e.eventData?.['approvalDate'] ? new Date(e.eventData['approvalDate']) : undefined,
          reason: e.eventData?.['reason']
        }))
      ),
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPendingApprovals'))
    );
  }

  // ─── Transition Execution ───────────────────────────────────────────────────

  /**
   * Validate a state transition.
   *
   * Validates:
   * - Target state is in allowed transitions list (Requirement 4.2)
   * - All prerequisite conditions are met (Requirement 4.3)
   * - Required fields are present
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
   * Execute a phase transition via the actual backend lifecycle engine.
   *
   * Calls POST /api/Projects/:projectId/transition which evaluates gate criteria,
   * validates prerequisites, and either completes or rejects the transition.
   *
   * Requirements: 4.6, 4.7
   */
  executeTransition(
    entityType: string,
    entityId: string,
    request: TransitionRequest
  ): Observable<StateTransition> {
    const backendRequest: PhaseTransitionRequest = {
      targetPhase: this.mapStateIdToPhase(request.transitionId),
      reason: request.reason ?? 'Phase transition requested',
      initiatedBy: request.metadata?.['userId'] ?? ''
    };

    return this.http.post<PhaseTransitionResult>(
      PROJECT_LIFECYCLE_ENDPOINTS.requestTransition(entityId),
      backendRequest
    ).pipe(
      map(result => ({
        id: `${result.projectId}-${result.transitionedAt}`,
        fromState: result.previousPhase.toString(),
        toState: result.newPhase.toString(),
        trigger: 'manual',
        timestamp: new Date(result.transitionedAt),
        userId: backendRequest.initiatedBy,
        userName: request.metadata?.['userName'] ?? '',
        reason: result.reason,
        metadata: { projectId: result.projectId }
      })),
      catchError(error => {
        console.error('Error executing transition:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Complete an activity with evidence (for checklist items).
   */
  completeActivity(
    projectId: string,
    activityId: string,
    completedBy: string,
    evidence: string[],
    notes?: string
  ): Observable<any> {
    return this.http.post<any>(
      ACTIVITY_ENDPOINTS.completeActivity(projectId, activityId),
      { completedBy, evidence, notes }
    ).pipe(
      catchError(error => this.handleError(error, 'completeActivity'))
    );
  }

  /**
   * Get execution progress for a project.
   */
  getExecutionProgress(projectId: string): Observable<any> {
    return this.http.get<any>(
      ACTIVITY_ENDPOINTS.getProgress(projectId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getExecutionProgress'))
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
    // The backend handles approval through the transition endpoint
    // with gate evaluation - transitions requiring approval will return
    // a pending status
    const backendRequest: PhaseTransitionRequest = {
      targetPhase: this.mapStateIdToPhase(transitionId),
      reason,
      initiatedBy: metadata?.['userId'] ?? ''
    };

    return this.http.post<any>(
      PROJECT_LIFECYCLE_ENDPOINTS.requestTransition(entityId),
      backendRequest
    ).pipe(
      map(response => ({
        id: response.id || `approval-${Date.now()}`,
        transitionId,
        entityId,
        entityType,
        requestedBy: backendRequest.initiatedBy,
        requestedAt: new Date(),
        status: 'pending' as const,
        reason
      })),
      catchError(error => this.handleError(error, 'createApprovalRequest'))
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
    return this.http.post<any>(
      `${PROJECT_LIFECYCLE_ENDPOINTS.getProjects()}/approvals/${approvalId}/approve`,
      { reason }
    ).pipe(
      map(response => ({
        ...response,
        requestedAt: new Date(response.requestedAt),
        approvalDate: response.approvalDate ? new Date(response.approvalDate) : undefined
      })),
      catchError(error => this.handleError(error, 'approveTransition'))
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
    return this.http.post<any>(
      `${PROJECT_LIFECYCLE_ENDPOINTS.getProjects()}/approvals/${approvalId}/reject`,
      { reason }
    ).pipe(
      map(response => ({
        ...response,
        requestedAt: new Date(response.requestedAt),
        approvalDate: response.approvalDate ? new Date(response.approvalDate) : undefined
      })),
      catchError(error => this.handleError(error, 'rejectTransition'))
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Map a ProjectDetailDto to the LifecycleState interface expected by the UI.
   */
  private mapProjectToLifecycleState(project: ProjectDetailDto): LifecycleState {
    const phaseTransitions = this.getValidTransitionsForPhase(project.currentPhase);
    return {
      id: project.currentPhase.toString(),
      name: this.getPhaseDisplayName(project.currentPhase),
      description: `Project is in ${this.getPhaseDisplayName(project.currentPhase)} phase`,
      type: this.getPhaseType(project.currentPhase),
      allowedTransitions: phaseTransitions.map(t => t.toState),
      requiredFields: this.getRequiredFieldsForPhase(project.currentPhase),
      validations: []
    };
  }

  /**
   * Backend state machine definition matching LifecycleEngine.ValidTransitions
   */
  private getValidTransitionsForPhase(phase: ProjectPhase): LifecycleTransition[] {
    const transitionMap: Record<number, ProjectPhase[]> = {
      [ProjectPhase.INITIATING]: [ProjectPhase.PLANNING, ProjectPhase.ON_HOLD, ProjectPhase.CANCELLED],
      [ProjectPhase.PLANNING]: [ProjectPhase.EXECUTING, ProjectPhase.ON_HOLD, ProjectPhase.CANCELLED],
      [ProjectPhase.EXECUTING]: [ProjectPhase.MONITORING_CONTROLLING, ProjectPhase.EXECUTING_MONITORING, ProjectPhase.ON_HOLD, ProjectPhase.CANCELLED],
      [ProjectPhase.MONITORING_CONTROLLING]: [ProjectPhase.CLOSE, ProjectPhase.ON_HOLD, ProjectPhase.CANCELLED],
      [ProjectPhase.EXECUTING_MONITORING]: [ProjectPhase.MONITORING_CONTROLLING, ProjectPhase.CLOSE, ProjectPhase.ON_HOLD, ProjectPhase.CANCELLED],
      [ProjectPhase.CLOSE]: [ProjectPhase.CANCELLED],
      [ProjectPhase.ON_HOLD]: [ProjectPhase.INITIATING, ProjectPhase.PLANNING, ProjectPhase.EXECUTING, ProjectPhase.EXECUTING_MONITORING, ProjectPhase.MONITORING_CONTROLLING, ProjectPhase.CANCELLED],
      [ProjectPhase.CANCELLED]: []
    };

    const allowedPhases = transitionMap[phase] || [];
    return allowedPhases.map(targetPhase => ({
      id: targetPhase.toString(),
      name: `Transition to ${this.getPhaseDisplayName(targetPhase)}`,
      fromState: phase.toString(),
      toState: targetPhase.toString(),
      requiresApproval: targetPhase === ProjectPhase.CLOSE || targetPhase === ProjectPhase.CANCELLED,
      validations: [],
      sideEffects: []
    }));
  }

  private getPhaseDisplayName(phase: ProjectPhase): string {
    const names: Record<number, string> = {
      [ProjectPhase.INITIATING]: 'Initiating',
      [ProjectPhase.PLANNING]: 'Planning',
      [ProjectPhase.EXECUTING]: 'Executing',
      [ProjectPhase.MONITORING_CONTROLLING]: 'Monitoring & Controlling',
      [ProjectPhase.EXECUTING_MONITORING]: 'Executing & Monitoring',
      [ProjectPhase.CLOSE]: 'Close',
      [ProjectPhase.ON_HOLD]: 'On Hold',
      [ProjectPhase.CANCELLED]: 'Cancelled'
    };
    return names[phase] || 'Unknown';
  }

  private getPhaseType(phase: ProjectPhase): 'initial' | 'active' | 'terminal' {
    if (phase === ProjectPhase.INITIATING) return 'initial';
    if (phase === ProjectPhase.CLOSE || phase === ProjectPhase.CANCELLED) return 'terminal';
    return 'active';
  }

  private getRequiredFieldsForPhase(phase: ProjectPhase): string[] {
    const requiredFields: Record<number, string[]> = {
      [ProjectPhase.PLANNING]: ['jobNumber', 'materialOrders'],
      [ProjectPhase.EXECUTING]: ['crewAssignment', 'schedule'],
      [ProjectPhase.MONITORING_CONTROLLING]: ['qualityReport'],
      [ProjectPhase.CLOSE]: ['finalDocumentation', 'clientSignOff'],
      [ProjectPhase.ON_HOLD]: ['holdReason'],
      [ProjectPhase.CANCELLED]: ['cancellationReason']
    };
    return requiredFields[phase] || [];
  }

  private mapStateIdToPhase(stateId: string): ProjectPhase {
    const num = parseInt(stateId, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) return num as ProjectPhase;
    // Handle string names
    const nameMap: Record<string, ProjectPhase> = {
      'initiating': ProjectPhase.INITIATING,
      'planning': ProjectPhase.PLANNING,
      'executing': ProjectPhase.EXECUTING,
      'monitoring_controlling': ProjectPhase.MONITORING_CONTROLLING,
      'executing_monitoring': ProjectPhase.EXECUTING_MONITORING,
      'close': ProjectPhase.CLOSE,
      'on_hold': ProjectPhase.ON_HOLD,
      'cancelled': ProjectPhase.CANCELLED
    };
    return nameMap[stateId.toLowerCase()] || ProjectPhase.INITIATING;
  }

  /**
   * Validate a single validation rule
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
        break;
    }

    return null;
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = `Invalid request: ${error.error?.error || 'Bad request'}`; break;
        case 404: message = 'Resource not found'; break;
        case 422: message = `Gate validation failed: ${error.error?.error || 'Unprocessable'}`; break;
        case 500: message = 'Server error'; break;
        default: message = `Server error: ${error.status}`;
      }
    }
    console.error(`LifecycleService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
