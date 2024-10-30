import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "./app/services/auth.service";
import { UserRole } from "./app/models/role.enum";

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        // Use bracket notation to access the expectedRoles property
        const expectedRoles: UserRole[] = route.data['expectedRoles']; 
    
        if (this.authService.isUserInRole(expectedRoles)) {
          return true; // User has access
        } else {
          this.router.navigate(['/unauthorized']); // Redirect to unauthorized page
          return false; // User does not have access
        }
    }
}