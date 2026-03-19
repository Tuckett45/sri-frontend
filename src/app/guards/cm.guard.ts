import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

/**
 * CM Guard
 * 
 * Protects routes that require Construction Manager (CM) or Admin role access.
 * Redirects unauthorized users to an unauthorized page with a return URL.
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'cm/dashboard',
 *   component: CMDashboardComponent,
 *   canActivate: [CMGuard]
 * }
 * ```
 * 
 * Validates Requirements: 3.7, 15.1, 15.2
 */
@Injectable({
  providedIn: 'root'
})
export class CMGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if user has CM, Admin, or related management role
    if (this.authService.isUserInRole([UserRole.CM, UserRole.Admin, UserRole.Controller, UserRole.OSPCoordinator])) {
      return true;
    }

    // Redirect to unauthorized page with return URL for post-login redirect
    console.warn('Access denied: CM or Admin role required');
    this.router.navigate(['/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
