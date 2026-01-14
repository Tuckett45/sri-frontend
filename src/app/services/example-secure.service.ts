import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigurationService } from './configuration.service';

/**
 * Example service demonstrating secure API usage without hardcoded keys
 * This service relies on ConfigurationInterceptor for API key management
 */
@Injectable({ providedIn: 'root' })
export class ExampleSecureService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigurationService);

  /**
   * HTTP options without hardcoded API keys
   * The ConfigurationInterceptor will automatically add required headers
   */
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
      // Note: No hardcoded Ocp-Apim-Subscription-Key
      // ConfigurationInterceptor handles this automatically
    })
  };

  /**
   * Example API call that will automatically get proper headers
   */
  getData(): Observable<any> {
    // Get the API base URL from configuration
    const config = this.configService.getCurrentConfig();
    const apiUrl = config?.apiBaseUrl || 'https://fallback-api.com';

    // Make the request - interceptor will add authentication and API key headers
    return this.http.get(`${apiUrl}/data`, this.httpOptions);
  }

  /**
   * Example POST request
   */
  postData(data: any): Observable<any> {
    const config = this.configService.getCurrentConfig();
    const apiUrl = config?.apiBaseUrl || 'https://fallback-api.com';

    // The interceptor will automatically add:
    // - Ocp-Apim-Subscription-Key (when configured)
    // - Authorization header (if user is authenticated)
    // - X-Session-ID (if available)
    return this.http.post(`${apiUrl}/data`, data, this.httpOptions);
  }

  /**
   * Example of overriding headers when needed
   */
  uploadFile(file: FormData): Observable<any> {
    const config = this.configService.getCurrentConfig();
    const apiUrl = config?.apiBaseUrl || 'https://fallback-api.com';

    // For file uploads, we don't want Content-Type: application/json
    const uploadOptions = {
      headers: new HttpHeaders({
        // Don't set Content-Type - let browser set it for FormData
        // ConfigurationInterceptor will still add API key and auth headers
      })
    };

    return this.http.post(`${apiUrl}/upload`, file, uploadOptions);
  }
}