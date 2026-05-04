import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CMGuard } from './cm.guard';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/role.enum';

describe('CMGuard', () => {
  let guard: CMGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  // The full set of roles the CMGuard allows
  const expectedAllowedRoles = [UserRole.CM, UserRole.Admin, UserRole.Controller, UserRole.OSPCoordinator];

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        CMGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(CMGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Create mock route and state
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/cm/dashboard' } as RouterStateSnapshot;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access for CM users', () => {
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith(expectedAllowedRoles);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should allow access for Admin users', () => {
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith(expectedAllowedRoles);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access for users without CM or Admin role', () => {
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(authService.isUserInRole).toHaveBeenCalledWith(expectedAllowedRoles);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/cm/dashboard' }
      });
    });

    it('should include return URL in query parameters when redirecting', () => {
      authService.isUserInRole.and.returnValue(false);
      const customState = { url: '/cm/reports/monthly' } as RouterStateSnapshot;

      guard.canActivate(mockRoute, customState);

      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/cm/reports/monthly' }
      });
    });

    it('should deny access for Technician role', () => {
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should deny access for PM role', () => {
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should deny access for Client role', () => {
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalled();
    });
  });
});
