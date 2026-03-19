import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Dispatcher Guard
 * 
 * Protects routes that require Dispatcher or Admin role access.
 * Dispatchers can manage scheduling, jobs, and technicians.
 * Admins have full access to all dispatcher features.
 * 
 * Mapped Roles:
 * - Admin: Full access
 * - PM (Project Manager): Dispatcher capabilities
 * - CM (Construction Manager): Dispatcher capabilities
 * - OSPCoordinator: Dispatcher capabilities
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'schedule',
 *   component: CalendarViewComponent,
 *   canActivate: [DispatcherGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DispatcherGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if user has Dispatcher or Admin role
    // Map existing ATLAS roles to Dispatcher capabilities
    const allowedRoles = [
      UserRole.Admin,
      UserRole.PM,
      UserRole.CM,
      UserRole.OSPCoordinator
    ];

    if (this.authService.isUserInRole(allowedRoles)) {
      return true;
    }

    // Redirect to dashboard instead of non-existent unauthorized page
    console.warn('Access denied: Dispatcher or Admin role required');
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: { 
        error: 'insufficient_permissions',
        message: 'Dispatcher or Admin access required'
      }
    });
    return false;
  }
}
