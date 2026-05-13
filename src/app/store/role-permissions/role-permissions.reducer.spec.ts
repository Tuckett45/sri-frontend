import { rolePermissionsReducer, initialState, RolePermissionsState } from './role-permissions.reducer';
import * as RolePermissionsActions from './role-permissions.actions';
import { RolePermission } from '../../models/permission.model';

describe('RolePermissionsReducer', () => {
  const mockRolePermission: RolePermission = {
    role: 'Admin',
    permissions: [
      {
        resource: 'jobs',
        actions: ['create', 'read', 'update', 'delete']
      }
    ],
    restrictions: []
  };

  const mockRolePermission2: RolePermission = {
    role: 'User',
    permissions: [
      {
        resource: 'jobs',
        actions: ['read']
      }
    ],
    restrictions: []
  };

  describe('unknown action', () => {
    it('should return the default state', () => {
      const action = { type: 'Unknown' };
      const state = rolePermissionsReducer(initialState, action as any);

      expect(state).toBe(initialState);
    });
  });

  describe('loadRolePermissions', () => {
    it('should set loading to true', () => {
      const action = RolePermissionsActions.loadRolePermissions({ role: 'Admin' });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadRolePermissionsSuccess', () => {
    it('should add role permission to state', () => {
      const action = RolePermissionsActions.loadRolePermissionsSuccess({ 
        rolePermission: mockRolePermission 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.permissions['Admin']).toEqual(mockRolePermission);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should update existing role permission', () => {
      const existingState: RolePermissionsState = {
        ...initialState,
        permissions: {
          'Admin': mockRolePermission
        }
      };

      const updatedPermission: RolePermission = {
        ...mockRolePermission,
        permissions: [
          {
            resource: 'jobs',
            actions: ['read']
          }
        ]
      };

      const action = RolePermissionsActions.loadRolePermissionsSuccess({ 
        rolePermission: updatedPermission 
      });
      const state = rolePermissionsReducer(existingState, action);

      expect(state.permissions['Admin']).toEqual(updatedPermission);
      expect(state.permissions['Admin'].permissions[0].actions).toEqual(['read']);
    });
  });

  describe('loadRolePermissionsFailure', () => {
    it('should set error and stop loading', () => {
      const action = RolePermissionsActions.loadRolePermissionsFailure({ 
        error: 'Failed to load' 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to load');
    });
  });

  describe('loadAllPermissions', () => {
    it('should set loading to true', () => {
      const action = RolePermissionsActions.loadAllPermissions();
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadAllPermissionsSuccess', () => {
    it('should add all permissions to state', () => {
      const permissions = [mockRolePermission, mockRolePermission2];
      const action = RolePermissionsActions.loadAllPermissionsSuccess({ permissions });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.permissions['Admin']).toEqual(mockRolePermission);
      expect(state.permissions['User']).toEqual(mockRolePermission2);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should replace existing permissions', () => {
      const existingState: RolePermissionsState = {
        ...initialState,
        permissions: {
          'OldRole': {
            role: 'OldRole',
            permissions: [],
            restrictions: []
          }
        }
      };

      const permissions = [mockRolePermission, mockRolePermission2];
      const action = RolePermissionsActions.loadAllPermissionsSuccess({ permissions });
      const state = rolePermissionsReducer(existingState, action);

      expect(state.permissions['OldRole']).toBeUndefined();
      expect(state.permissions['Admin']).toEqual(mockRolePermission);
      expect(state.permissions['User']).toEqual(mockRolePermission2);
    });
  });

  describe('loadAllPermissionsFailure', () => {
    it('should set error and stop loading', () => {
      const action = RolePermissionsActions.loadAllPermissionsFailure({ 
        error: 'Failed to load all' 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to load all');
    });
  });

  describe('updateRolePermissions', () => {
    it('should set loading to true', () => {
      const action = RolePermissionsActions.updateRolePermissions({ 
        rolePermission: mockRolePermission 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('updateRolePermissionsSuccess', () => {
    it('should update role permission in state', () => {
      const existingState: RolePermissionsState = {
        ...initialState,
        permissions: {
          'Admin': mockRolePermission
        }
      };

      const updatedPermission: RolePermission = {
        ...mockRolePermission,
        permissions: [
          {
            resource: 'jobs',
            actions: ['read', 'update']
          }
        ]
      };

      const action = RolePermissionsActions.updateRolePermissionsSuccess({ 
        rolePermission: updatedPermission 
      });
      const state = rolePermissionsReducer(existingState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.permissions['Admin']).toEqual(updatedPermission);
      expect(state.lastUpdated).toBeTruthy();
    });
  });

  describe('updateRolePermissionsFailure', () => {
    it('should set error and stop loading', () => {
      const action = RolePermissionsActions.updateRolePermissionsFailure({ 
        error: 'Failed to update' 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to update');
    });
  });

  describe('clearPermissionsCache', () => {
    it('should clear all permissions', () => {
      const existingState: RolePermissionsState = {
        ...initialState,
        permissions: {
          'Admin': mockRolePermission,
          'User': mockRolePermission2
        },
        lastUpdated: new Date()
      };

      const action = RolePermissionsActions.clearPermissionsCache();
      const state = rolePermissionsReducer(existingState, action);

      expect(state.permissions).toEqual({});
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe('setRolePermissions', () => {
    it('should set role permission directly', () => {
      const action = RolePermissionsActions.setRolePermissions({ 
        rolePermission: mockRolePermission 
      });
      const state = rolePermissionsReducer(initialState, action);

      expect(state.permissions['Admin']).toEqual(mockRolePermission);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should not affect loading or error state', () => {
      const existingState: RolePermissionsState = {
        ...initialState,
        loading: true,
        error: 'Some error'
      };

      const action = RolePermissionsActions.setRolePermissions({ 
        rolePermission: mockRolePermission 
      });
      const state = rolePermissionsReducer(existingState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBe('Some error');
      expect(state.permissions['Admin']).toEqual(mockRolePermission);
    });
  });
});
