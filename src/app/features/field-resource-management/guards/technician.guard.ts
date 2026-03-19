import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Technician Guard
 * 
 * Protects routes that require Technician role access.
 * Technicians can view their daily schedule, update job status, and track time.
 * 
 * Mapped Roles:
 * - Technician: Field technician access
 * - DeploymentEngineer: Field technician access
 * - SRITech: Field technician access
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'mobile/daily',
 *   component: DailyViewComponent,
 *   canActivate: [TechnicianGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class TechnicianGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Check if user has Technician role
    // Map existing ATLAS roles to Technician capabilities
    const allowedRoles = [
      UserRole.Admin,
      UserRole.Technician,
      UserRole.DeploymentEngineer,
      UserRole.SRITech
    ];

    if (this.authService.isUserInRole(allowedRoles)) {
      return true;
    }

    // Redirect to dashboard instead of non-existent unauthorized page
    console.warn('Access denied: Technician role required');
    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: { 
        error: 'insufficient_permissions',
        message: 'Technician access required'
      }
    });
    return false;
  }
}
