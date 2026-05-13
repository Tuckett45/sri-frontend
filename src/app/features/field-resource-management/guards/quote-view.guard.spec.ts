import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { QuoteViewGuard } from './quote-view.guard';
import { AuthService } from '../../../services/auth.service';
import { FrmPermissionService } from '../services/frm-permission.service';
import { UserRole } from '../../../models/role.enum';

describe('QuoteViewGuard', () => {
  let guard: QuoteViewGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let frmPermissionService: FrmPermissionService;
  let router: jasmine.SpyObj<Router>;

  const mockRoute: any = {};
  const mockState: any = { url: '/field-resource-management/quotes' };

  function setUser(role: string | null): void {
    if (role === null) {
      authService.getUser.and.returnValue(null);
    } else {
      authService.getUser.and.returnValue({ role });
    }
  }

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        QuoteViewGuard,
        FrmPermissionService,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(QuoteViewGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    frmPermissionService = TestBed.inject(FrmPermissionService);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for Admin role', () => {
    setUser(UserRole.Admin);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for PM role', () => {
    setUser(UserRole.PM);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for Manager role', () => {
    setUser(UserRole.Manager);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for DCOps role', () => {
    setUser(UserRole.DCOps);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for OSPCoordinator role', () => {
    setUser(UserRole.OSPCoordinator);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for EngineeringFieldSupport role', () => {
    setUser(UserRole.EngineeringFieldSupport);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should allow access for MaterialsManager role', () => {
    setUser(UserRole.MaterialsManager);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for Technician role', () => {
    setUser(UserRole.Technician);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for HR role', () => {
    setUser(UserRole.HR);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access when user is null', () => {
    setUser(null);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should redirect to dashboard with correct query params on denial', () => {
    setUser(UserRole.Technician);
    guard.canActivate(mockRoute, mockState);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/field-resource-management/dashboard'],
      {
        queryParams: {
          error: 'insufficient_permissions',
          message: 'Quote view access required'
        }
      }
    );
  });

  it('should deny access for VendorRep role (ReadOnly group)', () => {
    setUser(UserRole.VendorRep);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should deny access for Payroll role', () => {
    setUser(UserRole.Payroll);
    const result = guard.canActivate(mockRoute, mockState);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalled();
  });
});
