import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

/**
 * Manager Guard
 * 
 * Protects routes that require Manager, HR, or Admin access.
 * Allows access for users with Manager, HR, or Admin roles.
 */
@Injectable({
  providedIn: 'root'
})
export class ManagerGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const user = this.authService.getUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return of(false);
    }
    
    // Allow Manager, HR, Admin, CM, and Controller roles
    const allowedRoles = [
      UserRole.Admin,
      UserRole.Manager,
      UserRole.HR,
      UserRole.CM,
      UserRole.Controller
    ];
    
    const hasAccess = allowedRoles.includes(user.role as UserRole);
    
    if (!hasAccess) {
      this.router.navigate(['/unauthorized']);
      return of(false);
    }
    
    return of(true);
  }
}
