import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { shareReplay, tap, switchMap } from 'rxjs/operators';

/**
 * Cache Entry
 * Stores cached data with expiration time
 */
interface CacheEntry<T> {
  data: Observable<T>;
  expiresAt: number;
}

/**
 * Cache Service
 * 
 * Provides response caching for HTTP requests to improve performance
 * and reduce server load.
 * 
 * Features:
 * - Time-based cache expiration (TTL)
 * - Automatic cache invalidation
 * - Memory-efficient caching with shareReplay
 * - Cache clearing by key or all
 * - Cache statistics
 * 
 * Usage:
 * ```typescript
 * // In a service
 * getDashboardMetrics(): Observable<DashboardMetrics> {
 *   return this.cacheService.get(
 *     'dashboard-metrics',
 *     () => this.http.get<DashboardMetrics>('/api/dashboard'),
 *     5 * 60 * 1000 // 5 minutes TTL
 *   );
 * }
 * ```
 * 
 * Requirements: 14.3, 22.6
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Get data from cache or fetch if not cached/expired
   * 
   * @param key Unique cache key
   * @param fetcher Function that returns Observable to fetch data
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   * @returns Observable of cached or fresh data
   */
  get<T>(key: string, fetcher: () => Observable<T>, ttl: number = 5 * 60 * 1000): Observable<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached data if valid
    if (cached && cached.expiresAt > now) {
      this.cacheHits++;
      console.log(`[Cache] HIT: ${key} (expires in ${Math.round((cached.expiresAt - now) / 1000)}s)`);
      return cached.data;
    }

    // Fetch fresh data
    this.cacheMisses++;
    console.log(`[Cache] MISS: ${key} (fetching fresh data, TTL: ${ttl / 1000}s)`);

    const data$ = fetcher().pipe(
      shareReplay(1), // Share the result with multiple subscribers
      tap(() => {
        console.log(`[Cache] STORED: ${key}`);
      })
    );

    // Store in cache with expiration
    this.cache.set(key, {
      data: data$,
      expiresAt: now + ttl
    });

    // Schedule automatic cleanup
    timer(ttl).subscribe(() => {
      if (this.cache.has(key)) {
        const entry = this.cache.get(key);
        if (entry && entry.expiresAt <= Date.now()) {
          this.cache.delete(key);
          console.log(`[Cache] EXPIRED: ${key}`);
        }
      }
    });

    return data$;
  }

  /**
   * Invalidate (clear) cache for a specific key
   * 
   * @param key Cache key to invalidate
   */
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`[Cache] INVALIDATED: ${key}`);
    }
  }

  /**
   * Invalidate (clear) all cache entries matching a pattern
   * 
   * @param pattern RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`[Cache] INVALIDATED (pattern): ${key}`);
    });
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] CLEARED ALL: ${count} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('[Cache] Statistics reset');
  }

  /**
   * Check if a key is cached and valid
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const isValid = cached.expiresAt > Date.now();
    if (!isValid) {
      this.cache.delete(key);
    }
    
    return isValid;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry expiration time
   */
  getExpiration(key: string): Date | null {
    const cached = this.cache.get(key);
    return cached ? new Date(cached.expiresAt) : null;
  }
}
