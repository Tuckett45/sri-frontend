import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AtlasConfigService } from '../services/atlas-config.service';
import { AtlasRoutingService } from '../services/atlas-routing.service';
import { FeatureFlagService } from '../../../services/feature-flag.service';

/**
 * ATLAS Feature Guard
 * 
 * Route guard that checks if ATLAS integration is enabled via feature flag.
 * Prevents access to ATLAS routes when the integration is disabled.
 * 
 * Requirements: 9.7, 10.1, 10.2, 10.3
 * 
 * Usage:
 * ```typescript
 * {
 *   path: 'atlas',
 *   canActivate: [AtlasFeatureGuard],
 *   loadChildren: () => import('./features/atlas/atlas.module').then(m => m.AtlasModule)
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasFeatureGuard implements CanActivate {
  constructor(
    private atlasConfigService: AtlasConfigService,
    private atlasRoutingService: AtlasRoutingService,
    private featureFlagService: FeatureFlagService,
    private router: Router
  ) {}

  /**
   * Determines if a route can be activated based on ATLAS feature flag
   * 
   * @param route - The activated route snapshot
   * @param state - The router state snapshot
   * @returns True if ATLAS is enabled, false otherwise
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Check if ATLAS feature flag is enabled (frontend toggle)
    const featureFlagEnabled = this.featureFlagService.flagEnabled('atlas')();
    
    if (!featureFlagEnabled) {
      console.warn('ATLAS feature flag is disabled. Redirecting to overview.');
      return this.router.createUrlTree(['/overview']);
    }

    // Check if ATLAS integration is enabled (backend configuration) (Requirement 10.1)
    const isEnabled = this.atlasConfigService.isEnabled();

    if (!isEnabled) {
      // ATLAS integration is disabled, redirect to home or show message
      console.warn('ATLAS backend integration is disabled. Redirecting to overview.');
      
      // Redirect to overview page when ATLAS is disabled (Requirement 10.2)
      return this.router.createUrlTree(['/overview']);
    }

    // ATLAS is enabled, allow access
    console.log('ATLAS guard: Access granted');
    return true;
  }

  /**
   * Extract feature name from URL path
   * 
   * @param url - The URL path
   * @returns The feature name or null
   */
  private extractFeatureName(url: string): string | null {
    // URL format: /atlas/{feature}/...
    const match = url.match(/^\/atlas\/([^\/]+)/);
    return match ? match[1] : null;
  }
}
