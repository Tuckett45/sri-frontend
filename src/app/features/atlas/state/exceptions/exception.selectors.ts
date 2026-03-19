/**
 * Exception NgRx Selectors
 * 
 * Provides memoized selectors for accessing exception state.
 * Includes base selectors, entity selectors, and derived selectors
 * for filtered and computed data.
 * 
 * Requirements: 3.8, 11.3
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ExceptionState, exceptionAdapter, ExceptionFilters } from './exception.state';
import { ExceptionDto, ExceptionStatus } from '../../models/exception.model';

/**
 * Feature selector for exception state
 */
export const selectExceptionState = createFeatureSelector<ExceptionState>('exceptions');

/**
 * Entity adapter selectors
 * Provides efficient access to entity collection
 */
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = exceptionAdapter.getSelectors(selectExceptionState);

// ============================================================================
// Base Selectors
// ============================================================================

/**
 * Select all exception IDs
 */
export const selectExceptionIds = selectIds;

/**
 * Select exception entities as a dictionary
 */
export const selectExceptionEntities = selectEntities;

/**
 * Select all exceptions as an array
 */
export const selectAllExceptions = selectAll;

/**
 * Select total number of exceptions in state
 */
export const selectExceptionTotal = selectTotal;

// ============================================================================
// Selection Selectors
// ============================================================================

/**
 * Select currently selected exception ID
 */
export const selectSelectedExceptionId = createSelector(
  selectExceptionState,
  (state) => state.selectedId
);

/**
 * Select currently selected exception entity
 */
export const selectSelectedException = createSelector(
  selectExceptionEntities,
  selectSelectedExceptionId,
  (entities: Record<string, ExceptionDto | undefined>, selectedId: string | null) =>
    selectedId ? entities[selectedId] : null
);

// ============================================================================
// Loading State Selectors
// ============================================================================

/**
 * Select all loading states
 */
export const selectExceptionLoading = createSelector(
  selectExceptionState,
  (state) => state.loading
);

/**
 * Select list loading state
 */
export const selectExceptionsLoading = createSelector(
  selectExceptionLoading,
  (loading) => loading.list
);

/**
 * Select detail loading state
 */
export const selectExceptionDetailLoading = createSelector(
  selectExceptionLoading,
  (loading) => loading.detail
);

/**
 * Select creating loading state
 */
export const selectExceptionCreating = createSelector(
  selectExceptionLoading,
  (loading) => loading.creating
);

/**
 * Alias for creating exception selector (used by components)
 */
export const selectCreatingException = selectExceptionCreating;

/**
 * Select validating loading state
 */
export const selectExceptionValidating = createSelector(
  selectExceptionLoading,
  (loading) => loading.validating
);

/**
 * Select approving loading state
 */
export const selectExceptionApproving = createSelector(
  selectExceptionLoading,
  (loading) => loading.approving
);

/**
 * Select denying loading state
 */
export const selectExceptionDenying = createSelector(
  selectExceptionLoading,
  (loading) => loading.denying
);

/**
 * Select loading active exceptions state
 */
export const selectExceptionLoadingActive = createSelector(
  selectExceptionLoading,
  (loading) => loading.loadingActive
);

/**
 * Select if any operation is in progress
 */
export const selectExceptionAnyLoading = createSelector(
  selectExceptionLoading,
  (loading) => Object.values(loading).some(value => value === true)
);

// ============================================================================
// Error State Selectors
// ============================================================================

/**
 * Select all error states
 */
export const selectExceptionErrors = createSelector(
  selectExceptionState,
  (state) => state.error
);

/**
 * Select list error
 */
export const selectExceptionsError = createSelector(
  selectExceptionErrors,
  (errors) => errors.list
);

/**
 * Select detail error
 */
export const selectExceptionDetailError = createSelector(
  selectExceptionErrors,
  (errors) => errors.detail
);

/**
 * Select creating error
 */
export const selectExceptionCreatingError = createSelector(
  selectExceptionErrors,
  (errors) => errors.creating
);

/**
 * Alias for creating error selector (used by components)
 */
export const selectCreatingError = selectExceptionCreatingError;

