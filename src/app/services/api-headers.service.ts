import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { ConfigurationService } from './configuration.service';

/**
 * Service for adding API-specific headers to HTTP requests
 * This service is used by individual HTTP services to avoid circular dependency in interceptors
 */
@Injectable({ providedIn: 'root' })
export class ApiHeadersService {
  private readonly configService = inject(ConfigurationService);

  /**
   * Get HTTP headers with API subscription key if available
   */
  getApiHeaders(): Observable<HttpHeaders> {
    const config = this.configService.getCurrentConfig();
    
    if (!config) {
      // Return empty headers if no configuration is available
      return of(new HttpHeaders());
    }

    let headers = new HttpHeaders();

    // Add API subscription key if available
    if (config.apiSubscriptionKey) {
      headers = headers.set('Ocp-Apim-Subscription-Key', config.apiSubscriptionKey);
    }

    // Add any other standard API headers here
    headers = headers.set('Accept', 'application/json');

    return of(headers);
  }

  /**
   * Get API subscription key directly
   */
  getApiSubscriptionKey(): string | null {
    const config = this.configService.getCurrentConfig();
    return config?.apiSubscriptionKey || null;
  }

  /**
   * Check if API subscription key is available
   */
  hasApiSubscriptionKey(): boolean {
    return !!this.getApiSubscriptionKey();
  }
}