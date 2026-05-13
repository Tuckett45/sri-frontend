import { APP_INITIALIZER, Provider } from '@angular/core';
import { AtlasPreloadService } from '../services/atlas-preload.service';
import { AtlasConfigService } from '../services/atlas-config.service';

/**
 * ATLAS initialization function
 * 
 * This function is called during application bootstrap to preload
 * critical ATLAS data and improve initial load performance.
 * 
 * Requirements: 11.9
 */
export function initializeAtlas(
  preloadService: AtlasPreloadService,
  configService: AtlasConfigService
): () => Promise<void> {
  return () => {
    // Check if ATLAS is enabled
    const isEnabled = configService.config.enabled;
    
    if (!isEnabled) {
      console.log('[ATLAS] Integration disabled, skipping preload');
      return Promise.resolve();
    }

    console.log('[ATLAS] Starting data preload...');

    return new Promise((resolve) => {
      preloadService.preload({
        aiAgents: true,
        userApprovals: false
      }).subscribe({
        next: (result) => {
          if (result.success) {
            console.log('[ATLAS] Preload completed successfully', result);
          } else {
            console.warn('[ATLAS] Preload completed with errors', result.errors);
          }
          resolve();
        },
        error: (error) => {
          console.error('[ATLAS] Preload failed', error);
          // Don't block app initialization on preload failure
          resolve();
        }
      });
    });
  };
}

/**
 * Provider for ATLAS initialization
 * 
 * Add this to your app module providers to enable ATLAS preloading:
 * 
 * @example
 * ```typescript
 * @NgModule({
 *   providers: [
 *     atlasInitializerProvider
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
export const atlasInitializerProvider: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initializeAtlas,
  deps: [AtlasPreloadService, AtlasConfigService],
  multi: true
};
