import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
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
    private router: Router
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
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.authTokenService.getRefreshToken();

      if (refreshToken) {
        return this.refreshToken(refreshToken).pipe(
          switchMap((newToken: string) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(newToken);
            return next.handle(this.addToken(request, newToken));
          }),
          catchError((error) => {
            this.isRefreshing = false;
            this.logout();
            return throwError(() => error);
          })
        );
      } else {
        this.isRefreshing = false;
        this.logout();
        return throwError(() => new Error('No refresh token available'));
      }
    } else {
      // Wait for token refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addToken(request, token!));
        })
      );
    }
  }

  /**
   * Refresh authentication token
   * 
   * @param refreshToken - Refresh token
   * @returns Observable with new access token
   */
  private refreshToken(refreshToken: string): Observable<string> {
    // In a real implementation, this would call the refresh token endpoint
    // For now, we'll just return an error to trigger logout
    return throwError(() => new Error('Token refresh not implemented'));
    
    // Real implementation would look like:
    // return this.http.post<{ token: string }>('/api/auth/refresh', { refreshToken })
    //   .pipe(
    //     map(response => {
    //       this.authTokenService.setToken(response.token);
    //       return response.token;
    //     })
    //   );
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
