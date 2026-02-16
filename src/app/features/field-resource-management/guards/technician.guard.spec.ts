import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TechnicianGuard } from './technician.guard';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/role.enum';

describe('TechnicianGuard', () => {
  let guard: TechnicianGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        TechnicianGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(TechnicianGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for Technician role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/mobile/daily' } as any);

    expect(result).toBe(true);
    expect(authService.isUserInRole).toHaveBeenCalledWith([
      UserRole.Technician,
      UserRole.DeploymentEngineer,
      UserRole.SRITech
    ]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for DeploymentEngineer role', () => {
    authService.isUserInRole.and.returnValue(true);

    const result = guard.canActivate({} as any, { url: '/mobile/daily' } as any);

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for non-Technician role', () => {
    authService.isUserInRole.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/mobile/daily' } as any);

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
      queryParams: { returnUrl: '/mobile/daily' }
    });
  });
});
