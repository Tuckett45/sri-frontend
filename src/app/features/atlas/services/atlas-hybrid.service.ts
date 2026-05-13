import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AtlasRoutingService } from './atlas-routing.service';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Service for managing hybrid mode operations
 * 
 * Provides utilities for routing between ATLAS and ARK services in hybrid mode,
 * where some features use ATLAS and others use ARK.
 * 
 * Requirements: 10.5, 10.8
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasHybridService {
  constructor(
    private routingService: AtlasRoutingService,
    private configService: AtlasConfigService
  ) {}

  /**
   * Execute operation with automatic fallback to ARK on ATLAS failure
   * Requirements: 10.5, 10.8
   * 
   * @param featureName - The feature name
   * @param atlasOperation - Operation to execute with ATLAS
   * @param arkFallback - Fallback operation to execute with ARK
   * @returns Observable with operation result
   */
  executeWithFallback<T>(
    featureName: string,
    atlasOperation: () => Observable<T>,
    arkFallback: () => Observable<T>
  ): Observable<T> {
    // Check routing decision
    const decision = this.routingService.getRoutingDecision(featureName);

    if (decision.useAtlas) {
      // Try ATLAS first, fallback to ARK on error (Requirement 10.8)
      return atlasOperation().pipe(
        catchError((error) => {
          console.warn(
            `[Hybrid Mode] ATLAS operation failed for ${featureName}, ` +
            `falling back to ARK. Error:`,
            error
          );
          
          // Log fallback event
          this.logFallbackEvent(featureName, error);
          
          // Execute ARK fallback
          return arkFallback();
        })
      );
    } else {
      // Use ARK directly (Requirement 10.5)
      console.log(`[Hybrid Mode] Using ARK service for ${featureName}`);
      return arkFallback();
    }
  }

  /**
   * Execute operation with conditional routing (no automatic fallback)
   * Requirements: 10.5
   * 
   * @param featureName - The feature name
   * @param atlasOperation - Operation to execute with ATLAS
   * @param arkOperation - Operation to execute with ARK
   * @returns Observable with operation result
   */
  executeConditional<T>(
    featureName: string,
    atlasOperation: () => Observable<T>,
    arkOperation: () => Observable<T>
  ): Observable<T> {
    const decision = this.routingService.getRoutingDecision(featureName);

    if (decision.useAtlas) {
      console.log(`[Hybrid Mode] Routing ${featureName} to ATLAS`);
      return atlasOperation();
    } else {
      console.log(`[Hybrid Mode] Routing ${featureName} to ARK`);
      return arkOperation();
    }
  }

  /**
   * Check if hybrid mode is active
   * 
   * @returns True if hybrid mode is enabled
   */
  isHybridModeActive(): boolean {
    return this.configService.isHybridMode();
  }

  /**
   * Get list of features using ATLAS in hybrid mode
   * 
   * @returns Array of feature names using ATLAS
   */
  getAtlasFeatures(): string[] {
    if (!this.isHybridModeActive()) {
      // Not in hybrid mode
      if (this.configService.isEnabled()) {
        // All features use ATLAS
        return ['deployments', 'aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder'];
      } else {
        // No features use ATLAS
        return [];
      }
    }

    // In hybrid mode, return enabled features
    return this.routingService.getEnabledAtlasFeatures();
  }

  /**
   * Get list of features using ARK in hybrid mode
   * 
   * @returns Array of feature names using ARK
   */
  getArkFeatures(): string[] {
    const allFeatures = ['deployments', 'aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder'];
    const atlasFeatures = this.getAtlasFeatures();

    // Return features not in ATLAS list
    return allFeatures.filter(f => !atlasFeatures.includes(f));
  }

  /**
   * Get hybrid mode configuration summary
   * 
   * @returns Configuration summary object
   */
  getHybridModeConfig(): {
    isHybridMode: boolean;
    atlasEnabled: boolean;
    atlasFeatures: string[];
    arkFeatures: string[];
  } {
    return {
      isHybridMode: this.isHybridModeActive(),
      atlasEnabled: this.configService.isEnabled(),
      atlasFeatures: this.getAtlasFeatures(),
      arkFeatures: this.getArkFeatures()
    };
  }

  /**
   * Check if a specific feature should use ATLAS
   * 
   * @param featureName - The feature name
   * @returns True if feature should use ATLAS
   */
  shouldFeatureUseAtlas(featureName: string): boolean {
    return this.routingService.shouldUseAtlas(featureName);
  }

  /**
   * Check if a specific feature should use ARK
   * 
   * @param featureName - The feature name
   * @returns True if feature should use ARK
   */
  shouldFeatureUseArk(featureName: string): boolean {
    return !this.shouldFeatureUseAtlas(featureName);
  }

  /**
   * Log fallback event for monitoring
   * Requirements: 10.8
   * 
   * @param featureName - The feature name
   * @param error - The error that triggered fallback
   */
  private logFallbackEvent(featureName: string, error: any): void {
    const event = {
      timestamp: new Date(),
      featureName,
      error: error?.message || 'Unknown error',
      action: 'fallback_to_ark'
    };

    console.warn('[Hybrid Mode] Fallback event:', event);

    // In production, this would send to monitoring/analytics service
    // For now, just log to console
  }

  /**
   * Test ATLAS connectivity for a feature
   * 
   * @param featureName - The feature name
   * @param testOperation - Test operation to execute
   * @returns Observable with test result
   */
  testAtlasConnectivity<T>(
    featureName: string,
    testOperation: () => Observable<T>
  ): Observable<{ success: boolean; error?: any }> {
    if (!this.shouldFeatureUseAtlas(featureName)) {
      return of({ success: false, error: 'Feature not configured for ATLAS' });
    }

    return testOperation().pipe(
      map(() => ({ success: true })),
      catchError((error) => {
        return of({ success: false, error });
      })
    ) as Observable<{ success: boolean; error?: any }>;
  }
}
