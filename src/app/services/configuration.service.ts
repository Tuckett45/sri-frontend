import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer, of, from, firstValueFrom } from 'rxjs';
import { catchError, retry, tap, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environments';
import { MockConfigurationService } from './mock-configuration.service';
import { 
  RuntimeConfiguration, 
  RetryConfig, 
  NotificationConfig, 
  ConfigurationError, 
  ConfigurationErrorType,
  ConfigurationState,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_NOTIFICATION_CONFIG,
  NotificationType
} from '../models/configuration.model';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private readonly http = inject(HttpClient);
  private readonly mockConfigService = inject(MockConfigurationService);
  
  private readonly config$ = new BehaviorSubject<RuntimeConfiguration | null>(null);
  private readonly error$ = new BehaviorSubject<ConfigurationError | null>(null);
  private readonly isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly isInitialized$ = new BehaviorSubject<boolean>(false);
  
  private configCache: RuntimeConfiguration | null = null;
  private lastFetchTime: Date | null = null;
  private readonly cacheExpirationMs = 5 * 60 * 1000; // 5 minutes
  private useMockService = false;
  
  // Fallback configuration for when backend is unavailable
  private readonly fallbackConfig: RuntimeConfiguration = {
    vapidPublicKey: '', // Will be empty - notifications will be disabled
    apiBaseUrl: environment.apiUrl,
    apiSubscriptionKey: '', // Will be empty - API calls may fail
    pushSubscriptionEndpoint: `${environment.apiUrl}/push-subscriptions`,
    retryConfiguration: DEFAULT_RETRY_CONFIG,
    notificationSettings: DEFAULT_NOTIFICATION_CONFIG,
    version: '1.0.0-fallback',
    lastUpdated: new Date().toISOString()
  };

  /**
   * Get the current configuration as an observable
   */
  getConfig(): Observable<RuntimeConfiguration> {
    return this.config$.asObservable().pipe(
      switchMap(config => {
        if (config) {
          return of(config);
        }
        // If no config is available, try to initialize
        return from(this.initialize().then(() => this.config$.value || this.fallbackConfig));
      })
    );
  }

  /**
   * Get the current configuration synchronously (may return null if not initialized)
   */
  getCurrentConfig(): RuntimeConfiguration | null {
    return this.config$.value;
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config$.value !== null;
  }

  /**
   * Check if the service is currently loading configuration
   */
  isLoading(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  /**
   * Get the current error state
   */
  getError(): Observable<ConfigurationError | null> {
    return this.error$.asObservable();
  }

  /**
   * Check if the service has been initialized
   */
  isInitialized(): Observable<boolean> {
    return this.isInitialized$.asObservable();
  }

  /**
   * Check if we're currently using the mock configuration service
   */
  isUsingMockService(): boolean {
    return this.useMockService;
  }

  /**
   * Initialize the configuration service by fetching runtime configuration
   */
  async initialize(): Promise<void> {
    if (this.isLoading$.value) {
      console.log('⏳ Configuration service already initializing...');
      return;
    }

    console.log('🔧 Initializing Configuration Service...');
    this.isLoading$.next(true);
    this.error$.next(null);

    try {
      const config = await this.fetchConfiguration();
      this.setConfiguration(config);
      console.log('✅ Configuration Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Configuration Service:', error);
      this.handleConfigurationError(error);
      // Use fallback configuration to allow app to continue
      this.setConfiguration(this.fallbackConfig);
    } finally {
      this.isLoading$.next(false);
      this.isInitialized$.next(true);
    }
  }

  /**
   * Refresh the configuration from the backend
   */
  async refreshConfiguration(): Promise<void> {
    console.log('🔄 Refreshing configuration...');
    this.configCache = null;
    this.lastFetchTime = null;
    await this.initialize();
  }

  /**
   * Validate configuration object against expected schema
   */
  private validateConfiguration(config: any): config is RuntimeConfiguration {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    const requiredFields = [
      'vapidPublicKey',
      'apiBaseUrl',
      'apiSubscriptionKey', 
      'pushSubscriptionEndpoint',
      'retryConfiguration',
      'notificationSettings',
      'version',
      'lastUpdated'
    ];

    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate retry configuration
    const retryConfig = config.retryConfiguration;
    if (!retryConfig || typeof retryConfig !== 'object') {
      throw new Error('Invalid retryConfiguration object');
    }

    const requiredRetryFields = ['maxAttempts', 'baseDelayMs', 'maxDelayMs', 'backoffMultiplier'];
    for (const field of requiredRetryFields) {
      if (typeof retryConfig[field] !== 'number' || retryConfig[field] <= 0) {
        throw new Error(`Invalid retryConfiguration.${field}: must be a positive number`);
      }
    }

    // Validate notification settings
    const notificationSettings = config.notificationSettings;
    if (!notificationSettings || typeof notificationSettings !== 'object') {
      throw new Error('Invalid notificationSettings object');
    }

    if (typeof notificationSettings.permissionEducationEnabled !== 'boolean') {
      throw new Error('notificationSettings.permissionEducationEnabled must be a boolean');
    }

    if (typeof notificationSettings.maxNotificationHistory !== 'number' || notificationSettings.maxNotificationHistory <= 0) {
      throw new Error('notificationSettings.maxNotificationHistory must be a positive number');
    }

    if (!notificationSettings.defaultTimeouts || typeof notificationSettings.defaultTimeouts !== 'object') {
      throw new Error('notificationSettings.defaultTimeouts must be an object');
    }

    if (!Array.isArray(notificationSettings.supportedBrowsers)) {
      throw new Error('notificationSettings.supportedBrowsers must be an array');
    }

    // Validate API subscription key format
    if (config.apiSubscriptionKey && !this.isValidApiSubscriptionKey(config.apiSubscriptionKey)) {
      console.warn('⚠️ Invalid API subscription key format detected');
      // Don't throw error - allow fallback behavior
    }

    // Validate VAPID key format (base64url)
    if (config.vapidPublicKey && !this.isValidVapidKey(config.vapidPublicKey)) {
      console.warn('⚠️ Invalid VAPID key format detected');
      // Don't throw error - allow fallback behavior
    }

    return true;
  }

  /**
   * Validate API subscription key format
   */
  private isValidApiSubscriptionKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // API subscription keys are typically 32-character hexadecimal strings
    const hexPattern = /^[a-f0-9]{32}$/i;
    return hexPattern.test(key);
  }

  /**
   * Validate VAPID key format
   */
  private isValidVapidKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // VAPID keys should be base64url encoded and approximately 88 characters
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    return base64UrlPattern.test(key) && key.length >= 80 && key.length <= 100;
  }

  /**
   * Fetch configuration from backend with retry logic
   */
  private async fetchConfiguration(): Promise<RuntimeConfiguration> {
    // Check cache first
    if (this.configCache && this.isCacheValid()) {
      console.log('📋 Using cached configuration');
      return this.configCache;
    }

    // Try to fetch from real backend endpoints first
    const endpoints = this.getConfigurationEndpoints();
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🌐 Fetching configuration from: ${endpoint}`);
        
        const config = await firstValueFrom(this.http.get<RuntimeConfiguration>(endpoint));

        if (!config) {
          throw new Error('Empty configuration response');
        }

        // Validate the configuration
        if (this.validateConfiguration(config)) {
          this.configCache = config;
          this.lastFetchTime = new Date();
          this.useMockService = false;
          console.log('✅ Configuration fetched and validated successfully');
          return config;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Failed to fetch configuration from ${endpoint}:`, error);
        continue; // Try next endpoint
      }
    }

    // If all backend endpoints failed, try mock service for development
    if (!environment.production) {
      try {
        console.log('🔧 Backend endpoints failed, using mock configuration for development');
        const mockConfig = await firstValueFrom(this.mockConfigService.getRuntimeConfiguration());
        
        if (this.validateConfiguration(mockConfig)) {
          this.configCache = mockConfig;
          this.lastFetchTime = new Date();
          this.useMockService = true;
          console.log('✅ Mock configuration loaded successfully');
          return mockConfig;
        }
      } catch (mockError) {
        console.error('❌ Mock configuration also failed:', mockError);
      }
    }

    // If everything failed, throw the last error
    throw lastError || new Error('All configuration endpoints failed');
  }

  /**
   * Get list of configuration endpoints to try
   */
  private getConfigurationEndpoints(): string[] {
    const baseUrl = environment.apiUrl;
    return [
      `${baseUrl}/config/runtime`,
      `${baseUrl}/configuration/runtime`,
      `${baseUrl}/app/config` // Fallback endpoint
    ];
  }

  /**
   * Check if cached configuration is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastFetchTime) {
      return false;
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - this.lastFetchTime.getTime();
    return timeDiff < this.cacheExpirationMs;
  }

  /**
   * Set the current configuration and notify observers
   */
  private setConfiguration(config: RuntimeConfiguration): void {
    this.config$.next(config);
    this.error$.next(null);
    
    // Log configuration status
    if (config === this.fallbackConfig) {
      console.warn('⚠️ Using fallback configuration - some features may be limited');
    } else {
      console.log('✅ Configuration set successfully:', {
        version: config.version,
        lastUpdated: config.lastUpdated,
        hasVapidKey: !!config.vapidPublicKey,
        notificationsEnabled: config.notificationSettings.permissionEducationEnabled
      });
    }
  }

  /**
   * Handle configuration errors
   */
  private handleConfigurationError(error: any): void {
    let configError: ConfigurationError;

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        configError = {
          type: ConfigurationErrorType.NETWORK_ERROR,
          message: 'Network error - check internet connection',
          timestamp: new Date(),
          retryable: true
        };
      } else if (error.status >= 500) {
        configError = {
          type: ConfigurationErrorType.ENDPOINT_UNREACHABLE,
          message: `Server error (${error.status}) - configuration service unavailable`,
          timestamp: new Date(),
          retryable: true
        };
      } else {
        configError = {
          type: ConfigurationErrorType.ENDPOINT_UNREACHABLE,
          message: `HTTP ${error.status}: ${error.message}`,
          timestamp: new Date(),
          retryable: false
        };
      }
    } else if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
      configError = {
        type: ConfigurationErrorType.VALIDATION_ERROR,
        message: error.message || 'Configuration validation failed',
        timestamp: new Date(),
        retryable: false
      };
    } else {
      configError = {
        type: ConfigurationErrorType.NETWORK_ERROR,
        message: error.message || 'Unknown configuration error',
        timestamp: new Date(),
        retryable: true
      };
    }

    this.error$.next(configError);
    console.error('🚨 Configuration Error:', configError);
  }

  /**
   * Support for development hot-reloading
   */
  enableHotReload(): void {
    if (!environment.production) {
      console.log('🔥 Hot-reload enabled for configuration');
      
      // Check for configuration updates every 30 seconds in development
      timer(0, 30000).subscribe(() => {
        if (this.isInitialized$.value && !this.isLoading$.value) {
          this.refreshConfiguration().catch(error => {
            console.warn('Hot-reload configuration refresh failed:', error);
          });
        }
      });
    }
  }
}