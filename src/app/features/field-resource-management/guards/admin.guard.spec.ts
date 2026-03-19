import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AdminGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for Admin role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.Admin]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for non-Admin role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.Admin]);
    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
      queryParams: { returnUrl: '/admin/settings' }
    });
  });

  it('should redirect with correct return URL for different routes', () => {
    authService.isUserInRole.and.returnValue(false);
    const testUrl = '/admin/dashboard';

    guard.canActivate({} as any, { url: testUrl } as any);

    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
      queryParams: { returnUrl: testUrl }
    });
  });

  it('should deny access for CM role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for PM role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for Technician role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should handle multiple consecutive calls consistently', () => {
    authService.isUserInRole.and.returnValue(true);

    const result1 = guard.canActivate({} as any, { url: '/admin/settings' } as any);
    const result2 = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledTimes(2);
  });
});
