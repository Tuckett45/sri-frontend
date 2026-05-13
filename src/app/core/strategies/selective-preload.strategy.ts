import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Selective Preloading Strategy
 * 
 * Preloads modules based on route data configuration.
 * Allows fine-grained control over which modules to preload.
 * 
 * Usage:
 * Add `data: { preload: true }` to routes that should be preloaded.
 * Add `data: { preload: false }` or omit data to skip preloading.
 * Add `data: { preload: true, delay: 2000 }` to delay preloading by 2 seconds.
 * 
 * Example:
 * ```typescript
 * {
 *   path: 'feature',
 *   loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule),
 *   data: { preload: true, delay: 1000 }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadStrategy implements PreloadingStrategy {
  private preloadedModules: string[] = [];

  /**
   * Preload a route based on its data configuration
   */
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Check if route should be preloaded
    if (route.data && route.data['preload']) {
      const delay = route.data['delay'] || 0;
      const moduleName = route.path || 'unknown';

      console.log(`[Preload] Scheduling preload for module: ${moduleName} (delay: ${delay}ms)`);

      // Delay preloading if specified
      if (delay > 0) {
        return timer(delay).pipe(
          mergeMap(() => {
            console.log(`[Preload] Loading module: ${moduleName}`);
            this.preloadedModules.push(moduleName);
            return load();
          })
        );
      }

      // Immediate preload
      console.log(`[Preload] Loading module: ${moduleName}`);
      this.preloadedModules.push(moduleName);
      return load();
    }

    // Don't preload
    return of(null);
  }

  /**
   * Get list of preloaded modules
   */
  getPreloadedModules(): string[] {
    return this.preloadedModules;
  }
}
