import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RolePermissionsState } from './role-permissions.reducer';
import { RolePermission } from '../../models/permission.model';

/**
 * Selectors for role permissions state
 */

// Feature selector
export const selectRolePermissionsState = createFeatureSelector<RolePermissionsState>('rolePermissions');

// Select all permissions
export const selectAllPermissions = createSelector(
  selectRolePermissionsState,
  (state) => state.permissions
);

// Select permissions for a specific role
export const selectPermissionsForRole = (role: string) => createSelector(
  selectRolePermissionsState,
  (state): RolePermission | undefined => state.permissions[role]
);

// Select loading state
export const selectPermissionsLoading = createSelector(
  selectRolePermissionsState,
  (state) => state.loading
);

// Select error state
export const selectPermissionsError = createSelector(
  selectRolePermissionsState,
  (state) => state.error
);

// Select last updated timestamp
export const selectPermissionsLastUpdated = createSelector(
  selectRolePermissionsState,
  (state) => state.lastUpdated
);

// Select if permissions are loaded
export const selectPermissionsLoaded = createSelector(
  selectRolePermissionsState,
  (state) => Object.keys(state.permissions).length > 0
);

// Select all role names
export const selectAllRoles = createSelector(
  selectRolePermissionsState,
  (state) => Object.keys(state.permissions)
);
