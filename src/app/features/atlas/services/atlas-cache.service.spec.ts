import { TestBed } from '@angular/core/testing';
import { of, delay, throwError } from 'rxjs';
import { AtlasCacheService } from './atlas-cache.service';

describe('AtlasCacheService', () => {
  let service: AtlasCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasCacheService);
  });

  afterEach(() => {
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should cache data from observable', (done) => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      const source$ = of(data);

      service.get(key, source$).subscribe(result => {
        expect(result).toEqual(data);
        expect(service.has(key)).toBe(true);
        done();
      });
    });

    it('should return cached data on subsequent calls', (done) => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      let callCount = 0;
      const source$ = of(data).pipe(delay(10));

      // First call - should execute source
      service.get(key, source$).subscribe(result => {
        callCount++;
        expect(result).toEqual(data);

        // Second call - should return cached data immediately
        service.get(key, of({ id: 2, name: 'Different' })).subscribe(cachedResult => {
          expect(cachedResult).toEqual(data); // Should be original data
          expect(callCount).toBe(1); // Source should only be called once
          done();
        });
      });
    });

    it('should share in-flight requests', (done) => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      let sourceCallCount = 0;
      const source$ = of(data).pipe(
        delay(50),
        delay(0) // Ensure async
      );

      const createSource = () => {
        sourceCallCount++;
        return source$;
      };

      // Make two concurrent requests
      const sub1 = service.get(key, createSource()).subscribe();
      const sub2 = service.get(key, createSource()).subscribe();

      setTimeout(() => {
        expect(sourceCallCount).toBe(1); // Should only call source once
        sub1.unsubscribe();
        sub2.unsubscribe();
        done();
      }, 100);
    });

    it('should respect custom TTL', (done) => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };
      const shortTtl = 50; // 50ms

      service.get(key, of(data), { ttl: shortTtl }).subscribe(() => {
        expect(service.has(key, shortTtl)).toBe(true);

        // Wait for TTL to expire
        setTimeout(() => {
          expect(service.has(key, shortTtl)).toBe(false);
          done();
        }, 60);
      });
    });
  });

  describe('set', () => {
    it('should set cache entry directly', () => {
      const key = 'test-key';
      const data = { id: 1, name: 'Test' };

      service.set(key, data);
      expect(service.has(key)).toBe(true);
    });
  });

  describe('has', () => {
    it('should return false for non-existent key', () => {
      expect(service.has('non-existent')).toBe(false);
    });

    it('should return true for valid cached entry', () => {
      const key = 'test-key';
      service.set(key, { id: 1 });
      expect(service.has(key)).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', () => {
      const key = 'test-key';
      service.set(key, { id: 1 });
      expect(service.has(key)).toBe(true);

      service.invalidate(key);
      expect(service.has(key)).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    it('should remove entries matching pattern', () => {
      service.set('deployment-1', { id: 1 });
      service.set('deployment-2', { id: 2 });
      service.set('analysis-1', { id: 3 });

      service.invalidatePattern(/^deployment-/);

      expect(service.has('deployment-1')).toBe(false);
      expect(service.has('deployment-2')).toBe(false);
      expect(service.has('analysis-1')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      service.set('key1', { id: 1 });
      service.set('key2', { id: 2 });
      expect(service.getStats().size).toBe(2);

      service.clear();
      expect(service.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      service.set('key1', { id: 1 });
      service.set('key2', { id: 2 });

      const stats = service.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', (done) => {
      const shortTtl = 50;
      service.set('key1', { id: 1 });
      service.set('key2', { id: 2 });

      setTimeout(() => {
        service.cleanup(shortTtl);
        expect(service.getStats().size).toBe(0);
        done();
      }, 60);
    });

    it('should keep valid entries', () => {
      service.set('key1', { id: 1 });
      service.cleanup(5000); // 5 second TTL
      expect(service.has('key1')).toBe(true);
    });
  });
});
