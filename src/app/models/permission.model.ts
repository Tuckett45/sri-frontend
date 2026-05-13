/**
 * Permission models for role-based access control
 */

/**
 * Represents a permission for a specific resource and actions
 */
export interface Permission {
  resource: string;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

/**
 * Available permission actions
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute';

/**
 * Condition that must be evaluated for permission to be granted
 */
export interface PermissionCondition {
  field: string;
  operator: PermissionOperator;
  value: any;
}

/**
 * Operators for permission condition evaluation
 */
export type PermissionOperator = 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains';

/**
 * Represents all permissions and restrictions for a specific role
 */
export interface RolePermission {
  role: string;
  permissions: Permission[];
  restrictions: Restriction[];
}

/**
 * Represents a restriction on a resource
 */
export interface Restriction {
  resource: string;
  reason: string;
  expiresAt?: Date;
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  matchedPermission?: Permission;
}
