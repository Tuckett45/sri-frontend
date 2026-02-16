/**
 * ATLAS Security Tests
 * 
 * Verifies authentication and authorization
 * Tests input sanitization and validation
 * Verifies HTTPS enforcement
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AtlasAuthService } from '../../services/atlas-auth.service';
import { AtlasInputSanitizerService } from '../../services/atlas-input-sanitizer.service';
import { AtlasResponseValidatorService } from '../../services/atlas-response-validator.service';
import { AtlasTokenRotationService } from '../../services/atlas-token-rotation.service';
import { AtlasSecurityLoggerService } from '../../services/atlas-security-logger.service';
import { AtlasCspService } from '../../services/atlas-csp.service';
import { AtlasSsrfProtectionService } from '../../services/atlas-ssrf-protection.service';
import { DeploymentService } from '../../services/deployment.service';

describe('ATLAS Security Tests', () => {
  let httpMock: HttpTestingController;
  let authService: AtlasAuthService;
  let sanitizerService: AtlasInputSanitizerService;
  let validatorService: AtlasResponseValidatorService;
  let tokenRotationService: AtlasTokenRotationService;
  let securityLogger: AtlasSecurityLoggerService;
  let cspService: AtlasCspService;
  let ssrfProtection: AtlasSsrfProtectionService;
  let deploymentService: DeploymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AtlasAuthService,
        AtlasInputSanitizerService,
        AtlasResponseValidatorService,
        AtlasTokenRotationService,
        AtlasSecurityLoggerService,
        AtlasCspService,
        AtlasSsrfProtectionService,
        DeploymentService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AtlasAuthService);
    sanitizerService = TestBed.inject(AtlasInputSanitizerService);
    validatorService = TestBed.inject(AtlasResponseValidatorService);
    tokenRotationService = TestBed.inject(AtlasTokenRotationService);
    securityLogger = TestBed.inject(AtlasSecurityLoggerService);
    cspService = TestBed.inject(AtlasCspService);
    ssrfProtection = TestBed.inject(AtlasSsrfProtectionService);
    deploymentService = TestBed.inject(DeploymentService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Authentication Security', () => {
    it('should never store tokens in localStorage', () => {
      const token = 'test-token';
      
      authService.storeToken(token);

      expect(localStorage.getItem('atlas_access_token')).toBeNull();
      expect(localStorage.getItem('atlas_refresh_token')).toBeNull();
    });

    it('should store tokens only in sessionStorage', () => {
      const token = 'test-token';
      
      authService.storeToken(token);

      expect(sessionStorage.getItem('atlas_access_token')).toBe(token);
    });

    it('should clear all tokens on logout', () => {
      const token = 'test-token';
      authService.storeToken(token);

      authService.logout().subscribe(() => {
        expect(sessionStorage.getItem('atlas_access_token')).toBeNull();
        expect(sessionStorage.getItem('atlas_refresh_token')).toBeNull();
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/logout'));
      req.flush({});
    });

    it('should validate token expiration', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.xxx';
      
      const isValid = authService.isTokenValid(expiredToken);

      expect(isValid).toBe(false);
    });

    it('should enforce token rotation', (done) => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      authService.storeToken(oldToken);

      tokenRotationService.rotateToken().subscribe(token => {
        expect(token).toBe(newToken);
        expect(sessionStorage.getItem('atlas_access_token')).toBe(newToken);
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/rotate'));
      req.flush({ accessToken: newToken });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML in user input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello';
      
      const sanitized = sanitizerService.sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('should sanitize SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const sanitized = sanitizerService.sanitizeSql(sqlInjection);

      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    it('should escape special characters', () => {
      const input = '<>&"\'';
      
      const escaped = sanitizerService.escapeHtml(input);

      expect(escaped).toBe('&lt;&gt;&amp;&quot;&#x27;');
    });

    it('should validate and sanitize deployment titles', () => {
      const maliciousTitle = '<img src=x onerror=alert(1)>Deployment';
      
      const sanitized = sanitizerService.sanitizeDeploymentTitle(maliciousTitle);

      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
    });

    it('should prevent command injection in metadata', () => {
      const maliciousMetadata = {
        command: '$(rm -rf /)',
        description: 'Normal text'
      };
      
      const sanitized = sanitizerService.sanitizeMetadata(maliciousMetadata);

      expect(sanitized.command).not.toContain('$(');
      expect(sanitized.command).not.toContain('rm -rf');
    });
  });

  describe('Response Validation', () => {
    it('should validate API response structure', () => {
      const validResponse = {
        id: 'deployment-1',
        title: 'Test Deployment',
        type: 'STANDARD',
        currentState: 'DRAFT'
      };

      const isValid = validatorService.validateDeploymentResponse(validResponse);

      expect(isValid).toBe(true);
    });

    it('should reject malformed responses', () => {
      const malformedResponse = {
        id: '<script>alert(1)</script>',
        title: 'Test'
      };

      const isValid = validatorService.validateDeploymentResponse(malformedResponse);

      expect(isValid).toBe(false);
    });

    it('should detect and prevent XSS in responses', () => {
      const xssResponse = {
        id: 'deployment-1',
        title: '<script>alert("XSS")</script>',
        type: 'STANDARD'
      };

      const sanitized = validatorService.sanitizeResponse(xssResponse);

      expect(sanitized.title).not.toContain('<script>');
    });

    it('should validate response content types', () => {
      const response = new Response('{"data": "test"}', {
        headers: { 'Content-Type': 'application/json' }
      });

      const isValid = validatorService.validateContentType(response);

      expect(isValid).toBe(true);
    });
  });

  describe('HTTPS Enforcement', () => {
    it('should reject HTTP URLs', () => {
      const httpUrl = 'http://api.atlas.com/v1/deployments';

      expect(() => {
        deploymentService.validateUrl(httpUrl);
      }).toThrow();
    });

    it('should accept HTTPS URLs', () => {
      const httpsUrl = 'https://api.atlas.com/v1/deployments';

      expect(() => {
        deploymentService.validateUrl(httpsUrl);
      }).not.toThrow();
    });

    it('should enforce HTTPS in configuration', () => {
      const config = {
        atlasBaseUrl: 'http://api.atlas.com'
      };

      expect(() => {
        authService.validateConfig(config);
      }).toThrow();
    });
  });

  describe('Authorization', () => {
    it('should verify user roles before operations', (done) => {
      const deploymentId = 'test-deployment';
      
      authService.hasRole('DEPLOYMENT_ADMIN').subscribe(hasRole => {
        expect(hasRole).toBeDefined();
        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/roles'));
      req.flush({ roles: ['DEPLOYMENT_ADMIN'] });
    });

    it('should prevent unauthorized state transitions', (done) => {
      const deploymentId = 'test-deployment';
      
      deploymentService.transitionState(deploymentId, {
        targetState: 'CLOSED' as any,
        reason: 'Test'
      }).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/transition'));
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Security Logging', () => {
    it('should log authentication attempts', () => {
      spyOn(securityLogger, 'logAuthAttempt');

      authService.login('testuser', 'password').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({ accessToken: 'token' });

      expect(securityLogger.logAuthAttempt).toHaveBeenCalled();
    });

    it('should log failed authentication', () => {
      spyOn(securityLogger, 'logAuthFailure');

      authService.login('testuser', 'wrongpassword').subscribe({
        error: () => {
          expect(securityLogger.logAuthFailure).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should log authorization failures', () => {
      spyOn(securityLogger, 'logAuthorizationFailure');

      deploymentService.getDeployment('forbidden-deployment').subscribe({
        error: () => {
          expect(securityLogger.logAuthorizationFailure).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/deployments/'));
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should log suspicious activity', () => {
      spyOn(securityLogger, 'logSuspiciousActivity');

      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        authService.login('testuser', 'wrongpassword').subscribe();
        const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
        req.flush({ error: 'Invalid' }, { status: 401, statusText: 'Unauthorized' });
      }

      expect(securityLogger.logSuspiciousActivity).toHaveBeenCalled();
    });
  });

  describe('Content Security Policy', () => {
    it('should enforce CSP for ATLAS resources', () => {
      const cspHeader = cspService.generateCspHeader();

      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("script-src 'self'");
      expect(cspHeader).not.toContain("'unsafe-inline'");
    });

    it('should allow only whitelisted domains', () => {
      const allowedDomain = 'https://api.atlas.com';
      const blockedDomain = 'https://malicious.com';

      expect(cspService.isDomainAllowed(allowedDomain)).toBe(true);
      expect(cspService.isDomainAllowed(blockedDomain)).toBe(false);
    });
  });

  describe('SSRF Protection', () => {
    it('should block requests to internal IPs', () => {
      const internalUrls = [
        'http://localhost:8080',
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1'
      ];

      internalUrls.forEach(url => {
        expect(ssrfProtection.isUrlSafe(url)).toBe(false);
      });
    });

    it('should allow requests to whitelisted external domains', () => {
      const safeUrl = 'https://api.atlas.com/v1/deployments';

      expect(ssrfProtection.isUrlSafe(safeUrl)).toBe(true);
    });

    it('should validate URL format', () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd'
      ];

      invalidUrls.forEach(url => {
        expect(ssrfProtection.isUrlSafe(url)).toBe(false);
      });
    });
  });

  describe('Token Security', () => {
    it('should not expose tokens in error messages', () => {
      const token = 'secret-token-12345';
      authService.storeToken(token);

      deploymentService.getDeployment('test').subscribe({
        error: (error) => {
          expect(error.message).not.toContain(token);
          expect(error.toString()).not.toContain(token);
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/deployments/'));
      req.flush({ error: 'Error' }, { status: 500, statusText: 'Error' });
    });

    it('should not log tokens', () => {
      spyOn(console, 'log');
      spyOn(console, 'error');

      const token = 'secret-token-12345';
      authService.storeToken(token);

      expect(console.log).not.toHaveBeenCalledWith(jasmine.stringContaining(token));
      expect(console.error).not.toHaveBeenCalledWith(jasmine.stringContaining(token));
    });
  });

  describe('Rate Limiting', () => {
    it('should handle 429 Too Many Requests', (done) => {
      deploymentService.getDeployments().subscribe({
        next: () => fail('Should be rate limited'),
        error: (error) => {
          expect(error.status).toBe(429);
          done();
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/deployments'));
      req.flush(
        { error: 'Too Many Requests' },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '60' } }
      );
    });
  });

  describe('Data Encryption', () => {
    it('should not send sensitive data in query parameters', () => {
      const sensitiveData = { password: 'secret123' };

      deploymentService.getDeployments(sensitiveData as any).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/deployments'));
      
      // Verify password is not in URL
      expect(req.request.url).not.toContain('password');
      expect(req.request.url).not.toContain('secret123');

      req.flush({ items: [], pagination: { currentPage: 1, pageSize: 10, totalCount: 0, totalPages: 0 } });
    });
  });
});
