import { createReducer, on } from '@ngrx/store';
import { DeploymentState, deploymentAdapter, initialDeploymentState } from './deployment.state';
import * as DeploymentActions from './deployment.actions';

export const deploymentReducer = createReducer(
  initialDeploymentState,

  // Load list
  on(DeploymentActions.loadDeployments, DeploymentActions.refreshDeployments, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, list: true },
    error: { ...state.error, list: null }
  })),
  on(DeploymentActions.loadDeploymentsSuccess, (state, { result }): DeploymentState =>
    deploymentAdapter.setAll(result.items, {
      ...state,
      loading: { ...state.loading, list: false },
      pagination: result.pagination,
      lastLoaded: Date.now()
    })
  ),
  on(DeploymentActions.loadDeploymentsFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: error }
  })),

  // Load detail
  on(DeploymentActions.loadDeploymentDetail, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, detail: true },
    error: { ...state.error, detail: null }
  })),
  on(DeploymentActions.loadDeploymentDetailSuccess, (state, { deployment }): DeploymentState => ({
    ...state,
    selectedDeployment: deployment,
    loading: { ...state.loading, detail: false }
  })),
  on(DeploymentActions.loadDeploymentDetailFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, detail: false },
    error: { ...state.error, detail: error }
  })),

  // Create
  on(DeploymentActions.createDeployment, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, creating: true },
    error: { ...state.error, creating: null }
  })),
  on(DeploymentActions.createDeploymentSuccess, (state, { deployment }): DeploymentState =>
    deploymentAdapter.addOne(deployment, {
      ...state,
      loading: { ...state.loading, creating: false }
    })
  ),
  on(DeploymentActions.createDeploymentFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, creating: false },
    error: { ...state.error, creating: error }
  })),

  // Update
  on(DeploymentActions.updateDeployment, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, updating: true },
    error: { ...state.error, updating: null }
  })),
  on(DeploymentActions.updateDeploymentSuccess, (state, { deployment }): DeploymentState =>
    deploymentAdapter.upsertOne(deployment, {
      ...state,
      loading: { ...state.loading, updating: false }
    })
  ),
  on(DeploymentActions.updateDeploymentFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, updating: false },
    error: { ...state.error, updating: error }
  })),

  // Delete
  on(DeploymentActions.deleteDeployment, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, deleting: true },
    error: { ...state.error, deleting: null }
  })),
  on(DeploymentActions.deleteDeploymentSuccess, (state, { id }): DeploymentState =>
    deploymentAdapter.removeOne(id, {
      ...state,
      loading: { ...state.loading, deleting: false }
    })
  ),
  on(DeploymentActions.deleteDeploymentFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, deleting: false },
    error: { ...state.error, deleting: error }
  })),

  // Transition
  on(DeploymentActions.transitionState, (state): DeploymentState => ({
    ...state,
    loading: { ...state.loading, transitioning: true },
    error: { ...state.error, transitioning: null }
  })),
  on(DeploymentActions.transitionStateSuccess, (state, { deployment }): DeploymentState =>
    deploymentAdapter.upsertOne(deployment, {
      ...state,
      loading: { ...state.loading, transitioning: false }
    })
  ),
  on(DeploymentActions.transitionStateFailure, (state, { error }): DeploymentState => ({
    ...state,
    loading: { ...state.loading, transitioning: false },
    error: { ...state.error, transitioning: error }
  })),

  // Selection
  on(DeploymentActions.selectDeployment, (state, { id }): DeploymentState => ({
    ...state,
    selectedId: id
  })),
  on(DeploymentActions.clearDeploymentSelection, (state): DeploymentState => ({
    ...state,
    selectedId: null,
    selectedDeployment: null
  })),

  // Filters
  on(DeploymentActions.setDeploymentFilters, (state, { filters }): DeploymentState => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),
  on(DeploymentActions.clearDeploymentFilters, (state): DeploymentState => ({
    ...state,
    filters: {}
  })),

  // Cache
  on(DeploymentActions.clearDeploymentState, (): DeploymentState => initialDeploymentState)
);
