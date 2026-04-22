import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment, staging_environment, local_environment } from '../../../../environments/environments';

/**
 * Configuration interface for ATLAS endpoints and settings
 */
export interface AtlasConfiguration {
  baseUrl: string;
  apiVersion: string;
  endpoints: {
    deployments: string;
    aiAnalysis: string;
    approvals: string;
    exceptions: string;
    agents: string;
    queryBuilder: string;
    signalR: string;
  };
  features: {
    enabled: boolean;
    hybridMode: boolean;
    enabledFeatures: string[];
  };
  timeout: number;
  retryAttempts: number;
}

/**
 * Environment type for configuration selection
 */
export type EnvironmentType = 'production' | 'staging' | 'development';

/**
 * AtlasConfigService
 * 
 * Provides centralized configuration management for ATLAS integration.
 * Supports multiple environments (development, staging, production) and
 * provides methods to retrieve ATLAS base URL and service-specific endpoints.
 * 
 * Requirements: 4.1, 4.2, 4.4
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasConfigService {
  private readonly DEFAULT_CONFIG: AtlasConfiguration = {
    baseUrl: '/api/atlas',
    apiVersion: 'v1',
    endpoints: {
      deployments: '/v1/deployments',
      aiAnalysis: '/v1/ai-analysis',
      approvals: '/v1/approvals',
      exceptions: '/v1/exceptions',
      agents: '/api/agents',
      queryBuilder: '/v1/query-builder',
      signalR: '/hubs/atlas'
    },
    features: {
      enabled: true,
      hybridMode: false,
      enabledFeatures: []
    },
    timeout: 30000,
    retryAttempts: 3
  };

  private configSubject = new BehaviorSubject<AtlasConfiguration>(this.DEFAULT_CONFIG);
  private currentEnvironment: EnvironmentType;

  constructor() {
    this.currentEnvironment = this.detectEnvironment();
    this.loadConfiguration();
  }

  /**
   * Get the current ATLAS configuration as an observable
   */
  get config$(): Observable<AtlasConfiguration> {
    return this.configSubject.asObservable();
  }

  /**
   * Get the current ATLAS configuration synchronously
   */
  get config(): AtlasConfiguration {
    return this.configSubject.value;
  }

  /**
   * Get the ATLAS base URL for the current environment
   * Requirements: 4.4, 4.6
   */
  getBaseUrl(): string {
    const baseUrl = this.config.baseUrl;
    
    // Validate base URL before returning (Requirement 4.6)
    if (!this.isValidUrl(baseUrl)) {
      console.warn(`Invalid ATLAS base URL: ${baseUrl}, using fallback`);
      // Fallback to default configuration (Requirement 4.3)
      return this.DEFAULT_CONFIG.baseUrl;
    }
    
    return baseUrl;
  }

  /**
   * Get a specific service endpoint URL
   * Requirements: 4.4, 4.6
   * 
   * @param service - The service name (deployments, aiAnalysis, etc.)
   * @returns The full endpoint URL
   */
  getEndpoint(service: keyof AtlasConfiguration['endpoints']): string {
    const endpoint = this.config.endpoints[service];
    const fullUrl = `${this.config.baseUrl}${endpoint}`;
    
    // Validate endpoint URL before returning (Requirement 4.6)
    if (!this.isValidUrl(fullUrl)) {
      console.warn(`Invalid ATLAS endpoint URL for ${service}: ${fullUrl}, using fallback`);
      // Fallback to default configuration endpoint (Requirement 4.3)
      const fallbackEndpoint = this.DEFAULT_CONFIG.endpoints[service];
      return `${this.DEFAULT_CONFIG.baseUrl}${fallbackEndpoint}`;
    }
    
    return fullUrl;
  }

  /**
   * Get the API version
   */
  getApiVersion(): string {
    return this.config.apiVersion;
  }

  /**
   * Check if ATLAS integration is enabled
   */
  isEnabled(): boolean {
    return this.config.features.enabled;
  }

  /**
   * Check if hybrid mode is enabled (some features use ATLAS, others use ARK)
   */
  isHybridMode(): boolean {
    return this.config.features.hybridMode;
  }

  /**
   * Check if a specific ATLAS feature is enabled
   * 
   * @param featureName - The feature name to check
   * @returns True if the feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    return this.config.features.enabledFeatures.includes(featureName);
  }

  /**
   * Get the request timeout in milliseconds
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Get the number of retry attempts for failed requests
   */
  getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  /**
   * Get the current environment type
   */
  getEnvironment(): EnvironmentType {
    return this.currentEnvironment;
  }

  /**
   * Update the configuration at runtime
   * Requirements: 4.3, 4.5, 4.6, 4.7
   * 
   * @param updates - Partial configuration updates
   */
  updateConfiguration(updates: Partial<AtlasConfiguration>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = this.mergeConfiguration(currentConfig, updates);
    
    // Validate the new configuration (Requirement 4.6)
    if (this.validateConfiguration(newConfig)) {
      this.configSubject.next(newConfig);
    } else {
      // Reject invalid updates and keep current configuration (Requirement 4.3)
      console.error('Invalid ATLAS configuration update rejected, keeping current configuration', updates);
    }
  }

  /**
   * Reload configuration from environment
   * Requirements: 4.1
   */
  reloadConfiguration(): void {
    this.loadConfiguration();
  }

  /**
   * Detect the current environment based on Angular environment settings
   * Requirements: 4.2
   */
  private detectEnvironment(): EnvironmentType {
    if (environment.production) {
      return 'production';
    }
    
    // Check if we're using staging environment
    if (environment.apiUrl === staging_environment.apiUrl) {
      return 'staging';
    }
    
    // Check if we're using local environment
    if (environment.apiUrl === local_environment.apiUrl) {
      return 'development';
    }
    
    // Default to development for non-production builds
    return 'development';
  }

  /**
   * Load configuration based on the current environment
   * Requirements: 4.1, 4.2, 4.3
   */
  private loadConfiguration(): void {
    let config: AtlasConfiguration;

    try {
      switch (this.currentEnvironment) {
        case 'production':
          config = this.getProductionConfig();
          break;
        case 'staging':
          config = this.getStagingConfig();
          break;
        case 'development':
          config = this.getDevelopmentConfig();
          break;
        default:
          config = this.DEFAULT_CONFIG;
      }

      // Validate configuration before applying
      if (this.validateConfiguration(config)) {
        this.configSubject.next(config);
      } else {
        // Fallback to default configuration when validation fails (Requirement 4.3)
        console.warn('Invalid ATLAS configuration for environment, using fallback defaults');
        this.configSubject.next(this.DEFAULT_CONFIG);
      }
    } catch (error) {
      // Fallback to default configuration when loading fails (Requirement 4.3)
      console.error('Error loading ATLAS configuration, using fallback defaults:', error);
      this.configSubject.next(this.DEFAULT_CONFIG);
    }
  }

  /**
   * Get production environment configuration
   */
  private getProductionConfig(): AtlasConfiguration {
    return {
      baseUrl: 'https://sri-api.azurewebsites.net/api/atlas',
      apiVersion: 'v1',
      endpoints: {
        deployments: '/v1/deployments',
        aiAnalysis: '/v1/ai-analysis',
        approvals: '/v1/approvals',
        exceptions: '/v1/exceptions',
        agents: '/api/agents',
        queryBuilder: '/v1/query-builder',
        signalR: '/hubs/atlas'
      },
      features: {
        enabled: true,
        hybridMode: false,
        enabledFeatures: ['deployments', 'aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder']
      },
      timeout: 30000,
      retryAttempts: 3
    };
  }

  /**
   * Get staging environment configuration
   */
  private getStagingConfig(): AtlasConfiguration {
    return {
      baseUrl: 'https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net/atlas',
      apiVersion: 'v1',
      endpoints: {
        deployments: '/v1/deployments',
        aiAnalysis: '/v1/ai-analysis',
        approvals: '/v1/approvals',
        exceptions: '/v1/exceptions',
        agents: '/api/agents',
        queryBuilder: '/v1/query-builder',
        signalR: '/hubs/atlas'
      },
      features: {
        enabled: true,
        hybridMode: true,
        enabledFeatures: ['deployments', 'aiAnalysis', 'approvals']
      },
      timeout: 30000,
      retryAttempts: 3
    };
  }

  /**
   * Get development environment configuration
   */
  private getDevelopmentConfig(): AtlasConfiguration {
    return {
      baseUrl: 'https://localhost:44376/api/atlas',
      apiVersion: 'v1',
      endpoints: {
        deployments: '/v1/deployments',
        aiAnalysis: '/v1/ai-analysis',
        approvals: '/v1/approvals',
        exceptions: '/v1/exceptions',
        agents: '/api/agents',
        queryBuilder: '/v1/query-builder',
        signalR: '/hubs/atlas'
      },
      features: {
        enabled: true,
        hybridMode: true,
        enabledFeatures: ['deployments', 'aiAnalysis']
      },
      timeout: 60000, // Longer timeout for development
      retryAttempts: 2
    };
  }

  /**
   * Validate ATLAS configuration
   * Requirements: 4.3, 4.6
   * 
   * @param config - Configuration to validate
   * @returns True if configuration is valid
   */
  private validateConfiguration(config: AtlasConfiguration): boolean {
    // Validate base URL
    if (!config.baseUrl || !this.isValidUrl(config.baseUrl)) {
      console.error('Invalid ATLAS base URL:', config.baseUrl);
      return false;
    }

    // Validate API version
    if (!config.apiVersion || config.apiVersion.trim() === '') {
      console.error('Invalid ATLAS API version:', config.apiVersion);
      return false;
    }

    // Validate endpoints
    if (!config.endpoints || typeof config.endpoints !== 'object') {
      console.error('Invalid ATLAS endpoints configuration');
      return false;
    }

    // Validate each endpoint path (Requirement 4.6)
    const requiredEndpoints: (keyof AtlasConfiguration['endpoints'])[] = [
      'deployments', 'aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder', 'signalR'
    ];
    
    for (const endpointKey of requiredEndpoints) {
      const endpointPath = config.endpoints[endpointKey];
      if (!endpointPath || typeof endpointPath !== 'string' || endpointPath.trim() === '') {
        console.error(`Invalid ATLAS endpoint path for ${endpointKey}:`, endpointPath);
        return false;
      }
      
      // Validate full endpoint URL
      const fullUrl = `${config.baseUrl}${endpointPath}`;
      if (!this.isValidUrl(fullUrl)) {
        console.error(`Invalid ATLAS endpoint URL for ${endpointKey}:`, fullUrl);
        return false;
      }
    }

    // Validate timeout
    if (config.timeout <= 0 || config.timeout > 300000) {
      console.error('Invalid ATLAS timeout (must be between 0 and 300000ms):', config.timeout);
      return false;
    }

    // Validate retry attempts
    if (config.retryAttempts < 0 || config.retryAttempts > 10) {
      console.error('Invalid ATLAS retry attempts (must be between 0 and 10):', config.retryAttempts);
      return false;
    }

    // Validate features configuration (Requirement 4.3)
    if (!config.features || typeof config.features !== 'object') {
      console.error('Invalid ATLAS features configuration');
      return false;
    }

    if (typeof config.features.enabled !== 'boolean') {
      console.error('Invalid ATLAS features.enabled flag');
      return false;
    }

    if (typeof config.features.hybridMode !== 'boolean') {
      console.error('Invalid ATLAS features.hybridMode flag');
      return false;
    }

    if (!Array.isArray(config.features.enabledFeatures)) {
      console.error('Invalid ATLAS features.enabledFeatures array');
      return false;
    }

    return true;
  }

  /**
   * Validate URL format
   * Requirements: 4.6
   * 
   * @param url - URL to validate
   * @returns True if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      // For relative URLs, just check they start with /
      if (url.startsWith('/')) {
        return true;
      }

      // For absolute URLs, validate with URL constructor
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Deep merge configuration objects
   * 
   * @param target - Target configuration
   * @param source - Source configuration with updates
   * @returns Merged configuration
   */
  private mergeConfiguration(
    target: AtlasConfiguration,
    source: Partial<AtlasConfiguration>
  ): AtlasConfiguration {
    return {
      ...target,
      ...source,
      endpoints: {
        ...target.endpoints,
        ...(source.endpoints || {})
      },
      features: {
        ...target.features,
        ...(source.features || {})
      }
    };
  }
}
