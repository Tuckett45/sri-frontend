import { Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Cache entry with expiration and observable
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  observable?: Observable<T>;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to use in-flight request deduplication (default: true) */
  shareInFlight?: boolean;
}

/**
 * AtlasCacheService
 * 
 * Provides caching capabilities for ATLAS API responses to improve performance
 * and reduce unnecessary network requests.
 * 
 * Features:
 * - Time-based cache expiration (TTL)
 * - In-flight request deduplication
 * - Cache invalidation by key or pattern
 * - Memory-efficient storage
 * 
 * Requirements: 11.1
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or execute the provided observable
   * 
   * @param key - Unique cache key
   * @param source$ - Observable to execute if cache miss
   * @param options - Cache configuration options
   * @returns Observable of cached or fresh data
   */
  get<T>(key: string, source$: Observable<T>, options?: CacheOptions): Observable<T> {
    const ttl = options?.ttl ?? this.DEFAULT_TTL;
    const shareInFlight = options?.shareInFlight ?? true;

    // Check if we have a valid cached entry
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached, ttl)) {
      // Return cached data
      return of(cached.data);
    }

    // Check if there's an in-flight request we can share
    if (shareInFlight && cached?.observable) {
      return cached.observable;
    }

    // Create new request with caching
    const request$ = source$.pipe(
      tap(data => {
        // Store in cache
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
      }),
      shareReplay(1) // Share the result with multiple subscribers
    );

    // Store the in-flight observable if sharing is enabled
    if (shareInFlight) {
      this.cache.set(key, {
        data: null as any,
        timestamp: Date.now(),
        observable: request$
      });
    }

    return request$;
  }

  /**
   * Set a value in the cache directly
   * 
   * @param key - Unique cache key
   * @param data - Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a cache entry exists and is valid
   * 
   * @param key - Cache key to check
   * @param ttl - Optional TTL override
   * @returns True if entry exists and is valid
   */
  has(key: string, ttl?: number): boolean {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }
    return this.isValid(cached, ttl ?? this.DEFAULT_TTL);
  }

  /**
   * Invalidate a specific cache entry
   * 
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   * 
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * 
   * @returns Object with cache size and keys
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   * 
   * @param ttl - Optional TTL to use for expiration check
   */
  cleanup(ttl?: number): void {
    const expirationTtl = ttl ?? this.DEFAULT_TTL;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry, expirationTtl)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Check if a cache entry is still valid based on TTL
   * 
   * @param entry - Cache entry to check
   * @param ttl - Time-to-live in milliseconds
   * @returns True if entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>, ttl: number): boolean {
    const age = Date.now() - entry.timestamp;
    return age < ttl && entry.data !== null;
  }
}
