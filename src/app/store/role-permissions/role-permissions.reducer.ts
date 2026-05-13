import { createReducer, on } from '@ngrx/store';
import { RolePermission } from '../../models/permission.model';
import * as RolePermissionsActions from './role-permissions.actions';

/**
 * State interface for role permissions
 */
export interface RolePermissionsState {
  permissions: { [role: string]: RolePermission };
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Initial state
 */
export const initialState: RolePermissionsState = {
  permissions: {},
  loading: false,
  error: null,
  lastUpdated: null
};

/**
 * Reducer for role permissions state
 */
export const rolePermissionsReducer = createReducer(
  initialState,

  // Load role permissions
  on(RolePermissionsActions.loadRolePermissions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(RolePermissionsActions.loadRolePermissionsSuccess, (state, { rolePermission }) => ({
    ...state,
    permissions: {
      ...state.permissions,
      [rolePermission.role]: rolePermission
    },
    loading: false,
    error: null,
    lastUpdated: new Date()
  })),

  on(RolePermissionsActions.loadRolePermissionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load all permissions
  on(RolePermissionsActions.loadAllPermissions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(RolePermissionsActions.loadAllPermissionsSuccess, (state, { permissions }) => {
    const permissionsMap: { [role: string]: RolePermission } = {};
    permissions.forEach(permission => {
      permissionsMap[permission.role] = permission;
    });

    return {
      ...state,
      permissions: permissionsMap,
      loading: false,
      error: null,
      lastUpdated: new Date()
    };
  }),

  on(RolePermissionsActions.loadAllPermissionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update role permissions
  on(RolePermissionsActions.updateRolePermissions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(RolePermissionsActions.updateRolePermissionsSuccess, (state, { rolePermission }) => ({
    ...state,
    permissions: {
      ...state.permissions,
      [rolePermission.role]: rolePermission
    },
    loading: false,
    error: null,
    lastUpdated: new Date()
  })),

  on(RolePermissionsActions.updateRolePermissionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear permissions cache
  on(RolePermissionsActions.clearPermissionsCache, (state) => ({
    ...state,
    permissions: {},
    lastUpdated: null
  })),

  // Set role permissions (local/testing)
  on(RolePermissionsActions.setRolePermissions, (state, { rolePermission }) => ({
    ...state,
    permissions: {
      ...state.permissions,
      [rolePermission.role]: rolePermission
    },
    lastUpdated: new Date()
  }))
);
