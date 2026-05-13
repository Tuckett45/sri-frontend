import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { MarketFilterInterceptor } from './market-filter.interceptor';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';
import { UserRole } from '../models/role.enum';

describe('MarketFilterInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getUser']);
    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', ['canAccessMarket']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: MarketFilterInterceptor,
          multi: true
        },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Admin user behavior', () => {
    it('should not add market parameter for Admin users', () => {
      // Arrange
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.Admin,
        market: 'TestMarket'
      });

      // Act
      httpClient.get('/api/street-sheet').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/street-sheet');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({});
    });

    it('should not modify Admin requests even for filtered endpoints', () => {
      // Arrange
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: UserRole.Admin,
        market: 'TestMarket'
      });

      // Act
      httpClient.get('/api/technician').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/technician');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({});
    });
  });

  describe('CM user behavior', () => {
    beforeEach(() => {
      authService.isAdmin.and.returnValue(false);
    });

    it('should add market parameter for CM users on filtered endpoints', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'NorthMarket'
      });

      // Act
      httpClient.get('/api/street-sheet').subscribe();

      // Assert
      const req = httpMock.expectOne(request => 
        request.url === '/api/street-sheet' && 
        request.params.get('market') === 'NorthMarket'
      );
      expect(req.request.params.get('market')).toBe('NorthMarket');
      req.flush({});
    });

    it('should add market parameter for daily-report endpoint', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'SouthMarket'
      });

      // Act
      httpClient.get('/api/daily-report').subscribe();

      // Assert
      const req = httpMock.expectOne(request => 
        request.url === '/api/daily-report' && 
        request.params.get('market') === 'SouthMarket'
      );
      expect(req.request.params.get('market')).toBe('SouthMarket');
      req.flush({});
    });

    it('should add market parameter for technician endpoint', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'EastMarket'
      });

      // Act
      httpClient.get('/api/technician').subscribe();

      // Assert
      const req = httpMock.expectOne(request => 
        request.url === '/api/technician' && 
        request.params.get('market') === 'EastMarket'
      );
      expect(req.request.params.get('market')).toBe('EastMarket');
      req.flush({});
    });

    it('should not add market parameter for non-filtered endpoints', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });

      // Act
      httpClient.get('/api/some-other-endpoint').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/some-other-endpoint');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({});
    });
  });

  describe('Market parameter already present', () => {
    beforeEach(() => {
      authService.isAdmin.and.returnValue(false);
    });

    it('should not modify request when market parameter is already specified', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'DefaultMarket'
      });

      // Act
      httpClient.get('/api/street-sheet?market=SpecificMarket').subscribe();

      // Assert - should NOT add another market parameter since one already exists in URL
      const req = httpMock.expectOne('/api/street-sheet?market=SpecificMarket');
      expect(req.request.url).toContain('market=SpecificMarket');
      // Should not have added the DefaultMarket
      expect(req.request.url).not.toContain('DefaultMarket');
      req.flush({});
    });

    it('should preserve explicitly set market parameter over user market', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'UserMarket'
      });

      // Act
      httpClient.get('/api/technician?market=ExplicitMarket').subscribe();

      // Assert - should NOT add another market parameter since one already exists in URL
      const req = httpMock.expectOne('/api/technician?market=ExplicitMarket');
      expect(req.request.url).toContain('market=ExplicitMarket');
      // Should not have added the UserMarket
      expect(req.request.url).not.toContain('UserMarket');
      req.flush({});
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      authService.isAdmin.and.returnValue(false);
    });

    it('should handle user without market gracefully', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'user-1',
        name: 'User',
        email: 'user@test.com',
        role: UserRole.CM,
        market: undefined
      });

      // Act
      httpClient.get('/api/street-sheet').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/street-sheet');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({});
    });

    it('should handle null user gracefully', () => {
      // Arrange
      authService.getUser.and.returnValue(null);

      // Act
      httpClient.get('/api/street-sheet').subscribe();

      // Assert
      const req = httpMock.expectOne('/api/street-sheet');
      expect(req.request.params.has('market')).toBeFalse();
      req.flush({});
    });

    it('should handle POST requests with market filtering', () => {
      // Arrange
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });

      // Act
      httpClient.post('/api/street-sheet', { data: 'test' }).subscribe();

      // Assert
      const req = httpMock.expectOne(request => 
        request.url === '/api/street-sheet' && 
        request.params.get('market') === 'TestMarket'
      );
      expect(req.request.params.get('market')).toBe('TestMarket');
      req.flush({});
    });
  });

  describe('Filtered endpoints', () => {
    beforeEach(() => {
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({
        id: 'cm-1',
        name: 'CM User',
        email: 'cm@test.com',
        role: UserRole.CM,
        market: 'TestMarket'
      });
    });

    it('should filter preliminary-punch-list endpoint', () => {
      httpClient.get('/api/preliminary-punch-list').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/preliminary-punch-list' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });

    it('should filter assignment endpoint', () => {
      httpClient.get('/api/assignment').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/assignment' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });

    it('should filter project endpoint', () => {
      httpClient.get('/api/project').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/project' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });

    it('should filter resource endpoint', () => {
      httpClient.get('/api/resource').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/resource' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });

    it('should filter approval endpoint', () => {
      httpClient.get('/api/approval').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/approval' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });

    it('should filter workflow endpoint', () => {
      httpClient.get('/api/workflow').subscribe();
      const req = httpMock.expectOne(request => 
        request.url === '/api/workflow' && 
        request.params.get('market') === 'TestMarket'
      );
      req.flush({});
    });
  });
});
