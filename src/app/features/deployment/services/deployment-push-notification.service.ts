import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environments';
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
  private readonly featureFlags = inject(FeatureFlagService);
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
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentPushNotificationService {
  private readonly http = inject(HttpClient);
  
  // VAPID public key - This should be generated on your backend
  // Run: npx web-push generate-vapid-keys
  // Store the private key on backend, public key here
  private readonly vapidPublicKey = environment.vapidPublicKey || '';

  private swRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscriptionJSON | null = null;

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  /**
   * Check if user has granted notification permission
   */
  get permission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Initialize push notifications
   * 1. Register service worker
   * 2. Request notification permission
   * 3. Subscribe to push notifications
   * 4. Send subscription to backend
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      // Step 1: Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.swRegistration);

      // Step 2: Request permission
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // Step 3: Subscribe to push notifications
      await this.subscribeToPush();

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    if (!this.vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return;
    }

    try {
      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      this.pushSubscription = subscription.toJSON();
      console.log('Push subscription created:', this.pushSubscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(this.pushSubscription);

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.swRegistration) {
      console.warn('Service Worker not registered');
      return;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');

        // Notify backend
        await this.removeSubscriptionFromBackend(subscription.toJSON());
      }

      this.pushSubscription = null;

    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push subscription to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscriptionJSON): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/push-subscriptions`, subscription)
      );
      console.log('Push subscription sent to backend');
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
    }
  }

  /**
   * Remove push subscription from backend
   */
  private async removeSubscriptionFromBackend(subscription: PushSubscriptionJSON): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/api/push-subscriptions`, {
          body: subscription
        })
      );
      console.log('Push subscription removed from backend');
    } catch (error) {
      console.error('Failed to remove subscription from backend:', error);
    }
  }

  /**
   * Show a local notification (for testing)
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      await this.swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/assets/icons/icon-192x192.png',
        badge: payload.badge || '/assets/icons/badge-72x72.png',
        data: payload.data,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        vibrate: [200, 100, 200]
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Get current push subscription
   */
  async getCurrentSubscription(): Promise<PushSubscriptionJSON | null> {
    if (!this.swRegistration) {
      return null;
    }

    const subscription = await this.swRegistration.pushManager.getSubscription();
    return subscription ? subscription.toJSON() : null;
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
   * Test push notification (for debugging)
   */
  async testNotification(): Promise<void> {
    await this.showLocalNotification({
      title: '🚀 Test Notification',
      body: 'Push notifications are working!',
      tag: 'test',
      data: { type: 'test' }
    });
  }
}
