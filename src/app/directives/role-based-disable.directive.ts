import { 
  Directive, 
  ElementRef, 
  Input, 
  OnInit, 
  OnDestroy, 
  Renderer2 
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

/**
 * Attribute directive for conditionally disabling elements based on user role.
 * 
 * Usage:
 * - Single role: [roleBasedDisable]="UserRole.Admin"
 * - Multiple roles: [roleBasedDisable]="[UserRole.CM, UserRole.Admin]"
 * 
 * The directive will disable the element if the user does NOT have one of the specified roles.
 * It also adds visual styling and a tooltip explaining why the element is disabled.
 */
@Directive({
  selector: '[roleBasedDisable]'
})
export class RoleBasedDisableDirective implements OnInit, OnDestroy {
  @Input() roleBasedDisable: UserRole | UserRole[] = [];
  @Input() roleBasedDisableMessage?: string;

  private destroy$ = new Subject<void>();
  private defaultMessage = 'You do not have permission to perform this action';

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Initial state update
    this.updateDisabledState();

    // Subscribe to login status changes to update state when user logs in/out
    this.authService.getLoginStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDisabledState();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update the disabled state based on current user's role
   */
  private updateDisabledState(): void {
    const shouldDisable = !this.checkRoleAccess();

    if (shouldDisable) {
      this.disableElement();
    } else {
      this.enableElement();
    }
  }

  /**
   * Check if the current user has one of the required roles
   */
  private checkRoleAccess(): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    const roles = Array.isArray(this.roleBasedDisable) 
      ? this.roleBasedDisable 
      : [this.roleBasedDisable];

    if (roles.length === 0) {
      return true; // No roles specified means no restriction
    }

    return this.authService.isUserInRole(roles);
  }

  /**
   * Disable the element and apply visual styling
   */
  private disableElement(): void {
    const element = this.el.nativeElement;

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
    const message = this.roleBasedDisableMessage || this.defaultMessage;
    this.renderer.setAttribute(element, 'title', message);

    // Add aria-disabled for accessibility
    this.renderer.setAttribute(element, 'aria-disabled', 'true');
  }

  /**
   * Enable the element and remove visual styling
   */
  private enableElement(): void {
    const element = this.el.nativeElement;

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
