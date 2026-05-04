/**
 * Approval NgRx Selectors
 * 
 * Provides memoized selectors for accessing approval state.
 * Includes base selectors, entity selectors, and derived selectors
 * for filtered and computed data.
 * 
 * Requirements: 3.8, 11.3
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ApprovalState, approvalAdapter, ApprovalFilters } from './approval.state';
import { ApprovalDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';

/**
 * Feature selector for approval state
 */
export const selectApprovalState = createFeatureSelector<ApprovalState>('approvals');

/**
 * Entity adapter selectors
 * Provides efficient access to entity collection
 */
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = approvalAdapter.getSelectors(selectApprovalState);

// ============================================================================
// Base Selectors
// ============================================================================

/**
 * Select all approval IDs
 */
export const selectApprovalIds = selectIds;

/**
 * Select approval entities as a dictionary
 */
export const selectApprovalEntities = selectEntities;

/**
 * Select all approvals as an array
 */
export const selectAllApprovals = selectAll;

/**
 * Select total number of approvals in state
 */
export const selectApprovalTotal = selectTotal;

// ============================================================================
// Selection Selectors
// ============================================================================

/**
 * Select currently selected approval ID
 */
export const selectSelectedApprovalId = createSelector(
  selectApprovalState,
  (state) => state.selectedId
);

/**
 * Select currently selected approval entity
 */
export const selectSelectedApproval = createSelector(
  selectApprovalEntities,
  selectSelectedApprovalId,
  (entities: Record<string, ApprovalDto | undefined>, selectedId: string | null) =>
    selectedId ? entities[selectedId] : null
);

// ============================================================================
// Loading State Selectors
// ============================================================================

/**
 * Select all loading states
 */
export const selectApprovalLoading = createSelector(
  selectApprovalState,
  (state) => state.loading
);

/**
 * Select list loading state
 */
export const selectApprovalsLoading = createSelector(
  selectApprovalLoading,
  (loading) => loading.list
);

/**
 * Select detail loading state
 */
export const selectApprovalDetailLoading = createSelector(
  selectApprovalLoading,
  (loading) => loading.detail
);

/**
 * Select requesting loading state
 */
export const selectApprovalRequesting = createSelector(
  selectApprovalLoading,
  (loading) => loading.requesting
);

/**
 * Select recording decision loading state
 */
export const selectApprovalRecordingDecision = createSelector(
  selectApprovalLoading,
  (loading) => loading.recordingDecision
);

/**
 * Alias for recording decision loading state (used by components)
 */
export const selectRecordingDecision = selectApprovalRecordingDecision;

/**
 * Select checking authority loading state
 */
export const selectApprovalCheckingAuthority = createSelector(
  selectApprovalLoading,
  (loading) => loading.checkingAuthority
);

/**
 * Select loading pending approvals state
 */
export const selectApprovalLoadingPending = createSelector(
  selectApprovalLoading,
  (loading) => loading.loadingPending
);

/**
 * Select loading user approvals state
 */
export const selectApprovalLoadingUserApprovals = createSelector(
  selectApprovalLoading,
  (loading) => loading.loadingUserApprovals
);

/**
 * Select if any operation is in progress
 */
export const selectApprovalAnyLoading = createSelector(
  selectApprovalLoading,
  (loading) => Object.values(loading).some(value => value === true)
);

// ============================================================================
// Error State Selectors
// ============================================================================

/**
 * Select all error states
 */
export const selectApprovalErrors = createSelector(
  selectApprovalState,
  (state) => state.error
);

/**
 * Select list error
 */
export const selectApprovalsError = createSelector(
  selectApprovalErrors,
  (errors) => errors.list
);

/**
 * Select detail error
 */
export const selectApprovalDetailError = createSelector(
  selectApprovalErrors,
  (errors) => errors.detail
);

/**
 * Select requesting error
 */
