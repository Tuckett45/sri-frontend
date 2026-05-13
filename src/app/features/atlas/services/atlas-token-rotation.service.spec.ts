import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AtlasTokenRotationService, TokenRotationConfig } from './atlas-token-rotation.service';
import { AtlasAuthService, AtlasToken } from './atlas-auth.service';
import { of, BehaviorSubject } from 'rxjs';

describe('AtlasTokenRotationService', () => {
  let service: AtlasTokenRotationService;
  let authServiceMock: jasmine.SpyObj<AtlasAuthService>;
  let authStateSubject: BehaviorSubject<any>;

  beforeEach(() => {
    authStateSubject = new BehaviorSubject({
      isAuthenticated: false,
      token: null,
      lastRefreshed: null,
      sessionId: null
    });

    authServiceMock = jasmine.createSpyObj('AtlasAuthService', [
      'isAuthenticated',
      'refreshToken'
    ], {
      authState: authStateSubject.asObservable(),
      currentAuthState: authStateSubject.value
    });

    TestBed.configureTestingModule({
      providers: [
        AtlasTokenRotationService,
        { provide: AtlasAuthService, useValue: authServiceMock }
      ]
    });

    service = TestBed.inject(AtlasTokenRotationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('configuration', () => {
    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.rotationIntervalMs).toBeGreaterThan(0);
      expect(config.maxTokenAge).toBeGreaterThan(0);
      expect(config.rotateBeforeExpiry).toBeGreaterThan(0);
    });

    it('should update configuration', () => {
      const newConfig: Partial<TokenRotationConfig> = {
        rotationIntervalMs: 10 * 60 * 1000
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();
      expect(config.rotationIntervalMs).toBe(10 * 60 * 1000);
    });

    it('should start rotation when enabled', () => {
      spyOn(service, 'startRotation');
      
      // Simulate authenticated state
      authStateSubject.next({
        isAuthenticated: true,
        token: {
          accessToken: 'token',
          expiresAt: new Date(Date.now() + 3600000),
          tokenType: 'Bearer'
        },
        lastRefreshed: new Date(),
        sessionId: 'session123'
      });

      service.updateConfig({ enabled: true });
      
      // Note: startRotation may be called during initialization
      expect(service.startRotation).toHaveBeenCalled();
    });

    it('should stop rotation when disabled', () => {
      spyOn(service, 'stopRotation');
      service.updateConfig({ enabled: false });
      expect(service.stopRotation).toHaveBeenCalled();
    });
  });

  describe('rotation status', () => {
    it('should provide rotation status', (done) => {
      service.status$.subscribe(status => {
        expect(status).toBeDefined();
        expect(status.rotationCount).toBeDefined();
        expect(status.isRotating).toBeDefined();
        done();
      });
    });

    it('should update status after rotation', fakeAsync(() => {
      const mockToken: AtlasToken = {
        accessToken: 'new-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer'
      };

      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'old-token',
            expiresAt: new Date(Date.now() + 1000), // Expires soon
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          sessionId: 'session123'
        })
      });
      authServiceMock.refreshToken.and.returnValue(Promise.resolve(mockToken));

      service.rotateToken().then(() => {
        const status = service.status;
        expect(status.lastRotation).toBeTruthy();
        expect(status.rotationCount).toBeGreaterThan(0);
      });

      tick();
    }));
  });

  describe('shouldRotateToken', () => {
    it('should return false when not authenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(false);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: false,
          token: null,
          lastRefreshed: null,
          sessionId: null
        })
      });

      expect(service.shouldRotateToken()).toBe(false);
    });

    it('should return true when token is old', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 3600000),
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
          sessionId: 'session123'
        })
      });

      expect(service.shouldRotateToken()).toBe(true);
    });

    it('should return true when token expires soon', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // Expires in 2 minutes
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(),
          sessionId: 'session123'
        })
      });

      expect(service.shouldRotateToken()).toBe(true);
    });

    it('should return false when token is fresh', () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(),
          sessionId: 'session123'
        })
      });

      expect(service.shouldRotateToken()).toBe(false);
    });
  });

  describe('rotateToken', () => {
    it('should rotate token successfully', async () => {
      const mockToken: AtlasToken = {
        accessToken: 'new-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer'
      };

      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'old-token',
            expiresAt: new Date(Date.now() + 1000), // Expires soon
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          sessionId: 'session123'
        })
      });
      authServiceMock.refreshToken.and.returnValue(Promise.resolve(mockToken));

      const result = await service.rotateToken();
      expect(result).toEqual(mockToken);
      expect(authServiceMock.refreshToken).toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      authServiceMock.isAuthenticated.and.returnValue(false);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: false,
          token: null,
          lastRefreshed: null,
          sessionId: null
        })
      });

      await expectAsync(service.rotateToken()).toBeRejected();
    });

    it('should handle rotation errors', async () => {
      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 1000),
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(Date.now() - 25 * 60 * 1000),
          sessionId: 'session123'
        })
      });
      authServiceMock.refreshToken.and.returnValue(Promise.reject(new Error('Rotation failed')));

      await expectAsync(service.rotateToken()).toBeRejected();
      
      const status = service.status;
      expect(status.lastError).toBeTruthy();
    });

    it('should prevent concurrent rotations', async () => {
      const mockToken: AtlasToken = {
        accessToken: 'new-token',
        expiresAt: new Date(Date.now() + 3600000),
        tokenType: 'Bearer'
      };

      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 1000),
            tokenType: 'Bearer'
          },
          lastRefreshed: new Date(Date.now() - 25 * 60 * 1000),
          sessionId: 'session123'
        })
      });
      authServiceMock.refreshToken.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(mockToken), 100))
      );

      const rotation1 = service.rotateToken();
      const rotation2 = service.rotateToken();

      await expectAsync(rotation2).toBeRejected();
      await rotation1;
    });
  });

  describe('token age', () => {
    it('should calculate token age', () => {
      const lastRefreshed = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      authServiceMock.isAuthenticated.and.returnValue(true);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: true,
          token: {
            accessToken: 'token',
            expiresAt: new Date(Date.now() + 3600000),
            tokenType: 'Bearer'
          },
          lastRefreshed,
          sessionId: 'session123'
        })
      });

      const age = service.getTokenAge();
      expect(age).toBeGreaterThan(9 * 60 * 1000); // At least 9 minutes
      expect(age).toBeLessThan(11 * 60 * 1000); // Less than 11 minutes
    });

    it('should return null when not authenticated', () => {
      authServiceMock.isAuthenticated.and.returnValue(false);
      Object.defineProperty(authServiceMock, 'currentAuthState', {
        get: () => ({
          isAuthenticated: false,
          token: null,
          lastRefreshed: null,
          sessionId: null
        })
      });

      expect(service.getTokenAge()).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should reset statistics', () => {
      service.resetStatistics();
      const status = service.status;
      expect(status.rotationCount).toBe(0);
      expect(status.lastError).toBeNull();
    });
  });
});
