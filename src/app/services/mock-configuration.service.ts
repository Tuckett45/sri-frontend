import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { RuntimeConfiguration, DEFAULT_RETRY_CONFIG, DEFAULT_NOTIFICATION_CONFIG } from '../models/configuration.model';
import { environment } from 'src/environments/environments';

/**
 * Mock Configuration Service for testing and development
 * This simulates the backend configuration endpoint
 * Remove this when the real backend endpoint is implemented
 */
@Injectable({ providedIn: 'root' })
export class MockConfigurationService {

  /**
   * Mock configuration data
   * In production, this would come from a secure backend endpoint
   */
  private readonly mockConfig: RuntimeConfiguration = {
    vapidPublicKey: 'BOg-2-T3wIzg42wyoCXxTdkYqShVYCQ87g_ZXUS6lYG-ymcoYfl3qpXq3ImqMoJ9UY1EQAxXBLaywuvuF21yD4s',
    apiBaseUrl: environment.apiUrl,
    apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8', // This would be securely managed on backend
    pushSubscriptionEndpoint: `${environment.apiUrl}/push-subscriptions`,
    retryConfiguration: DEFAULT_RETRY_CONFIG,
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_CONFIG,
      permissionEducationEnabled: true,
      maxNotificationHistory: 100
    },
    version: '1.0.0-mock',
    lastUpdated: new Date().toISOString()
  };

  /**
   * Simulate fetching configuration from backend
   * Returns mock configuration with a small delay to simulate network request
   */
  getRuntimeConfiguration(): Observable<RuntimeConfiguration> {
    console.log('🔧 [MOCK] Fetching runtime configuration...');
    
    // Simulate network delay
    return of(this.mockConfig).pipe(
      delay(500) // 500ms delay to simulate real API call
    );
  }

  /**
   * Check if this is a mock service (for development detection)
   */
  isMockService(): boolean {
    return true;
  }

  /**
   * Get mock configuration synchronously (for testing)
   */
  getMockConfig(): RuntimeConfiguration {
    return { ...this.mockConfig };
  }
}