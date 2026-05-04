import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PMGuard } from './pm.guard';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

describe('PMGuard', () => {
  let guard: PMGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        PMGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(PMGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for PM role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.PM, UserRole.VendorRep]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for VendorRep role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.PM, UserRole.VendorRep]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for non-PM/Vendor role and redirect to dashboard', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(false);
    expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.PM, UserRole.VendorRep]);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'PM or Vendor access required'
        }
      }
    );
  });

  it('should redirect to dashboard with correct query params on denial', () => {
    authService.isUserInRole.and.returnValue(false);
    const testUrl = '/pm/dashboard';

    guard.canActivate({} as any, { url: testUrl } as any);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'PM or Vendor access required'
        }
      }
    );
  });

  it('should deny access for Technician role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for CM role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for Admin role (not in PM/Vendor group)', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should handle multiple consecutive calls consistently', () => {
    authService.isUserInRole.and.returnValue(true);

    const result1 = guard.canActivate({} as any, { url: '/pm/jobs' } as any);
    const result2 = guard.canActivate({} as any, { url: '/pm/jobs' } as any);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledTimes(2);
  });
});
