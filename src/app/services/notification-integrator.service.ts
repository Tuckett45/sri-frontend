import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DeploymentPushNotificationService } from '../features/deployment/services/deployment-push-notification.service';
import { FeatureFlagService } from './feature-flag.service';
import { ConfigurationService } from './configuration.service';
import { Router } from '@angular/router';

/**
 * Notification payload structure for all notification types
 * 
 * This interface defines the structure of notification data that flows through
 * the notification system. It supports multiple notification types (deployment,
 * magic-8-ball, system) and includes metadata for routing and filtering.
 * 
 * @example
 * ```typescript
 * const payload: NotificationPayload = {
 *   type: 'magic-8-ball',
 *   title: '🎱 Magic 8 Ball',
 *   message: 'Your answer is: Yes',
 *   category: 'positive',
 *   metadata: { question: 'Will it work?', answer: 'Yes' }
 * };
 * ```
 */
export interface NotificationPayload {
  /** Type identifier for routing and filtering */
  type: 'deployment' | 'magic-8-ball' | 'system';
  
  /** Display title */
  title: string;
  
  /** Display message/body */
  message: string;
  
  /** Optional category for styling/filtering */
  category?: 'positive' | 'negative' | 'neutral' | 'info' | 'warning' | 'error';
  
  /** Additional data for notification handlers */
  metadata?: {
    deploymentId?: string;
    question?: string;
    answer?: string;
    timestamp?: string;
    [key: string]: any;
  };
  
  /** Actions available in push notifications */
  actions?: NotificationAction[];
}

/**
 * Notification action for push notifications
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Options for notification delivery
 * 
 * Controls how notifications are delivered across different channels (toast, push).
 * Includes configuration for styling, timeouts, navigation, and push notification
 * specific options like icons and badges.
 * 
 * @example
 * ```typescript
 * const options: NotificationDeliveryOptions = {
 *   showToast: true,
 *   sendPush: false,
 *   toastType: 'success',
 *   navigateOnClick: ['/notifications']
 * };
 * ```
 */
export interface NotificationDeliveryOptions {
  /** Whether to show toast notification */
  showToast: boolean;
  
  /** Whether to send push notification */
  sendPush: boolean;
  
  /** Toast type (defaults to 'info') */
  toastType?: 'info' | 'success' | 'warning' | 'error';
  
  /** Toast timeout in milliseconds (0 = no auto-dismiss) */
  toastTimeout?: number;
  
  /** Router commands to navigate on click */
  navigateOnClick?: string[];
  
  /** Push notification title override */
  pushTitle?: string;
  
  /** Push notification icon */
  pushIcon?: string;
  
  /** Push notification badge */
  pushBadge?: string;
  
  /** Push notification tag */
  pushTag?: string;
  
  /** Whether push notification requires interaction */
  requireInteraction?: boolean;
}

/**
 * Result of notification delivery attempt
 */
export interface NotificationDeliveryResult {
  /** Overall success status */
  success: boolean;
  
  /** Whether toast was delivered */
  toastDelivered: boolean;
  
  /** Whether push was delivered */
  pushDelivered: boolean;
  
  /** Any errors that occurred */
  errors: NotificationError[];
}

/**
 * Notification error details
 */
export interface NotificationError {
  /** Channel where error occurred */
  channel: 'toast' | 'push' | 'config' | 'storage';
  
  /** The error that occurred */
  error: Error;
  
  /** Whether the error is recoverable */
  recoverable: boolean;
  
  /** When the error occurred */
  timestamp: Date;
  
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  /** Unique identifier for the notification */
  id: string;
  
  /** Type identifier */
  type: 'deployment' | 'magic-8-ball' | 'system';
  
  /** Display title */
  title: string;
  
  /** Display message */
  message: string;
  
  /** When the notification was created */
  timestamp: Date;
  
  /** Optional category */
  category?: 'positive' | 'negative' | 'neutral' | 'info' | 'warning' | 'error';
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Whether notification was delivered via toast */
  deliveredViaToast: boolean;
  
  /** Whether notification was delivered via push */
  deliveredViaPush: boolean;
}

