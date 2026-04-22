/**
 * Exception NgRx Actions
 * 
 * Defines all actions for exception state management including:
 * - Load operations (list, detail, active exceptions)
 * - Create exception
 * - Validate exception
 * - Approve/deny exception
 * - Filter management
 * 
 * Each operation has corresponding success and failure actions.
 * 
 * Requirements: 3.2
 */

import { createAction, props } from '@ngrx/store';
import {
  ExceptionDto,
  CreateExceptionRequest,
  ExceptionValidationResult,
  ApproveExceptionRequest,
  DenyExceptionRequest
} from '../../models/exception.model';
import { PagedResult } from '../../models/common.model';
import { ExceptionFilters } from './exception.state';

// ============================================================================
// Load Exceptions for Deployment
// ============================================================================

/**
 * Load exceptions for a specific deployment with pagination
 */
export const loadExceptions = createAction(
  '[Exception] Load Exceptions',
  props<{ deploymentId: string; page?: number; pageSize?: number }>()
);

/**
 * Exceptions loaded successfully
 */
export const loadExceptionsSuccess = createAction(
  '[Exception] Load Exceptions Success',
  props<{ result: PagedResult<ExceptionDto> }>()
);

/**
 * Failed to load exceptions
 */
export const loadExceptionsFailure = createAction(
  '[Exception] Load Exceptions Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Exception Detail
// ============================================================================

/**
 * Load a specific exception by ID
 */
export const loadException = createAction(
  '[Exception] Load Exception',
  props<{ exceptionId: string }>()
);

/**
 * Exception loaded successfully
 */
export const loadExceptionSuccess = createAction(
  '[Exception] Load Exception Success',
  props<{ exception: ExceptionDto }>()
);

/**
 * Failed to load exception
 */
export const loadExceptionFailure = createAction(
  '[Exception] Load Exception Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Active Exceptions
// ============================================================================

/**
 * Load active (approved and not expired) exceptions for a deployment
 */
export const loadActiveExceptions = createAction(
  '[Exception] Load Active Exceptions',
  props<{ deploymentId: string }>()
);

/**
 * Active exceptions loaded successfully
 */
export const loadActiveExceptionsSuccess = createAction(
  '[Exception] Load Active Exceptions Success',
  props<{ exceptions: ExceptionDto[] }>()
);

/**
 * Failed to load active exceptions
 */
export const loadActiveExceptionsFailure = createAction(
  '[Exception] Load Active Exceptions Failure',
  props<{ error: string }>()
);

// ============================================================================
// Create Exception
// ============================================================================

/**
 * Create a new exception request
 */
export const createException = createAction(
  '[Exception] Create Exception',
  props<{ deploymentId: string; request: CreateExceptionRequest }>()
);

/**
 * Exception created successfully
 */
export const createExceptionSuccess = createAction(
  '[Exception] Create Exception Success',
  props<{ exception: ExceptionDto; deploymentId: string }>()
);

/**
 * Failed to create exception
 */
export const createExceptionFailure = createAction(
  '[Exception] Create Exception Failure',
  props<{ error: string }>()
);

// ============================================================================
// Validate Exception
// ============================================================================

/**
 * Validate an exception request before submission
 */
export const validateException = createAction(
  '[Exception] Validate Exception',
  props<{ deploymentId: string; request: CreateExceptionRequest }>()
);

/**
 * Exception validated successfully
 */
export const validateExceptionSuccess = createAction(
  '[Exception] Validate Exception Success',
  props<{ result: ExceptionValidationResult }>()
);

/**
 * Failed to validate exception
 */
export const validateExceptionFailure = createAction(
  '[Exception] Validate Exception Failure',
  props<{ error: string }>()
);

// ============================================================================
// Approve Exception
// ============================================================================

/**
 * Approve an exception request
 */
export const approveException = createAction(
  '[Exception] Approve Exception',
  props<{ exceptionId: string; request: ApproveExceptionRequest }>()
);

/**
 * Exception approved successfully
 */
export const approveExceptionSuccess = createAction(
  '[Exception] Approve Exception Success',
  props<{ exception: ExceptionDto }>()
);

/**
 * Failed to approve exception
 */
export const approveExceptionFailure = createAction(
  '[Exception] Approve Exception Failure',
  props<{ error: string }>()
);

// ============================================================================
// Deny Exception
// ============================================================================

/**
 * Deny an exception request
 */
export const denyException = createAction(
  '[Exception] Deny Exception',
  props<{ exceptionId: string; request: DenyExceptionRequest }>()
);

/**
 * Exception denied successfully
 */
export const denyExceptionSuccess = createAction(
  '[Exception] Deny Exception Success',
  props<{ exception: ExceptionDto }>()
);

/**
 * Failed to deny exception
 */
export const denyExceptionFailure = createAction(
  '[Exception] Deny Exception Failure',
  props<{ error: string }>()
);

// ============================================================================
// Filter Management
// ============================================================================

/**
 * Set exception filters
 */
export const setExceptionFilters = createAction(
  '[Exception] Set Filters',
  props<{ filters: ExceptionFilters }>()
);

/**
 * Clear all exception filters
 */
export const clearExceptionFilters = createAction(
  '[Exception] Clear Filters'
);

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Select an exception by ID
 */
export const selectException = createAction(
  '[Exception] Select Exception',
  props<{ id: string }>()
);

/**
 * Clear exception selection
 */
export const clearExceptionSelection = createAction(
  '[Exception] Clear Selection'
);

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all exception state (useful for logout or reset)
 */
export const clearExceptionState = createAction(
  '[Exception] Clear State'
);

/**
 * Refresh exceptions (force reload)
 */
export const refreshExceptions = createAction(
  '[Exception] Refresh Exceptions',
  props<{ deploymentId: string }>()
);