/**
 * Select validating error
 */
export const selectExceptionValidatingError = createSelector(
  selectExceptionErrors,
  (errors) => errors.validating
);

/**
 * Select approving error
 */
export const selectExceptionApprovingError = createSelector(
  selectExceptionErrors,
  (errors) => errors.approving
);

/**
 * Select denying error
 */
export const selectExceptionDenyingError = createSelector(
  selectExceptionErrors,
  (errors) => errors.denying
);

/**
 * Select loading active exceptions error
 */
export const selectExceptionLoadingActiveError = createSelector(
  selectExceptionErrors,
  (errors) => errors.loadingActive
);

/**
 * Select if any error exists
 */
export const selectExceptionAnyError = createSelector(
  selectExceptionErrors,
  (errors) => Object.values(errors).some(value => value !== null)
);

// ============================================================================
// Pagination Selectors
// ============================================================================

/**
 * Select pagination metadata
 */
export const selectExceptionPagination = createSelector(
  selectExceptionState,
  (state) => state.pagination
);

/**
 * Alias for pagination selector (used by components)
 */
export const selectPagination = selectExceptionPagination;

/**
 * Select current page number
 */
export const selectExceptionCurrentPage = createSelector(
  selectExceptionPagination,
  (pagination) => pagination?.currentPage || 1
);

/**
 * Select page size
 */
export const selectExceptionPageSize = createSelector(
  selectExceptionPagination,
  (pagination) => pagination?.pageSize || 50
);

/**
 * Select total count
 */
export const selectExceptionTotalCount = createSelector(
  selectExceptionPagination,
  (pagination) => pagination?.totalCount || 0
);

/**
 * Select total pages
 */
export const selectExceptionTotalPages = createSelector(
  selectExceptionPagination,
  (pagination) => pagination?.totalPages || 0
);

// ============================================================================
// Filter Selectors
// ============================================================================

/**
 * Select current filters
 */
export const selectExceptionFilters = createSelector(
  selectExceptionState,
  (state) => state.filters
);

/**
 * Alias for filters selector (used by components)
 */
export const selectFilters = selectExceptionFilters;

/**
 * Select status filter
 */
export const selectExceptionStatusFilter = createSelector(
  selectExceptionFilters,
  (filters) => filters.status
);

/**
 * Select exception type filter
 */
export const selectExceptionTypeFilter = createSelector(
  selectExceptionFilters,
  (filters) => filters.exceptionType
);

/**
 * Select deployment ID filter
 */
export const selectExceptionDeploymentIdFilter = createSelector(
  selectExceptionFilters,
  (filters) => filters.deploymentId
);

/**
 * Select requested by filter
 */
export const selectExceptionRequestedByFilter = createSelector(
  selectExceptionFilters,
  (filters) => filters.requestedBy
);

/**
 * Select if any filters are active
 */
export const selectExceptionHasActiveFilters = createSelector(
  selectExceptionFilters,
  (filters) => Object.keys(filters).length > 0
);

// ============================================================================
// Active Exceptions Selectors
// ============================================================================

/**
 * Select active exceptions
 */
export const selectActiveExceptions = createSelector(
  selectExceptionState,
  (state) => state.activeExceptions
);

/**
 * Select count of active exceptions
 */
export const selectActiveExceptionsCount = createSelector(
  selectActiveExceptions,
  (exceptions) => exceptions.length
);

/**
 * Select if there are any active exceptions
 */
export const selectHasActiveExceptions = createSelector(
  selectActiveExceptionsCount,
  (count) => count > 0
);

// ============================================================================
// Validation Result Selectors
// ============================================================================

/**
 * Select validation result
 */
export const selectExceptionValidationResult = createSelector(
  selectExceptionState,
  (state) => state.validationResult
);

/**
 * Select if validation result is approved
 */
export const selectExceptionValidationIsApproved = createSelector(
  selectExceptionValidationResult,
  (result) => result?.isApproved || false
);

/**
 * Select validation errors
 */
export const selectExceptionValidationErrors = createSelector(
  selectExceptionValidationResult,
  (result) => result?.validationErrors || []
);

