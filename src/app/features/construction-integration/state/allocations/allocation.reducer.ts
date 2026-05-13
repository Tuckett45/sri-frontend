import { createReducer, on } from '@ngrx/store';
import { AllocationState, allocationAdapter, initialAllocationState } from './allocation.state';
import * as AllocationActions from './allocation.actions';

export const allocationReducer = createReducer(
  initialAllocationState,

  // Load Allocations
  on(AllocationActions.loadAllocations, (state, { year }): AllocationState => ({
    ...state,
    selectedYear: year,
    loading: true,
    error: null
  })),
  on(AllocationActions.loadAllocationsSuccess, (state, { allocations }): AllocationState =>
    allocationAdapter.setAll(allocations, { ...state, loading: false, error: null })
  ),
  on(AllocationActions.loadAllocationsFailure, (state, { error }): AllocationState => ({
    ...state,
    loading: false,
    error
  })),

  // Optimistic Update — apply immediately
  on(AllocationActions.updateAllocation, (state, { allocation }): AllocationState =>
    allocationAdapter.upsertOne(allocation, { ...state, saving: true, error: null })
  ),
  on(AllocationActions.updateAllocationSuccess, (state, { allocation }): AllocationState =>
    allocationAdapter.upsertOne(allocation, { ...state, saving: false, error: null })
  ),
  // Revert on failure
  on(AllocationActions.updateAllocationFailure, (state, { error, previousAllocation }): AllocationState =>
    allocationAdapter.upsertOne(previousAllocation, { ...state, saving: false, error })
  ),

  // Year Selection
  on(AllocationActions.selectYear, (state, { year }): AllocationState => ({
    ...state,
    selectedYear: year
  }))
);
