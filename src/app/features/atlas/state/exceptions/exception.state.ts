/**
 * Exception NgRx State Management
 * 
 * This module defines the state structure for exception management in the ATLAS feature.
 * It uses NgRx for predictable state management with entities, loading states, errors,
 * pagination, and filters.
 * 
 * Requirements: 3.1, 3.9
 */

import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { ExceptionDto, ExceptionStatus } from '../../models/exception.model';
import { PaginationMetadata } from '../../models/common.model';

/**
 * Filter criteria for exception queries
 */
export interface ExceptionFilters {
  /** Filter by exception status */
  status?: ExceptionStatus;
  
  /** Filter by exception type */
  exceptionType?: string;
  
  /** Filter by deployment ID */
  deploymentId?: string;
  
  /** Filter by requester ID */
  requestedBy?: string;
}

/**
 * Loading state for different operations
 */
export interface LoadingState {
  /** Loading exception list */
  list: boolean;
  
  /** Loading exception detail */
  detail: boolean;
  
  /** Creating exception */
  creating: boolean;
  
  /** Validating exception */
  validating: boolean;
  
  /** Approving exception */
  approving: boolean;
  
  /** Denying exception */
  denying: boolean;
  
  /** Loading active exceptions */
  loadingActive: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  /** Error loading list */
  list: string | null;
  
  /** Error loading detail */
  detail: string | null;
  
  /** Error creating exception */
  creating: string | null;
  
  /** Error validating exception */
  validating: string | null;
  
  /** Error approving exception */
  approving: string | null;
  
  /** Error denying exception */
  denying: string | null;
  
  /** Error loading active exceptions */
  loadingActive: string | null;
}

/**
 * Exception state interface
 * 
 * Manages exception entities using NgRx Entity for normalized storage,
 * along with loading states, errors, pagination, and filters.
 */
export interface ExceptionState extends EntityState<ExceptionDto> {
  /** Currently selected exception ID */
  selectedId: string | null;
  
  /** Loading states for various operations */
  loading: LoadingState;
  
  /** Error states for various operations */
  error: ErrorState;
  
  /** Pagination metadata from API */
  pagination: PaginationMetadata | null;
  
  /** Current filter criteria */
  filters: ExceptionFilters;
  
  /** Active exceptions for current deployment */
  activeExceptions: ExceptionDto[];
  
  /** Validation result for exception request */
  validationResult: any | null;
  
  /** Timestamp of last successful load */
  lastLoaded: number | null;
}

/**
 * Entity adapter for exception management
 * Provides methods for CRUD operations on the entity collection
 */
export const exceptionAdapter: EntityAdapter<ExceptionDto> = createEntityAdapter<ExceptionDto>({
  selectId: (exception: ExceptionDto) => exception.id,
  sortComparer: (a: ExceptionDto, b: ExceptionDto) => {
    // Sort by requestedAt descending (most recent first), with pending exceptions first
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    
    const aDate = new Date(a.requestedAt).getTime();
    const bDate = new Date(b.requestedAt).getTime();
    return bDate - aDate;
  }
});

/**
 * Initial loading state
 */
const initialLoadingState: LoadingState = {
  list: false,
  detail: false,
  creating: false,
  validating: false,
  approving: false,
  denying: false,
  loadingActive: false
};

/**
 * Initial error state
 */
const initialErrorState: ErrorState = {
  list: null,
  detail: null,
  creating: null,
  validating: null,
  approving: null,
  denying: null,
  loadingActive: null
};

/**
 * Initial exception state
 * 
 * Provides the default state structure with empty entities,
 * no selection, no loading, no errors, and default filters.
 */
export const initialExceptionState: ExceptionState = exceptionAdapter.getInitialState({
  selectedId: null,
  loading: initialLoadingState,
  error: initialErrorState,
  pagination: null,
  filters: {},
  activeExceptions: [],
  validationResult: null,
  lastLoaded: null
});
