import { TestBed } from '@angular/core/testing';
import { AtlasCspService, CspConfig } from './atlas-csp.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasCspService', () => {
  let service: AtlasCspService;
  let configServiceMock: jasmine.SpyObj<AtlasConfigService>;

  beforeEach(() => {
    configServiceMock = jasmine.createSpyObj('AtlasConfigService', [
      'getBaseUrl',
      'getEnvironment'
    ]);
    configServiceMock.getBaseUrl.and.returnValue('https://api.example.com');
    configServiceMock.getEnvironment.and.returnValue('development');

    TestBed.configureTestingModule({
      providers: [
        AtlasCspService,
        { provide: AtlasConfigService, useValue: configServiceMock }
      ]
    });

    service = TestBed.inject(AtlasCspService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('configuration', () => {
    it('should have default CSP configuration', () => {
      const config = service.getConfig();
      expect(config.defaultSrc).toContain("'self'");
      expect(config.objectSrc).toContain("'none'");
      expect(config.upgradeInsecureRequests).toBe(true);
    });

    it('should update configuration', () => {
      const updates: Partial<CspConfig> = {
        scriptSrc: ["'self'", "'nonce-abc123'"]
      };

      service.updateConfig(updates);
      const config = service.getConfig();
      expect(config.scriptSrc).toEqual(["'self'", "'nonce-abc123'"]);
    });

    it('should include ATLAS endpoint in connect-src', () => {
      const config = service.getConfig();
      expect(config.connectSrc).toContain('https://api.example.com');
    });
  });

  describe('generateCspHeader', () => {
    it('should generate valid CSP header', () => {
      const header = service.generateCspHeader();
      expect(header).toContain("default-src 'self'");
      expect(header).toContain("object-src 'none'");
      expect(header).toContain('upgrade-insecure-requests');
    });

    it('should include all configured directives', () => {
      service.updateConfig({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'"]
      });

      const header = service.generateCspHeader();
      expect(header).toContain("script-src 'self' https://cdn.example.com");
      expect(header).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should include report-uri if configured', () => {
      service.updateConfig({
        reportUri: 'https://example.com/csp-report'
      });

      const header = service.generateCspHeader();
      expect(header).toContain('report-uri https://example.com/csp-report');
    });
  });

  describe('generateCspMetaTag', () => {
    it('should generate CSP meta tag content', () => {
      const metaContent = service.generateCspMetaTag();
      expect(metaContent).toBeTruthy();
      expect(metaContent).toContain("default-src 'self'");
    });
  });

  describe('source management', () => {
    it('should add allowed source', () => {
      service.addAllowedSource('scriptSrc', 'https://cdn.example.com');
      
      const config = service.getConfig();
      expect(config.scriptSrc).toContain('https://cdn.example.com');
    });

    it('should not add duplicate sources', () => {
      service.addAllowedSource('scriptSrc', 'https://cdn.example.com');
      service.addAllowedSource('scriptSrc', 'https://cdn.example.com');
      
      const config = service.getConfig();
      const count = config.scriptSrc.filter(src => src === 'https://cdn.example.com').length;
      expect(count).toBe(1);
    });

    it('should remove allowed source', () => {
      service.addAllowedSource('scriptSrc', 'https://cdn.example.com');
      service.removeAllowedSource('scriptSrc', 'https://cdn.example.com');
      
      const config = service.getConfig();
      expect(config.scriptSrc).not.toContain('https://cdn.example.com');
    });
  });

  describe('addAtlasEndpoint', () => {
    it('should add ATLAS endpoint to connect-src', () => {
      service.addAtlasEndpoint();
      
      const config = service.getConfig();
      expect(config.connectSrc).toContain('https://api.example.com');
    });

    it('should handle relative URLs', () => {
      configServiceMock.getBaseUrl.and.returnValue('/api/atlas');
      
      const newService = new AtlasCspService(configServiceMock);
      newService.addAtlasEndpoint();
      
      const config = newService.getConfig();
      expect(config.connectSrc).toContain('/api/atlas');
    });
  });

  describe('configureSignalRCsp', () => {
    it('should add WebSocket endpoints for SignalR', () => {
      service.configureSignalRCsp();
      
      const config = service.getConfig();
      expect(config.connectSrc).toContain('https://api.example.com');
      expect(config.connectSrc).toContain('wss://api.example.com');
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = service.generateNonce();
      const nonce2 = service.generateNonce();
      
      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate base64 encoded nonces', () => {
      const nonce = service.generateNonce();
      
      // Base64 pattern
      const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
      expect(base64Pattern.test(nonce)).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate safe configuration', () => {
      service.updateConfig({
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        objectSrc: ["'none'"]
      });

      const result = service.validateConfig();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect unsafe-inline in production', () => {
      configServiceMock.getEnvironment.and.returnValue('production');
      const prodService = new AtlasCspService(configServiceMock);
      
      prodService.updateConfig({
        scriptSrc: ["'self'", "'unsafe-inline'"]
      });

      const result = prodService.validateConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unsafe-inline'))).toBe(true);
    });

    it('should detect unsafe-eval', () => {
      configServiceMock.getEnvironment.and.returnValue('production');
      const prodService = new AtlasCspService(configServiceMock);
      
      prodService.updateConfig({
        scriptSrc: ["'self'", "'unsafe-eval'"]
      });

      const result = prodService.validateConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unsafe-eval'))).toBe(true);
    });

    it('should detect wildcard in default-src', () => {
      service.updateConfig({
        defaultSrc: ['*']
      });

      const result = service.validateConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Wildcard'))).toBe(true);
    });

    it('should detect missing object-src none', () => {
      service.updateConfig({
        objectSrc: ["'self'"]
      });

      const result = service.validateConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('object-src'))).toBe(true);
    });
  });

  describe('production environment', () => {
    it('should remove unsafe-inline in production', () => {
      configServiceMock.getEnvironment.and.returnValue('production');
      
      const prodService = new AtlasCspService(configServiceMock);
      const config = prodService.getConfig();
      
      expect(config.scriptSrc).not.toContain("'unsafe-inline'");
      expect(config.styleSrc).not.toContain("'unsafe-inline'");
    });

    it('should allow unsafe-inline in development', () => {
      configServiceMock.getEnvironment.and.returnValue('development');
      
      const devService = new AtlasCspService(configServiceMock);
      const config = devService.getConfig();
      
      expect(config.scriptSrc).toContain("'unsafe-inline'");
    });
  });

  describe('CSP violation handler', () => {
    it('should provide violation handler', () => {
      const handler = service.getCspViolationHandler();
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should handle violation events', () => {
      spyOn(console, 'error');
      
      const handler = service.getCspViolationHandler();
      const mockEvent = {
        blockedURI: 'https://evil.com/script.js',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        originalPolicy: "default-src 'self'",
        sourceFile: 'https://example.com/app.js',
        lineNumber: 10,
        columnNumber: 5
      } as SecurityPolicyViolationEvent;

      handler(mockEvent);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});
