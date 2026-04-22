import { TestBed } from '@angular/core/testing';
import { AtlasConfigService, AtlasConfiguration } from './atlas-config.service';

describe('AtlasConfigService', () => {
  let service: AtlasConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AtlasConfigService]
    });
    service = TestBed.inject(AtlasConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Configuration Loading', () => {
    it('should load default configuration on initialization', () => {
      const config = service.config;
      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(config.apiVersion).toBeDefined();
      expect(config.endpoints).toBeDefined();
    });

    it('should provide configuration as observable', (done) => {
      service.config$.subscribe(config => {
        expect(config).toBeDefined();
        expect(config.baseUrl).toBeDefined();
        done();
      });
    });

    it('should detect environment type', () => {
      const environment = service.getEnvironment();
      expect(['production', 'staging', 'development']).toContain(environment);
    });
  });

  describe('Base URL and Endpoints', () => {
    it('should return base URL', () => {
      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
    });

    it('should return deployment endpoint', () => {
      const endpoint = service.getEndpoint('deployments');
      expect(endpoint).toContain('deployments');
    });

    it('should return AI analysis endpoint', () => {
      const endpoint = service.getEndpoint('aiAnalysis');
      expect(endpoint).toContain('ai-analysis');
    });

    it('should return approvals endpoint', () => {
      const endpoint = service.getEndpoint('approvals');
      expect(endpoint).toContain('approvals');
    });

    it('should return exceptions endpoint', () => {
      const endpoint = service.getEndpoint('exceptions');
      expect(endpoint).toContain('exceptions');
    });

    it('should return agents endpoint', () => {
      const endpoint = service.getEndpoint('agents');
      expect(endpoint).toContain('agents');
    });

    it('should return query builder endpoint', () => {
      const endpoint = service.getEndpoint('queryBuilder');
      expect(endpoint).toContain('query-builder');
    });

    it('should return SignalR endpoint', () => {
      const endpoint = service.getEndpoint('signalR');
      expect(endpoint).toContain('atlas');
    });

    it('should construct full endpoint URLs with base URL', () => {
      const baseUrl = service.getBaseUrl();
      const endpoint = service.getEndpoint('deployments');
      expect(endpoint).toContain(baseUrl);
    });
  });

  describe('API Version', () => {
    it('should return API version', () => {
      const version = service.getApiVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Flags', () => {
    it('should check if ATLAS is enabled', () => {
      const enabled = service.isEnabled();
      expect(typeof enabled).toBe('boolean');
    });

    it('should check if hybrid mode is enabled', () => {
      const hybridMode = service.isHybridMode();
      expect(typeof hybridMode).toBe('boolean');
    });

    it('should check if specific feature is enabled', () => {
      const isDeploymentsEnabled = service.isFeatureEnabled('deployments');
      expect(typeof isDeploymentsEnabled).toBe('boolean');
    });

    it('should return false for non-existent feature', () => {
      const isEnabled = service.isFeatureEnabled('nonExistentFeature');
      expect(isEnabled).toBe(false);
    });
  });

  describe('Timeout and Retry Configuration', () => {
    it('should return timeout value', () => {
      const timeout = service.getTimeout();
      expect(timeout).toBeGreaterThan(0);
      expect(timeout).toBeLessThanOrEqual(300000);
    });

    it('should return retry attempts', () => {
      const retryAttempts = service.getRetryAttempts();
      expect(retryAttempts).toBeGreaterThanOrEqual(0);
      expect(retryAttempts).toBeLessThanOrEqual(10);
    });
  });

  describe('Runtime Configuration Updates', () => {
    it('should update configuration at runtime', () => {
      const originalTimeout = service.getTimeout();
      const newTimeout = 45000;

      service.updateConfiguration({
        timeout: newTimeout
      });

      expect(service.getTimeout()).toBe(newTimeout);
    });

    it('should update feature flags at runtime', () => {
      service.updateConfiguration({
        features: {
          enabled: true,
          hybridMode: true,
          enabledFeatures: ['deployments', 'aiAnalysis']
        }
      });

      expect(service.isEnabled()).toBe(true);
      expect(service.isHybridMode()).toBe(true);
      expect(service.isFeatureEnabled('deployments')).toBe(true);
      expect(service.isFeatureEnabled('aiAnalysis')).toBe(true);
    });

    it('should merge endpoint updates with existing configuration', () => {
      const originalDeploymentsEndpoint = service.getEndpoint('deployments');
      
      service.updateConfiguration({
        endpoints: {
          deployments: '/v2/deployments',
          aiAnalysis: '/v1/ai-analysis',
          approvals: '/v1/approvals',
          exceptions: '/v1/exceptions',
          agents: '/api/agents',
          queryBuilder: '/v1/query-builder',
          signalR: '/hubs/atlas'
        }
      });

      const newDeploymentsEndpoint = service.getEndpoint('deployments');
      expect(newDeploymentsEndpoint).not.toBe(originalDeploymentsEndpoint);
      expect(newDeploymentsEndpoint).toContain('v2');
    });

    it('should notify subscribers when configuration changes', (done) => {
      let notificationCount = 0;
      
      service.config$.subscribe(() => {
        notificationCount++;
        if (notificationCount === 2) {
          // First notification is initial value, second is after update
          done();
        }
      });

      service.updateConfiguration({
        timeout: 50000
      });
    });

    it('should reject invalid configuration updates', () => {
      const originalTimeout = service.getTimeout();
      
      // Try to set invalid timeout (negative)
      service.updateConfiguration({
        timeout: -1000
      });

      // Configuration should remain unchanged
      expect(service.getTimeout()).toBe(originalTimeout);
    });

    it('should reject invalid base URL updates', () => {
      const originalBaseUrl = service.getBaseUrl();
      
      // Try to set invalid URL
      service.updateConfiguration({
        baseUrl: 'not-a-valid-url'
      });

      // Configuration should remain unchanged
      expect(service.getBaseUrl()).toBe(originalBaseUrl);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate timeout range', () => {
      const originalTimeout = service.getTimeout();
      
      // Try to set timeout above maximum
      service.updateConfiguration({
        timeout: 400000
      });

      expect(service.getTimeout()).toBe(originalTimeout);
    });

    it('should validate retry attempts range', () => {
      const originalRetryAttempts = service.getRetryAttempts();
      
      // Try to set retry attempts above maximum
      service.updateConfiguration({
        retryAttempts: 15
      });

      expect(service.getRetryAttempts()).toBe(originalRetryAttempts);
    });

    it('should accept valid HTTPS URLs', () => {
      service.updateConfiguration({
        baseUrl: 'https://api.example.com/atlas'
      });

      expect(service.getBaseUrl()).toBe('https://api.example.com/atlas');
    });

    it('should accept valid relative URLs', () => {
      service.updateConfiguration({
        baseUrl: '/api/atlas'
      });

      expect(service.getBaseUrl()).toBe('/api/atlas');
    });

    it('should validate individual endpoint paths', () => {
      const originalConfig = service.config;
      
      // Try to set invalid endpoint (empty string)
      service.updateConfiguration({
        endpoints: {
          deployments: '',
          aiAnalysis: '/v1/ai-analysis',
          approvals: '/v1/approvals',
          exceptions: '/v1/exceptions',
          agents: '/api/agents',
          queryBuilder: '/v1/query-builder',
          signalR: '/hubs/atlas'
        }
      });

      // Configuration should remain unchanged
      expect(service.config).toEqual(originalConfig);
    });

    it('should validate features configuration structure', () => {
      const originalConfig = service.config;
      
      // Try to set invalid features configuration
      service.updateConfiguration({
        features: {
          enabled: 'yes' as any, // Invalid type
          hybridMode: false,
          enabledFeatures: []
        }
      });

      // Configuration should remain unchanged
      expect(service.config).toEqual(originalConfig);
    });

    it('should validate enabledFeatures is an array', () => {
      const originalConfig = service.config;
      
      // Try to set invalid enabledFeatures (not an array)
      service.updateConfiguration({
        features: {
          enabled: true,
          hybridMode: false,
          enabledFeatures: 'deployments' as any
        }
      });

      // Configuration should remain unchanged
      expect(service.config).toEqual(originalConfig);
    });
  });

  describe('Configuration Reload', () => {
    it('should reload configuration from environment', () => {
      // Modify configuration
      service.updateConfiguration({
        timeout: 50000
      });

      // Reload should reset to environment-based configuration
      service.reloadConfiguration();

      const config = service.config;
      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
    });
  });

  describe('Fallback Logic', () => {
    it('should fallback to default base URL when current base URL is invalid', () => {
      // Force an invalid base URL into the configuration
      const invalidConfig = {
        ...service.config,
        baseUrl: 'invalid-url'
      };
      
      // Directly set the invalid config (bypassing validation)
      (service as any).configSubject.next(invalidConfig);

      // getBaseUrl should return the fallback default
      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBe('/api/atlas'); // DEFAULT_CONFIG baseUrl
    });

    it('should fallback to default endpoint when current endpoint is invalid', () => {
      // Force an invalid endpoint into the configuration
      const invalidConfig = {
        ...service.config,
        baseUrl: 'invalid-url',
        endpoints: {
          ...service.config.endpoints,
          deployments: '/v1/deployments'
        }
      };
      
      // Directly set the invalid config (bypassing validation)
      (service as any).configSubject.next(invalidConfig);

      // getEndpoint should return the fallback default
      const endpoint = service.getEndpoint('deployments');
      expect(endpoint).toContain('/api/atlas'); // DEFAULT_CONFIG baseUrl
      expect(endpoint).toContain('deployments');
    });

    it('should use current configuration when valid', () => {
      // Set a valid configuration
      service.updateConfiguration({
        baseUrl: 'https://valid-api.example.com/atlas'
      });

      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBe('https://valid-api.example.com/atlas');
    });

    it('should validate endpoint URLs before returning them', () => {
      // Set a valid base URL
      service.updateConfiguration({
        baseUrl: 'https://api.example.com'
      });

      // Get an endpoint - should validate and return successfully
      const endpoint = service.getEndpoint('deployments');
      expect(endpoint).toContain('https://api.example.com');
      expect(endpoint).toContain('deployments');
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should have different configurations for different environments', () => {
      const config = service.config;
      const environment = service.getEnvironment();

      // Configuration should be appropriate for the environment
      if (environment === 'production') {
        expect(config.features.enabled).toBe(true);
        expect(config.timeout).toBe(30000);
      } else if (environment === 'development') {
        expect(config.timeout).toBeGreaterThanOrEqual(30000);
      }
    });

    it('should enable more features in production than in development', () => {
      const environment = service.getEnvironment();
      const config = service.config;

      if (environment === 'production') {
        expect(config.features.enabledFeatures.length).toBeGreaterThan(0);
      }
    });
  });
});
