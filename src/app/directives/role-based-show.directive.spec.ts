import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { RoleBasedShowDirective } from './role-based-show.directive';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { UserRole } from '../models/role.enum';

// Test component to host the directive
@Component({
  template: `
    <div *roleBasedShow="role" id="single-role">Single Role Content</div>
    <div *roleBasedShow="roles" id="multiple-roles">Multiple Roles Content</div>
    <div *roleBasedShow="role; market: market" id="with-market">Market Content</div>
  `
})
class TestComponent {
  role: UserRole = UserRole.CM;
  roles: UserRole[] = [UserRole.CM, UserRole.Admin];
  market: string = 'NYC';
}

describe('RoleBasedShowDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;
  let loginStatus$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    loginStatus$ = new BehaviorSubject<boolean>(true);

    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isLoggedIn',
      'isUserInRole',
      'getLoginStatus'
    ]);
    authServiceSpy.getLoginStatus.and.returnValue(loginStatus$.asObservable());

    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', [
      'canAccessMarket'
    ]);

    await TestBed.configureTestingModule({
      declarations: [RoleBasedShowDirective, TestComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  describe('Single Role', () => {
    it('should show content when user has the required role', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#single-role'));
      expect(element).toBeTruthy();
      expect(element.nativeElement.textContent).toContain('Single Role Content');
    });

    it('should hide content when user does not have the required role', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#single-role'));
      expect(element).toBeNull();
    });

    it('should hide content when user is not logged in', () => {
      authService.isLoggedIn.and.returnValue(false);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#single-role'));
      expect(element).toBeNull();
    });
  });

  describe('Multiple Roles', () => {
    it('should show content when user has one of the required roles', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#multiple-roles'));
      expect(element).toBeTruthy();
      expect(element.nativeElement.textContent).toContain('Multiple Roles Content');
    });

    it('should hide content when user does not have any of the required roles', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#multiple-roles'));
      expect(element).toBeNull();
    });
  });

  describe('Market Filtering', () => {
    it('should show content when user has role and market access', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#with-market'));
      expect(element).toBeTruthy();
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('NYC');
    });

    it('should hide content when user has role but no market access', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(false);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#with-market'));
      expect(element).toBeNull();
    });

    it('should hide content when user has market access but no role', () => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#with-market'));
      expect(element).toBeNull();
    });
  });

  describe('Role Changes', () => {
    it('should update view when login status changes', (done) => {
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      let element = fixture.debugElement.query(By.css('#single-role'));
      expect(element).toBeTruthy();

      // Simulate logout
      authService.isLoggedIn.and.returnValue(false);
      loginStatus$.next(false);

      // Wait for async update
      setTimeout(() => {
        fixture.detectChanges();
        element = fixture.debugElement.query(By.css('#single-role'));
        expect(element).toBeNull();
        done();
      }, 100);
    });

    it('should show content when user logs in', (done) => {
      authService.isLoggedIn.and.returnValue(false);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      let element = fixture.debugElement.query(By.css('#single-role'));
      expect(element).toBeNull();

      // Simulate login
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);
      loginStatus$.next(true);

      // Wait for async update
      setTimeout(() => {
        fixture.detectChanges();
        element = fixture.debugElement.query(By.css('#single-role'));
        expect(element).toBeTruthy();
        done();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should hide content when role array is empty', () => {
      component.roles = [];
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(false);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#multiple-roles'));
      expect(element).toBeNull();
    });

    it('should handle undefined market gracefully', () => {
      component.market = undefined as any;
      authService.isLoggedIn.and.returnValue(true);
      authService.isUserInRole.and.returnValue(true);

      fixture.detectChanges();

      const element = fixture.debugElement.query(By.css('#with-market'));
      expect(element).toBeTruthy();
      expect(roleBasedDataService.canAccessMarket).not.toHaveBeenCalled();
    });
  });
});
