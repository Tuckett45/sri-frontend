import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  ElementRef,
  Renderer2,
  Optional
} from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { Store } from '@ngrx/store';
import { SecureAuthService } from '../services/secure-auth.service';
import { UserRole } from '../models/role.enum';
import { selectAllPermissions } from '../store/role-permissions/role-permissions.selectors';

/**
 * Unified role enforcement directive that supports both hide and disable modes.
 * 
 * Usage:
 * - Hide mode (default): *appRoleEnforcement="'Admin'"
 * - Disable mode: <button appRoleEnforcement="'Admin'" enforcementMode="disable">
 * - Multiple roles (OR): *appRoleEnforcement="['Admin', 'Manager']"
 * - Multiple roles (AND): *appRoleEnforcement="['Admin', 'Manager']" [requireAll]="true"
 * 
 * The directive will:
 * - In 'hide' mode: Remove the element from DOM if user lacks required role(s)
 * - In 'disable' mode: Disable the element if user lacks required role(s)
 * - React to role changes during the session
 */
@Directive({
  selector: '[appRoleEnforcement]'
})
export class RoleEnforcementDirective implements OnInit, OnDestroy {
  @Input() appRoleEnforcement: string | string[] = [];
  @Input() enforcementMode: 'hide' | 'disable' = 'hide';
  @Input() requireAll: boolean = false; // AND vs OR for multiple roles

  private destroy$ = new Subject<void>();
  private hasView = false;
  private isStructural = false;

  constructor(
    @Optional() private templateRef: TemplateRef<any>,
    @Optional() private viewContainer: ViewContainerRef,
    @Optional() private elementRef: ElementRef,
    @Optional() private renderer: Renderer2,
    private authService: SecureAuthService,
    private store: Store
  ) {
    // Determine if this is a structural directive (has TemplateRef) or attribute directive
    this.isStructural = !!this.templateRef && !!this.viewContainer;
  }

  ngOnInit(): void {
    // Initial permission check
    this.checkPermissions();

    // Subscribe to both authentication state changes AND role permission changes
    // This ensures the UI updates immediately when:
    // 1. User's role changes during a session (auth state change)
    // 2. Role permissions are updated in the system (permission state change)
    combineLatest([
      this.authService.getAuthState(),
      this.store.select(selectAllPermissions)
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Re-evaluate permissions whenever auth state or permissions change
        this.checkPermissions();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check permissions and apply enforcement
   */
  private checkPermissions(): void {
    const hasPermission = this.evaluatePermissions();
    this.applyEnforcement(hasPermission);
  }

  /**
   * Evaluate if the current user has the required permissions
   */
  private evaluatePermissions(): boolean {
    // Check if user is authenticated
    const authState = this.authService['authState$']?.value;
    if (!authState || !authState.isAuthenticated || !authState.user) {
      return false;
    }

    const user = authState.user;
    const userRole = user.role;

    // Normalize roles to array
    const requiredRoles = Array.isArray(this.appRoleEnforcement)
      ? this.appRoleEnforcement
      : [this.appRoleEnforcement];

    if (requiredRoles.length === 0) {
      return false;
    }

    // Check role requirements
    if (this.requireAll) {
      // AND logic: user must have ALL specified roles
      // Note: In this system, users typically have one role, so this will check if the user's role matches all requirements
      // This is more useful for future multi-role systems
      return requiredRoles.every(role => this.hasRole(userRole, role));
    } else {
      // OR logic: user must have ANY of the specified roles
      return requiredRoles.some(role => this.hasRole(userRole, role));
    }
  }

  /**
   * Check if user has a specific role
   */
  private hasRole(userRole: string, requiredRole: string): boolean {
    // Direct role match
    if (userRole === requiredRole) {
      return true;
    }

    // Check if it's a UserRole enum value
    const roleEnumValue = UserRole[requiredRole as keyof typeof UserRole];
    if (roleEnumValue && userRole === roleEnumValue) {
      return true;
    }

    return false;
  }

  /**
   * Apply enforcement based on permission status
   */
  private applyEnforcement(hasPermission: boolean): void {
    if (this.enforcementMode === 'hide') {
      this.applyHideEnforcement(hasPermission);
    } else {
      this.applyDisableEnforcement(hasPermission);
    }
  }

  /**
   * Apply hide enforcement (structural directive behavior)
   */
  private applyHideEnforcement(hasPermission: boolean): void {
    if (!this.isStructural || !this.viewContainer || !this.templateRef) {
      console.warn('RoleEnforcementDirective: Hide mode requires structural directive usage (*appRoleEnforcement)');
      return;
    }

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  /**
   * Apply disable enforcement (attribute directive behavior)
   */
  private applyDisableEnforcement(hasPermission: boolean): void {
    if (!this.elementRef || !this.renderer) {
      console.warn('RoleEnforcementDirective: Disable mode requires attribute directive usage [appRoleEnforcement]');
      return;
    }

    const element = this.elementRef.nativeElement;

    if (!hasPermission) {
      this.disableElement(element);
    } else {
      this.enableElement(element);
    }
  }

  /**
   * Disable the element and apply visual styling
   */
  private disableElement(element: HTMLElement): void {
    if (!this.renderer) return;

    // Set disabled attribute for form controls
    if (this.isFormControl(element)) {
      this.renderer.setProperty(element, 'disabled', true);
    }

    // Add disabled class for visual styling
    this.renderer.addClass(element, 'role-disabled');

    // Add pointer-events: none to prevent interaction
    this.renderer.setStyle(element, 'pointer-events', 'none');

    // Add opacity for visual feedback
    this.renderer.setStyle(element, 'opacity', '0.5');

    // Add cursor style
    this.renderer.setStyle(element, 'cursor', 'not-allowed');

    // Add tooltip
    this.renderer.setAttribute(element, 'title', 'You do not have permission to perform this action');

    // Add aria-disabled for accessibility
    this.renderer.setAttribute(element, 'aria-disabled', 'true');
  }

  /**
   * Enable the element and remove visual styling
   */
  private enableElement(element: HTMLElement): void {
    if (!this.renderer) return;

    // Remove disabled attribute for form controls
    if (this.isFormControl(element)) {
      this.renderer.setProperty(element, 'disabled', false);
    }

    // Remove disabled class
    this.renderer.removeClass(element, 'role-disabled');

    // Remove inline styles
    this.renderer.removeStyle(element, 'pointer-events');
    this.renderer.removeStyle(element, 'opacity');
    this.renderer.removeStyle(element, 'cursor');

    // Remove tooltip
    this.renderer.removeAttribute(element, 'title');

    // Remove aria-disabled
    this.renderer.removeAttribute(element, 'aria-disabled');
  }

  /**
   * Check if the element is a form control
   */
  private isFormControl(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return ['input', 'select', 'textarea', 'button'].includes(tagName);
  }
}
