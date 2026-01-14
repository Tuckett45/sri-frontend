import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { ToastrService } from 'ngx-toastr';

export interface DeploymentPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceType?: string;
  browser?: string;
}

export interface PushSubscriptionResponse {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime: string | null;
  deviceType: string | null;
  browser: string | null;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
  status: string; // "Created", "Updated", "Active"
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class DeploymentPushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigurationService);
  private readonly featureFlags = inject(FeatureFlagService);
  private readonly toastr = inject(ToastrService);
  
  private isInitialized$ = new BehaviorSubject<boolean>(false);
  private isSubscribed$ = new BehaviorSubject<boolean>(false);
  private subscriptionError$ = new BehaviorSubject<string | null>(null);
  private currentSubscription$ = new BehaviorSubject<PushSubscription | null>(null);
  private swRegistration: ServiceWorkerRegistration | null = null;

  // Public observables
  readonly initialized$ = this.isInitialized$.asObservable();
  readonly subscribed$ = this.isSubscribed$.asObservable();
  readonly error$ = this.subscriptionError$.asObservable();

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
  }

  get permission(): NotificationPermission {
    return this.isSupported() ? Notification.permission : 'default';
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }
    return Notification.requestPermission();
  }

  /**
   * Initialize push notifications
   * Call this when the app starts or when user enables notifications
   */
  async initialize(): Promise<void> {
    try {
      // Check if notifications are enabled via feature flag
      const notificationsEnabled = this.featureFlags.flagEnabled('notifications')();
      if (!notificationsEnabled) {
        console.log('📵 Push notifications disabled by feature flag');
        return;
      }

      // Wait for configuration to be available
      const config = await firstValueFrom(this.configService.getConfig());
      if (!config) {
        this.subscriptionError$.next('Configuration not available');
        console.error('❌ Configuration service not available');
        return;
      }

      // Check if VAPID key is available
      if (!config.vapidPublicKey) {
        this.subscriptionError$.next('VAPID public key not configured');
        console.warn('⚠️ VAPID public key not available - push notifications disabled');
        return;
      }

      // Check browser support
      if (!('Notification' in window)) {
        this.subscriptionError$.next('Browser does not support notifications');
        console.warn('❌ Browser does not support notifications');
        return;
      }

      if (!('serviceWorker' in navigator)) {
        this.subscriptionError$.next('Browser does not support service workers');
        console.warn('❌ Browser does not support service workers');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.subscriptionError$.next('Notification permission denied');
        console.warn('❌ Notification permission denied');
        return;
      }

      // Register service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        this.subscriptionError$.next('Failed to register service worker');
        return;
      }

      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('✅ Found existing push subscription');
        await this.syncSubscriptionWithBackend(existingSubscription, config);
        this.currentSubscription$.next(existingSubscription);
        this.isSubscribed$.next(true);
      } else {
        // Create new subscription
        await this.subscribe(registration, config);
      }

      this.isInitialized$.next(true);
      console.log('✅ Push notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      this.subscriptionError$.next(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(registration?: ServiceWorkerRegistration, config?: any): Promise<void> {
    try {
      if (!registration) {
        registration = await navigator.serviceWorker.ready;
      }
      this.swRegistration = registration;

      if (!config) {
        config = await firstValueFrom(this.configService.getConfig());
      }

      if (!config?.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(config.vapidPublicKey)
      });

      console.log('✅ Created new push subscription');
      
      await this.syncSubscriptionWithBackend(subscription, config);
      
      this.currentSubscription$.next(subscription);
      this.isSubscribed$.next(true);
      this.subscriptionError$.next(null);

      this.toastr.success('Push notifications enabled!', 'Notifications', {
        timeOut: 3000,
        positionClass: 'toast-top-right'
      });
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      this.subscriptionError$.next(error instanceof Error ? error.message : 'Failed to subscribe');
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    try {
      const subscription = this.currentSubscription$.value;
      if (!subscription) {
        console.warn('⚠️ No active subscription to unsubscribe from');
        return;
      }

      // Unsubscribe from browser
      await subscription.unsubscribe();
      console.log('✅ Unsubscribed from push notifications');

      // Remove from backend
      const config = await firstValueFrom(this.configService.getConfig());
      await this.removeSubscriptionFromBackend(subscription, config);

      this.currentSubscription$.next(null);
      this.isSubscribed$.next(false);

      this.toastr.info('Push notifications disabled', 'Notifications', {
        timeOut: 3000,
        positionClass: 'toast-top-right'
      });
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    try {
      const config = await firstValueFrom(this.configService.getConfig());
      if (!config?.pushSubscriptionEndpoint) {
        throw new Error('Push subscription endpoint not configured');
      }

      await firstValueFrom(
        this.http.post(`${config.pushSubscriptionEndpoint}/test`, {})
      );
      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Get current user's subscriptions from backend
   */
  getMySubscriptions(): Observable<PushSubscriptionResponse[]> {
    return this.configService.getConfig().pipe(
      switchMap(config => {
        if (!config?.pushSubscriptionEndpoint) {
          throw new Error('Push subscription endpoint not configured');
        }
        return this.http.get<PushSubscriptionResponse[]>(config.pushSubscriptionEndpoint);
      })
    );
  }

  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported in this environment.');
      return;
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const registration = await this.getServiceWorkerRegistration();
      if (!registration) {
        throw new Error('Service Worker not registered');
      }

      const options: NotificationOptions & { vibrate?: number[]; actions?: NotificationAction[] } = {
        body: payload.body,
        icon: payload.icon || '/assets/icons/icon-192x192.png',
        badge: payload.badge || '/assets/icons/badge-72x72.png',
        data: payload.data,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction ?? false,
        actions: payload.actions
      };

      if (payload.vibrate) {
        options.vibrate = payload.vibrate;
      }

      await registration.showNotification(payload.title, options);
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }

  async getCurrentSubscription(): Promise<PushSubscriptionJSON | null> {
    const registration = await this.getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.toJSON() : null;
  }

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.swRegistration) {
      return this.swRegistration;
    }
    if (!('serviceWorker' in navigator)) {
      return null;
    }
    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      return this.swRegistration;
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      return null;
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      // Use custom service worker for push notifications
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service worker registered:', registration.scope);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Sync subscription with backend
   */
  private async syncSubscriptionWithBackend(subscription: PushSubscription, config?: any): Promise<void> {
    try {
      if (!config) {
        config = await firstValueFrom(this.configService.getConfig());
      }

      if (!config?.pushSubscriptionEndpoint) {
        throw new Error('Push subscription endpoint not configured');
      }

      const subscriptionData = this.convertSubscriptionToDTO(subscription);
      
      const response = await firstValueFrom(
        this.http.post<PushSubscriptionResponse>(config.pushSubscriptionEndpoint, subscriptionData)
      );
      
      console.log('✅ Subscription synced with backend:', response.status);
    } catch (error) {
      console.error('❌ Failed to sync subscription with backend:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(subscription: PushSubscription, config?: any): Promise<void> {
    try {
      if (!config) {
        config = await firstValueFrom(this.configService.getConfig());
      }

      if (!config?.pushSubscriptionEndpoint) {
        throw new Error('Push subscription endpoint not configured');
      }

      const subscriptionData = this.convertSubscriptionToDTO(subscription);
      
      await firstValueFrom(
        this.http.request('DELETE', config.pushSubscriptionEndpoint, { body: subscriptionData })
      );
      
      console.log('✅ Subscription removed from backend');
    } catch (error) {
      console.error('❌ Failed to remove subscription from backend:', error);
      throw error;
    }
  }

  /**
   * Convert PushSubscription to DTO format
   */
  private convertSubscriptionToDTO(subscription: PushSubscription): DeploymentPushSubscription {
    const subscriptionJson = subscription.toJSON();
    
    return {
      endpoint: subscription.endpoint,
      expirationTime: subscriptionJson.expirationTime || null,
      keys: {
        p256dh: subscriptionJson.keys?.['p256dh'] || '',
        auth: subscriptionJson.keys?.['auth'] || ''
      },
      deviceType: this.detectDeviceType(),
      browser: this.detectBrowser()
    };
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  /**
   * Detect browser
   */
  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  }
}
