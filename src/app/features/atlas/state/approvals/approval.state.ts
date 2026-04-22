/**
 * Approval NgRx State Management
 * 
 * This module defines the state structure for approval management in the ATLAS feature.
 * It uses NgRx for predictable state management with entities, loading states, errors,
 * pagination, and filters.
 * 
 * Requirements: 3.1, 3.9
 */

import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { ApprovalDto, ApprovalStatus, LifecycleState } from '../../models/approval.model';
import { PaginationMetadata } from '../../models/common.model';

/**
 * Filter criteria for approval queries
 */
export interface ApprovalFilters {
  /** Filter by approval status */
  status?: ApprovalStatus;
  
  /** Filter by lifecycle state */
  forState?: LifecycleState;
  
  /** Filter by deployment ID */
  deploymentId?: string;
  
  /** Filter by approver ID */
  approverId?: string;
}

/**
 * Loading state for different operations
 */
export interface LoadingState {
  /** Loading approval list */
  list: boolean;
  
  /** Loading approval detail */
  detail: boolean;
  
  /** Requesting approval */
  requesting: boolean;
  
  /** Recording decision */
  recordingDecision: boolean;
  
  /** Checking authority */
  checkingAuthority: boolean;
  
  /** Loading pending approvals */
  loadingPending: boolean;
  
  /** Loading user approvals */
  loadingUserApprovals: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  /** Error loading list */
  list: string | null;
  
  /** Error loading detail */
  detail: string | null;
  
  /** Error requesting approval */
  requesting: string | null;
  
  /** Error recording decision */
  recordingDecision: string | null;
  
  /** Error checking authority */
  checkingAuthority: string | null;
  
  /** Error loading pending approvals */
  loadingPending: string | null;
  
  /** Error loading user approvals */
  loadingUserApprovals: string | null;
}

/**
 * Approval state interface
 * 
 * Manages approval entities using NgRx Entity for normalized storage,
 * along with loading states, errors, pagination, and filters.
 */
export interface ApprovalState extends EntityState<ApprovalDto> {
  /** Currently selected approval ID */
  selectedId: string | null;
  
  /** Loading states for various operations */
  loading: LoadingState;
  
  /** Error states for various operations */
  error: ErrorState;
  
  /** Pagination metadata from API */
  pagination: PaginationMetadata | null;
  
  /** Current filter criteria */
  filters: ApprovalFilters;
  
  /** Pending approvals for current user */
  pendingApprovals: ApprovalDto[];
  
  /** User approvals with pagination */
  userApprovals: {
    items: ApprovalDto[];
    pagination: PaginationMetadata | null;
  };
  
  /** Approval authority check result */
  authority: {
    isAuthorized: boolean;
    authorityLevel?: string;
    roles?: string[];
    permissions?: string[];
    reason?: string;
  } | null;
  
  /** Timestamp of last successful load */
  lastLoaded: number | null;
}

/**
 * Entity adapter for approval management
 * Provides methods for CRUD operations on the entity collection
 */
export const approvalAdapter: EntityAdapter<ApprovalDto> = createEntityAdapter<ApprovalDto>({
  selectId: (approval: ApprovalDto) => approval.id,
  sortComparer: (a: ApprovalDto, b: ApprovalDto) => {
    // Sort by approvedAt descending (most recent first), with pending approvals first
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    
    const aDate = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
    const bDate = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
    return bDate - aDate;
  }
});

/**
 * Initial loading state
 */
const initialLoadingState: LoadingState = {
  list: false,
  detail: false,
  requesting: false,
  recordingDecision: false,
  checkingAuthority: false,
  loadingPending: false,
  loadingUserApprovals: false
};

/**
 * Initial error state
 */
const initialErrorState: ErrorState = {
  list: null,
  detail: null,
  requesting: null,
  recordingDecision: null,
  checkingAuthority: null,
  loadingPending: null,
  loadingUserApprovals: null
};

/**
 * Initial approval state
 * 
 * Provides the default state structure with empty entities,
 * no selection, no loading, no errors, and default filters.
 */
export const initialApprovalState: ApprovalState = approvalAdapter.getInitialState({
  selectedId: null,
  loading: initialLoadingState,
  error: initialErrorState,
  pagination: null,
  filters: {},
  pendingApprovals: [],
  userApprovals: {
    items: [],
    pagination: null
  },
  authority: null,
  lastLoaded: null
});
