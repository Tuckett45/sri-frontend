import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { AtlasAuthService } from '../services/atlas-auth.service';
import { AtlasConfigService } from '../services/atlas-config.service';
import { ApiHeadersService } from '../../../services/api-headers.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';

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
  private readonly apiHeadersService = inject(ApiHeadersService);
  private readonly appAuthService = inject(AuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept ATLAS API requests
    if (!this.isAtlasRequest(req.url)) {
      return next.handle(req);
    }

    // Get access token and add ATLAS-specific headers
    return from(this.resolveAccessToken()).pipe(
      switchMap(accessToken => {
        let modifiedReq = req;

        // Add authentication token if available (Requirement 2.5).
        // Only set it when the request doesn't already carry an Authorization
        // header from an earlier interceptor, so we never clobber an existing one.
        if (accessToken && !modifiedReq.headers.has('Authorization')) {
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

        // Add Azure API Management subscription key
        const subscriptionKey = this.apiHeadersService.getApiSubscriptionKey() || 'ffd675634ab645d7845640bb88d672d8';
        atlasHeaders['Ocp-Apim-Subscription-Key'] = subscriptionKey;

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
   * Resolve the access token for an ATLAS request.
   *
   * Prefers the dedicated ATLAS token (AtlasAuthService) when present, but
   * falls back to the main application login token (AuthService). In this app,
   * users authenticate through the primary AuthService (/auth/login) and the
   * ATLAS platform API accepts that token, while AtlasAuthService's separate
   * token store is typically empty — which previously left ATLAS feature calls
   * (pto-requests, overtime-requests, hierarchy, managers) unauthenticated and
   * caused 401s / empty team, timeline, and approval views.
   */
  private async resolveAccessToken(): Promise<string | null> {
    try {
      const atlasToken = await this.authService.getAccessToken();
      if (atlasToken) {
        return atlasToken;
      }
    } catch {
      // Ignore and fall back to the app token below.
    }

    try {
      return await this.appAuthService.getAccessToken();
    } catch {
      return null;
    }
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

    // Check if the URL targets the configured ATLAS platform API base URL.
    // This is the authoritative check: every ATLAS API call (pto-requests,
    // overtime-requests, hierarchy, managers, etc.) hits environment.atlasApiUrl,
    // and all of them require the Bearer token / userId claim server-side.
    // Without this, feature endpoints like /v1/pto-requests and
    // /v1/overtime-requests went out unauthenticated and the API returned 401.
    if (environment.atlasApiUrl && url.startsWith(environment.atlasApiUrl)) {
      return true;
    }

    // Check if URL matches any ATLAS endpoint patterns
    const atlasPatterns = [
      '/v1/deployments',
      '/v1/ai-analysis',
      '/v1/approvals',
      '/v1/exceptions',
      '/v1/pto-requests',
      '/v1/overtime-requests',
      '/v1/hierarchy',
      '/v1/managers',
      '/v1/reports',
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
