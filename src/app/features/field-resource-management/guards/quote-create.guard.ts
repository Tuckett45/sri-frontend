import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FrmPermissionService } from '../services/frm-permission.service';

/**
 * QuoteCreateGuard
 *
 * Protects the quote creation route (`quotes/new`) by checking the `canCreateQuote` permission.
 * Only roles with `canCreateQuote` granted (Admin, PM, DCOps, OSPCoordinator,
 * EngineeringFieldSupport, Manager) are allowed access.
 * Redirects unauthorized users to `/field-resource-management/dashboard`.
 *
 * Usage:
 * ```typescript
 * {
 *   path: 'new',
 *   component: RfpIntakeFormComponent,
 *   canActivate: [QuoteCreateGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class QuoteCreateGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getUser();

    if (this.frmPermissionService.hasPermission(user?.role, 'canCreateQuote')) {
      return true;
    }

    console.warn('QuoteCreateGuard - Access denied: canCreateQuote permission required');
    console.warn('QuoteCreateGuard - User role:', user?.role);
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: {
        error: 'insufficient_permissions',
        message: 'Quote creation access required'
      }
    });
    return false;
  }
}
