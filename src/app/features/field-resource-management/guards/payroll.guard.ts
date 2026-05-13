import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

@Injectable({
  providedIn: 'root'
})
export class PayrollGuard implements CanActivate {
  private readonly allowedRoles = [
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
        message: 'Payroll access required'
      }
    });
    return false;
  }
}
