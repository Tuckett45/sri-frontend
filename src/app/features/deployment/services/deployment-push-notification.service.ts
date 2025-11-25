import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environments';
import { DeploymentFeatureFlagsService } from './deployment-feature-flags.service';
import { ToastrService } from 'ngx-toastr';

export interface PushSubscriptionData {
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
  private readonly featureFlags = inject(DeploymentFeatureFlagsService);
  private readonly toastr = inject(ToastrService);
  
  private readonly apiUrl = `${environment.apiUrl}/push-subscriptions`;
  private readonly vapidPublicKey = environment.vapidPublicKey;
  
  private isInitialized$ = new BehaviorSubject<boolean>(false);
  private isSubscribed$ = new BehaviorSubject<boolean>(false);
  private subscriptionError$ = new BehaviorSubject<string | null>(null);
  private currentSubscription$ = new BehaviorSubject<PushSubscription | null>(null);

  // Public observables
  readonly initialized$ = this.isInitialized$.asObservable();
  readonly subscribed$ = this.isSubscribed$.asObservable();
  readonly error$ = this.subscriptionError$.asObservable();

  /**
   * Check if push notifications are supported in the browser
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  get permission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Show a local notification
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported()) {
      console.warn('❌ Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('❌ Notification permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/assets/icons/notification-icon.png',
        badge: payload.badge || '/assets/icons/notification-badge.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        data: payload.data
      });
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Initialize push notifications
   * Call this when the app starts or when user enables notifications
   */
  async initialize(): Promise<void> {
    try {
      // Check if notifications are enabled via feature flag
      const notificationsEnabled = this.featureFlags.areNotificationsEnabled();
      if (!notificationsEnabled) {
        console.log('📵 Push notifications disabled by feature flag');
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
        await this.syncSubscriptionWithBackend(existingSubscription);
        this.currentSubscription$.next(existingSubscription);
        this.isSubscribed$.next(true);
      } else {
        // Create new subscription
        await this.subscribe(registration);
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
  async subscribe(registration?: ServiceWorkerRegistration): Promise<void> {
    try {
      if (!registration) {
        registration = await navigator.serviceWorker.ready;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('✅ Created new push subscription');
      
      await this.syncSubscriptionWithBackend(subscription);
      
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
      await this.removeSubscriptionFromBackend(subscription);

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
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/test`, {})
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
    return this.http.get<PushSubscriptionResponse[]>(this.apiUrl);
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register('/ngsw-worker.js', {
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
  private async syncSubscriptionWithBackend(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = this.convertSubscriptionToDTO(subscription);
      
      const response = await firstValueFrom(
        this.http.post<PushSubscriptionResponse>(this.apiUrl, subscriptionData)
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
  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    try {
      const subscriptionData = this.convertSubscriptionToDTO(subscription);
      
      await firstValueFrom(
        this.http.request('DELETE', this.apiUrl, { body: subscriptionData })
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
  private convertSubscriptionToDTO(subscription: PushSubscription): PushSubscriptionData {
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

