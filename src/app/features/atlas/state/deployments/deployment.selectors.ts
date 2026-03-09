import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DeploymentState, deploymentAdapter } from './deployment.state';

export const selectDeploymentState = createFeatureSelector<DeploymentState>('deployments');

const { selectAll, selectEntities, selectIds, selectTotal } =
  deploymentAdapter.getSelectors(selectDeploymentState);

export const selectAllDeployments = selectAll;
export const selectDeploymentEntities = selectEntities;
export const selectDeploymentIds = selectIds;
export const selectDeploymentTotal = selectTotal;

export const selectSelectedDeploymentId = createSelector(
  selectDeploymentState,
  (state) => state.selectedId
);

export const selectSelectedDeployment = createSelector(
  selectDeploymentState,
  (state) => state.selectedDeployment
);

export const selectDeploymentById = (id: string) =>
  createSelector(selectDeploymentEntities, (entities) => entities[id]);

// Loading
const selectLoading = createSelector(selectDeploymentState, (state) => state.loading);

export const selectDeploymentsLoading = createSelector(selectLoading, (l) => l.list);
export const selectDeploymentDetailLoading = createSelector(selectLoading, (l) => l.detail);
export const selectDeploymentCreating = createSelector(selectLoading, (l) => l.creating);
export const selectDeploymentUpdating = createSelector(selectLoading, (l) => l.updating);
export const selectDeploymentDeleting = createSelector(selectLoading, (l) => l.deleting);
export const selectDeploymentTransitioning = createSelector(selectLoading, (l) => l.transitioning);
export const selectDeploymentAnyLoading = createSelector(
  selectLoading,
  (l) => Object.values(l).some(Boolean)
);

// Errors
const selectErrors = createSelector(selectDeploymentState, (state) => state.error);

export const selectDeploymentsError = createSelector(selectErrors, (e) => e.list);
export const selectDeploymentDetailError = createSelector(selectErrors, (e) => e.detail);
export const selectDeploymentCreatingError = createSelector(selectErrors, (e) => e.creating);
export const selectDeploymentUpdatingError = createSelector(selectErrors, (e) => e.updating);
export const selectDeploymentTransitioningError = createSelector(selectErrors, (e) => e.transitioning);

// Pagination & filters
export const selectDeploymentPagination = createSelector(
  selectDeploymentState,
  (state) => state.pagination
);

export const selectDeploymentFilters = createSelector(
  selectDeploymentState,
  (state) => state.filters
);

export const selectDeploymentLastLoaded = createSelector(
  selectDeploymentState,
  (state) => state.lastLoaded
);

export const selectDeploymentIsStale = createSelector(
  selectDeploymentLastLoaded,
  (lastLoaded) => !lastLoaded || Date.now() - lastLoaded > 5 * 60 * 1000
);
