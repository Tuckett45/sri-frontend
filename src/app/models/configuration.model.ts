/**
 * Runtime configuration models for secure configuration management
 */

export interface RuntimeConfiguration {
  vapidPublicKey: string;
  apiBaseUrl: string;
  apiSubscriptionKey: string;
  pushSubscriptionEndpoint: string;
  retryConfiguration: RetryConfig;
  notificationSettings: NotificationConfig;
  version: string;
  lastUpdated: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface NotificationConfig {
  permissionEducationEnabled: boolean;
  maxNotificationHistory: number;
  defaultTimeouts: Record<NotificationType, number>;
  supportedBrowsers: string[];
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface ConfigurationError {
  type: ConfigurationErrorType;
  message: string;
  timestamp: Date;
  retryable: boolean;
  context?: Record<string, any>;
}

export enum ConfigurationErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENDPOINT_UNREACHABLE = 'ENDPOINT_UNREACHABLE',
  INVALID_SCHEMA = 'INVALID_SCHEMA'
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration service state interface
 */
export interface ConfigurationState {
  config: RuntimeConfiguration | null;
  error: ConfigurationError | null;
  isLoading: boolean;
  isInitialized: boolean;
  lastFetchTime: Date | null;
}

/**
 * Default configuration values
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  permissionEducationEnabled: true,
  maxNotificationHistory: 50,
  defaultTimeouts: {
    'info': 5000,
    'warning': 8000,
    'error': 0, // No auto-dismiss for errors
    'success': 7000
  },
  supportedBrowsers: ['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera']
};

/**
 * Configuration endpoint options
 */
export interface ConfigurationEndpoint {
  url: string;
  priority: number;
  timeout: number;
  retryCount: number;
}

/**
 * Hot-reload configuration for development
 */
export interface HotReloadConfig {
  enabled: boolean;
  intervalMs: number;
  watchFiles: string[];
}