import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

@Injectable({
  providedIn: 'root'
})
export class HrGuard implements CanActivate {
  private readonly allowedRoles = [
    UserRole.HR,
    UserRole.Payroll,
    UserRole.Admin
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
        message: 'HR access required'
      }
    });
    return false;
  }
}
