import { createAction, props } from '@ngrx/store';
import { RolePermission } from '../../models/permission.model';

/**
 * Actions for role permissions state management
 */

// Load permissions for a specific role
export const loadRolePermissions = createAction(
  '[Role Permissions] Load Role Permissions',
  props<{ role: string }>()
);

export const loadRolePermissionsSuccess = createAction(
  '[Role Permissions] Load Role Permissions Success',
  props<{ rolePermission: RolePermission }>()
);

export const loadRolePermissionsFailure = createAction(
  '[Role Permissions] Load Role Permissions Failure',
  props<{ error: string }>()
);

// Load all permissions
export const loadAllPermissions = createAction(
  '[Role Permissions] Load All Permissions'
);

export const loadAllPermissionsSuccess = createAction(
  '[Role Permissions] Load All Permissions Success',
  props<{ permissions: RolePermission[] }>()
);

export const loadAllPermissionsFailure = createAction(
  '[Role Permissions] Load All Permissions Failure',
  props<{ error: string }>()
);

// Update permissions for a role
export const updateRolePermissions = createAction(
  '[Role Permissions] Update Role Permissions',
  props<{ rolePermission: RolePermission }>()
);

export const updateRolePermissionsSuccess = createAction(
  '[Role Permissions] Update Role Permissions Success',
  props<{ rolePermission: RolePermission }>()
);

export const updateRolePermissionsFailure = createAction(
  '[Role Permissions] Update Role Permissions Failure',
  props<{ error: string }>()
);

// Clear permissions cache
export const clearPermissionsCache = createAction(
  '[Role Permissions] Clear Permissions Cache'
);

// Set permissions (for local/testing use)
export const setRolePermissions = createAction(
  '[Role Permissions] Set Role Permissions',
  props<{ rolePermission: RolePermission }>()
);