export const selectApprovalRequestingError = createSelector(
  selectApprovalErrors,
  (errors) => errors.requesting
);

/**
 * Select recording decision error
 */
export const selectApprovalRecordingDecisionError = createSelector(
  selectApprovalErrors,
  (errors) => errors.recordingDecision
);

/**
 * Select checking authority error
 */
export const selectApprovalCheckingAuthorityError = createSelector(
  selectApprovalErrors,
  (errors) => errors.checkingAuthority
);

/**
 * Select loading pending approvals error
 */
export const selectApprovalLoadingPendingError = createSelector(
  selectApprovalErrors,
  (errors) => errors.loadingPending
);

/**
 * Alias for pending approvals loading state (used by components)
 */
export const selectPendingApprovalsLoading = selectApprovalLoadingPending;

/**
 * Alias for pending approvals error (used by components)
 */
export const selectPendingApprovalsError = selectApprovalLoadingPendingError;

/**
 * Select loading user approvals error
 */
export const selectApprovalLoadingUserApprovalsError = createSelector(
  selectApprovalErrors,
  (errors) => errors.loadingUserApprovals
);

/**
 * Select if any error exists
 */
export const selectApprovalAnyError = createSelector(
  selectApprovalErrors,
  (errors) => Object.values(errors).some(value => value !== null)
);

// ============================================================================
// Pagination Selectors
// ============================================================================

/**
 * Select pagination metadata
 */
export const selectApprovalPagination = createSelector(
  selectApprovalState,
  (state) => state.pagination
);

/**
 * Select current page number
 */
export const selectApprovalCurrentPage = createSelector(
  selectApprovalPagination,
  (pagination) => pagination?.currentPage || 1
);

/**
 * Select page size
 */
export const selectApprovalPageSize = createSelector(
  selectApprovalPagination,
  (pagination) => pagination?.pageSize || 50
);

/**
 * Select total count
 */
export const selectApprovalTotalCount = createSelector(
  selectApprovalPagination,
  (pagination) => pagination?.totalCount || 0
);

/**
 * Select total pages
 */
export const selectApprovalTotalPages = createSelector(
  selectApprovalPagination,
  (pagination) => pagination?.totalPages || 0
);

// ============================================================================
// Filter Selectors
// ============================================================================

/**
 * Select current filters
 */
export const selectApprovalFilters = createSelector(
  selectApprovalState,
  (state) => state.filters
);

/**
 * Select status filter
 */
export const selectApprovalStatusFilter = createSelector(
  selectApprovalFilters,
  (filters) => filters.status
);

/**
 * Select for state filter
 */
export const selectApprovalForStateFilter = createSelector(
  selectApprovalFilters,
  (filters) => filters.forState
);

/**
 * Select deployment ID filter
 */
export const selectApprovalDeploymentIdFilter = createSelector(
  selectApprovalFilters,
  (filters) => filters.deploymentId
);

/**
 * Select if any filters are active
 */
export const selectApprovalHasActiveFilters = createSelector(
  selectApprovalFilters,
  (filters) => Object.keys(filters).length > 0
);

// ============================================================================
// Pending Approvals Selectors
// ============================================================================

/**
 * Select pending approvals
 */
export const selectPendingApprovals = createSelector(
  selectApprovalState,
  (state) => state.pendingApprovals
);

/**
 * Select count of pending approvals
 */
export const selectPendingApprovalsCount = createSelector(
  selectPendingApprovals,
  (approvals) => approvals.length
);

/**
 * Select if there are any pending approvals
 */
export const selectHasPendingApprovals = createSelector(
  selectPendingApprovalsCount,
  (count) => count > 0
);

// ============================================================================
// User Approvals Selectors
// ============================================================================

/**
 * Select user approvals
 */
export const selectUserApprovals = createSelector(
  selectApprovalState,
  (state) => state.userApprovals.items
);

/**
 * Select user approvals pagination
 */
