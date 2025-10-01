import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

@Injectable({ providedIn: 'root' })
export class HrRoleGuard implements CanActivate {
  private readonly hrRoles: Array<string> = [UserRole.Admin, UserRole.Controller, 'HR'];

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    const role = this.authService.getUser()?.role ?? (this.authService.getUserRole() as unknown as string);
    const canView = !!role && this.hrRoles.includes(role);

    if (!canView) {
      this.router.navigate(['/expenses/employee']);
      return false;
    }

    return true;
  }
}
