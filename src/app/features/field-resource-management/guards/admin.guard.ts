import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Admin Guard
 * 
 * Protects routes that require Admin role access.
 * Redirects unauthorized users to an unauthorized page.
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'admin/settings',
 *   component: SystemConfigurationComponent,
 *   canActivate: [AdminGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if user has Admin role
    if (this.authService.isUserInRole([UserRole.Admin])) {
      return true;
    }

    // Redirect to unauthorized page
    console.warn('Access denied: Admin role required');
    this.router.navigate(['/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