export const selectUserApprovalsPagination = createSelector(
  selectApprovalState,
  (state) => state.userApprovals.pagination
);

// ============================================================================
// Authority Selectors
// ============================================================================

/**
 * Select approval authority
 */
export const selectApprovalAuthority = createSelector(
  selectApprovalState,
  (state) => state.authority
);

/**
 * Select if user is authorized
 */
export const selectIsAuthorized = createSelector(
  selectApprovalAuthority,
  (authority) => authority?.isAuthorized || false
);

/**
 * Select authority level
 */
export const selectAuthorityLevel = createSelector(
  selectApprovalAuthority,
  (authority) => authority?.authorityLevel
);

/**
 * Select user roles
 */
export const selectUserRoles = createSelector(
  selectApprovalAuthority,
  (authority) => authority?.roles || []
);

/**
 * Select user permissions
 */
export const selectUserPermissions = createSelector(
  selectApprovalAuthority,
  (authority) => authority?.permissions || []
);

// ============================================================================
// Cache Selectors
// ============================================================================

/**
 * Select last loaded timestamp
 */
export const selectApprovalLastLoaded = createSelector(
  selectApprovalState,
  (state) => state.lastLoaded
);

/**
 * Select if data is stale (older than 5 minutes)
 */
export const selectApprovalIsStale = createSelector(
  selectApprovalLastLoaded,
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
 * Select approvals filtered by current filters
 */
export const selectFilteredApprovals = createSelector(
  selectAllApprovals,
  selectApprovalFilters,
  (approvals: ApprovalDto[], filters: ApprovalFilters) => {
    let filtered: ApprovalDto[] = approvals;

    if (filters.status) {
      filtered = filtered.filter((a: ApprovalDto) => a.status === filters.status);
    }

    if (filters.forState) {
      filtered = filtered.filter((a: ApprovalDto) => a.forState === filters.forState);
    }

    if (filters.deploymentId) {
      // Note: ApprovalDto doesn't have deploymentId, this would need to be tracked separately
      // or filtered at the API level
    }

    if (filters.approverId) {
      filtered = filtered.filter((a: ApprovalDto) => a.approverId === filters.approverId);
    }

    return filtered;
  }
);

/**
 * Select approvals by status
 */
export const selectApprovalsByStatus = (status: ApprovalStatus) =>
  createSelector(
    selectAllApprovals,
    (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.status === status)
  );

/**
 * Select approvals by state
 */
export const selectApprovalsByState = (forState: LifecycleState) =>
  createSelector(
    selectAllApprovals,
    (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.forState === forState)
  );

/**
 * Select pending approvals only
 */
export const selectPendingApprovalsOnly = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.status === 'PENDING')
);

/**
 * Select approved approvals
 */
export const selectApprovedApprovals = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.status === 'APPROVED')
);

/**
 * Select denied approvals
 */
export const selectDeniedApprovals = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.status === 'DENIED')
);

/**
 * Select expired approvals
 */
export const selectExpiredApprovals = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => approvals.filter((a: ApprovalDto) => a.status === 'EXPIRED')
);

/**
 * Select approval by ID (factory selector)
 */
export const selectApprovalById = (id: string) =>
  createSelector(
    selectApprovalEntities,
    (entities: Record<string, ApprovalDto | undefined>) => entities[id]
  );

/**
 * Select count of approvals by status
 */
export const selectApprovalCountByStatus = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => {
    const counts: Record<string, number> = {};
    approvals.forEach((a: ApprovalDto) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }
);

/**
 * Select count of approvals by state
 */
export const selectApprovalCountByState = createSelector(
  selectAllApprovals,
  (approvals: ApprovalDto[]) => {
    const counts: Record<string, number> = {};
    approvals.forEach((a: ApprovalDto) => {
      counts[a.forState] = (counts[a.forState] || 0) + 1;
    });
    return counts;
  }
);
