import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PermissionService } from '../../../services/permission.service';
import { User } from '../../../models/user.model';
import {
  AuditLoggingService,
  AuditAction,
  AuditResource
} from './audit-logging.service';

/**
 * Budget permission check result
 */
export interface BudgetPermissionResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: string[];
}

/**
 * Budget adjustment validation result
 */
export interface BudgetAdjustmentValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Budget adjustment limits by role
 */
export interface BudgetAdjustmentLimits {
  minAmount: number;
  maxAmount: number;
  requiresApproval: boolean;
  approvalThreshold: number;
}

/**
 * Budget Permission Service
 * 
 * Provides role-based access control for budget operations.
 * Validates that only Admin and Manager roles can adjust budgets.
 * Integrates with the existing PermissionService for authorization checks.
 * 
 * Features:
 * - Role-based budget adjustment authorization (Admin/Manager only)
 * - Adjustment amount validation with configurable limits
 * - Reason validation for audit compliance
 * - Integration with audit logging for permission denials
 * 
 * Requirements: 2.1-2.2 (Budget adjustment authorization)
 * 
 * @example
 * // Check if user can adjust budget
 * const result = budgetPermissionService.canAdjustBudget(user);
 * if (!result.allowed) {
 *   console.log('Permission denied:', result.reason);
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class BudgetPermissionService {
  // Roles allowed to adjust budgets
  private readonly BUDGET_ADJUSTMENT_ROLES = ['Admin', 'Manager', 'CM'];
  
  // Roles allowed to view budget details
  private readonly BUDGET_VIEW_ROLES = ['Admin', 'Manager', 'CM', 'Dispatcher', 'User'];
  
  // Adjustment limits by role
  private readonly ADJUSTMENT_LIMITS: Record<string, BudgetAdjustmentLimits> = {
    Admin: {
      minAmount: -10000,
      maxAmount: 10000,
      requiresApproval: false,
      approvalThreshold: Infinity
    },
    Manager: {
      minAmount: -1000,
      maxAmount: 1000,
      requiresApproval: true,
      approvalThreshold: 500
    },
    CM: {
      minAmount: -500,
      maxAmount: 500,
      requiresApproval: true,
      approvalThreshold: 200
    }
  };

  constructor(
    private permissionService: PermissionService,
    private auditLoggingService: AuditLoggingService
  ) {
    // Register budget permissions with the permission service
    this.registerBudgetPermissions();
  }

  /**
   * Check if a user can adjust budgets
   * @param user - User to check
   * @returns BudgetPermissionResult indicating if adjustment is allowed
   */
  canAdjustBudget(user: User | null): BudgetPermissionResult {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        requiredRole: this.BUDGET_ADJUSTMENT_ROLES
      };
    }

    if (!user.role) {
      return {
        allowed: false,
        reason: 'User role not defined',
        requiredRole: this.BUDGET_ADJUSTMENT_ROLES
      };
    }

    const hasPermission = this.BUDGET_ADJUSTMENT_ROLES.includes(user.role);

    if (!hasPermission) {
      // Log permission denial
      this.auditLoggingService.logPermissionDenial(
        user.id,
        user.name,
        AuditResource.Budget,
        AuditAction.Update,
        `User role '${user.role}' not authorized for budget adjustments`
      );

      return {
        allowed: false,
        reason: `Role '${user.role}' is not authorized to adjust budgets. Required roles: ${this.BUDGET_ADJUSTMENT_ROLES.join(', ')}`,
        requiredRole: this.BUDGET_ADJUSTMENT_ROLES
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a user can view budget details
   * @param user - User to check
   * @returns BudgetPermissionResult indicating if viewing is allowed
   */
  canViewBudget(user: User | null): BudgetPermissionResult {
    if (!user) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        requiredRole: this.BUDGET_VIEW_ROLES
      };
    }

    if (!user.role) {
      return {
        allowed: false,
        reason: 'User role not defined',
        requiredRole: this.BUDGET_VIEW_ROLES
      };
    }

    const hasPermission = this.BUDGET_VIEW_ROLES.includes(user.role);

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Role '${user.role}' is not authorized to view budgets`,
        requiredRole: this.BUDGET_VIEW_ROLES
      };
    }

    return { allowed: true };
  }

  /**
   * Validate a budget adjustment request
   * @param user - User making the adjustment
   * @param amount - Adjustment amount
   * @param reason - Reason for adjustment
   * @param currentBudget - Current budget value
   * @returns BudgetAdjustmentValidation result
   */
  validateAdjustment(
    user: User,
    amount: number,
    reason: string,
    currentBudget: number
  ): BudgetAdjustmentValidation {
    const errors: string[] = [];

    // Check permission first
    const permissionResult = this.canAdjustBudget(user);
    if (!permissionResult.allowed) {
      errors.push(permissionResult.reason || 'Permission denied');
      return { valid: false, errors };
    }

    // Get adjustment limits for user's role
    const limits = this.getAdjustmentLimits(user.role);

    // Validate amount is within limits
    if (amount < limits.minAmount) {
      errors.push(`Adjustment amount cannot be less than ${limits.minAmount} hours`);
    }

    if (amount > limits.maxAmount) {
      errors.push(`Adjustment amount cannot exceed ${limits.maxAmount} hours`);
    }

    // Validate amount is not zero
    if (amount === 0) {
      errors.push('Adjustment amount cannot be zero');
    }

    // Validate reason is provided and meets minimum length
    if (!reason || reason.trim().length === 0) {
      errors.push('Reason is required for budget adjustments');
    } else if (reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters');
    } else if (reason.trim().length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    }

    // Validate resulting budget is not negative (unless explicitly allowed)
    const resultingBudget = currentBudget + amount;
    if (resultingBudget < 0 && user.role !== 'Admin') {
      errors.push('Adjustment would result in negative budget. Only Admin can set negative budgets.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get adjustment limits for a role
   * @param role - User role
   * @returns BudgetAdjustmentLimits for the role
   */
  getAdjustmentLimits(role: string): BudgetAdjustmentLimits {
    return this.ADJUSTMENT_LIMITS[role] || {
      minAmount: 0,
      maxAmount: 0,
      requiresApproval: true,
      approvalThreshold: 0
    };
  }

  /**
   * Check if an adjustment requires approval
   * @param user - User making the adjustment
   * @param amount - Adjustment amount
   * @returns True if approval is required
   */
  requiresApproval(user: User, amount: number): boolean {
    const limits = this.getAdjustmentLimits(user.role);
    
    if (!limits.requiresApproval) {
      return false;
    }

    return Math.abs(amount) > limits.approvalThreshold;
  }

  /**
   * Get observable for current user's budget permissions
   * @returns Observable of BudgetPermissionResult
   */
  getCurrentUserBudgetPermission(): Observable<BudgetPermissionResult> {
    return this.permissionService.getCurrentUser().pipe(
      map(user => this.canAdjustBudget(user))
    );
  }

  /**
   * Register budget permissions with the permission service
   */
  private registerBudgetPermissions(): void {
    // Add budget permissions to Admin role
    const adminPermissions = this.permissionService.getRolePermissions('Admin');
    if (adminPermissions) {
      const hasBudgetPermission = adminPermissions.permissions.some(
        p => p.resource === 'budgets'
      );
      if (!hasBudgetPermission) {
        adminPermissions.permissions.push({
          resource: 'budgets',
          actions: ['create', 'read', 'update', 'delete']
        });
        this.permissionService.setRolePermissions('Admin', adminPermissions);
      }
    }

    // Add budget permissions to CM role (Manager equivalent)
    const cmPermissions = this.permissionService.getRolePermissions('CM');
    if (cmPermissions) {
      const hasBudgetPermission = cmPermissions.permissions.some(
        p => p.resource === 'budgets'
      );
      if (!hasBudgetPermission) {
        cmPermissions.permissions.push({
          resource: 'budgets',
          actions: ['read', 'update']
        });
        this.permissionService.setRolePermissions('CM', cmPermissions);
      }
    }

    // Add read-only budget permissions to Dispatcher
    const dispatcherPermissions = this.permissionService.getRolePermissions('Dispatcher');
    if (dispatcherPermissions) {
      const hasBudgetPermission = dispatcherPermissions.permissions.some(
        p => p.resource === 'budgets'
      );
      if (!hasBudgetPermission) {
        dispatcherPermissions.permissions.push({
          resource: 'budgets',
          actions: ['read']
        });
        this.permissionService.setRolePermissions('Dispatcher', dispatcherPermissions);
      }
    }

    // Add read-only budget permissions to User
    const userPermissions = this.permissionService.getRolePermissions('User');
    if (userPermissions) {
      const hasBudgetPermission = userPermissions.permissions.some(
        p => p.resource === 'budgets'
      );
      if (!hasBudgetPermission) {
        userPermissions.permissions.push({
          resource: 'budgets',
          actions: ['read']
        });
        this.permissionService.setRolePermissions('User', userPermissions);
      }
    }
  }
}
