import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  ExceptionDto,
  CreateExceptionRequest,
  ExceptionValidationResult,
  ApproveExceptionRequest,
  DenyExceptionRequest
} from '../models/exception.model';
import { PagedResult } from '../models/common.model';

/**
 * Service for managing exception and waiver requests with validation and approval workflows.
 * 
 * This service provides methods to:
 * - Create exception requests for deployments
 * - Query exceptions with pagination
 * - Retrieve specific exceptions and active exceptions
 * - Validate exception requests before submission
 * - Approve or deny exception requests
 * 
 * All API calls are routed through the ATLAS API gateway at /v1/exceptions
 * and include automatic error handling via AtlasErrorHandlerService.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */
@Injectable({
  providedIn: 'root'
})
export class ExceptionService {
  private readonly baseUrl = '/v1/exceptions';

  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  /**
   * Create a new exception request for a deployment.
   * 
   * Exception requests allow deployments to proceed despite not meeting
   * standard requirements, subject to approval.
   * 
   * @param deploymentId - The deployment ID to create an exception for
   * @param request - The exception request details including type, justification, and evidence
   * @returns Observable of the created ExceptionDto
   * 
   * @example
   * const request: CreateExceptionRequest = {
   *   exceptionType: 'MISSING_DOCUMENTATION',
   *   justification: 'Documentation will be completed post-deployment',
   *   requestedBy: 'user-123',
   *   supportingEvidence: ['ticket-456']
   * };
   * this.exceptionService.createException('dep-123', request)
   *   .subscribe(exception => {
   *     console.log(`Exception created with ID: ${exception.id}`);
   *   });
   */
  createException(deploymentId: string, request: CreateExceptionRequest): Observable<ExceptionDto> {
    return this.http.post<ExceptionDto>(
      `${this.baseUrl}/deployments/${deploymentId}`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<ExceptionDto>(error, {
          endpoint: `${this.baseUrl}/deployments/${deploymentId}`,
          method: 'POST'
        })
      )
    );
  }

  /**
   * Get paginated list of exceptions for a specific deployment.
   * 
   * @param deploymentId - The deployment ID to query exceptions for
   * @param page - Page number (1-indexed, defaults to 1)
   * @param pageSize - Number of items per page (defaults to 50)
   * @returns Observable of PagedResult containing exception records
   * 
   * @example
   * this.exceptionService.getExceptions('dep-123', 1, 20)
   *   .subscribe(result => {
   *     console.log(`Page ${result.pagination.currentPage} of ${result.pagination.totalPages}`);
   *     result.items.forEach(exception => console.log(exception));
   *   });
   */
  getExceptions(
    deploymentId: string,
    page: number = 1,
    pageSize: number = 50
  ): Observable<PagedResult<ExceptionDto>> {
    return this.http.get<PagedResult<ExceptionDto>>(
      `${this.baseUrl}/deployments/${deploymentId}`,
      { params: { page: page.toString(), pageSize: pageSize.toString() } }
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<PagedResult<ExceptionDto>>(error, {
          endpoint: `${this.baseUrl}/deployments/${deploymentId}`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Get a specific exception by its ID.
   * 
   * @param exceptionId - The unique identifier of the exception
   * @returns Observable of the ExceptionDto
   * 
   * @example
   * this.exceptionService.getException('exc-456')
   *   .subscribe(exception => {
   *     console.log(`Exception status: ${exception.status}`);
   *     console.log(`Requested by: ${exception.requestedBy}`);
   *   });
   */
  getException(exceptionId: string): Observable<ExceptionDto> {
    return this.http.get<ExceptionDto>(`${this.baseUrl}/${exceptionId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<ExceptionDto>(error, {
            endpoint: `${this.baseUrl}/${exceptionId}`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get all active (approved and not expired) exceptions for a deployment.
   * 
   * Active exceptions are those with APPROVED status that have not yet expired.
   * These exceptions allow the deployment to bypass certain requirements.
   * 
   * @param deploymentId - The deployment ID to query active exceptions for
   * @returns Observable of array of active ExceptionDto records
   * 
   * @example
   * this.exceptionService.getActiveExceptions('dep-123')
   *   .subscribe(exceptions => {
   *     console.log(`${exceptions.length} active exceptions`);
   *     exceptions.forEach(exc => {
   *       console.log(`Type: ${exc.exceptionType}, Expires: ${exc.expiresAt}`);
   *     });
   *   });
   */
  getActiveExceptions(deploymentId: string): Observable<ExceptionDto[]> {
    return this.http.get<ExceptionDto[]>(
      `${this.baseUrl}/deployments/${deploymentId}/active`
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<ExceptionDto[]>(error, {
          endpoint: `${this.baseUrl}/deployments/${deploymentId}/active`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Validate an exception request before submitting it.
   * 
   * This endpoint checks if the exception request is valid and provides
   * feedback on validation errors, alternative paths, and additional requirements.
   * 
   * @param deploymentId - The deployment ID to validate the exception for
   * @param request - The exception request to validate
   * @returns Observable of ExceptionValidationResult with validation details
   * 
   * @example
   * const request: CreateExceptionRequest = {
   *   exceptionType: 'MISSING_DOCUMENTATION',
   *   justification: 'Documentation will be completed post-deployment',
   *   requestedBy: 'user-123'
   * };
   * this.exceptionService.validateException('dep-123', request)
   *   .subscribe(result => {
   *     if (result.isApproved) {
   *       console.log('Exception request is valid');
   *     } else {
   *       console.log('Validation errors:', result.validationErrors);
   *       console.log('Alternative paths:', result.alternativePaths);
   *     }
   *   });
   */
  validateException(
    deploymentId: string,
    request: CreateExceptionRequest
  ): Observable<ExceptionValidationResult> {
    return this.http.post<ExceptionValidationResult>(
      `${this.baseUrl}/deployments/${deploymentId}/validate`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<ExceptionValidationResult>(error, {
          endpoint: `${this.baseUrl}/deployments/${deploymentId}/validate`,
          method: 'POST'
        })
      )
    );
  }

  /**
   * Approve an exception request.
   * 
   * Approving an exception allows the deployment to proceed despite not meeting
   * standard requirements. Additional requirements may be specified as conditions.
   * 
   * @param exceptionId - The ID of the exception to approve
   * @param request - The approval request including approver ID and any additional requirements
   * @returns Observable of the updated ExceptionDto with APPROVED status
   * 
   * @example
   * const approvalRequest: ApproveExceptionRequest = {
   *   approverId: 'user-789',
   *   additionalRequirements: ['Complete documentation within 30 days']
   * };
   * this.exceptionService.approveException('exc-456', approvalRequest)
   *   .subscribe(exception => {
   *     console.log(`Exception approved: ${exception.status}`);
   *   });
   */
  approveException(exceptionId: string, request: ApproveExceptionRequest): Observable<ExceptionDto> {
    return this.http.post<ExceptionDto>(
      `${this.baseUrl}/${exceptionId}/approve`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<ExceptionDto>(error, {
          endpoint: `${this.baseUrl}/${exceptionId}/approve`,
          method: 'POST'
        })
      )
    );
  }

  /**
   * Deny an exception request.
   * 
   * Denying an exception prevents the deployment from bypassing standard requirements.
   * A denial reason should be provided to explain why the exception was not granted.
   * 
   * @param exceptionId - The ID of the exception to deny
   * @param request - The denial request including approver ID and denial reason
   * @returns Observable of the updated ExceptionDto with DENIED status
   * 
   * @example
   * const denialRequest: DenyExceptionRequest = {
   *   approverId: 'user-789',
   *   denialReason: 'Insufficient justification provided'
   * };
   * this.exceptionService.denyException('exc-456', denialRequest)
   *   .subscribe(exception => {
   *     console.log(`Exception denied: ${exception.status}`);
   *   });
   */
  denyException(exceptionId: string, request: DenyExceptionRequest): Observable<ExceptionDto> {
    return this.http.post<ExceptionDto>(
      `${this.baseUrl}/${exceptionId}/deny`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<ExceptionDto>(error, {
          endpoint: `${this.baseUrl}/${exceptionId}/deny`,
          method: 'POST'
        })
      )
    );
  }
}
