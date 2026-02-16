import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { AtlasAuthService } from '../services/atlas-auth.service';
import { AtlasConfigService } from '../services/atlas-config.service';

/**
 * AtlasAuthInterceptor
 * 
 * HTTP Interceptor that automatically attaches authentication tokens and
 * ATLAS-specific headers to all ATLAS API requests.
 * 
 * Features:
 * - Automatically adds Bearer token authentication
 * - Adds ATLAS API version header
 * - Adds client ID header for request tracking
 * - Only intercepts requests to ATLAS endpoints
 * 
 * Requirements: 1.3, 2.5
 */
@Injectable()
export class AtlasAuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AtlasAuthService);
  private readonly configService = inject(AtlasConfigService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept ATLAS API requests
    if (!this.isAtlasRequest(req.url)) {
      return next.handle(req);
    }

    // Get access token and add ATLAS-specific headers
    return from(this.authService.getAccessToken()).pipe(
      switchMap(accessToken => {
        let modifiedReq = req;

        // Add authentication token if available (Requirement 2.5)
        if (accessToken) {
          const authState = this.authService.currentAuthState;
          const tokenType = authState.token?.tokenType || 'Bearer';
          
          modifiedReq = modifiedReq.clone({
            setHeaders: {
              'Authorization': `${tokenType} ${accessToken}`
            }
          });
        }

        // Add ATLAS-specific headers (Requirement 1.3)
        const atlasHeaders: { [key: string]: string } = {};

        // Add API version header
        const apiVersion = this.configService.getApiVersion();
        if (apiVersion) {
          atlasHeaders['X-API-Version'] = apiVersion;
        }

        // Add client ID header (session ID for request tracking)
        const authState = this.authService.currentAuthState;
        if (authState.sessionId) {
          atlasHeaders['X-Client-ID'] = authState.sessionId;
        }

        // Add correlation ID for request tracing
        const correlationId = this.generateCorrelationId();
        atlasHeaders['X-Correlation-ID'] = correlationId;

        // Clone request with ATLAS headers
        if (Object.keys(atlasHeaders).length > 0) {
          modifiedReq = modifiedReq.clone({
            setHeaders: atlasHeaders
          });
        }

        console.log(`🔷 ATLAS Request: ${modifiedReq.method} ${modifiedReq.url}`, {
          hasAuth: modifiedReq.headers.has('Authorization'),
          apiVersion: modifiedReq.headers.get('X-API-Version'),
          clientId: modifiedReq.headers.get('X-Client-ID'),
          correlationId: modifiedReq.headers.get('X-Correlation-ID')
        });

        return next.handle(modifiedReq);
      })
    );
  }

  /**
   * Check if the request URL is for an ATLAS endpoint
   * 
   * @param url - Request URL
   * @returns True if this is an ATLAS request
   */
  private isAtlasRequest(url: string): boolean {
    const atlasBaseUrl = this.configService.getBaseUrl();
    
    // Check if URL contains ATLAS base path
    if (url.includes('/atlas')) {
      return true;
    }

    // Check if URL starts with ATLAS base URL
    if (atlasBaseUrl && url.startsWith(atlasBaseUrl)) {
      return true;
    }

    // Check if URL matches any ATLAS endpoint patterns
    const atlasPatterns = [
      '/v1/deployments',
      '/v1/ai-analysis',
      '/v1/approvals',
      '/v1/exceptions',
      '/api/agents',
      '/v1/query-builder',
      '/hubs/atlas'
    ];

    return atlasPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Generate a unique correlation ID for request tracing
   * 
   * @returns Correlation ID string
   */
  private generateCorrelationId(): string {
    return 'atlas_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }
}
