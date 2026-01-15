import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, switchMap, catchError, of } from 'rxjs';
import { SecureAuthService } from '../services/secure-auth.service';

/**
 * HTTP Interceptor that automatically adds authentication tokens to outgoing requests
 * Note: Configuration-based headers are handled separately to avoid circular dependency
 */
@Injectable()
export class ConfigurationInterceptor implements HttpInterceptor {
  private readonly authService = inject(SecureAuthService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip interception for configuration endpoints to avoid circular dependency
    if (this.isConfigurationEndpoint(req.url)) {
      return next.handle(req);
    }

    // Skip interception for external APIs (Google Maps, etc.)
    if (this.isExternalApiEndpoint(req.url)) {
      return next.handle(req);
    }

    // Get auth headers only (configuration headers will be added by services directly)
    return this.authService.getAuthHeaders().pipe(
      switchMap(authHeaders => {
        // Clone the request and add headers
        let modifiedReq = req.clone();

        // Add authentication headers if available
        if (authHeaders && authHeaders.keys().length > 0) {
          const headerUpdates: { [key: string]: string } = {};
          
          authHeaders.keys().forEach(key => {
            const value = authHeaders.get(key);
            if (value) {
              headerUpdates[key] = value;
            }
          });

          if (Object.keys(headerUpdates).length > 0) {
            modifiedReq = modifiedReq.clone({
              setHeaders: headerUpdates
            });
          }
        }

        // Add standard headers if not present
        if (!modifiedReq.headers.has('Content-Type') && this.shouldAddContentType(modifiedReq)) {
          modifiedReq = modifiedReq.clone({
            setHeaders: {
              'Content-Type': 'application/json'
            }
          });
        }

        console.log(`🌐 HTTP Request: ${modifiedReq.method} ${modifiedReq.url}`, {
          hasAuth: modifiedReq.headers.has('Authorization'),
          hasSessionId: modifiedReq.headers.has('X-Session-ID')
        });

        return next.handle(modifiedReq);
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle authentication errors
        if (error.status === 401) {
          console.warn('🚨 Authentication failed - token may be expired');
          // The SecureAuthService will handle logout automatically
        } else if (error.status === 403) {
          console.warn('🚨 Access forbidden - insufficient permissions');
        } else if (error.status === 0) {
          console.warn('🚨 Network error - check connection');
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Check if the request URL is for configuration endpoints
   */
  private isConfigurationEndpoint(url: string): boolean {
    const configEndpoints = [
      '/config/runtime',
      '/configuration/runtime',
      '/app/config'
    ];

    return configEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Check if the request URL is for external APIs that don't need our auth headers
   */
  private isExternalApiEndpoint(url: string): boolean {
    const externalApis = [
      'maps.googleapis.com',
      'googleapis.com'
    ];

    return externalApis.some(api => url.includes(api));
  }

  /**
   * Determine if Content-Type header should be added
   */
  private shouldAddContentType(req: HttpRequest<any>): boolean {
    // Add Content-Type for POST, PUT, PATCH requests with body
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    return methodsWithBody.includes(req.method) && req.body !== null;
  }
}