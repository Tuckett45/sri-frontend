/**
 * Exception NgRx Reducer
 * 
 * Implements pure, immutable state transitions for all exception actions.
 * Uses NgRx Entity adapter for efficient entity management.
 * 
 * Requirements: 3.3
 */

import { createReducer, on } from '@ngrx/store';
import { ExceptionState, exceptionAdapter, initialExceptionState } from './exception.state';
import * as ExceptionActions from './exception.actions';

/**
 * Exception reducer
 * 
 * Handles all exception-related actions and produces new immutable state.
 * Uses the entity adapter for normalized entity storage and efficient updates.
 */
export const exceptionReducer = createReducer(
  initialExceptionState,

  // ============================================================================
  // Load Exceptions for Deployment
  // ============================================================================

  on(ExceptionActions.loadExceptions, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, list: true },
    error: { ...state.error, list: null }
  })),

  on(ExceptionActions.loadExceptionsSuccess, (state, { result }): ExceptionState =>
    exceptionAdapter.setAll(result.items, {
      ...state,
      loading: { ...state.loading, list: false },
      error: { ...state.error, list: null },
      pagination: result.pagination,
      lastLoaded: Date.now()
    })
  ),

  on(ExceptionActions.loadExceptionsFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: error }
  })),

  // ============================================================================
  // Load Exception Detail
  // ============================================================================

  on(ExceptionActions.loadException, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, detail: true },
    error: { ...state.error, detail: null }
  })),

  on(ExceptionActions.loadExceptionSuccess, (state, { exception }): ExceptionState =>
    exceptionAdapter.upsertOne(exception, {
      ...state,
      loading: { ...state.loading, detail: false },
      error: { ...state.error, detail: null }
    })
  ),

  on(ExceptionActions.loadExceptionFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, detail: false },
    error: { ...state.error, detail: error }
  })),

  // ============================================================================
  // Load Active Exceptions
  // ============================================================================

  on(ExceptionActions.loadActiveExceptions, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, loadingActive: true },
    error: { ...state.error, loadingActive: null }
  })),

  on(ExceptionActions.loadActiveExceptionsSuccess, (state, { exceptions }): ExceptionState => ({
    ...state,
    activeExceptions: exceptions,
    loading: { ...state.loading, loadingActive: false },
    error: { ...state.error, loadingActive: null }
  })),

  on(ExceptionActions.loadActiveExceptionsFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, loadingActive: false },
    error: { ...state.error, loadingActive: error }
  })),

  // ============================================================================
  // Create Exception
  // ============================================================================

  on(ExceptionActions.createException, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, creating: true },
    error: { ...state.error, creating: null }
  })),

  on(ExceptionActions.createExceptionSuccess, (state, { exception }): ExceptionState =>
    exceptionAdapter.addOne(exception, {
      ...state,
      loading: { ...state.loading, creating: false },
      error: { ...state.error, creating: null }
    })
  ),

  on(ExceptionActions.createExceptionFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, creating: false },
    error: { ...state.error, creating: error }
  })),

  // ============================================================================
  // Validate Exception
  // ============================================================================

  on(ExceptionActions.validateException, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, validating: true },
    error: { ...state.error, validating: null },
    validationResult: null
  })),

  on(ExceptionActions.validateExceptionSuccess, (state, { result }): ExceptionState => ({
    ...state,
    validationResult: result,
    loading: { ...state.loading, validating: false },
    error: { ...state.error, validating: null }
  })),

  on(ExceptionActions.validateExceptionFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, validating: false },
    error: { ...state.error, validating: error }
  })),

  // ============================================================================
  // Approve Exception
  // ============================================================================

  on(ExceptionActions.approveException, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, approving: true },
    error: { ...state.error, approving: null }
  })),

  on(ExceptionActions.approveExceptionSuccess, (state, { exception }): ExceptionState =>
    exceptionAdapter.updateOne(
      {
        id: exception.id,
        changes: exception
      },
      {
        ...state,
        loading: { ...state.loading, approving: false },
        error: { ...state.error, approving: null }
      }
    )
  ),

  on(ExceptionActions.approveExceptionFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, approving: false },
    error: { ...state.error, approving: error }
  })),

  // ============================================================================
  // Deny Exception
  // ============================================================================

  on(ExceptionActions.denyException, (state): ExceptionState => ({
    ...state,
    loading: { ...state.loading, denying: true },
    error: { ...state.error, denying: null }
  })),

  on(ExceptionActions.denyExceptionSuccess, (state, { exception }): ExceptionState =>
    exceptionAdapter.updateOne(
      {
        id: exception.id,
        changes: exception
      },
      {
        ...state,
        loading: { ...state.loading, denying: false },
        error: { ...state.error, denying: null }
      }
    )
  ),

  on(ExceptionActions.denyExceptionFailure, (state, { error }): ExceptionState => ({
    ...state,
    loading: { ...state.loading, denying: false },
    error: { ...state.error, denying: error }
  })),

  // ============================================================================
  // Filter Management
  // ============================================================================

  on(ExceptionActions.setExceptionFilters, (state, { filters }): ExceptionState => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  on(ExceptionActions.clearExceptionFilters, (state): ExceptionState => ({
    ...state,
    filters: {}
  })),

  // ============================================================================
  // Selection Management
  // ============================================================================

  on(ExceptionActions.selectException, (state, { id }): ExceptionState => ({
    ...state,
    selectedId: id
  })),

  on(ExceptionActions.clearExceptionSelection, (state): ExceptionState => ({
    ...state,
    selectedId: null
  })),

  // ============================================================================
  // Cache Management
  // ============================================================================

  on(ExceptionActions.clearExceptionState, (): ExceptionState => initialExceptionState),

  on(ExceptionActions.refreshExceptions, (state): ExceptionState => ({
    ...state,
    lastLoaded: null
  }))
);
