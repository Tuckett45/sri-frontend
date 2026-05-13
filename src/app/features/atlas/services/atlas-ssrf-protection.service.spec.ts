import { TestBed } from '@angular/core/testing';
import { AtlasSsrfProtectionService, SsrfProtectionConfig } from './atlas-ssrf-protection.service';
import { AtlasSecurityLoggerService } from './atlas-security-logger.service';

describe('AtlasSsrfProtectionService', () => {
  let service: AtlasSsrfProtectionService;
  let securityLoggerMock: jasmine.SpyObj<AtlasSecurityLoggerService>;

  beforeEach(() => {
    securityLoggerMock = jasmine.createSpyObj('AtlasSecurityLoggerService', ['logSsrfAttempt']);

    TestBed.configureTestingModule({
      providers: [
        AtlasSsrfProtectionService,
        { provide: AtlasSecurityLoggerService, useValue: securityLoggerMock }
      ]
    });

    service = TestBed.inject(AtlasSsrfProtectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('configuration', () => {
    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.allowedProtocols).toContain('https:');
      expect(config.blockPrivateIps).toBe(true);
      expect(config.blockLocalhost).toBe(true);
    });

    it('should update configuration', () => {
      const updates: Partial<SsrfProtectionConfig> = {
        allowedProtocols: ['https:'],
        blockLocalhost: false
      };

      service.updateConfig(updates);
      const config = service.getConfig();
      expect(config.allowedProtocols).toEqual(['https:']);
      expect(config.blockLocalhost).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate safe HTTPS URLs', () => {
      const result = service.validateUrl('https://api.example.com/data');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://api.example.com/data');
    });

    it('should validate safe HTTP URLs', () => {
      const result = service.validateUrl('http://api.example.com/data');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const result = service.validateUrl('not a url');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid URL format');
    });
  });

  describe('protocol validation', () => {
    it('should reject disallowed protocols', () => {
      const result = service.validateUrl('ftp://example.com/file');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Protocol');
    });

    it('should reject javascript protocol', () => {
      const result = service.validateUrl('javascript:alert("xss")');
      expect(result.isValid).toBe(false);
    });

    it('should reject file protocol', () => {
      const result = service.validateUrl('file:///etc/passwd');
      expect(result.isValid).toBe(false);
    });
  });

  describe('localhost blocking', () => {
    it('should block localhost', () => {
      const result = service.validateUrl('http://localhost:8080/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Localhost');
      expect(securityLoggerMock.logSsrfAttempt).toHaveBeenCalled();
    });

    it('should block 127.0.0.1', () => {
      const result = service.validateUrl('http://127.0.0.1:8080/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Localhost');
    });

    it('should block ::1 (IPv6 localhost)', () => {
      const result = service.validateUrl('http://[::1]:8080/api');
      expect(result.isValid).toBe(false);
    });

    it('should allow localhost when configured', () => {
      service.updateConfig({ blockLocalhost: false });
      const result = service.validateUrl('http://localhost:8080/api');
      expect(result.isValid).toBe(true);
    });
  });

  describe('private IP blocking', () => {
    it('should block 10.x.x.x range', () => {
      const result = service.validateUrl('http://10.0.0.1/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Private IP');
    });

    it('should block 172.16.x.x - 172.31.x.x range', () => {
      const result = service.validateUrl('http://172.16.0.1/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Private IP');
    });

    it('should block 192.168.x.x range', () => {
      const result = service.validateUrl('http://192.168.1.1/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Private IP');
    });

    it('should block 169.254.x.x range (link-local)', () => {
      const result = service.validateUrl('http://169.254.1.1/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Private IP');
    });

    it('should allow private IPs when configured', () => {
      service.updateConfig({ blockPrivateIps: false });
      const result = service.validateUrl('http://192.168.1.1/api');
      expect(result.isValid).toBe(true);
    });
  });

  describe('metadata endpoint blocking', () => {
    it('should block AWS/Azure/GCP metadata endpoint', () => {
      const result = service.validateUrl('http://169.254.169.254/latest/meta-data');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('metadata');
    });

    it('should block Google metadata endpoint', () => {
      const result = service.validateUrl('http://metadata.google.internal/computeMetadata');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('metadata');
    });

    it('should allow metadata endpoints when configured', () => {
      service.updateConfig({ blockMetadataEndpoints: false });
      const result = service.validateUrl('http://metadata.google.internal/data');
      expect(result.isValid).toBe(true);
    });
  });

  describe('domain whitelist', () => {
    beforeEach(() => {
      service.updateConfig({
        allowedDomains: ['example.com', 'api.trusted.com']
      });
    });

    it('should allow whitelisted domains', () => {
      const result = service.validateUrl('https://example.com/api');
      expect(result.isValid).toBe(true);
    });

    it('should allow subdomains of whitelisted domains', () => {
      const result = service.validateUrl('https://api.example.com/data');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-whitelisted domains', () => {
      const result = service.validateUrl('https://evil.com/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not in the allowed domains');
    });

    it('should add domain to whitelist', () => {
      service.addAllowedDomain('newdomain.com');
      const result = service.validateUrl('https://newdomain.com/api');
      expect(result.isValid).toBe(true);
    });

    it('should remove domain from whitelist', () => {
      service.removeAllowedDomain('example.com');
      const result = service.validateUrl('https://example.com/api');
      expect(result.isValid).toBe(false);
    });
  });

  describe('port validation', () => {
    beforeEach(() => {
      service.updateConfig({
        allowedPorts: [80, 443, 8080]
      });
    });

    it('should allow whitelisted ports', () => {
      const result = service.validateUrl('https://example.com:443/api');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-whitelisted ports', () => {
      const result = service.validateUrl('http://example.com:9999/api');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Port');
    });

    it('should use default port when not specified', () => {
      const result = service.validateUrl('https://example.com/api');
      expect(result.isValid).toBe(true); // HTTPS default port 443 is allowed
    });

    it('should add port to whitelist', () => {
      service.addAllowedPort(9999);
      const result = service.validateUrl('http://example.com:9999/api');
      expect(result.isValid).toBe(true);
    });

    it('should remove port from whitelist', () => {
      service.removeAllowedPort(8080);
      const result = service.validateUrl('http://example.com:8080/api');
      expect(result.isValid).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('should check if URL is safe', () => {
      expect(service.isSafeUrl('https://example.com/api')).toBe(true);
      expect(service.isSafeUrl('http://localhost:8080/api')).toBe(false);
    });

    it('should get sanitized URL', () => {
      const sanitized = service.getSanitizedUrl('https://example.com/api');
      expect(sanitized).toBe('https://example.com/api');
    });

    it('should throw error for invalid URL', () => {
      expect(() => service.getSanitizedUrl('http://localhost:8080/api')).toThrow();
    });
  });

  describe('security logging', () => {
    it('should log SSRF attempts', () => {
      service.validateUrl('http://localhost:8080/api');
      expect(securityLoggerMock.logSsrfAttempt).toHaveBeenCalledWith(
        'http://localhost:8080/api',
        jasmine.any(String)
      );
    });

    it('should log multiple SSRF attempts', () => {
      service.validateUrl('http://localhost:8080/api');
      service.validateUrl('http://192.168.1.1/api');
      service.validateUrl('http://169.254.169.254/metadata');

      expect(securityLoggerMock.logSsrfAttempt).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with query parameters', () => {
      const result = service.validateUrl('https://example.com/api?param=value');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      const result = service.validateUrl('https://example.com/api#section');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with authentication', () => {
      const result = service.validateUrl('https://user:pass@example.com/api');
      expect(result.isValid).toBe(true);
    });

    it('should handle IPv6 addresses', () => {
      const result = service.validateUrl('http://[2001:db8::1]/api');
      expect(result.isValid).toBe(true);
    });

    it('should block IPv6 link-local addresses', () => {
      const result = service.validateUrl('http://[fe80::1]/api');
      expect(result.isValid).toBe(false);
    });
  });
});
