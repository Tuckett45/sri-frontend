import { Injectable } from '@angular/core';
import { User } from '../../../models/user.model';
import { RolePermission } from '../../../models/permission.model';

/**
 * Represents an entity that can be scoped by market, company, and ownership
 */
export interface ScopedEntity {
  market?: string;
  company?: string;
  assignedTo?: string;
  ownerId?: string;
}

/**
 * Data scope types for filtering
 */
export type ScopeType = 'all' | 'market' | 'company' | 'self';

/**
 * Data scope definition
 */
export interface DataScope {
  scopeType: ScopeType;
  scopeValues?: string[];
}

/**
 * Service for filtering data based on user role and data scope
 * 
 * Implements the filterDataByScope algorithm from the design document:
 * - Admin: see all data (scope: 'all')
 * - CM: see all data in their market, or all markets if RG market (scope: 'market')
 * - PM/Vendor: see only their company AND market (scope: 'company')
 * - Technician: see only items assigned to them (scope: 'self')
 */
@Injectable({
  providedIn: 'root'
})
export class DataScopeService {

  constructor() {}

  /**
   * Filter data array based on user's role and data scope
   * 
   * @param data - Array of entities to filter
   * @param user - User with role, market, and company information
   * @param rolePermission - Role permission containing data scopes
   * @returns Filtered array containing only items user has permission to see
   * 
   * Preconditions:
   * - data is a valid array (may be empty)
   * - user is non-null with valid role and scope information
   * - rolePermission contains valid data scopes for the user's role
   * - All items in data implement ScopedEntity interface (have market, company fields)
   * 
   * Postconditions:
   * - Returns filtered array containing only items user has permission to see
   * - If user has 'all' scope, returns entire input array
   * - If user has 'market' scope, returns items matching user's market
   * - If user has 'company' scope, returns items matching user's company AND market
   * - If user has 'self' scope, returns only items where user is the owner/assignee
   * - Original data array is not mutated
   * - Order of items is preserved
   * 
   * Loop Invariants:
   * - filteredData contains only entities that passed scope check
   * - All previously processed entities were evaluated correctly
   * - No duplicate entities in filteredData
   */
  filterDataByScope<T extends ScopedEntity>(
    data: T[],
    user: User,
    dataScopes: DataScope[]
  ): T[] {
    // Precondition validation
    if (!data) {
      console.error('DataScopeService.filterDataByScope: data is null');
      return [];
    }

    if (!Array.isArray(data)) {
      console.error('DataScopeService.filterDataByScope: data is not an array');
      return [];
    }

    if (!user) {
      console.error('DataScopeService.filterDataByScope: user is null');
      return [];
    }

    if (!user.role) {
      console.error('DataScopeService.filterDataByScope: user.role is null');
      return [];
    }

    if (!dataScopes || dataScopes.length === 0) {
      console.error('DataScopeService.filterDataByScope: dataScopes is empty');
      return [];
    }

    // Step 1: Determine scope type
    const scopeType = this.determineScopeType(dataScopes);

    // Step 2: Apply scope filter based on type
    const filteredData: T[] = [];

    switch (scopeType) {
      case 'all':
        // Admin: see everything
        return [...data]; // Return copy to preserve immutability

      case 'market':
        // CM: see all in their market (or all markets if RG market CM)
        if (user.market === 'RG') {
          // RG market CMs see all markets
          return [...data];
        } else {
          // Filter by user's market
          for (const entity of data) {
            if (entity.market === user.market) {
              filteredData.push(entity);
            }
          }
        }
        break;

      case 'company':
        // PM/Vendor: see only their company AND market
        for (const entity of data) {
          if (entity.company === user.company && entity.market === user.market) {
            filteredData.push(entity);
          }
        }
        break;

      case 'self':
        // Technician: see only assigned to them
        for (const entity of data) {
          if (entity.assignedTo === user.id || entity.ownerId === user.id) {
            filteredData.push(entity);
          }
        }
        break;

      default:
        console.warn(`DataScopeService.filterDataByScope: unknown scope type '${scopeType}'`);
        return [];
    }

    return filteredData;
  }

  /**
   * Determine the scope type from data scopes array
   * 
   * @param dataScopes - Array of data scope definitions
   * @returns The primary scope type to apply
   * 
   * Preconditions:
   * - dataScopes is a non-empty array
   * 
   * Postconditions:
   * - Returns a valid ScopeType
   * - If multiple scopes exist, returns the most restrictive
   */
  private determineScopeType(dataScopes: DataScope[]): ScopeType {
    if (!dataScopes || dataScopes.length === 0) {
      // Default to most restrictive
      return 'self';
    }

    // Priority order: all > market > company > self
    // Return the first (most permissive) scope found
    for (const scope of dataScopes) {
      if (scope.scopeType === 'all') {
        return 'all';
      }
    }

    for (const scope of dataScopes) {
      if (scope.scopeType === 'market') {
        return 'market';
      }
    }

    for (const scope of dataScopes) {
      if (scope.scopeType === 'company') {
        return 'company';
      }
    }

    // Default to self if no other scope found
    return 'self';
  }

  /**
   * Get data scopes for a given role
   * This is a helper method to create DataScope arrays based on role
   * 
   * @param role - User role
   * @returns Array of DataScope objects for the role
   */
  getDataScopesForRole(role: string): DataScope[] {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return [{ scopeType: 'all' }];

      case 'CM':
      case 'CONSTRUCTIONMANAGER':
        return [{ scopeType: 'market' }];

      case 'PM':
      case 'PROJECTMANAGER':
      case 'VENDOR':
        return [{ scopeType: 'company' }];

      case 'TECHNICIAN':
        return [{ scopeType: 'self' }];

      default:
        console.warn(`DataScopeService.getDataScopesForRole: unknown role '${role}'`);
        return [{ scopeType: 'self' }]; // Default to most restrictive
    }
  }

  /**
   * Check if a user can access a specific entity
   * 
   * @param entity - The entity to check access for
   * @param user - The user requesting access
   * @param dataScopes - Data scopes for the user's role
   * @returns boolean indicating if user can access the entity
   */
  canAccessEntity<T extends ScopedEntity>(
    entity: T,
    user: User,
    dataScopes: DataScope[]
  ): boolean {
    if (!entity || !user || !dataScopes) {
      return false;
    }

    const filtered = this.filterDataByScope([entity], user, dataScopes);
    return filtered.length > 0;
  }
}
