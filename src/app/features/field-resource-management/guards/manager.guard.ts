import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Manager Guard
 *
 * Protects routes that require Manager_Group access.
 * Allows access for users with PM, Admin, DCOps, OSPCoordinator,
 * EngineeringFieldSupport, MaterialsManager, or Manager roles.
 */
@Injectable({
  providedIn: 'root'
})
export class ManagerGuard implements CanActivate {
  private readonly allowedRoles = [
    UserRole.PM,
    UserRole.Admin,
    UserRole.DCOps,
    UserRole.OSPCoordinator,
    UserRole.EngineeringFieldSupport,
    UserRole.MaterialsManager,
    UserRole.Manager
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isUserInRole(this.allowedRoles)) {
      return true;
    }

    this.router.navigate(['/field-resource-management/dashboard'], {
      queryParams: {
        error: 'insufficient_permissions',
        message: 'Manager access required'
      }
    });
    return false;
  }
}
