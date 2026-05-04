import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Technician Guard
 * 
 * Protects routes that require Field_Group or Manager_Group role access.
 * Covers field technicians and managers who need access to mobile/field routes.
 * 
 * Mapped Roles:
 * - Field_Group: Technician, DeploymentEngineer, CM, SRITech
 * - Manager_Group: PM, Admin, DCOps, OSPCoordinator, EngineeringFieldSupport, MaterialsManager
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
      // Field_Group
      UserRole.Technician,
      UserRole.DeploymentEngineer,
      UserRole.CM,
      UserRole.SRITech,
      // Manager_Group
      UserRole.PM,
      UserRole.Admin,
      UserRole.DCOps,
      UserRole.OSPCoordinator,
      UserRole.EngineeringFieldSupport,
      UserRole.MaterialsManager
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
