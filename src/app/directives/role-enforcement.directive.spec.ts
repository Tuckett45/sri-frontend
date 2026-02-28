import { Component, DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { RoleEnforcementDirective } from './role-enforcement.directive';
import { SecureAuthService } from '../services/secure-auth.service';
import { UserRole } from '../models/role.enum';
import { SecureAuthState } from '../models/auth.model';
import { User } from '../models/user.model';

// Test component for structural directive (hide mode)
@Component({
  template: `
    <div *appRoleEnforcement="role" id="test-element">
      Protected Content
    </div>
  `
})
class TestHideComponent {
  role: string | string[] = UserRole.Admin;
}

// Test component for attribute directive (disable mode)
@Component({
  template: `
    <button [appRoleEnforcement]="role" [enforcementMode]="'disable'" id="test-button">
      Protected Action
    </button>
  `
})
class TestDisableComponent {
  role: string | string[] = UserRole.Admin;
}

// Test component for multiple roles with AND logic
@Component({
  template: `
    <div *appRoleEnforcement="roles" [requireAll]="true" id="test-element">
      Protected Content
    </div>
  `
})
class TestRequireAllComponent {
  roles: string[] = [UserRole.Admin, UserRole.CM];
}

describe('RoleEnforcementDirective', () => {
  let mockAuthService: jasmine.SpyObj<SecureAuthService>;
  let authStateSubject: BehaviorSubject<SecureAuthState>;

  beforeEach(() => {
    // Create mock auth state
    authStateSubject = new BehaviorSubject<SecureAuthState>({
      isAuthenticated: false,
      user: null,
      tokenExpiresAt: null,
      lastValidated: null,
      sessionId: null,
      authMethod: 'memory-only' as any
    });

    // Create mock auth service
    mockAuthService = jasmine.createSpyObj('SecureAuthService', ['getAuthState']);
    mockAuthService.getAuthState.and.returnValue(authStateSubject.asObservable());
    (mockAuthService as any).authState$ = authStateSubject;
  });

  describe('Hide Mode (Structural Directive)', () => {
    let fixture: ComponentFixture<TestHideComponent>;
    let component: TestHideComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [RoleEnforcementDirective, TestHideComponent],
        providers: [
          { provide: SecureAuthService, useValue: mockAuthService }
        ]
      });

      fixture = TestBed.createComponent(TestHideComponent);
      component = fixture.componentInstance;
    });

    it('should hide element when user is not authenticated', () => {
      authStateSubject.next({
        isAuthenticated: false,
        user: null,
        tokenExpiresAt: null,
        lastValidated: null,
        sessionId: null,
        authMethod: 'memory-only' as any
      });

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).toBeNull();
    });

    it('should show element when user has required role', () => {
      const adminUser = new User(
        '1',
        'Admin User',
        'admin@test.com',
        'password',
        UserRole.Admin,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: adminUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = UserRole.Admin;
      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).not.toBeNull();
      expect(element.nativeElement.textContent.trim()).toBe('Protected Content');
    });

    it('should hide element when user lacks required role', () => {
      const regularUser = new User(
        '2',
        'Regular User',
        'user@test.com',
        'password',
        UserRole.User,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: regularUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = UserRole.Admin;
      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).toBeNull();
    });

    it('should show element when user has one of multiple roles (OR logic)', () => {
      const cmUser = new User(
        '3',
        'CM User',
        'cm@test.com',
        'password',
        UserRole.CM,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: cmUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = [UserRole.Admin, UserRole.CM];
      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).not.toBeNull();
    });

    it('should react to role changes during session', () => {
      const regularUser = new User(
        '4',
        'Regular User',
        'user@test.com',
        'password',
        UserRole.User,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: regularUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = UserRole.Admin;
      fixture.detectChanges();

      // Initially hidden
      let element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).toBeNull();

      // User role changes to Admin
      const adminUser = new User(
        '4',
        'Admin User',
        'user@test.com',
        'password',
        UserRole.Admin,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: adminUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      fixture.detectChanges();

      // Now visible
      element = fixture.debugElement.query(By.css('#test-element'));
      expect(element).not.toBeNull();
    });
  });

  describe('Disable Mode (Attribute Directive)', () => {
    let fixture: ComponentFixture<TestDisableComponent>;
    let component: TestDisableComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [RoleEnforcementDirective, TestDisableComponent],
        providers: [
          { provide: SecureAuthService, useValue: mockAuthService }
        ]
      });

      fixture = TestBed.createComponent(TestDisableComponent);
      component = fixture.componentInstance;
    });

    it('should disable element when user lacks required role', () => {
      const regularUser = new User(
        '5',
        'Regular User',
        'user@test.com',
        'password',
        UserRole.User,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: regularUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = UserRole.Admin;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#test-button'));
      expect(button).not.toBeNull();
      expect(button.nativeElement.disabled).toBe(true);
      expect(button.nativeElement.classList.contains('role-disabled')).toBe(true);
      expect(button.nativeElement.getAttribute('aria-disabled')).toBe('true');
    });

    it('should enable element when user has required role', () => {
      const adminUser = new User(
        '6',
        'Admin User',
        'admin@test.com',
        'password',
        UserRole.Admin,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: adminUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = UserRole.Admin;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#test-button'));
      expect(button).not.toBeNull();
      expect(button.nativeElement.disabled).toBe(false);
      expect(button.nativeElement.classList.contains('role-disabled')).toBe(false);
      expect(button.nativeElement.getAttribute('aria-disabled')).toBeNull();
    });

    it('should enable element when user has one of multiple roles (OR logic)', () => {
      const cmUser = new User(
        '7',
        'CM User',
        'cm@test.com',
        'password',
        UserRole.CM,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: cmUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.role = [UserRole.Admin, UserRole.CM];
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#test-button'));
      expect(button).not.toBeNull();
      expect(button.nativeElement.disabled).toBe(false);
    });
  });

  describe('AND Logic (requireAll)', () => {
    let fixture: ComponentFixture<TestRequireAllComponent>;
    let component: TestRequireAllComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [RoleEnforcementDirective, TestRequireAllComponent],
        providers: [
          { provide: SecureAuthService, useValue: mockAuthService }
        ],
        schemas: [NO_ERRORS_SCHEMA] // Allow unknown properties for testing
      });

      fixture = TestBed.createComponent(TestRequireAllComponent);
      component = fixture.componentInstance;
    });

    it('should hide element when user has only one of multiple required roles', () => {
      const cmUser = new User(
        '8',
        'CM User',
        'cm@test.com',
        'password',
        UserRole.CM,
        'NYC',
        'Test Company',
        new Date(),
        true
      );

      authStateSubject.next({
        isAuthenticated: true,
        user: cmUser,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        sessionId: 'test-session',
        authMethod: 'memory-only' as any
      });

      component.roles = [UserRole.Admin, UserRole.CM];
      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#test-element'));
      // With AND logic, user needs both Admin AND CM roles
      // Since user only has CM, element should be hidden
      expect(element).toBeNull();
    });
  });
});
