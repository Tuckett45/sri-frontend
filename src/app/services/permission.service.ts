import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/user.model';
import {
  Permission,
  PermissionAction,
  PermissionCondition,
  PermissionCheckResult,
  RolePermission
} from '../models/permission.model';
import { DataScope } from '../features/field-resource-management/services/data-scope.service';
import * as RolePermissionsSelectors from '../store/role-permissions/role-permissions.selectors';

/**
 * Service for checking user permissions with condition evaluation
 * 
 * Implements the checkPermission algorithm from the design document:
 * - Validates user and input parameters
 * - Retrieves role permissions
 * - Checks resource and action matches
 * - Evaluates permission conditions
 * - Returns deterministic results for same inputs
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  // In-memory store for role permissions
  // In a real application, this would be loaded from backend/NgRx store
  private rolePermissionsStore: Map<string, RolePermission> = new Map();
  
  // Mock current user for development
  // In production, this would come from an auth service/store
  private mockCurrentUser: User = {
    id: 'user-123',
    name: 'Admin User',
    email: 'admin@example.com',
    password: '',
    role: 'Admin',
    market: 'ALL',
    company: 'INTERNAL',
    createdDate: new Date(),
    isApproved: true
  };

  constructor(private store: Store) {
    // Initialize with default permissions for testing
    this.initializeDefaultPermissions();
  }

  /**
   * Check if a user has permission to perform an action on a resource
   * 
   * @param user - The user to check permissions for
   * @param resource - The resource name (e.g., 'jobs', 'deployments', 'workflows')
   * @param action - The action to perform ('create', 'read', 'update', 'delete', 'execute')
   * @returns boolean indicating if permission is granted
   * 
   * Preconditions:
   * - user is not null and has a defined role
   * - resource is a non-empty string
   * - action is one of the valid PermissionAction values
   * 
   * Postconditions:
   * - Returns true if and only if user's role has permission for resource+action
   * - No side effects on user or permission data
   * - Result is deterministic for same inputs
   */
  checkPermission(user: User, resource: string, action: PermissionAction): boolean {
    // Precondition assertions
    if (!user) {
      console.error('PermissionService.checkPermission: user is null');
      return false;
    }

    if (!user.role) {
      console.error('PermissionService.checkPermission: user.role is null');
      return false;
    }

    if (!resource || resource.trim() === '') {
      console.error('PermissionService.checkPermission: resource is empty');
      return false;
    }

    const validActions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'execute'];
    if (!validActions.includes(action)) {
      console.error(`PermissionService.checkPermission: invalid action '${action}'`);
      return false;
    }

    // Get role permissions
    const rolePermissions = this.rolePermissionsStore.get(user.role);

    if (!rolePermissions) {
      // No permissions defined for this role
      return false;
    }

    // Check each permission for matching resource
    for (const permission of rolePermissions.permissions) {
      if (!permission.resource) {
        console.warn('PermissionService.checkPermission: permission.resource is null');
        continue;
      }

      // Check if resource matches
      if (permission.resource === resource) {
        // Check if action is allowed
        if (permission.actions.includes(action)) {
          // Check conditions if present
          if (permission.conditions && permission.conditions.length > 0) {
            // All conditions must evaluate to true
            for (const condition of permission.conditions) {
              if (!this.evaluateCondition(condition, user)) {
                // Condition failed, permission denied
                return false;
              }
            }
          }

          // All checks passed, permission granted
          return true;
        }
      }
    }

    // No matching permission found
    return false;
  }

  /**
   * Check permission with detailed result
   * 
   * @param user - The user to check permissions for
   * @param resource - The resource name
   * @param action - The action to perform
   * @returns PermissionCheckResult with detailed information
   */
  checkPermissionDetailed(
    user: User,
    resource: string,
    action: PermissionAction
  ): PermissionCheckResult {
    // Precondition checks
    if (!user || !user.role) {
      return {
        granted: false,
        reason: 'User or user role is not defined'
      };
    }

    if (!resource || resource.trim() === '') {
      return {
        granted: false,
        reason: 'Resource is empty'
      };
    }

    const validActions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'execute'];
    if (!validActions.includes(action)) {
      return {
        granted: false,
        reason: `Invalid action: ${action}`
      };
    }

    // Get role permissions
    const rolePermissions = this.rolePermissionsStore.get(user.role);

    if (!rolePermissions) {
      return {
        granted: false,
        reason: `No permissions defined for role: ${user.role}`
      };
    }

    // Check each permission
    for (const permission of rolePermissions.permissions) {
      if (!permission.resource) {
        continue;
      }

      if (permission.resource === resource) {
        if (permission.actions.includes(action)) {
          // Check conditions
          if (permission.conditions && permission.conditions.length > 0) {
            for (const condition of permission.conditions) {
              if (!this.evaluateCondition(condition, user)) {
                return {
                  granted: false,
                  reason: `Permission condition failed: ${condition.field} ${condition.operator} ${condition.value}`,
                  matchedPermission: permission
                };
              }
            }
          }

          return {
            granted: true,
            matchedPermission: permission
          };
        } else {
          return {
            granted: false,
            reason: `Action '${action}' not allowed for resource '${resource}'`
          };
        }
      }
    }

    return {
      granted: false,
      reason: `No permission found for resource: ${resource}`
    };
  }

  /**
   * Evaluate a permission condition against user data
   * 
   * @param condition - The condition to evaluate
   * @param user - The user to evaluate against
   * @returns boolean indicating if condition is satisfied
   */
  private evaluateCondition(condition: PermissionCondition, user: User): boolean {
    // Get the field value from user object
    const fieldValue = this.getFieldValue(user, condition.field);

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'notEquals':
        return fieldValue !== condition.value;

      case 'in':
        if (!Array.isArray(condition.value)) {
          console.warn('PermissionService.evaluateCondition: "in" operator requires array value');
          return false;
        }
        return condition.value.includes(fieldValue);

      case 'notIn':
        if (!Array.isArray(condition.value)) {
          console.warn('PermissionService.evaluateCondition: "notIn" operator requires array value');
          return false;
        }
        return !condition.value.includes(fieldValue);

      case 'contains':
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          return fieldValue.includes(condition.value);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return false;

      default:
        console.warn(`PermissionService.evaluateCondition: unknown operator '${condition.operator}'`);
        return false;
    }
  }

  /**
   * Get a field value from user object using dot notation
   * 
   * @param user - The user object
   * @param field - The field path (e.g., 'market', 'company', 'role')
   * @returns The field value or undefined
   */
  private getFieldValue(user: User, field: string): any {
    const parts = field.split('.');
    let value: any = user;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set role permissions (for testing or dynamic configuration)
   * 
   * @param role - The role name
   * @param permissions - The permissions for the role
   */
  setRolePermissions(role: string, permissions: RolePermission): void {
    this.rolePermissionsStore.set(role, permissions);
  }

  /**
   * Get role permissions
   * 
   * @param role - The role name
   * @returns RolePermission or undefined
   */
  getRolePermissions(role: string): RolePermission | undefined {
    return this.rolePermissionsStore.get(role);
  }

  /**
   * Clear all role permissions (for testing)
   */
  clearAllPermissions(): void {
    this.rolePermissionsStore.clear();
  }

  /**
   * Initialize default permissions for common roles
   * This would typically be loaded from backend or configuration
   */
  private initializeDefaultPermissions(): void {
    // Admin role - full access
    this.setRolePermissions('Admin', {
      role: 'Admin',
      permissions: [
        {
          resource: 'jobs',
          actions: ['create', 'read', 'update', 'delete', 'execute']
        },
        {
          resource: 'deployments',
          actions: ['create', 'read', 'update', 'delete', 'execute']
        },
        {
          resource: 'workflows',
          actions: ['create', 'read', 'update', 'delete', 'execute']
        },
        {
          resource: 'users',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'reports',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'technicians',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'crews',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'assignments',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'kpis',
          actions: ['read']
        },
        {
          resource: 'approvals',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'system_config',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'time_entries',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'budgets',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'travel_profiles',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'home_addresses',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'inventory',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'materials',
          actions: ['create', 'read', 'update', 'delete']
        }
      ],
      restrictions: []
    });

    // Manager role - budget adjustment and management permissions
    this.setRolePermissions('Manager', {
      role: 'Manager',
      permissions: [
        {
          resource: 'jobs',
          actions: ['create', 'read', 'update', 'execute']
        },
        {
          resource: 'budgets',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'travel_profiles',
          actions: ['read', 'update']
        },
        {
          resource: 'home_addresses',
          actions: ['read', 'update']
        },
        {
          resource: 'inventory',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'materials',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'reports',
          actions: ['create', 'read']
        },
        {
          resource: 'technicians',
          actions: ['read', 'update']
        },
        {
          resource: 'crews',
          actions: ['read', 'update']
        },
        {
          resource: 'assignments',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'kpis',
          actions: ['read']
        },
        {
          resource: 'time_entries',
          actions: ['create', 'read', 'update']
        }
      ],
      restrictions: []
    });

    // CM role - construction manager permissions
    this.setRolePermissions('CM', {
      role: 'CM',
      permissions: [
        {
          resource: 'jobs',
          actions: ['create', 'read', 'update', 'execute']
        },
        {
          resource: 'deployments',
          actions: ['read', 'update']
        },
        {
          resource: 'workflows',
          actions: ['create', 'read', 'update', 'execute']
        },
        {
          resource: 'reports',
          actions: ['create', 'read']
        },
        {
          resource: 'technicians',
          actions: ['read']
        },
        {
          resource: 'crews',
          actions: ['read']
        },
        {
          resource: 'assignments',
          actions: ['read']
        },
        {
          resource: 'kpis',
          actions: ['read']
        },
        {
          resource: 'approvals',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'budgets',
          actions: ['read', 'update']
        },
        {
          resource: 'travel_profiles',
          actions: ['read', 'update']
        },
        {
          resource: 'home_addresses',
          actions: ['read']
        },
        {
          resource: 'inventory',
          actions: ['read', 'update']
        },
        {
          resource: 'materials',
          actions: ['read', 'update']
        }
      ],
      restrictions: []
    });

    // Dispatcher role - can manage technicians, jobs, crews, scheduling
    this.setRolePermissions('Dispatcher', {
      role: 'Dispatcher',
      permissions: [
        {
          resource: 'jobs',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'technicians',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'crews',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'assignments',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'reports',
          actions: ['read']
        },
        {
          resource: 'kpis',
          actions: ['read']
        },
        {
          resource: 'budgets',
          actions: ['read']
        },
        {
          resource: 'inventory',
          actions: ['read', 'update']
        },
        {
          resource: 'materials',
          actions: ['read']
        }
      ],
      restrictions: []
    });

    // User role - basic FRM access
    this.setRolePermissions('User', {
      role: 'User',
      permissions: [
        { resource: 'jobs', actions: ['read'] },
        { resource: 'deployments', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'budgets', actions: ['read'] },
        { resource: 'technicians', actions: ['read'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'assignments', actions: ['read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['create', 'read', 'update'] }
      ],
      restrictions: []
    });

    // Technician role
    this.setRolePermissions('Technician', {
      role: 'Technician',
      permissions: [
        {
          resource: 'jobs',
          actions: ['read', 'update', 'execute']
        },
        {
          resource: 'deployments',
          actions: ['read', 'update']
        },
        {
          resource: 'assignments',
          actions: ['read']
        },
        {
          resource: 'time_entries',
          actions: ['create', 'read', 'update']
        },
        {
          resource: 'kpis',
          actions: ['read']
        },
        {
          resource: 'budgets',
          actions: ['read']
        },
        {
          resource: 'travel_profiles',
          actions: ['read', 'update'],
          conditions: [{ field: 'id', operator: 'equals' as const, value: 'self' }]
        }
      ],
      restrictions: []
    });

    // HR role - personnel and timecard management
    this.setRolePermissions('HR', {
      role: 'HR',
      permissions: [
        { resource: 'technicians', actions: ['create', 'read', 'update'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'jobs', actions: ['read'] },
        { resource: 'assignments', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'budgets', actions: ['read'] },
        { resource: 'travel_profiles', actions: ['read'] },
        { resource: 'home_addresses', actions: ['read'] },
        { resource: 'inventory', actions: ['read'] },
        { resource: 'materials', actions: ['read'] }
      ],
      restrictions: []
    });

    // OSPCoordinator role - dispatching and coordination
    this.setRolePermissions('OSPCoordinator', {
      role: 'OSPCoordinator',
      permissions: [
        { resource: 'jobs', actions: ['create', 'read', 'update'] },
        { resource: 'technicians', actions: ['read', 'update'] },
        { resource: 'crews', actions: ['read', 'update'] },
        { resource: 'assignments', actions: ['create', 'read', 'update'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['create', 'read', 'update'] },
        { resource: 'budgets', actions: ['read'] },
        { resource: 'approvals', actions: ['read', 'update'] },
        { resource: 'travel_profiles', actions: ['read'] },
        { resource: 'inventory', actions: ['read', 'update'] },
        { resource: 'materials', actions: ['read'] }
      ],
      restrictions: []
    });

    // Controller role - financial oversight
    this.setRolePermissions('Controller', {
      role: 'Controller',
      permissions: [
        { resource: 'jobs', actions: ['read'] },
        { resource: 'technicians', actions: ['read'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'assignments', actions: ['read'] },
        { resource: 'reports', actions: ['create', 'read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['read', 'update'] },
        { resource: 'budgets', actions: ['create', 'read', 'update'] },
        { resource: 'approvals', actions: ['read', 'update'] },
        { resource: 'travel_profiles', actions: ['read'] },
        { resource: 'inventory', actions: ['read'] },
        { resource: 'materials', actions: ['read'] }
      ],
      restrictions: []
    });

    // EngineeringFieldSupport role - field support and technical oversight
    this.setRolePermissions('EngineeringFieldSupport', {
      role: 'EngineeringFieldSupport',
      permissions: [
        { resource: 'jobs', actions: ['read', 'update'] },
        { resource: 'technicians', actions: ['read'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'assignments', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['create', 'read', 'update'] },
        { resource: 'budgets', actions: ['read'] },
        { resource: 'travel_profiles', actions: ['read'] },
        { resource: 'inventory', actions: ['read', 'update'] },
        { resource: 'materials', actions: ['read', 'update'] }
      ],
      restrictions: []
    });

    // MaterialsManager role - inventory and materials management
    this.setRolePermissions('MaterialsManager', {
      role: 'MaterialsManager',
      permissions: [
        { resource: 'jobs', actions: ['read'] },
        { resource: 'technicians', actions: ['read'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'assignments', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['create', 'read', 'update'] },
        { resource: 'budgets', actions: ['read'] },
        { resource: 'inventory', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'materials', actions: ['create', 'read', 'update', 'delete'] }
      ],
      restrictions: []
    });

    // PM role - project management
    this.setRolePermissions('PM', {
      role: 'PM',
      permissions: [
        { resource: 'jobs', actions: ['create', 'read', 'update'] },
        { resource: 'technicians', actions: ['read'] },
        { resource: 'crews', actions: ['read'] },
        { resource: 'assignments', actions: ['create', 'read', 'update'] },
        { resource: 'reports', actions: ['create', 'read'] },
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['read'] },
        { resource: 'budgets', actions: ['read', 'update'] },
        { resource: 'travel_profiles', actions: ['read'] },
        { resource: 'inventory', actions: ['read'] },
        { resource: 'materials', actions: ['read'] }
      ],
      restrictions: []
    });

    // Payroll role - timecards, approvals, travel, expenses, and back-office HR functions
    this.setRolePermissions('Payroll', {
      role: 'Payroll',
      permissions: [
        { resource: 'kpis', actions: ['read'] },
        { resource: 'time_entries', actions: ['read', 'update', 'execute'] },
        { resource: 'approvals', actions: ['read', 'update'] },
        { resource: 'travel_profiles', actions: ['read', 'update'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'payroll', actions: ['create', 'read', 'update'] }
      ],
      restrictions: []
    });
  }

  /**
   * Get current user
   * In production, this would retrieve from auth service or NgRx store
   * 
   * @returns Observable of current user
   */
  getCurrentUser(): Observable<User> {
    // TODO: Replace with actual auth service call
    // return this.store.select(selectCurrentUser);
    return of(this.mockCurrentUser);
  }

  /**
   * Get data scopes for current user's role
   * 
   * @returns Observable of data scopes array
   */
  getCurrentUserDataScopes(): Observable<DataScope[]> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user || !user.role) {
          return [];
        }
        
        // Map role to data scope type
        switch (user.role) {
          case 'Admin':
            return [{ scopeType: 'all' as const }];
          
          case 'CM':
            return [{ scopeType: 'market' as const }];
          
          case 'PM':
          case 'Vendor':
            return [{ scopeType: 'company' as const }];
          
          case 'Technician':
            return [{ scopeType: 'self' as const }];
          
          default:
            console.warn(`Unknown role: ${user.role}, defaulting to 'self' scope`);
            return [{ scopeType: 'self' as const }];
        }
      })
    );
  }

  /**
   * Set current user (for testing)
   * 
   * @param user - User to set as current
   */
  setCurrentUser(user: User): void {
    this.mockCurrentUser = user;
  }
}
