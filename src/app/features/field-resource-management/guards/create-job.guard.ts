import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FrmPermissionService } from '../services/frm-permission.service';

/**
 * CreateJobGuard
 *
 * Protects the job setup route (`jobs/new`) by checking the `canCreateJob` permission.
 * Only Admin, Payroll, and HR roles are granted access.
 * Redirects unauthorized users to `/field-resource-management/dashboard`.
 *
 * Usage:
 * ```typescript
 * {
 *   path: 'new',
 *   component: JobSetupComponent,
 *   canActivate: [CreateJobGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class CreateJobGuard implements CanActivate {
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

    if (this.frmPermissionService.hasPermission(user?.role, 'canCreateJob')) {
      return true;
    }

    console.warn('CreateJobGuard - Access denied: canCreateJob permission required');
    console.warn('CreateJobGuard - User role:', user?.role);
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: {
        error: 'insufficient_permissions',
        message: 'Job creation access required'
      }
    });
    return false;
  }
}
