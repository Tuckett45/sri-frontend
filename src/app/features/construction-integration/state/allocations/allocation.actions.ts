import { createAction, props } from '@ngrx/store';
import { ResourceAllocation } from '../../models/construction.models';

// Load Allocations by Year
export const loadAllocations = createAction(
  '[Construction/Allocations] Load Allocations',
  props<{ year: number }>()
);
export const loadAllocationsSuccess = createAction(
  '[Construction/Allocations] Load Allocations Success',
  props<{ allocations: ResourceAllocation[] }>()
);
export const loadAllocationsFailure = createAction(
  '[Construction/Allocations] Load Allocations Failure',
  props<{ error: string }>()
);

// Update Allocation (optimistic)
export const updateAllocation = createAction(
  '[Construction/Allocations] Update Allocation',
  props<{ allocation: ResourceAllocation; previousAllocation: ResourceAllocation }>()
);
export const updateAllocationSuccess = createAction(
  '[Construction/Allocations] Update Allocation Success',
  props<{ allocation: ResourceAllocation }>()
);
export const updateAllocationFailure = createAction(
  '[Construction/Allocations] Update Allocation Failure',
  props<{ error: string; previousAllocation: ResourceAllocation }>()
);

// Year Selection
export const selectYear = createAction(
  '[Construction/Allocations] Select Year',
  props<{ year: number }>()
);
