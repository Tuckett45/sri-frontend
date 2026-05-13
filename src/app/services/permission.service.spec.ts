import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';
import { User } from '../models/user.model';
import { RolePermission, PermissionCondition } from '../models/permission.model';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PermissionService]
    });
    service = TestBed.inject(PermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkPermission', () => {
    let adminUser: User;
    let cmUser: User;
    let regularUser: User;

    beforeEach(() => {
      adminUser = new User(
        '1',
        'Admin User',
        'admin@test.com',
        'password',
        'Admin',
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      cmUser = new User(
        '2',
        'CM User',
        'cm@test.com',
        'password',
        'CM',
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      regularUser = new User(
        '3',
        'Regular User',
        'user@test.com',
        'password',
        'User',
        'NYC',
        'Test Company',
        new Date(),
        true
      );
    });

    it('should return false when user is null', () => {
      const result = service.checkPermission(null as any, 'jobs', 'read');
      expect(result).toBe(false);
    });

    it('should return false when user role is null', () => {
      const userWithoutRole = new User(
        '4',
        'No Role User',
        'norole@test.com',
        'password',
        null as any,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      const result = service.checkPermission(userWithoutRole, 'jobs', 'read');
      expect(result).toBe(false);
    });

    it('should return false when resource is empty', () => {
      const result = service.checkPermission(adminUser, '', 'read');
      expect(result).toBe(false);
    });

    it('should return false when action is invalid', () => {
      const result = service.checkPermission(adminUser, 'jobs', 'invalid' as any);
      expect(result).toBe(false);
    });

    it('should return true when admin has permission for resource and action', () => {
      const result = service.checkPermission(adminUser, 'jobs', 'create');
      expect(result).toBe(true);
    });

    it('should return true when CM has permission for resource and action', () => {
      const result = service.checkPermission(cmUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should return false when CM lacks permission for action', () => {
      const result = service.checkPermission(cmUser, 'jobs', 'delete');
      expect(result).toBe(false);
    });

    it('should return true when regular user has read permission', () => {
      const result = service.checkPermission(regularUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should return false when regular user lacks create permission', () => {
      const result = service.checkPermission(regularUser, 'jobs', 'create');
      expect(result).toBe(false);
    });

    it('should return false when no permissions defined for role', () => {
      const unknownRoleUser = new User(
        '5',
        'Unknown Role User',
        'unknown@test.com',
        'password',
        'UnknownRole',
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      const result = service.checkPermission(unknownRoleUser, 'jobs', 'read');
      expect(result).toBe(false);
    });

    it('should return deterministic results for same inputs', () => {
      const result1 = service.checkPermission(adminUser, 'jobs', 'create');
      const result2 = service.checkPermission(adminUser, 'jobs', 'create');
      const result3 = service.checkPermission(adminUser, 'jobs', 'create');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(true);
    });
  });

  describe('checkPermission with conditions', () => {
    let testUser: User;

    beforeEach(() => {
      testUser = new User(
        '6',
        'Test User',
        'test@test.com',
        'password',
        'TestRole',
        'NYC',
        'TestCompany',
        new Date(),
        true
      );

      // Clear default permissions
      service.clearAllPermissions();
    });

    it('should evaluate equals condition correctly', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'equals',
                value: 'NYC'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should deny permission when equals condition fails', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'equals',
                value: 'LA'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(false);
    });

    it('should evaluate notEquals condition correctly', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'notEquals',
                value: 'LA'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should evaluate in condition correctly', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'in',
                value: ['NYC', 'LA', 'SF']
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should evaluate notIn condition correctly', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'notIn',
                value: ['LA', 'SF']
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should evaluate contains condition for strings correctly', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'company',
                operator: 'contains',
                value: 'Test'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });

    it('should deny permission when all conditions must pass and one fails', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'equals',
                value: 'NYC'
              },
              {
                field: 'company',
                operator: 'equals',
                value: 'WrongCompany'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(false);
    });

    it('should grant permission when all conditions pass', () => {
      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'equals',
                value: 'NYC'
              },
              {
                field: 'company',
                operator: 'equals',
                value: 'TestCompany'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermission(testUser, 'jobs', 'read');
      expect(result).toBe(true);
    });
  });

  describe('checkPermissionDetailed', () => {
    let adminUser: User;

    beforeEach(() => {
      adminUser = new User(
        '7',
        'Admin User',
        'admin@test.com',
        'password',
        'Admin',
        'NYC',
        'Test Company',
        new Date(),
        true
      );
    });

    it('should return detailed result with granted true for valid permission', () => {
      const result = service.checkPermissionDetailed(adminUser, 'jobs', 'create');

      expect(result.granted).toBe(true);
      expect(result.matchedPermission).toBeDefined();
      expect(result.matchedPermission?.resource).toBe('jobs');
    });

    it('should return detailed result with reason when permission denied', () => {
      const regularUser = new User(
        '8',
        'Regular User',
        'user@test.com',
        'password',
        'User',
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      const result = service.checkPermissionDetailed(regularUser, 'jobs', 'create');

      expect(result.granted).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('not allowed');
    });

    it('should return reason when condition fails', () => {
      const testUser = new User(
        '9',
        'Test User',
        'test@test.com',
        'password',
        'TestRole',
        'NYC',
        'TestCompany',
        new Date(),
        true
      );

      service.clearAllPermissions();

      const rolePermission: RolePermission = {
        role: 'TestRole',
        permissions: [
          {
            resource: 'jobs',
            actions: ['read'],
            conditions: [
              {
                field: 'market',
                operator: 'equals',
                value: 'LA'
              }
            ]
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('TestRole', rolePermission);

      const result = service.checkPermissionDetailed(testUser, 'jobs', 'read');

      expect(result.granted).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('condition failed');
    });
  });

  describe('getRolePermissions and setRolePermissions', () => {
    it('should set and get role permissions', () => {
      const customPermission: RolePermission = {
        role: 'CustomRole',
        permissions: [
          {
            resource: 'custom-resource',
            actions: ['read', 'create']
          }
        ],
        restrictions: []
      };

      service.setRolePermissions('CustomRole', customPermission);

      const retrieved = service.getRolePermissions('CustomRole');
      expect(retrieved).toEqual(customPermission);
    });

    it('should return undefined for non-existent role', () => {
      const retrieved = service.getRolePermissions('NonExistentRole');
      expect(retrieved).toBeUndefined();
    });
  });
});
