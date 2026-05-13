import * as fromSelectors from './role-permissions.selectors';
import { RolePermissionsState } from './role-permissions.reducer';
import { RolePermission } from '../../models/permission.model';

describe('RolePermissions Selectors', () => {
  const mockRolePermission1: RolePermission = {
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

  const mockState: RolePermissionsState = {
    permissions: {
      'Admin': mockRolePermission1,
      'User': mockRolePermission2
    },
    loading: false,
    error: null,
    lastUpdated: new Date('2024-01-01')
  };

  const emptyState: RolePermissionsState = {
    permissions: {},
    loading: false,
    error: null,
    lastUpdated: null
  };

  describe('selectAllPermissions', () => {
    it('should select all permissions', () => {
      const result = fromSelectors.selectAllPermissions.projector(mockState);
      expect(result).toEqual(mockState.permissions);
      expect(Object.keys(result).length).toBe(2);
    });

    it('should return empty object when no permissions', () => {
      const result = fromSelectors.selectAllPermissions.projector(emptyState);
      expect(result).toEqual({});
    });
  });

  describe('selectPermissionsForRole', () => {
    it('should select permissions for Admin role', () => {
      const selector = fromSelectors.selectPermissionsForRole('Admin');
      const result = selector.projector(mockState);
      expect(result).toEqual(mockRolePermission1);
    });

    it('should select permissions for User role', () => {
      const selector = fromSelectors.selectPermissionsForRole('User');
      const result = selector.projector(mockState);
      expect(result).toEqual(mockRolePermission2);
    });

    it('should return undefined for non-existent role', () => {
      const selector = fromSelectors.selectPermissionsForRole('NonExistent');
      const result = selector.projector(mockState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectPermissionsLoading', () => {
    it('should select loading state as false', () => {
      const result = fromSelectors.selectPermissionsLoading.projector(mockState);
      expect(result).toBe(false);
    });

    it('should select loading state as true', () => {
      const loadingState = { ...mockState, loading: true };
      const result = fromSelectors.selectPermissionsLoading.projector(loadingState);
      expect(result).toBe(true);
    });
  });

  describe('selectPermissionsError', () => {
    it('should select error as null', () => {
      const result = fromSelectors.selectPermissionsError.projector(mockState);
      expect(result).toBeNull();
    });

    it('should select error message', () => {
      const errorState = { ...mockState, error: 'Failed to load' };
      const result = fromSelectors.selectPermissionsError.projector(errorState);
      expect(result).toBe('Failed to load');
    });
  });

  describe('selectPermissionsLastUpdated', () => {
    it('should select last updated timestamp', () => {
      const result = fromSelectors.selectPermissionsLastUpdated.projector(mockState);
      expect(result).toEqual(new Date('2024-01-01'));
    });

    it('should return null when never updated', () => {
      const result = fromSelectors.selectPermissionsLastUpdated.projector(emptyState);
      expect(result).toBeNull();
    });
  });

  describe('selectPermissionsLoaded', () => {
    it('should return true when permissions are loaded', () => {
      const result = fromSelectors.selectPermissionsLoaded.projector(mockState);
      expect(result).toBe(true);
    });

    it('should return false when no permissions loaded', () => {
      const result = fromSelectors.selectPermissionsLoaded.projector(emptyState);
      expect(result).toBe(false);
    });
  });

  describe('selectAllRoles', () => {
    it('should select all role names', () => {
      const result = fromSelectors.selectAllRoles.projector(mockState);
      expect(result).toEqual(['Admin', 'User']);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no roles', () => {
      const result = fromSelectors.selectAllRoles.projector(emptyState);
      expect(result).toEqual([]);
    });
  });
});
