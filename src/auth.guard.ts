import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './app/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {
    console.log('AuthGuard - Constructor called');
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    console.log('AuthGuard - canActivate called for route:', state.url);
    console.log('AuthGuard - localStorage.loggedIn:', localStorage.getItem('loggedIn'));
    console.log('AuthGuard - localStorage.user:', localStorage.getItem('user'));
    console.log('AuthGuard - sessionStorage.authToken:', sessionStorage.getItem('authToken'));
    
    const isAuthenticated = this.authService.isLoggedIn();
    console.log('AuthGuard - isAuthenticated:', isAuthenticated);

    if (!isAuthenticated) {
      console.warn('AuthGuard - User not authenticated, redirecting to login');
      console.warn('AuthGuard - Attempted to access:', state.url);
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    console.log('AuthGuard - Access granted for:', state.url);
    return true;
  }
}