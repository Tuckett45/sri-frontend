import { 
  Directive, 
  Input, 
  OnInit, 
  OnDestroy, 
  TemplateRef, 
  ViewContainerRef 
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { UserRole } from '../models/role.enum';

/**
 * Structural directive for conditional rendering based on user role and optional market access.
 * 
 * Usage:
 * - Single role: *roleBasedShow="UserRole.Admin"
 * - Multiple roles: *roleBasedShow="[UserRole.CM, UserRole.Admin]"
 * - With market: *roleBasedShow="UserRole.CM; market: 'NYC'"
 * 
 * The directive will show the element only if:
 * 1. The user has one of the specified roles
 * 2. If a market is specified, the user has access to that market
 */
@Directive({
  selector: '[roleBasedShow]'
})
export class RoleBasedShowDirective implements OnInit, OnDestroy {
  @Input() roleBasedShow: UserRole | UserRole[] = [];
  @Input() roleBasedShowMarket?: string;

  private destroy$ = new Subject<void>();
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  ngOnInit(): void {
    // Initial view update
    this.updateView();

    // Subscribe to login status changes to update view when user logs in/out
    this.authService.getLoginStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update the view based on current user's role and market access
   */
  private updateView(): void {
    const shouldShow = this.checkAccess();

    if (shouldShow && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!shouldShow && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  /**
   * Check if the current user has access based on role and market
   */
  private checkAccess(): boolean {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    // Check role access
    const hasRole = this.checkRoleAccess();
    if (!hasRole) {
      return false;
    }

    // Check market access if specified
    if (this.roleBasedShowMarket) {
      const hasMarketAccess = this.roleBasedDataService.canAccessMarket(
        this.roleBasedShowMarket
      );
      return hasMarketAccess;
    }

    return true;
  }

  /**
   * Check if the current user has one of the required roles
   */
  private checkRoleAccess(): boolean {
    const roles = Array.isArray(this.roleBasedShow) 
      ? this.roleBasedShow 
      : [this.roleBasedShow];

    if (roles.length === 0) {
      return false;
    }

    return this.authService.isUserInRole(roles);
  }
}
