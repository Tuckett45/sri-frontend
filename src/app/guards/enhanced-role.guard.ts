import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { UserRole } from '../models/role.enum';

/**
 * Configuration interface for EnhancedRoleGuard route data
 */
export interface RoleGuardConfig {
  allowedRoles: UserRole[];
  requireMarketMatch?: boolean;
  marketParam?: string;
}

/**
 * Enhanced Role Guard
 * 
 * Advanced guard that provides:
 * - Configurable role-based access control
 * - Optional market validation for route parameters
 * - Integration with RoleBasedDataService for market access checks
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'projects/:market',
 *   component: ProjectListComponent,
 *   canActivate: [EnhancedRoleGuard],
 *   data: {
 *     roleGuard: {
 *       allowedRoles: [UserRole.CM, UserRole.Admin],
 *       requireMarketMatch: true,
 *       marketParam: 'market'
 *     }
 *   }
 * }
 * ```
 * 
 * Validates Requirements: 1.5, 3.7, 3.8, 16.1, 16.2
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedRoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Get guard configuration from route data
    const config: RoleGuardConfig = route.data['roleGuard'];
    
    if (!config) {
      console.error('EnhancedRoleGuard: No roleGuard configuration found in route data');
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // Check if user has one of the allowed roles
    if (!this.authService.isUserInRole(config.allowedRoles)) {
      console.warn('Access denied: User does not have required role');
      this.router.navigate(['/unauthorized'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // Check market access if required
    if (config.requireMarketMatch) {
      const marketParam = config.marketParam || 'market';
      const marketValue = route.params[marketParam];
      
      if (marketValue && !this.roleBasedDataService.canAccessMarket(marketValue)) {
        console.warn(`Access denied: User cannot access market '${marketValue}'`);
        this.router.navigate(['/unauthorized'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }
    }

    return true;
  }
}
