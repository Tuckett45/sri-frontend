import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

/**
 * Image Cache Entry
 * Stores metadata about cached images
 */
interface ImageCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  mimeType: string;
}

/**
 * Cache Configuration
 */
interface CacheConfig {
  maxCacheSize: number; // Maximum cache size in bytes
  maxAge: number; // Maximum age in milliseconds
  cacheName: string; // Cache storage name
}

/**
 * Image Cache Service
 * 
 * Provides image caching using the Cache API for PWA support and offline access.
 * Manages cache size limits, TTL-based expiration, and automatic cleanup.
 * 
 * Features:
 * - Cache images using browser Cache API
 * - Support offline access to cached images
 * - TTL-based cache expiration
 * - Size-based cache management (LRU eviction)
 * - Manual cache invalidation
 * - Cache statistics and monitoring
 * - Service Worker integration ready
 * 
 * Requirements: 16.3.3, 4.1.5, 1.10.5
 * 
 * Usage:
 * ```typescript
 * // Cache an image
 * this.imageCacheService.cacheImage(imageUrl, blob).subscribe();
 * 
 * // Retrieve cached image
 * this.imageCacheService.getCachedImage(imageUrl).subscribe(blob => {
 *   const url = URL.createObjectURL(blob);
 *   imgElement.src = url;
 * });
 * 
 * // Check if image is cached
 * const isCached = await this.imageCacheService.isCached(imageUrl);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private readonly config: CacheConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50 MB default
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days default
    cacheName: 'frm-image-cache-v1'
  };

  private cacheMetadata: Map<string, ImageCacheEntry> = new Map();
  private currentCacheSize = 0;
  private cacheReady = false;

  constructor() {
    this.initializeCache();
  }

  /**
   * Initialize cache and load metadata
   */
  private async initializeCache(): Promise<void> {
    try {
      if (!('caches' in window)) {
        console.warn('[ImageCache] Cache API not supported');
        return;
      }

      const cache = await caches.open(this.config.cacheName);
      const requests = await cache.keys();

      // Load metadata for existing cached images
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          const metadata = this.extractMetadata(request.url, response);
          
          this.cacheMetadata.set(request.url, {
            url: request.url,
            blob,
            timestamp: metadata.timestamp,
            size: blob.size,
            mimeType: blob.type
          });

          this.currentCacheSize += blob.size;
        }
      }

      this.cacheReady = true;
      console.log(`[ImageCache] Initialized with ${this.cacheMetadata.size} images (${this.formatBytes(this.currentCacheSize)})`);

      // Clean up expired entries
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('[ImageCache] Initialization failed:', error);
    }
  }

  /**
   * Cache an image from a URL
   * 
   * @param url Image URL to cache
   * @param blob Optional blob if already fetched
   * @returns Observable that completes when caching is done
   */
  cacheImage(url: string, blob?: Blob): Observable<void> {
    if (!('caches' in window)) {
      return throwError(() => new Error('Cache API not supported'));
    }

    return from(this.cacheImageInternal(url, blob)).pipe(
      catchError(error => {
        console.error('[ImageCache] Failed to cache image:', url, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Internal method to cache an image
   */
  private async cacheImageInternal(url: string, blob?: Blob): Promise<void> {
    const cache = await caches.open(this.config.cacheName);

    // Fetch blob if not provided
    if (!blob) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      blob = await response.blob();
    }

    // Check if we need to make space
    await this.ensureSpace(blob.size);

    // Create response with metadata headers
    const headers = new Headers({
      'Content-Type': blob.type,
      'X-Cache-Timestamp': Date.now().toString(),
      'X-Cache-Size': blob.size.toString()
    });

    const response = new Response(blob, { headers });

    // Store in cache
    await cache.put(url, response);

    // Update metadata
    this.cacheMetadata.set(url, {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      mimeType: blob.type
    });

    this.currentCacheSize += blob.size;

    console.log(`[ImageCache] Cached: ${url} (${this.formatBytes(blob.size)})`);
  }

  /**
   * Get cached image
   * 
   * @param url Image URL
   * @returns Observable of Blob or null if not cached
   */
  getCachedImage(url: string): Observable<Blob | null> {
    if (!('caches' in window)) {
      return of(null);
    }

    return from(this.getCachedImageInternal(url)).pipe(
      catchError(error => {
        console.error('[ImageCache] Failed to retrieve cached image:', url, error);
        return of(null);
      })
    );
  }

  /**
   * Internal method to get cached image
   */
  private async getCachedImageInternal(url: string): Promise<Blob | null> {
    const cache = await caches.open(this.config.cacheName);
    const response = await cache.match(url);

    if (!response) {
      return null;
    }

    // Check if expired
    const metadata = this.extractMetadata(url, response);
    const age = Date.now() - metadata.timestamp;

    if (age > this.config.maxAge) {
      console.log(`[ImageCache] Expired: ${url}`);
      await this.invalidate(url);
      return null;
    }

    const blob = await response.blob();
    console.log(`[ImageCache] HIT: ${url}`);
    return blob;
  }

  /**
   * Cache an image from a File object (for uploaded images)
   * 
   * @param file File object
   * @param identifier Unique identifier for the file
   * @returns Observable that completes when caching is done
   */
  cacheFile(file: File, identifier: string): Observable<void> {
    const cacheKey = this.generateCacheKey(identifier);
    return this.cacheImage(cacheKey, file);
  }

  /**
   * Get cached file
   * 
   * @param identifier Unique identifier for the file
   * @returns Observable of Blob or null if not cached
   */
  getCachedFile(identifier: string): Observable<Blob | null> {
    const cacheKey = this.generateCacheKey(identifier);
    return this.getCachedImage(cacheKey);
  }

  /**
   * Check if an image is cached
   * 
   * @param url Image URL
   * @returns Promise resolving to true if cached
   */
  async isCached(url: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cache = await caches.open(this.config.cacheName);
      const response = await cache.match(url);
      
      if (!response) {
        return false;
      }

      // Check if expired
      const metadata = this.extractMetadata(url, response);
      const age = Date.now() - metadata.timestamp;

      if (age > this.config.maxAge) {
        await this.invalidate(url);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ImageCache] Error checking cache:', error);
      return false;
    }
  }

  /**
   * Invalidate (remove) a cached image
   * 
   * @param url Image URL to invalidate
   */
  async invalidate(url: string): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open(this.config.cacheName);
      const deleted = await cache.delete(url);

      if (deleted) {
        const entry = this.cacheMetadata.get(url);
        if (entry) {
          this.currentCacheSize -= entry.size;
          this.cacheMetadata.delete(url);
        }
        console.log(`[ImageCache] Invalidated: ${url}`);
      }
    } catch (error) {
      console.error('[ImageCache] Failed to invalidate:', url, error);
    }
  }

  /**
   * Clear all cached images
   */
  async clearAll(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const deleted = await caches.delete(this.config.cacheName);
      if (deleted) {
        this.cacheMetadata.clear();
        this.currentCacheSize = 0;
        console.log('[ImageCache] Cleared all cached images');
      }
    } catch (error) {
      console.error('[ImageCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    count: number;
    size: number;
    sizeFormatted: string;
    maxSize: number;
    maxSizeFormatted: string;
    utilizationPercent: number;
  } {
    const utilizationPercent = this.config.maxCacheSize > 0
      ? (this.currentCacheSize / this.config.maxCacheSize) * 100
      : 0;

    return {
      count: this.cacheMetadata.size,
      size: this.currentCacheSize,
      sizeFormatted: this.formatBytes(this.currentCacheSize),
      maxSize: this.config.maxCacheSize,
      maxSizeFormatted: this.formatBytes(this.config.maxCacheSize),
      utilizationPercent: Math.round(utilizationPercent * 100) / 100
    };
  }

  /**
   * Ensure there's enough space in cache
   * Uses LRU (Least Recently Used) eviction strategy
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    if (this.currentCacheSize + requiredSize <= this.config.maxCacheSize) {
      return;
    }

    console.log(`[ImageCache] Need to free space: ${this.formatBytes(requiredSize)}`);

    // Sort entries by timestamp (oldest first)
    const sortedEntries = Array.from(this.cacheMetadata.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    let freedSpace = 0;
    const targetSpace = requiredSize + (this.config.maxCacheSize * 0.1); // Free 10% extra

    for (const entry of sortedEntries) {
      if (this.currentCacheSize - freedSpace + requiredSize <= this.config.maxCacheSize) {
        break;
      }

      await this.invalidate(entry.url);
      freedSpace += entry.size;
      console.log(`[ImageCache] Evicted: ${entry.url} (${this.formatBytes(entry.size)})`);
    }

    console.log(`[ImageCache] Freed ${this.formatBytes(freedSpace)}`);
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredUrls: string[] = [];

    for (const [url, entry] of this.cacheMetadata.entries()) {
      const age = now - entry.timestamp;
      if (age > this.config.maxAge) {
        expiredUrls.push(url);
      }
    }

    for (const url of expiredUrls) {
      await this.invalidate(url);
    }

    if (expiredUrls.length > 0) {
      console.log(`[ImageCache] Cleaned up ${expiredUrls.length} expired entries`);
    }
  }

  /**
   * Extract metadata from cached response
   */
  private extractMetadata(url: string, response: Response): { timestamp: number; size: number } {
    const timestampHeader = response.headers.get('X-Cache-Timestamp');
    const sizeHeader = response.headers.get('X-Cache-Size');

    return {
      timestamp: timestampHeader ? parseInt(timestampHeader, 10) : Date.now(),
      size: sizeHeader ? parseInt(sizeHeader, 10) : 0
    };
  }

  /**
   * Generate cache key for file identifier
   */
  private generateCacheKey(identifier: string): string {
    return `frm-file://${identifier}`;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    Object.assign(this.config, config);
    console.log('[ImageCache] Configuration updated:', this.config);
  }

  /**
   * Get all cached URLs
   */
  getCachedUrls(): string[] {
    return Array.from(this.cacheMetadata.keys());
  }

  /**
   * Preload images for offline access
   * 
   * @param urls Array of image URLs to preload
   * @returns Observable that emits progress and completes when done
   */
  preloadImages(urls: string[]): Observable<{ loaded: number; total: number; url: string }> {
    return new Observable(observer => {
      let loaded = 0;
      const total = urls.length;

      const loadNext = async () => {
        if (loaded >= total) {
          observer.complete();
          return;
        }

        const url = urls[loaded];
        try {
          await this.cacheImageInternal(url);
          loaded++;
          observer.next({ loaded, total, url });
          loadNext();
        } catch (error) {
          console.error(`[ImageCache] Failed to preload: ${url}`, error);
          loaded++;
          loadNext();
        }
      };

      loadNext();
    });
  }
}
