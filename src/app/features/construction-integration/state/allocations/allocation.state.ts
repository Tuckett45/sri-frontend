import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { ResourceAllocation } from '../../models/construction.models';

export interface AllocationState extends EntityState<ResourceAllocation> {
  selectedYear: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export const allocationAdapter: EntityAdapter<ResourceAllocation> = createEntityAdapter<ResourceAllocation>({
  selectId: (allocation: ResourceAllocation) => allocation.id
});

export const initialAllocationState: AllocationState = allocationAdapter.getInitialState({
  selectedYear: new Date().getFullYear(),
  loading: false,
  saving: false,
  error: null
});