/**
 * Service that integrates notification delivery across multiple channels
 * 
 * This service centralizes all notification logic for the application, providing
 * a unified interface for sending toast and push notifications. It handles:
 * - Feature flag checking
 * - Multi-channel delivery (toast and push)
 * - Error handling with graceful degradation
 * - Notification history tracking
 * - Category-based timeout configuration
 * - Navigation on notification click
 * 
 * The service respects user preferences and feature flags, ensuring notifications
 * are only sent when appropriate. All notification delivery is non-blocking and
 * will not prevent the application from functioning if notifications fail.
 * 
 * @example
 * ```typescript
 * const payload: NotificationPayload = {
 *   type: 'magic-8-ball',
 *   title: 'Magic 8 Ball',
 *   message: 'Your answer is ready',
 *   category: 'positive'
 * };
 * 
 * const options: NotificationDeliveryOptions = {
 *   showToast: true,
 *   sendPush: false,
 *   toastType: 'success'
 * };
 * 
 * const result = await notificationService.sendNotification(payload, options);
 * console.log('Toast delivered:', result.toastDelivered);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NotificationIntegratorService {
  private readonly toastr = inject(ToastrService);
  private readonly pushService = inject(DeploymentPushNotificationService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly configService = inject(ConfigurationService);
  private readonly router = inject(Router);
  
  private readonly HISTORY_STORAGE_KEY = 'sri-notification-history';
  private notificationHistory: NotificationHistoryEntry[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * Send notification through configured channels
   * 
   * This is the main entry point for sending notifications. It attempts to deliver
   * notifications through the requested channels (toast and/or push) and handles
   * errors gracefully. If one channel fails, the other may still succeed.
   * 
   * The method respects feature flags - if notifications are disabled, it returns
   * immediately with success=true (not an error condition).
   * 
   * Successful notifications are automatically added to the notification history.
   * 
   * @param payload - The notification content and metadata
   * @param options - Delivery options controlling channels and styling
   * @returns A promise resolving to the delivery result with success status and any errors
   * 
   * @example
   * ```typescript
   * const result = await service.sendNotification(
   *   { type: 'magic-8-ball', title: 'Answer', message: 'Yes' },
   *   { showToast: true, sendPush: false }
   * );
   * 
   * if (result.success) {
   *   console.log('Notification delivered successfully');
   * } else {
   *   console.error('Notification failed:', result.errors);
   * }
   * ```
   */
  async sendNotification(
    payload: NotificationPayload,
    options: NotificationDeliveryOptions
  ): Promise<NotificationDeliveryResult> {
    const result: NotificationDeliveryResult = {
      success: false,
      toastDelivered: false,
      pushDelivered: false,
      errors: []
    };

    // Check if notifications are enabled via feature flag
    if (!this.areNotificationsEnabled()) {
      console.log('📵 Notifications disabled by feature flag');
      result.success = true; // Not an error, just disabled
      return result;
    }

    // Attempt toast notification
    if (options.showToast) {
      try {
        await this.sendToastNotification(payload, options);
        result.toastDelivered = true;
      } catch (error) {
        console.error('❌ Toast notification failed:', error);
        result.errors.push({
          channel: 'toast',
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
          timestamp: new Date()
        });
      }
    }

    // Attempt push notification
    if (options.sendPush) {
      try {
        await this.sendPushNotification(payload, options);
        result.pushDelivered = true;
      } catch (error) {
        console.error('❌ Push notification failed:', error);
        result.errors.push({
          channel: 'push',
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
          timestamp: new Date()
        });
      }
    }

    // Overall success if at least one channel succeeded or both were disabled
    result.success = result.toastDelivered || result.pushDelivered || (!options.showToast && !options.sendPush);

    // Add to notification history if at least one channel succeeded
    if (result.toastDelivered || result.pushDelivered) {
      this.addToHistory(payload, result);
    }

    return result;
  }

  /**
   * Check if notifications are enabled via feature flag
   */
  areNotificationsEnabled(): boolean {
    return this.featureFlags.flagEnabled('notifications')();
  }

  /**
   * Get notification configuration from ConfigurationService
   */
  getNotificationConfig(): Observable<any> {
    return this.configService.getConfig();
  }

  /**
   * Request notification permissions from the browser
   */
  async requestPermissions(): Promise<NotificationPermission> {
    try {
      return await this.pushService.requestPermission();
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      throw error;
    }
  }

  /**
   * Send toast notification
   */
  private async sendToastNotification(
    payload: NotificationPayload,
    options: NotificationDeliveryOptions
  ): Promise<void> {
    const toastType = options.toastType || 'info';
    const timeout = options.toastTimeout ?? this.getDefaultTimeout(payload.category);
    
    const toastOptions = {
      timeOut: timeout,
      closeButton: true,
      progressBar: true,
      enableHtml: false,
      positionClass: 'toast-top-right',
      tapToDismiss: true
    };

    // Add click handler for navigation if specified
    if (options.navigateOnClick) {
      const onTap = () => {
        this.router.navigate(options.navigateOnClick!);
      };
      Object.assign(toastOptions, { onTap });
    }

    // Show toast based on type
    switch (toastType) {
      case 'success':
        this.toastr.success(payload.message, payload.title, toastOptions);
        break;
      case 'warning':
        this.toastr.warning(payload.message, payload.title, toastOptions);
        break;
      case 'error':
        this.toastr.error(payload.message, payload.title, toastOptions);
        break;
      default:
        this.toastr.info(payload.message, payload.title, toastOptions);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    payload: NotificationPayload,
    options: NotificationDeliveryOptions
  ): Promise<void> {
    // Check if push notifications are supported and permitted
    if (!this.pushService.isSupported()) {
      throw new Error('Push notifications not supported in this browser');
    }

    if (this.pushService.permission !== 'granted') {
      throw new Error('Push notification permission not granted');
    }

    // Build push notification payload
    const pushPayload = {
      title: options.pushTitle || payload.title,
      body: payload.message,
      icon: options.pushIcon || '/assets/icons/icon-192x192.png',
      badge: options.pushBadge || '/assets/icons/badge-72x72.png',
      tag: options.pushTag || payload.type,
      requireInteraction: options.requireInteraction ?? false,
      data: {
        type: payload.type,
        ...payload.metadata,
        navigateOnClick: options.navigateOnClick
      },
      actions: payload.actions
    };

    await this.pushService.showLocalNotification(pushPayload);
  }

  /**
   * Get default timeout based on category
   */
  private getDefaultTimeout(category?: string): number {
    switch (category) {
      case 'positive':
        return 6000; // 6 seconds
      case 'negative':
        return 8000; // 8 seconds
      case 'neutral':
        return 5000; // 5 seconds
      default:
        return 6000; // Default 6 seconds
    }
  }

  /**
   * Add notification to history
   */
  private addToHistory(
    payload: NotificationPayload,
    result: NotificationDeliveryResult
  ): void {
    try {
      const entry: NotificationHistoryEntry = {
        id: this.generateHistoryId(),
        type: payload.type,
        title: payload.title,
        message: payload.message,
        timestamp: new Date(),
        category: payload.category,
        metadata: payload.metadata,
        deliveredViaToast: result.toastDelivered,
        deliveredViaPush: result.pushDelivered
      };

      // Add to beginning of array (newest first)
      this.notificationHistory.unshift(entry);

      // Enforce history size limit
      this.enforceHistoryLimit();

      // Persist to storage
      this.saveHistory();
    } catch (error) {
      console.error('❌ Failed to add notification to history:', error);
    }
  }

  /**
   * Enforce history size limit using FIFO removal
   */
  private enforceHistoryLimit(): void {
    try {
      const config = this.configService.getCurrentConfig();
      const maxHistory = config?.notificationSettings?.maxNotificationHistory ?? 50;

      if (this.notificationHistory.length > maxHistory) {
        // Remove oldest entries (from the end of the array)
        this.notificationHistory = this.notificationHistory.slice(0, maxHistory);
      }
    } catch (error) {
      // If config service doesn't have getCurrentConfig (e.g., in tests), use default
      const maxHistory = 50;
      if (this.notificationHistory.length > maxHistory) {
        this.notificationHistory = this.notificationHistory.slice(0, maxHistory);
      }
    }
  }

  /**
   * Get notification history
   */
  getHistory(): NotificationHistoryEntry[] {
    return [...this.notificationHistory];
  }

  /**
   * Get notification history filtered by type
   */
  getHistoryByType(type: 'deployment' | 'magic-8-ball' | 'system'): NotificationHistoryEntry[] {
    return this.notificationHistory.filter(entry => entry.type === type);
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notificationHistory = [];
    this.saveHistory();
  }

  /**
   * Clear history for a specific type
   */
  clearHistoryByType(type: 'deployment' | 'magic-8-ball' | 'system'): void {
    this.notificationHistory = this.notificationHistory.filter(entry => entry.type !== type);
    this.saveHistory();
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(this.HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        this.notificationHistory = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('❌ Failed to load notification history:', error);
      this.notificationHistory = [];
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(this.notificationHistory);
      window.localStorage.setItem(this.HISTORY_STORAGE_KEY, serialized);
    } catch (error) {
      console.error('❌ Failed to save notification history:', error);
    }
  }

  /**
   * Generate unique ID for history entry
   * @returns A unique identifier combining timestamp and random string
   */
  private generateHistoryId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
