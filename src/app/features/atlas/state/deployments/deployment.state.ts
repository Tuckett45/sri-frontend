import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { DeploymentDto } from '../../models/deployment.model';
import { PaginationMetadata } from '../../models/common.model';

export interface DeploymentFilters {
  state?: string;
  type?: string;
  search?: string;
  assignedToMe?: boolean;
}

export interface DeploymentState extends EntityState<DeploymentDto> {
  selectedId: string | null;
  loading: {
    list: boolean;
    detail: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    transitioning: boolean;
  };
  error: {
    list: string | null;
    detail: string | null;
    creating: string | null;
    updating: string | null;
    deleting: string | null;
    transitioning: string | null;
  };
  pagination: PaginationMetadata | null;
  filters: DeploymentFilters;
  selectedDeployment: DeploymentDto | null;
  lastLoaded: number | null;
}

export const deploymentAdapter: EntityAdapter<DeploymentDto> = createEntityAdapter<DeploymentDto>({
  selectId: (d: DeploymentDto) => d.id,
  sortComparer: (a: DeploymentDto, b: DeploymentDto) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
});

const initialLoadingState = {
  list: false,
  detail: false,
  creating: false,
  updating: false,
  deleting: false,
  transitioning: false
};

const initialErrorState = {
  list: null,
  detail: null,
  creating: null,
  updating: null,
  deleting: null,
  transitioning: null
};

export const initialDeploymentState: DeploymentState = deploymentAdapter.getInitialState({
  selectedId: null,
  loading: initialLoadingState,
  error: initialErrorState,
  pagination: null,
  filters: {},
  selectedDeployment: null,
  lastLoaded: null
});
