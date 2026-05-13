import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AtlasRoutingService } from './atlas-routing.service';

/**
 * Base service for ATLAS services with routing and fallback support
 * 
 * Provides common functionality for checking feature flags and handling
 * routing between ATLAS and ARK services.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.7, 10.8
 */
@Injectable()
export abstract class AtlasBaseService {
  protected abstract featureName: string;

  constructor(protected routingService: AtlasRoutingService) {}

  /**
   * Check if ATLAS should be used for this service
   * Requirements: 10.1, 10.2, 10.3
   * 
   * @returns True if ATLAS should be used
   */
  protected shouldUseAtlas(): boolean {
    return this.routingService.shouldUseAtlas(this.featureName);
  }

  /**
   * Check if ARK fallback should be used
   * Requirements: 10.2, 10.8
   * 
   * @returns True if ARK fallback should be used
   */
  protected shouldUseArkFallback(): boolean {
    return this.routingService.shouldUseArkFallback(this.featureName);
  }

  /**
   * Execute operation with routing check
   * Requirements: 10.1, 10.2, 10.3, 10.7
   * 
   * @param atlasOperation - Operation to execute if ATLAS is enabled
   * @param arkFallback - Optional fallback operation if ATLAS is disabled
   * @returns Observable with operation result
   */
  protected executeWithRouting<T>(
    atlasOperation: () => Observable<T>,
    arkFallback?: () => Observable<T>
  ): Observable<T> {
    if (this.shouldUseAtlas()) {
      // Log that ATLAS is being used (Requirement 10.7)
      console.log(`[${this.featureName}] Using ATLAS service`);
      return atlasOperation();
    } else {
      // Log that ARK fallback is being used (Requirement 10.7)
      console.log(`[${this.featureName}] Using ARK fallback service`);
      
      if (arkFallback) {
        return arkFallback();
      } else {
        // No fallback available
        return throwError(() => new Error(
          `ATLAS is disabled for ${this.featureName} and no ARK fallback is available`
        ));
      }
    }
  }

  /**
   * Get routing decision for this service
   * 
   * @returns Routing decision with details
   */
  protected getRoutingDecision() {
    return this.routingService.getRoutingDecision(this.featureName);
  }

  /**
   * Check if ATLAS is available for this service
   * 
   * @returns True if ATLAS is available
   */
  isAtlasAvailable(): boolean {
    return this.routingService.isAtlasAvailable(this.featureName);
  }

  /**
   * Get the feature name for this service
   * 
   * @returns Feature name
   */
  getFeatureName(): string {
    return this.featureName;
  }
}