/**
 * Select alternative paths from validation
 */
export const selectExceptionValidationAlternativePaths = createSelector(
  selectExceptionValidationResult,
  (result) => result?.alternativePaths || []
);

// ============================================================================
// Cache Selectors
// ============================================================================

/**
 * Select last loaded timestamp
 */
export const selectExceptionLastLoaded = createSelector(
  selectExceptionState,
  (state) => state.lastLoaded
);

/**
 * Select if data is stale (older than 5 minutes)
 */
export const selectExceptionIsStale = createSelector(
  selectExceptionLastLoaded,
  (lastLoaded) => {
    if (!lastLoaded) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastLoaded > fiveMinutes;
  }
);

// ============================================================================
// Derived Selectors (Filtered and Computed)
// Requirement 11.3: Memoized selectors to prevent unnecessary re-renders
// ============================================================================

/**
 * Select exceptions filtered by current filters
 */
export const selectFilteredExceptions = createSelector(
  selectAllExceptions,
  selectExceptionFilters,
  (exceptions: ExceptionDto[], filters: ExceptionFilters) => {
    let filtered: ExceptionDto[] = exceptions;

    if (filters.status) {
      filtered = filtered.filter((e: ExceptionDto) => e.status === filters.status);
    }

    if (filters.exceptionType) {
      filtered = filtered.filter((e: ExceptionDto) => e.exceptionType === filters.exceptionType);
    }

    if (filters.requestedBy) {
      filtered = filtered.filter((e: ExceptionDto) => e.requestedBy === filters.requestedBy);
    }

    return filtered;
  }
);

/**
 * Select exceptions by status
 */
export const selectExceptionsByStatus = (status: ExceptionStatus) =>
  createSelector(
    selectAllExceptions,
    (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.status === status)
  );

/**
 * Select exceptions by type
 */
export const selectExceptionsByType = (exceptionType: string) =>
  createSelector(
    selectAllExceptions,
    (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.exceptionType === exceptionType)
  );

/**
 * Select pending exceptions only
 */
export const selectPendingExceptions = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.status === 'PENDING')
);

/**
 * Select approved exceptions
 */
export const selectApprovedExceptions = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.status === 'APPROVED')
);

/**
 * Select denied exceptions
 */
export const selectDeniedExceptions = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.status === 'DENIED')
);

/**
 * Select expired exceptions
 */
export const selectExpiredExceptions = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => exceptions.filter((e: ExceptionDto) => e.status === 'EXPIRED')
);

/**
 * Select exception by ID (factory selector)
 */
export const selectExceptionById = (id: string) =>
  createSelector(
    selectExceptionEntities,
    (entities: Record<string, ExceptionDto | undefined>) => entities[id]
  );

/**
 * Select count of exceptions by status
 */
export const selectExceptionCountByStatus = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => {
    const counts: Record<string, number> = {};
    exceptions.forEach((e: ExceptionDto) => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return counts;
  }
);

/**
 * Select count of exceptions by type
 */
export const selectExceptionCountByType = createSelector(
  selectAllExceptions,
  (exceptions: ExceptionDto[]) => {
    const counts: Record<string, number> = {};
    exceptions.forEach((e: ExceptionDto) => {
      const type = e.exceptionType || 'UNKNOWN';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }
);

/**
 * Select exceptions expiring soon (within 7 days)
 */
export const selectExceptionsExpiringSoon = createSelector(
  selectApprovedExceptions,
  (exceptions: ExceptionDto[]) => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    return exceptions.filter((e: ExceptionDto) => {
      if (!e.expiresAt) return false;
      const expiresAt = new Date(e.expiresAt);
      return expiresAt <= sevenDaysFromNow && expiresAt > new Date();
    });
  }
);

/**
 * Select count of pending exceptions
 */
export const selectPendingExceptionsCount = createSelector(
  selectPendingExceptions,
  (exceptions) => exceptions.length
);

/**
 * Select if there are any pending exceptions
 */
export const selectHasPendingExceptions = createSelector(
  selectPendingExceptionsCount,
  (count) => count > 0
);
