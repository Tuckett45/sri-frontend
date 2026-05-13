import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, delay } from 'rxjs';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CacheService]
    });
    service = TestBed.inject(CacheService);
  });

  afterEach(() => {
    service.clearAll();
    service.resetStats();
  });

  describe('Cache Hit/Miss', () => {
    it('should return cached data on cache hit', fakeAsync(() => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const fetcher = jasmine.createSpy('fetcher').and.returnValue(of(data));

      // First call - cache miss
      service.get(key, fetcher, 5000).subscribe(result => {
        expect(result).toEqual(data);
      });
      tick();

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      service.get(key, fetcher, 5000).subscribe(result => {
        expect(result).toEqual(data);
      });
      tick();

      // Fetcher should not be called again
      expect(fetcher).toHaveBeenCalledTimes(1);

      const stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    }));

    it('should fetch fresh data on cache miss', fakeAsync(() => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const fetcher = jasmine.createSpy('fetcher').and.returnValue(of(data));

      service.get(key, fetcher, 5000).subscribe(result => {
        expect(result).toEqual(data);
      });
      tick();

      expect(fetcher).toHaveBeenCalledTimes(1);

      const stats = service.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    }));
  });

  describe('Cache Expiration (Requirement 16.3)', () => {
    it('should fetch fresh data when cache expires', fakeAsync(() => {
      const key = 'test-key';
      const data1 = { value: 'data-1' };
      const data2 = { value: 'data-2' };
      const fetcher = jasmine.createSpy('fetcher')
        .and.returnValues(of(data1), of(data2));

      const ttl = 1000; // 1 second

      // First call - cache miss
      service.get(key, fetcher, ttl).subscribe(result => {
        expect(result).toEqual(data1);
      });
      tick();

      // Second call within TTL - cache hit
      tick(500);
      service.get(key, fetcher, ttl).subscribe(result => {
        expect(result).toEqual(data1);
      });
      tick();

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Third call after TTL expires - cache miss, fetch fresh data
      tick(600); // Total 1100ms, exceeds TTL
      service.get(key, fetcher, ttl).subscribe(result => {
        expect(result).toEqual(data2);
      });
      tick();

      expect(fetcher).toHaveBeenCalledTimes(2);
    }));

    it('should automatically clean up expired entries', fakeAsync(() => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const fetcher = () => of(data);
      const ttl = 1000;

      service.get(key, fetcher, ttl).subscribe();
      tick();

      expect(service.has(key)).toBe(true);

      // Wait for TTL to expire
      tick(ttl + 100);

      expect(service.has(key)).toBe(false);
    }));
  });

  describe('Cache Invalidation (Requirement 16.4)', () => {
    it('should invalidate specific cache entry', fakeAsync(() => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const fetcher = () => of(data);

      service.get(key, fetcher, 5000).subscribe();
      tick();

      expect(service.has(key)).toBe(true);

      service.invalidate(key);

      expect(service.has(key)).toBe(false);
    }));

    it('should invalidate cache entries matching pattern', fakeAsync(() => {
      const keys = ['user-1', 'user-2', 'product-1'];
      const fetcher = () => of({ value: 'data' });

      keys.forEach(key => {
        service.get(key, fetcher, 5000).subscribe();
      });
      tick();

      expect(service.has('user-1')).toBe(true);
      expect(service.has('user-2')).toBe(true);
      expect(service.has('product-1')).toBe(true);

      service.invalidatePattern(/^user-/);

      expect(service.has('user-1')).toBe(false);
      expect(service.has('user-2')).toBe(false);
      expect(service.has('product-1')).toBe(true);
    }));

    it('should clear all cache entries', fakeAsync(() => {
      const keys = ['key-1', 'key-2', 'key-3'];
      const fetcher = () => of({ value: 'data' });

      keys.forEach(key => {
        service.get(key, fetcher, 5000).subscribe();
      });
      tick();

      expect(service.getStats().size).toBe(3);

      service.clearAll();

      expect(service.getStats().size).toBe(0);
      keys.forEach(key => {
        expect(service.has(key)).toBe(false);
      });
    }));
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', fakeAsync(() => {
      const key = 'test-key';
      const fetcher = () => of({ value: 'data' });

      // First call - miss
      service.get(key, fetcher, 5000).subscribe();
      tick();

      // Second call - hit
      service.get(key, fetcher, 5000).subscribe();
      tick();

      // Third call - hit
      service.get(key, fetcher, 5000).subscribe();
      tick();

      const stats = service.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.67); // 2/3 * 100
    }));

    it('should reset statistics', fakeAsync(() => {
      const key = 'test-key';
      const fetcher = () => of({ value: 'data' });

      service.get(key, fetcher, 5000).subscribe();
      tick();
      service.get(key, fetcher, 5000).subscribe();
      tick();

      let stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      service.resetStats();

      stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    }));

    it('should track cache size', fakeAsync(() => {
      const keys = ['key-1', 'key-2', 'key-3'];
      const fetcher = () => of({ value: 'data' });

      keys.forEach(key => {
        service.get(key, fetcher, 5000).subscribe();
      });
      tick();

      const stats = service.getStats();
      expect(stats.size).toBe(3);
    }));
  });

  describe('Cache Utilities', () => {
    it('should check if key is cached', fakeAsync(() => {
      const key = 'test-key';
      const fetcher = () => of({ value: 'data' });

      expect(service.has(key)).toBe(false);

      service.get(key, fetcher, 5000).subscribe();
      tick();

      expect(service.has(key)).toBe(true);
    }));

    it('should return all cache keys', fakeAsync(() => {
      const keys = ['key-1', 'key-2', 'key-3'];
      const fetcher = () => of({ value: 'data' });

      keys.forEach(key => {
        service.get(key, fetcher, 5000).subscribe();
      });
      tick();

      const cacheKeys = service.getKeys();
      expect(cacheKeys.length).toBe(3);
      expect(cacheKeys).toContain('key-1');
      expect(cacheKeys).toContain('key-2');
      expect(cacheKeys).toContain('key-3');
    }));

    it('should return cache entry expiration time', fakeAsync(() => {
      const key = 'test-key';
      const fetcher = () => of({ value: 'data' });
      const ttl = 5000;

      const beforeTime = Date.now();
      service.get(key, fetcher, ttl).subscribe();
      tick();
      const afterTime = Date.now();

      const expiration = service.getExpiration(key);
      expect(expiration).toBeTruthy();
      
      if (expiration) {
        const expirationTime = expiration.getTime();
        expect(expirationTime).toBeGreaterThanOrEqual(beforeTime + ttl);
        expect(expirationTime).toBeLessThanOrEqual(afterTime + ttl);
      }
    }));

    it('should return null for non-existent key expiration', () => {
      const expiration = service.getExpiration('non-existent-key');
      expect(expiration).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from fetcher', fakeAsync(() => {
      const key = 'test-key';
      const error = new Error('Fetch failed');
      const fetcher = () => throwError(() => error);

      let caughtError: any;
      service.get(key, fetcher, 5000).subscribe({
        next: () => fail('Should not succeed'),
        error: (err) => {
          caughtError = err;
        }
      });
      tick();

      expect(caughtError).toBe(error);
    }));

    it('should not cache failed requests', fakeAsync(() => {
      const key = 'test-key';
      const error = new Error('Fetch failed');
      const successData = { value: 'success' };
      const fetcher = jasmine.createSpy('fetcher')
        .and.returnValues(
          throwError(() => error),
          of(successData)
        );

      // First call fails
      service.get(key, fetcher, 5000).subscribe({
        error: () => {}
      });
      tick();

      // Second call should fetch again (not use cache)
      service.get(key, fetcher, 5000).subscribe(result => {
        expect(result).toEqual(successData);
      });
      tick();

      expect(fetcher).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Concurrent Requests', () => {
    it('should share result with multiple subscribers', fakeAsync(() => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      const fetcher = jasmine.createSpy('fetcher').and.returnValue(
        of(data).pipe(delay(100))
      );

      const results: any[] = [];

      // Make multiple concurrent requests
      service.get(key, fetcher, 5000).subscribe(result => results.push(result));
      service.get(key, fetcher, 5000).subscribe(result => results.push(result));
      service.get(key, fetcher, 5000).subscribe(result => results.push(result));

      tick(100);

      // Fetcher should only be called once
      expect(fetcher).toHaveBeenCalledTimes(1);

      // All subscribers should receive the same data
      expect(results.length).toBe(3);
      expect(results[0]).toEqual(data);
      expect(results[1]).toEqual(data);
      expect(results[2]).toEqual(data);
    }));
  });
});
