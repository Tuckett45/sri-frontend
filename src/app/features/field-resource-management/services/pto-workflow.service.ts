/**
 * PTO Workflow Service
 * Orchestrates status transitions and enforces workflow integrity for PTO requests.
 */

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import {
  ApprovalAction,
  ApprovalEntry,
  CreatePtoRequestDto,
  PtoRequest,
  RequestStatus
} from '../models/pto.models';
import { PtoValidationService } from './pto-validation.service';

@Injectable({
  providedIn: 'root'
})
export class PtoWorkflowService {

  constructor(private validationService: PtoValidationService) {}

  /**
   * Submits a new PTO request.
   * Validates the DTO, creates a PtoRequest with Pending_Manager_Approval status,
   * generates an ID, sets timestamps, and appends an initial ApprovalEntry.
   * @param dto The create PTO request DTO
   * @returns Observable of the created PtoRequest
   */
  submit(dto: CreatePtoRequestDto): Observable<PtoRequest> {
    const validationResult = this.validationService.validateRequest(dto);

    if (!validationResult.valid) {
      return throwError(() => ({
        message: 'Validation failed',
        errors: validationResult.errors
      }));
    }

    const now = new Date().toISOString();
    const requestId = uuidv4();

    const initialEntry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'submitted',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason: null,
      fromStatus: RequestStatus.Pending_Manager_Approval,
      toStatus: RequestStatus.Pending_Manager_Approval
    };

    const request: PtoRequest = {
      id: requestId,
      employeeId: dto.employeeId,
      employeeName: 'Current User',
      managerId: '',
      managerName: '',
      startDate: dto.startDate,
      endDate: dto.endDate,
      requestType: dto.requestType,
      reason: dto.reason || null,
      status: RequestStatus.Pending_Manager_Approval,
      approvalHistory: [initialEntry],
      createdAt: now,
      updatedAt: now
    };

    return of(request);
  }

  /**
   * Cancels a PTO request.
   * Validates that cancellation is allowed (status must be Pending_Manager_Approval
   * or Pending_Backoffice_Approval).
   * @param requestId The ID of the request to cancel
   * @param request The current PtoRequest object
   * @returns Observable of the updated PtoRequest
   */
  cancel(requestId: string, request: PtoRequest): Observable<PtoRequest> {
    if (!this.validationService.isValidTransition(request.status, RequestStatus.Cancelled, 'employee')) {
      return throwError(() => ({
        message: 'This action is not available for the current request status'
      }));
    }

    const now = new Date().toISOString();

    const entry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'cancelled',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason: null,
      fromStatus: request.status,
      toStatus: RequestStatus.Cancelled
    };

    const updatedRequest: PtoRequest = {
      ...request,
      status: RequestStatus.Cancelled,
      approvalHistory: [...(request.approvalHistory || []), entry],
      updatedAt: now
    };

    return of(updatedRequest);
  }

  /**
   * Approves a PTO request as a manager.
   * Transitions status to Pending_Backoffice_Approval.
   * @param requestId The ID of the request
   * @param request The current PtoRequest object
   * @returns Observable of the updated PtoRequest
   */
  managerApprove(requestId: string, request: PtoRequest): Observable<PtoRequest> {
    if (!this.validationService.isValidTransition(
      request.status, RequestStatus.Pending_Backoffice_Approval, 'manager'
    )) {
      return throwError(() => ({
        message: 'This action is not available for the current request status'
      }));
    }

    const now = new Date().toISOString();

    const entry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'manager_approved',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason: null,
      fromStatus: request.status,
      toStatus: RequestStatus.Pending_Backoffice_Approval
    };

    const updatedRequest: PtoRequest = {
      ...request,
      status: RequestStatus.Pending_Backoffice_Approval,
      approvalHistory: [...(request.approvalHistory || []), entry],
      updatedAt: now
    };

    return of(updatedRequest);
  }

  /**
   * Rejects a PTO request as a manager.
   * Validates that a non-empty reason is provided.
   * Transitions status to Rejected.
   * @param requestId The ID of the request
   * @param request The current PtoRequest object
   * @param reason The rejection reason (required, non-empty after trimming)
   * @returns Observable of the updated PtoRequest
   */
  managerReject(requestId: string, request: PtoRequest, reason: string): Observable<PtoRequest> {
    if (!this.validationService.isValidTransition(
      request.status, RequestStatus.Rejected, 'manager'
    )) {
      return throwError(() => ({
        message: 'This action is not available for the current request status'
      }));
    }

    if (!reason || reason.trim().length === 0) {
      return throwError(() => ({
        message: 'A reason is required when rejecting a request'
      }));
    }

    const now = new Date().toISOString();

    const entry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'manager_rejected',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason,
      fromStatus: request.status,
      toStatus: RequestStatus.Rejected
    };

    const updatedRequest: PtoRequest = {
      ...request,
      status: RequestStatus.Rejected,
      approvalHistory: [...(request.approvalHistory || []), entry],
      updatedAt: now
    };

    return of(updatedRequest);
  }

  /**
   * Approves a PTO request as backoffice.
   * Transitions status to Approved.
   * @param requestId The ID of the request
   * @param request The current PtoRequest object
   * @returns Observable of the updated PtoRequest
   */
  backofficeApprove(requestId: string, request: PtoRequest): Observable<PtoRequest> {
    if (!this.validationService.isValidTransition(
      request.status, RequestStatus.Approved, 'backoffice'
    )) {
      return throwError(() => ({
        message: 'This action is not available for the current request status'
      }));
    }

    const now = new Date().toISOString();

    const entry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'backoffice_approved',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason: null,
      fromStatus: request.status,
      toStatus: RequestStatus.Approved
    };

    const updatedRequest: PtoRequest = {
      ...request,
      status: RequestStatus.Approved,
      approvalHistory: [...(request.approvalHistory || []), entry],
      updatedAt: now
    };

    return of(updatedRequest);
  }

  /**
   * Rejects a PTO request as backoffice.
   * Validates that a non-empty reason is provided.
   * Transitions status to Rejected.
   * @param requestId The ID of the request
   * @param request The current PtoRequest object
   * @param reason The rejection reason (required, non-empty after trimming)
   * @returns Observable of the updated PtoRequest
   */
  backofficeReject(requestId: string, request: PtoRequest, reason: string): Observable<PtoRequest> {
    if (!this.validationService.isValidTransition(
      request.status, RequestStatus.Rejected, 'backoffice'
    )) {
      return throwError(() => ({
        message: 'This action is not available for the current request status'
      }));
    }

    if (!reason || reason.trim().length === 0) {
      return throwError(() => ({
        message: 'A reason is required when rejecting a request'
      }));
    }

    const now = new Date().toISOString();

    const entry: ApprovalEntry = {
      id: uuidv4(),
      requestId,
      action: 'backoffice_rejected',
      performedBy: 'current-user',
      performedByName: 'Current User',
      performedAt: now,
      reason,
      fromStatus: request.status,
      toStatus: RequestStatus.Rejected
    };

    const updatedRequest: PtoRequest = {
      ...request,
      status: RequestStatus.Rejected,
      approvalHistory: [...(request.approvalHistory || []), entry],
      updatedAt: now
    };

    return of(updatedRequest);
  }
}
