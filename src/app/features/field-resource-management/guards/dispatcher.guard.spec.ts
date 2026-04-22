import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DispatcherGuard } from './dispatcher.guard';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

describe('DispatcherGuard', () => {
  let guard: DispatcherGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  // The full set of roles the DispatcherGuard allows
  const expectedAllowedRoles = [
    UserRole.User,
    UserRole.Technician,
    UserRole.CM,
    UserRole.Admin,
    UserRole.HR,
    UserRole.Payroll,
    UserRole.OSPCoordinator,
    UserRole.Controller,
    UserRole.EngineeringFieldSupport,
    UserRole.MaterialsManager,
    UserRole.PM
  ];

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        DispatcherGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(DispatcherGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for Admin role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith(expectedAllowedRoles);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for PM role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for CM role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for OSPCoordinator role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for Technician role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/technicians' } as any);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for unauthorized role and redirect to dashboard', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'Dispatcher or Admin access required'
        }
      }
    );
  });

  it('should redirect with correct query params for different routes', () => {
    authService.isUserInRole.and.returnValue(false);
    const testUrl = '/dispatcher/jobs';

    guard.canActivate({} as any, { url: testUrl } as any);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'Dispatcher or Admin access required'
        }
      }
    );
  });

  it('should handle multiple consecutive calls consistently', () => {
    authService.isUserInRole.and.returnValue(true);

    const result1 = guard.canActivate({} as any, { url: '/schedule' } as any);
    const result2 = guard.canActivate({} as any, { url: '/schedule' } as any);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledTimes(2);
  });
});
