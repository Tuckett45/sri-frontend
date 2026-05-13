import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, tap, timeout } from 'rxjs/operators';
import { AtlasRoutingService } from './atlas-routing.service';
import { AtlasServiceLoggerService } from './atlas-service-logger.service';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Fallback configuration options
 */
export interface FallbackOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  logFailure?: boolean;
  throwOnNoFallback?: boolean;
}

/**
 * Fallback result
 */
export interface FallbackResult<T> {
  data: T;
  source: 'ATLAS' | 'ARK';
  fallbackUsed: boolean;
  attempts: number;
  duration: number;
}

/**
 * AtlasFallbackService
 * 
 * Handles automatic fallback from ATLAS to ARK services when ATLAS fails.
 * Implements retry logic, timeout handling, and logging.
 * 
 * Requirements: 10.8
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasFallbackService {
  private readonly DEFAULT_OPTIONS: FallbackOptions = {
    retryAttempts: 2,
    retryDelay: 1000,
    timeout: 30000,
    logFailure: true,
    throwOnNoFallback: false
  };

  constructor(
    private routingService: AtlasRoutingService,
    private loggerService: AtlasServiceLoggerService,
    private configService: AtlasConfigService
  ) {}

  /**
   * Execute operation with automatic fallback to ARK on ATLAS failure
   * Requirements: 10.8
   * 
   * @param featureName - The feature name
   * @param operation - The operation name
   * @param atlasOperation - Operation to execute with ATLAS
   * @param arkFallback - Fallback operation to execute with ARK
   * @param options - Fallback configuration options
   * @returns Observable with operation result
   */
  executeWithFallback<T>(
    featureName: string,
    operation: string,
    atlasOperation: () => Observable<T>,
    arkFallback: () => Observable<T>,
    options?: FallbackOptions
  ): Observable<FallbackResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // Check if ATLAS should be used
    const shouldUseAtlas = this.routingService.shouldUseAtlas(featureName);

    if (!shouldUseAtlas) {
      // Use ARK directly
      return this.executeArkOperation(featureName, operation, arkFallback, startTime, opts);
    }

    // Try ATLAS first with retry and timeout
    return this.executeAtlasOperation(
      featureName,
      operation,
      atlasOperation,
      arkFallback,
      startTime,
      opts
    );
  }

  /**
   * Execute ATLAS operation with retry and fallback
   * Requirements: 10.8
   */
  private executeAtlasOperation<T>(
    featureName: string,
    operation: string,
    atlasOperation: () => Observable<T>,
    arkFallback: () => Observable<T>,
    startTime: number,
    options: FallbackOptions
  ): Observable<FallbackResult<T>> {
    let attempts = 0;

    return atlasOperation().pipe(
      // Add timeout
      timeout(options.timeout!),
      
      // Retry on failure
      retry({
        count: options.retryAttempts!,
        delay: (error, retryCount) => {
          attempts = retryCount;
          console.warn(
            `[Fallback] ATLAS operation failed for ${featureName}.${operation}, ` +
            `retry attempt ${retryCount}/${options.retryAttempts}`,
            error
          );
          return of(null);
        }
      }),
      
      // Log success
      tap(() => {
        const duration = Date.now() - startTime;
        this.loggerService.logAtlasRequest(featureName, operation, true, duration);
      }),
      
      // Transform to FallbackResult
      tap((data) => ({
        data,
        source: 'ATLAS' as const,
        fallbackUsed: false,
        attempts: attempts + 1,
        duration: Date.now() - startTime
      })),
      
      // Fallback to ARK on error
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log ATLAS failure
        if (options.logFailure) {
          this.loggerService.logAtlasRequest(
            featureName,
            operation,
            false,
            duration,
            error?.message || 'Unknown error'
          );
        }

        console.warn(
          `[Fallback] ATLAS operation failed for ${featureName}.${operation} ` +
          `after ${attempts + 1} attempts, falling back to ARK`,
          error
        );

        // Execute ARK fallback
        return this.executeArkFallback(
          featureName,
          operation,
          arkFallback,
          startTime,
          attempts + 1,
          options
        );
      })
    ) as Observable<FallbackResult<T>>;
  }

  /**
   * Execute ARK fallback operation
   * Requirements: 10.8
   */
  private executeArkFallback<T>(
    featureName: string,
    operation: string,
    arkFallback: () => Observable<T>,
    startTime: number,
    atlasAttempts: number,
    options: FallbackOptions
  ): Observable<FallbackResult<T>> {
    return arkFallback().pipe(
      // Add timeout
      timeout(options.timeout!),
      
      // Log success
      tap(() => {
        const duration = Date.now() - startTime;
        this.loggerService.logArkRequest(featureName, operation, true, duration);
      }),
      
      // Transform to FallbackResult
      tap((data) => ({
        data,
        source: 'ARK' as const,
        fallbackUsed: true,
        attempts: atlasAttempts,
        duration: Date.now() - startTime
      })),
      
      // Handle ARK failure
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log ARK failure
        if (options.logFailure) {
          this.loggerService.logArkRequest(
            featureName,
            operation,
            false,
            duration,
            error?.message || 'Unknown error'
          );
        }

        console.error(
          `[Fallback] ARK fallback also failed for ${featureName}.${operation}`,
          error
        );

        // Both ATLAS and ARK failed
        if (options.throwOnNoFallback) {
          return throwError(() => new Error(
            `Both ATLAS and ARK services failed for ${featureName}.${operation}`
          ));
        }

        // Return error result
        return throwError(() => error);
      })
    ) as Observable<FallbackResult<T>>;
  }

  /**
   * Execute ARK operation directly
   */
  private executeArkOperation<T>(
    featureName: string,
    operation: string,
    arkOperation: () => Observable<T>,
    startTime: number,
    options: FallbackOptions
  ): Observable<FallbackResult<T>> {
    return arkOperation().pipe(
      // Add timeout
      timeout(options.timeout!),
      
      // Log success
      tap(() => {
        const duration = Date.now() - startTime;
        this.loggerService.logArkRequest(featureName, operation, true, duration);
      }),
      
      // Transform to FallbackResult
      tap((data) => ({
        data,
        source: 'ARK' as const,
        fallbackUsed: false,
        attempts: 1,
        duration: Date.now() - startTime
      })),
      
      // Handle failure
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log failure
        if (options.logFailure) {
          this.loggerService.logArkRequest(
            featureName,
            operation,
            false,
            duration,
            error?.message || 'Unknown error'
          );
        }

        return throwError(() => error);
      })
    ) as Observable<FallbackResult<T>>;
  }

  /**
   * Check if fallback is available for a feature
   * 
   * @param featureName - The feature name
   * @returns True if ARK fallback is available
   */
  isFallbackAvailable(featureName: string): boolean {
    // In hybrid mode, ARK is always available as fallback
    return this.configService.isHybridMode() || !this.configService.isEnabled();
  }

  /**
   * Get fallback statistics
   * 
   * @returns Fallback statistics
   */
  getFallbackStatistics(): {
    totalFallbacks: number;
    fallbacksByFeature: Record<string, number>;
    fallbackRate: number;
  } {
    const stats = this.loggerService.getStatistics();
    
    // Count fallbacks (ARK requests when ATLAS is enabled)
    let totalFallbacks = 0;
    const fallbacksByFeature: Record<string, number> = {};

    if (this.configService.isEnabled()) {
      // In ATLAS-enabled mode, ARK requests are fallbacks
      for (const [feature, counts] of Object.entries(stats.byFeature)) {
        if (counts.ark > 0) {
          fallbacksByFeature[feature] = counts.ark;
          totalFallbacks += counts.ark;
        }
      }
    }

    const fallbackRate = stats.totalRequests > 0
      ? (totalFallbacks / stats.totalRequests) * 100
      : 0;

    return {
      totalFallbacks,
      fallbacksByFeature,
      fallbackRate
    };
  }
}
