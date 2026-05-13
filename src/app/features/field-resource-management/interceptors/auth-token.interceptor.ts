import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpClient
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

import { AuthTokenService } from '../services/auth-token.service';

/**
 * Authentication Token Interceptor
 * 
 * Automatically adds JWT token to HTTP requests.
 * Handles token expiration and refresh.
 * Redirects to login on 401 errors.
 * 
 * Requirements: 1.1-1.5
 */
@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private authTokenService: AuthTokenService,
    private router: Router,
    private http: HttpClient
  ) {}

  /**
   * Intercept HTTP requests and add authentication token
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip token for certain URLs (login, public endpoints)
    if (this.shouldSkipToken(request.url)) {
      return next.handle(request);
    }

    // Add token to request
    const token = this.authTokenService.getToken();
    if (token && !this.authTokenService.isTokenExpired()) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            return this.handle401Error(request, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Add authentication token to request headers
   */
  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  /**
   * Check if token should be skipped for this URL
   */
  private shouldSkipToken(url: string): boolean {
    const skipUrls = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/public'
    ];

    return skipUrls.some(skipUrl => url.includes(skipUrl));
  }

  /**
   * Handle 401 Unauthorized error
   * Attempts to refresh token or redirects to login
   */
  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // If we're already refreshing, wait for it to complete
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addToken(request, token!));
        })
      );
    }

    const refreshToken = this.authTokenService.getRefreshToken();

    // If no refresh token, don't attempt refresh - just pass through the error
    // This allows the app to continue working even if auth isn't fully set up
    if (!refreshToken) {
      console.warn('No refresh token available. Passing through 401 error.');
      return throwError(() => new Error('Unauthorized - No refresh token available'));
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.refreshToken(refreshToken).pipe(
      switchMap((newToken: string) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(newToken);
        return next.handle(this.addToken(request, newToken));
      }),
      catchError((error) => {
        this.isRefreshing = false;
        
        // Only logout if the refresh token itself is invalid (401)
        // For other errors (404, 500), don't logout - the endpoint might not be implemented
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.error('Refresh token is invalid. Logging out.');
          this.logout();
        } else {
          console.warn('Token refresh failed but not due to invalid token. Continuing session.');
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh authentication token
   * 
   * @param refreshToken - Refresh token
   * @returns Observable with new access token
   */
  private refreshToken(refreshToken: string): Observable<string> {
    return this.http.post<{ token: string; refreshToken?: string; expiresIn?: number }>(
      '/api/auth/refresh', 
      { refreshToken }
    ).pipe(
      map(response => {
        // Store new tokens
        this.authTokenService.setToken(
          response.token, 
          response.refreshToken || refreshToken, 
          response.expiresIn
        );
        return response.token;
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        
        // Only logout if the refresh token itself is invalid (401)
        // For other errors (404, 500), the refresh endpoint might not be implemented yet
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.error('Refresh token is invalid or expired');
        } else {
          console.warn('Token refresh endpoint not available or failed. Continuing with existing session.');
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user and redirect to login page
   */
  private logout(): void {
    this.authTokenService.clearTokens();
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }
}
