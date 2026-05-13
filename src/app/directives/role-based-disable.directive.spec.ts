import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { RoleBasedDisableDirective } from './role-based-disable.directive';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

// Test component to host the directive
@Component({
  template: `
    <button [roleBasedDisable]="role" id="single-role-btn">Single Role Button</button>
    <button [roleBasedDisable]="roles" id="multiple-roles-btn">Multiple Roles Button</button>
    <input [roleBasedDisable]="role" id="input-field" type="text" />
    <div [roleBasedDisable]="role" id="div-element">Div Element</div>
    <button 
      [roleBasedDisable]="role" 
      [roleBasedDisableMessage]="customMessage" 
      id="custom-message-btn">
      Custom Message Button
    </button>
  `
})
class TestComponent {
  role: UserRole = UserRole.Admin;
  roles: UserRole[] = [UserRole.CM, UserRole.Admin];
  customMessage: string = 'Custom permission message';
}

describe('RoleBasedDisableDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let loginStatus$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    loginStatus$ = new BehaviorSubject<boolean>(true);

    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isLoggedIn',
      'isUserInRole',
      'getLoginStatus'
    ]);
    authServiceSpy.getLoginStatus.and.returnValue(loginStatus$.asObservable());

    await TestBed.configureTestingModule({
      declarations: [RoleBasedDisableDirective, TestComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  describe('Single Role', () => {
    it('should enable element when user has the required role', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(false);
      expect(element.classList.contains('role-disabled')).toBe(false);
      expect(element.style.opacity).toBe('');
    });

    it('should disable element when user does not have the required role', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(true);
      expect(element.classList.contains('role-disabled')).toBe(true);
      expect(element.style.opacity).toBe('0.5');
      expect(element.style.pointerEvents).toBe('none');
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should disable element when user is not logged in', () => {
      authService.isLoggedIn.and.returnValue(false);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(true);
      expect(element.classList.contains('role-disabled')).toBe(true);
    });
  });

  describe('Multiple Roles', () => {
    it('should enable element when user has one of the required roles', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#multiple-roles-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(false);
      expect(element.classList.contains('role-disabled')).toBe(false);
    });

    it('should disable element when user does not have any of the required roles', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#multiple-roles-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(true);
      expect(element.classList.contains('role-disabled')).toBe(true);
    });
  });

  describe('Form Controls', () => {
    it('should disable input field when user lacks permission', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('#input-field'));
      const element = input.nativeElement as HTMLInputElement;

      expect(element.disabled).toBe(true);
      expect(element.classList.contains('role-disabled')).toBe(true);
    });

    it('should enable input field when user has permission', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('#input-field'));
      const element = input.nativeElement as HTMLInputElement;

      expect(element.disabled).toBe(false);
      expect(element.classList.contains('role-disabled')).toBe(false);
    });
  });

  describe('Non-Form Elements', () => {
    it('should apply visual styling to non-form elements', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const div = fixture.debugElement.query(By.css('#div-element'));
      const element = div.nativeElement as HTMLDivElement;

      expect(element.classList.contains('role-disabled')).toBe(true);
      expect(element.style.opacity).toBe('0.5');
      expect(element.style.pointerEvents).toBe('none');
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should not set disabled property on non-form elements', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const div = fixture.debugElement.query(By.css('#div-element'));
      const element = div.nativeElement as any;

      // Div elements don't have a disabled property
      expect(element.disabled).toBeUndefined();
    });
  });

  describe('Tooltip', () => {
    it('should add default tooltip when element is disabled', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.title).toBe('You do not have permission to perform this action');
    });

    it('should add custom tooltip when provided', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#custom-message-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.title).toBe('Custom permission message');
    });

    it('should remove tooltip when element is enabled', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.title).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should add aria-disabled attribute when disabled', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.getAttribute('aria-disabled')).toBe('true');
    });

    it('should remove aria-disabled attribute when enabled', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#single-role-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('Role Changes', () => {
    it('should update disabled state when login status changes', (done) => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      let button = fixture.debugElement.query(By.css('#single-role-btn'));
      let element = button.nativeElement as HTMLButtonElement;
      expect(element.disabled).toBe(false);

      // Simulate logout
      authService.isLoggedIn.and.returnValue(false);
      loginStatus$.next(false);

      // Wait for async update
      setTimeout(() => {
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('#single-role-btn'));
        element = button.nativeElement as HTMLButtonElement;
        expect(element.disabled).toBe(true);
        done();
      }, 100);
    });

    it('should enable element when user gains permission', (done) => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      let button = fixture.debugElement.query(By.css('#single-role-btn'));
      let element = button.nativeElement as HTMLButtonElement;
      expect(element.disabled).toBe(true);

      // Simulate role change
      authService.isUserInRole.and.returnValue(true);
      loginStatus$.next(true);

      // Wait for async update
      setTimeout(() => {
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('#single-role-btn'));
        element = button.nativeElement as HTMLButtonElement;
        expect(element.disabled).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should enable element when role array is empty', () => {
      component.roles = [];
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('#multiple-roles-btn'));
      const element = button.nativeElement as HTMLButtonElement;

      expect(element.disabled).toBe(false);
    });
  });
});
