import { TestBed } from '@angular/core/testing';

import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  let service: AuthTokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthTokenService]
    });
    service = TestBed.inject(AuthTokenService);
    
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setToken and getToken', () => {
    it('should store and retrieve token', () => {
      const token = 'test-token-123';
      service.setToken(token);
      
      expect(service.getToken()).toBe(token);
    });

    it('should store refresh token', () => {
      const token = 'access-token';
      const refreshToken = 'refresh-token';
      service.setToken(token, refreshToken);
      
      expect(service.getRefreshToken()).toBe(refreshToken);
    });

    it('should store token expiry', () => {
      const token = 'test-token';
      const expiresIn = 3600; // 1 hour
      service.setToken(token, undefined, expiresIn);
      
      const expiry = service.getTokenExpiry();
      expect(expiry).not.toBeNull();
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('hasToken', () => {
    it('should return false when no token', () => {
      expect(service.hasToken()).toBe(false);
    });

    it('should return true when token exists', () => {
      service.setToken('test-token');
      expect(service.hasToken()).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token', () => {
      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return false for non-expired token', () => {
      const token = 'test-token';
      const expiresIn = 3600; // 1 hour from now
      service.setToken(token, undefined, expiresIn);
      
      expect(service.isTokenExpired()).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = 'test-token';
      const expiresIn = -1; // Already expired
      service.setToken(token, undefined, expiresIn);
      
      expect(service.isTokenExpired()).toBe(true);
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens', () => {
      service.setToken('access-token', 'refresh-token', 3600);
      
      expect(service.hasToken()).toBe(true);
      
      service.clearTokens();
      
      expect(service.hasToken()).toBe(false);
      expect(service.getRefreshToken()).toBeNull();
      expect(service.getTokenExpiry()).toBeNull();
    });
  });

  describe('getUserFromToken', () => {
    it('should return null when no token', () => {
      expect(service.getUserFromToken()).toBeNull();
    });

    it('should decode valid JWT token', () => {
      // Create a simple JWT token (header.payload.signature)
      const payload = { userId: '123', role: 'Admin', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      service.setToken(token);
      
      const user = service.getUserFromToken();
      expect(user).not.toBeNull();
      expect(user.userId).toBe('123');
      expect(user.role).toBe('Admin');
    });
  });

  describe('hasRole', () => {
    it('should return false when no token', () => {
      expect(service.hasRole('Admin')).toBe(false);
    });

    it('should check user role correctly', () => {
      const payload = { userId: '123', role: 'Admin' };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      service.setToken(token);
      
      expect(service.hasRole('Admin')).toBe(true);
      expect(service.hasRole('User')).toBe(false);
    });

    it('should handle array of roles', () => {
      const payload = { userId: '123', role: ['Admin', 'Dispatcher'] };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      service.setToken(token);
      
      expect(service.hasRole('Admin')).toBe(true);
      expect(service.hasRole('Dispatcher')).toBe(true);
      expect(service.hasRole('Technician')).toBe(false);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return 0 when no token', () => {
      expect(service.getTimeUntilExpiry()).toBe(0);
    });

    it('should return time until expiry', () => {
      const token = 'test-token';
      const expiresIn = 3600; // 1 hour
      service.setToken(token, undefined, expiresIn);
      
      const timeUntilExpiry = service.getTimeUntilExpiry();
      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThanOrEqual(3600 * 1000);
    });

    it('should return 0 for expired token', () => {
      const token = 'test-token';
      const expiresIn = -1;
      service.setToken(token, undefined, expiresIn);
      
      expect(service.getTimeUntilExpiry()).toBe(0);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return false when no token', () => {
      expect(service.isTokenExpiringSoon()).toBe(false);
    });

    it('should return true when token expires within 5 minutes', () => {
      const token = 'test-token';
      const expiresIn = 240; // 4 minutes
      service.setToken(token, undefined, expiresIn);
      
      expect(service.isTokenExpiringSoon()).toBe(true);
    });

    it('should return false when token expires in more than 5 minutes', () => {
      const token = 'test-token';
      const expiresIn = 600; // 10 minutes
      service.setToken(token, undefined, expiresIn);
      
      expect(service.isTokenExpiringSoon()).toBe(false);
    });
  });
});
