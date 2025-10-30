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

