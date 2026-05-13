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
    // Debug: Log the user's role
    const user = this.authService.getUser();
    console.log('AdminGuard - User:', user);
    console.log('AdminGuard - Checking for Admin role');
    
    // Check if user has Admin role
    if (this.authService.isUserInRole([UserRole.Admin])) {
      console.log('AdminGuard - Access granted');
      return true;
    }

    // Redirect to dashboard instead of non-existent unauthorized page
    console.warn('AdminGuard - Access denied: Admin role required');
    console.warn('AdminGuard - User role:', user?.role);
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: { 
        error: 'insufficient_permissions',
        message: 'Admin access required'
      }
    });
    return false;
  }
}
