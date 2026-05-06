import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class DispatcherGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  canActivate(): boolean {
    const user = this.authService.currentUser;
    const allowed = ['Admin', 'Dispatcher', 'CM', 'PM', 'Manager'];
    if (user && allowed.includes(user.role)) return true;
    this.router.navigate(['/field-resource-management/dashboard']);
    return false;
  }
}
