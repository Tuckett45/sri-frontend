import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { EnhancedRoleGuard, RoleGuardConfig } from './enhanced-role.guard';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { UserRole } from '../models/role.enum';

describe('EnhancedRoleGuard', () => {
  let guard: EnhancedRoleGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;
  let router: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', ['canAccessMarket']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        EnhancedRoleGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(EnhancedRoleGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Create mock route and state
    mockRoute = {
      params: {},
      data: {}
    } as any;
    mockState = { url: '/projects/market1' } as RouterStateSnapshot;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate - role validation', () => {
    it('should allow access when user has required role', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM, UserRole.Admin]
      };
      mockRoute.data = { roleGuard: config };
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.CM, UserRole.Admin]);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required role', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.Admin]
      };
      mockRoute.data = { roleGuard: config };
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.Admin]);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/projects/market1' }
      });
    });

    it('should deny access when no roleGuard configuration is provided', () => {
      mockRoute.data = {};

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
    });

    it('should allow access for single role configuration', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM]
      };
      mockRoute.data = { roleGuard: config };
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.CM]);
    });

    it('should allow access for multiple role configuration', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM, UserRole.Admin, UserRole.PM]
      };
      mockRoute.data = { roleGuard: config };
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.CM, UserRole.Admin, UserRole.PM]);
    });
  });

  describe('canActivate - market validation', () => {
    it('should allow access when market validation passes', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('market1');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access when market validation fails', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market2' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('market2');
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/projects/market1' }
      });
    });

    it('should use default market param name when not specified', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('market1');
    });

    it('should use custom market param name when specified', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'marketId'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { marketId: 'customMarket' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('customMarket');
    });

    it('should skip market validation when requireMarketMatch is false', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: false
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).not.toHaveBeenCalled();
    });

    it('should skip market validation when requireMarketMatch is not set', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM]
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).not.toHaveBeenCalled();
    });

    it('should allow access when market param is not present in route', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = {}; // No market param
      authService.isUserInRole.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(roleBasedDataService.canAccessMarket).not.toHaveBeenCalled();
    });
  });

  describe('canActivate - combined role and market validation', () => {
    it('should check role before market validation', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.Admin],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(authService.isUserInRole).toHaveBeenCalled();
      expect(roleBasedDataService.canAccessMarket).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/projects/market1' }
      });
    });

    it('should pass both role and market validation for authorized access', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM, UserRole.Admin],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market1' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(authService.isUserInRole).toHaveBeenCalledWith([UserRole.CM, UserRole.Admin]);
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('market1');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access when role passes but market validation fails', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'unauthorizedMarket' };
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(false);
      expect(authService.isUserInRole).toHaveBeenCalled();
      expect(roleBasedDataService.canAccessMarket).toHaveBeenCalledWith('unauthorizedMarket');
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/projects/market1' }
      });
    });
  });

  describe('canActivate - return URL handling', () => {
    it('should include return URL in query parameters when role check fails', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.Admin]
      };
      mockRoute.data = { roleGuard: config };
      const customState = { url: '/admin/settings' } as RouterStateSnapshot;
      authService.isUserInRole.and.returnValue(false);

      guard.canActivate(mockRoute, customState);

      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/admin/settings' }
      });
    });

    it('should include return URL in query parameters when market check fails', () => {
      const config: RoleGuardConfig = {
        allowedRoles: [UserRole.CM],
        requireMarketMatch: true,
        marketParam: 'market'
      };
      mockRoute.data = { roleGuard: config };
      mockRoute.params = { market: 'market2' };
      const customState = { url: '/projects/market2/details' } as RouterStateSnapshot;
      authService.isUserInRole.and.returnValue(true);
      roleBasedDataService.canAccessMarket.and.returnValue(false);

      guard.canActivate(mockRoute, customState);

      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized'], {
        queryParams: { returnUrl: '/projects/market2/details' }
      });
    });
  });
});
