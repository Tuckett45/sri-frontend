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
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole', 'getUser']);
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

    // Default: return a mock user
    authService.getUser.and.returnValue({ role: 'User' });
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for Admin role', () => {
    authService.getUser.and.returnValue({ role: UserRole.Admin });
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.Admin]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for non-Admin role and redirect to dashboard', () => {
    authService.getUser.and.returnValue({ role: UserRole.Technician });
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.Admin]);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'Admin access required'
        }
      }
    );
  });

  it('should deny access for CM role', () => {
    authService.getUser.and.returnValue({ role: UserRole.CM });
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for PM role', () => {
    authService.getUser.and.returnValue({ role: UserRole.PM });
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for Technician role', () => {
    authService.getUser.and.returnValue({ role: UserRole.Technician });
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should handle multiple consecutive calls consistently', () => {
    authService.getUser.and.returnValue({ role: UserRole.Admin });
    authService.isUserInRole.and.returnValue(true);

    const result1 = guard.canActivate({} as any, { url: '/admin/settings' } as any);
    const result2 = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledTimes(2);
  });

  it('should deny access when user is null (unauthenticated)', () => {
    authService.getUser.and.returnValue(null);
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/settings' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({
          error: 'insufficient_permissions'
        })
      })
    );
  });
});
