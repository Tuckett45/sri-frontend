import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RoleBasedDataService } from '../services/role-based-data.service';

/**
 * Market Filter Interceptor
 * 
 * Automatically applies market filtering to outgoing HTTP requests based on user role.
 * 
 * Rules:
 * - Admin users: No automatic market filtering applied
 * - CM users: Automatically adds market parameter to filtered endpoints
 * - Skips interception if market parameter is already present
 * - Only applies to specific endpoints that require market filtering
 * 
 * Requirements: 1.1, 1.5, 3.8, 16.3, 16.4
 */
@Injectable()
export class MarketFilterInterceptor implements HttpInterceptor {

  /**
   * List of API endpoints that require automatic market filtering for CM users
   */
  private readonly marketFilteredEndpoints = [
    '/street-sheet',
    '/preliminary-punch-list',
    '/daily-report',
    '/technician',
    '/assignment',
    '/project',
    '/resource',
    '/approval',
    '/workflow'
  ];

  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  /**
   * Intercept HTTP requests and add market parameter for CM users on filtered endpoints
   * 
   * @param req The outgoing HTTP request
   * @param next The next handler in the chain
   * @returns Observable of the HTTP event
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip if Admin user - they have access to all markets
    if (this.authService.isAdmin()) {
      return next.handle(req);
    }

    // Check if this endpoint requires market filtering
    if (!this.shouldApplyMarketFilter(req.url)) {
      return next.handle(req);
    }

    // Skip if market parameter is already specified in the request (check both params and URL)
    if (req.params.has('market') || req.url.includes('market=')) {
      return next.handle(req);
    }

    // Get current user and their market
    const user = this.authService.getUser();
    if (!user || !user.market) {
      // No user or no market assigned - proceed without modification
      return next.handle(req);
    }

    // Clone the request and add market parameter
    const modifiedReq = req.clone({
      params: req.params.set('market', user.market)
    });

    return next.handle(modifiedReq);
  }

  /**
   * Determine if market filtering should be applied to this URL
   * 
   * @param url The request URL
   * @returns true if market filtering should be applied, false otherwise
   */
  private shouldApplyMarketFilter(url: string): boolean {
    return this.marketFilteredEndpoints.some(endpoint => url.includes(endpoint));
  }
}
