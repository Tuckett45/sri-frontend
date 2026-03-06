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
        }
      ],
      restrictions: []
    });

    // User role - basic permissions
    this.setRolePermissions('User', {
      role: 'User',
      permissions: [
        {
          resource: 'jobs',
          actions: ['read']
        },
        {
          resource: 'deployments',
          actions: ['read']
        },
        {
          resource: 'reports',
          actions: ['read']
        }
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
        }
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
