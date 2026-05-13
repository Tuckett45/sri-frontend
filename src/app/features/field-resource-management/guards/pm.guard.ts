import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * PM Guard
 * 
 * Protects routes that require Project Manager (PM) or Vendor role access.
 * PMs/Vendors can only access data for their specific company AND market.
 * 
 * Mapped Roles:
 * - PM: Project Manager access
 * - VendorRep: Vendor representative access
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'pm/jobs',
 *   component: PMJobsComponent,
 *   canActivate: [PMGuard]
 * }
 * ```
 * 
 * **Validates: Requirements 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6**
 */
@Injectable({
  providedIn: 'root'
})
export class PMGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if user has PM or VendorRep role
    const allowedRoles = [
      UserRole.PM,
      UserRole.VendorRep
    ];

    if (this.authService.isUserInRole(allowedRoles)) {
      return true;
    }

    // Redirect to dashboard instead of non-existent unauthorized page
    console.warn('Access denied: PM or Vendor role required');
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: { 
        error: 'insufficient_permissions',
        message: 'PM or Vendor access required'
      }
    });
    return false;
  }
}
