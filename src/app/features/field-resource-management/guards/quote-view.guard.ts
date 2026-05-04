import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FrmPermissionService } from '../services/frm-permission.service';

/**
 * QuoteViewGuard
 *
 * Protects quote routes by checking the `canViewQuote` permission.
 * Only roles with `canViewQuote` granted (Admin, PM, DCOps, OSPCoordinator,
 * EngineeringFieldSupport, Manager, MaterialsManager) are allowed access.
 * Redirects unauthorized users to `/field-resource-management/dashboard`.
 *
 * Usage:
 * ```typescript
 * {
 *   path: 'quotes',
 *   loadChildren: () => import('./quotes.module').then(m => m.QuotesModule),
 *   canActivate: [QuoteViewGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class QuoteViewGuard implements CanActivate {
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

    if (this.frmPermissionService.hasPermission(user?.role, 'canViewQuote')) {
      return true;
    }

    console.warn('QuoteViewGuard - Access denied: canViewQuote permission required');
    console.warn('QuoteViewGuard - User role:', user?.role);
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: {
        error: 'insufficient_permissions',
        message: 'Quote view access required'
      }
    });
    return false;
  }
}
