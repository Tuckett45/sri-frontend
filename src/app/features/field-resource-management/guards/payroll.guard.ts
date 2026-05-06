import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class PayrollGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  canActivate(): boolean {
    const user = this.authService.getCurrentUser();
    const allowed = ['Admin', 'HR', 'Payroll'];
    if (user && allowed.includes(user.role)) return true;
    this.router.navigate(['/field-resource-management/dashboard']);
    return false;
  }
}
