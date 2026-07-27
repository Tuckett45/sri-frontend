import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { UserRole } from '../models/role.enum';

export interface MarketFilterOptions {
  includeAllMarkets?: boolean;  // Admin override
  specificMarket?: string;       // Explicit market filter
  excludeRGMarkets?: boolean;    // CM-specific filtering for street sheets
}

export interface RoleBasedQueryParams {
  market?: string;
  userId?: string;
  role?: UserRole;
  includeSubordinates?: boolean;
}

/**
 * Cache entry with TTL support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  accessibleMarketsTTL: number; // TTL for accessible markets cache (ms)
  defaultTTL: number; // Default TTL for other cached data (ms)
}

@Injectable({
  providedIn: 'root'
})
export class RoleBasedDataService {
  // Cache storage
  private accessibleMarketsCache: CacheEntry<string[]> | null = null;
  private dataCache = new Map<string, CacheEntry<any>>();
  
  // Cache configuration with defaults
  private cacheConfig: CacheConfig = {
    accessibleMarketsTTL: 5 * 60 * 1000, // 5 minutes
    defaultTTL: 2 * 60 * 1000 // 2 minutes
  };

  constructor(private authService: AuthService) {
    // Subscribe to login status to warm cache on login
    this.authService.getLoginStatus().subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.warmCache();
      } else {
        this.clearCache();
      }
    });
  }

  /**
   * Apply market filtering based on current user's role
   * @param data Array of data items with optional market property
   * @param options Filtering options
   * @returns Filtered array based on user role and options
   */
  applyMarketFilter<T extends { market?: string }>(
    data: T[],
    options?: MarketFilterOptions
  ): T[] {
    if (!data || data.length === 0) {
      return data;
    }

    // Admin users see all markets unless specific market is requested
    if (this.authService.isAdmin()) {
      if (options?.specificMarket) {
        return data.filter(item => item.market === options.specificMarket);
      }
      return data;
    }

    // CM users see only their assigned market
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (!user || !user.market) {
        return [];
      }

      let filtered = data.filter(item => item.market === user.market);

      // Exclude RG markets for street sheets if specified
      if (options?.excludeRGMarkets) {
        filtered = filtered.filter(item => 
          !item.market || !item.market.toUpperCase().includes('RG')
        );
      }

      return filtered;
    }

    // For other roles, return data as-is (can be extended later)
    return data;
  }

  /**
   * Get query parameters with role-based filtering
   * @param additionalParams Additional parameters to include
   * @returns HttpParams with role-based filtering applied
   */
  getRoleBasedQueryParams(
    additionalParams?: Record<string, any>
  ): HttpParams {
    let params = new HttpParams();

    // Add additional params first
    if (additionalParams) {
      Object.keys(additionalParams).forEach(key => {
        const value = additionalParams[key];
        if (value !== null && value !== undefined) {
          params = params.set(key, String(value));
        }
      });
    }

    // Admin users don't need market filtering unless explicitly specified
    if (this.authService.isAdmin()) {
      return params;
    }

    // CM users need market filtering
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      if (user && user.market) {
        params = params.set('market', user.market);
      }
    }

    return params;
  }

  /**
   * Check if user can access data from specific market
   * @param market Market identifier to check
   * @returns True if user can access the market
   */
  canAccessMarket(market: string): boolean {
    if (!market) {
      return false;
    }

    // Admin can access all markets
    if (this.authService.isAdmin()) {
      return true;
    }

    // CM can only access their assigned market
    if (this.authService.isCM()) {
      const user = this.authService.getUser();
      return user && user.market === market;
    }

    // Other roles - default to false for security
    return false;
  }

  /**
   * Get list of markets accessible to current user (with caching)
   * @returns Array of market identifiers
   */
  getAccessibleMarkets(): string[] {
    // Check cache first
    if (this.accessibleMarketsCache && this.isCacheValid(this.accessibleMarketsCache)) {
      return this.accessibleMarketsCache.data;
    }
    
    const user = this.authService.getUser();
    
    if (!user) {
      return [];
    }

    let markets: string[] = [];

    // Admin can access all markets - return empty array to indicate "all"
    // The calling code should interpret empty array from Admin as "all markets"
    if (this.authService.isAdmin()) {
      markets = [];
    }
    // CM can only access their assigned market
    else if (this.authService.isCM()) {
      markets = user.market ? [user.market] : [];
    }
    // Other roles - return empty array
    else {
      markets = [];
    }
    
    // Cache the result
    this.accessibleMarketsCache = {
      data: markets,
      timestamp: Date.now(),
      ttl: this.cacheConfig.accessibleMarketsTTL
    };
    
    return markets;
  }
  
  /**
   * Configure cache TTL settings
   * @param config Cache configuration
   */
  configureCacheTTL(config: Partial<CacheConfig>): void {
    this.cacheConfig = {
      ...this.cacheConfig,
      ...config
    };
  }
  
  /**
   * Get current cache configuration
   * @returns Current cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }
  
  /**
   * Invalidate cache on role change
   * Should be called when user role changes
   */
  invalidateCacheOnRoleChange(): void {
    this.clearCache();
  }
  
  /**
   * Warm cache on login
   * Pre-loads frequently accessed data
   */
  private warmCache(): void {
    // Pre-load accessible markets
    this.getAccessibleMarkets();
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.accessibleMarketsCache = null;
    this.dataCache.clear();
  }
  
  /**
   * Check if cache entry is still valid
   * @param entry Cache entry to check
   * @returns True if cache is valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }
  
  /**
   * Get cached data by key
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  getCachedData<T>(key: string): T | null {
    const entry = this.dataCache.get(key);
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      this.dataCache.delete(key);
    }
    
    return null;
  }
  
  /**
   * Set cached data with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   */
  setCachedData<T>(key: string, data: T, ttl?: number): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheConfig.defaultTTL
    });
  }
  
  /**
   * Invalidate specific cache entry
   * @param key Cache key to invalidate
   */
  invalidateCache(key: string): void {
    this.dataCache.delete(key);
  }
}
