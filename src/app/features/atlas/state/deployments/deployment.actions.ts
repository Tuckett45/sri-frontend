/**
 * Deployment NgRx Actions
 *
 * Defines all actions for deployment state management including:
 * - Load operations (list, detail)
 * - CRUD operations
 * - State transitions
 * - Evidence management
 * - Filter management
 *
 * Each operation has corresponding success and failure actions.
 */

import { createAction, props } from '@ngrx/store';
import {
  DeploymentDto,
  DeploymentDetailDto,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  StateTransitionRequest,
  EvidenceSubmissionRequest
} from '../../models/deployment.model';
import { DeploymentFilters } from './deployment.state';

// ============================================================================
// Load Deployments (List)
// ============================================================================

/**
 * Load deployments with optional filters
 */
export const loadDeployments = createAction(
  '[Deployment] Load Deployments',
  props<{ filters?: any }>()
);

/**
 * Deployments loaded successfully
 */
export const loadDeploymentsSuccess = createAction(
  '[Deployment] Load Deployments Success',
  props<{ result: { items: DeploymentDto[]; pagination: any } }>()
);

/**
 * Failed to load deployments
 */
export const loadDeploymentsFailure = createAction(
  '[Deployment] Load Deployments Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Deployment Detail
// ============================================================================

/**
 * Load detailed deployment information
 */
export const loadDeploymentDetail = createAction(
  '[Deployment] Load Deployment Detail',
  props<{ id: string }>()
);

/**
 * Deployment detail loaded successfully
 */
export const loadDeploymentDetailSuccess = createAction(
  '[Deployment] Load Deployment Detail Success',
  props<{ deployment: DeploymentDetailDto }>()
);

/**
 * Failed to load deployment detail
 */
export const loadDeploymentDetailFailure = createAction(
  '[Deployment] Load Deployment Detail Failure',
  props<{ error: string }>()
);

// ============================================================================
// Create Deployment
// ============================================================================

/**
 * Create a new deployment
 */
export const createDeployment = createAction(
  '[Deployment] Create Deployment',
  props<{ request: CreateDeploymentRequest }>()
);

/**
 * Deployment created successfully
 */
export const createDeploymentSuccess = createAction(
  '[Deployment] Create Deployment Success',
  props<{ deployment: DeploymentDto }>()
);

/**
 * Failed to create deployment
 */
export const createDeploymentFailure = createAction(
  '[Deployment] Create Deployment Failure',
  props<{ error: string }>()
);

// ============================================================================
// Update Deployment
// ============================================================================

/**
 * Update an existing deployment
 */
export const updateDeployment = createAction(
  '[Deployment] Update Deployment',
  props<{ id: string; request: UpdateDeploymentRequest; etag?: string }>()
);

/**
 * Deployment updated successfully
 */
export const updateDeploymentSuccess = createAction(
  '[Deployment] Update Deployment Success',
  props<{ deployment: DeploymentDto }>()
);

/**
 * Failed to update deployment
 */
export const updateDeploymentFailure = createAction(
  '[Deployment] Update Deployment Failure',
  props<{ error: string }>()
);

// ============================================================================
// Delete Deployment
// ============================================================================

/**
 * Delete a deployment
 */
export const deleteDeployment = createAction(
  '[Deployment] Delete Deployment',
  props<{ id: string; reason?: string }>()
);

/**
 * Deployment deleted successfully
 */
export const deleteDeploymentSuccess = createAction(
  '[Deployment] Delete Deployment Success',
  props<{ id: string }>()
);

/**
 * Failed to delete deployment
 */
export const deleteDeploymentFailure = createAction(
  '[Deployment] Delete Deployment Failure',
  props<{ error: string }>()
);

// ============================================================================
// State Transition
// ============================================================================

/**
 * Request a state transition
 */
export const transitionState = createAction(
  '[Deployment] Transition State',
  props<{ id: string; request: StateTransitionRequest }>()
);

/**
 * Alias for transitionState (used by sync service)
 */
export const transitionDeploymentState = transitionState;

/**
 * State transition completed successfully
 */
export const transitionStateSuccess = createAction(
  '[Deployment] Transition State Success',
  props<{ deployment: DeploymentDto }>()
);

/**
 * Failed to transition state
 */
export const transitionStateFailure = createAction(
  '[Deployment] Transition State Failure',
  props<{ error: string }>()
);

// ============================================================================
// Evidence Management
// ============================================================================

/**
 * Submit evidence for a deployment
 */
export const submitEvidence = createAction(
  '[Deployment] Submit Evidence',
  props<{ deploymentId: string; request: EvidenceSubmissionRequest }>()
);

/**
 * Evidence submitted successfully
 */
export const submitEvidenceSuccess = createAction(
  '[Deployment] Submit Evidence Success',
  props<{ evidence: any }>()
);

/**
 * Failed to submit evidence
 */
export const submitEvidenceFailure = createAction(
  '[Deployment] Submit Evidence Failure',
  props<{ error: string }>()
);

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Select a deployment by ID
 */
export const selectDeployment = createAction(
  '[Deployment] Select Deployment',
  props<{ id: string }>()
);

/**
 * Clear deployment selection
 */
export const clearDeploymentSelection = createAction(
  '[Deployment] Clear Selection'
);

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all deployment state
 */
export const clearDeploymentState = createAction(
  '[Deployment] Clear State'
);

/**
 * Refresh deployments (force reload)
 */
export const refreshDeployments = createAction(
  '[Deployment] Refresh Deployments'
);

// ============================================================================
// Filter Management
// ============================================================================

export const setDeploymentFilters = createAction(
  '[Deployment] Set Filters',
  props<{ filters: DeploymentFilters }>()
);

export const clearDeploymentFilters = createAction(
  '[Deployment] Clear Filters'
);
