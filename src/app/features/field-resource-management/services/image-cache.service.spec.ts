import { TestBed } from '@angular/core/testing';
import { ImageCacheService } from './image-cache.service';

describe('ImageCacheService', () => {
  let service: ImageCacheService;
  let mockCache: any;
  let mockCaches: any;

  beforeEach(() => {
    // Mock Cache API
    mockCache = {
      put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
      match: jasmine.createSpy('match').and.returnValue(Promise.resolve(undefined)),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve(true)),
      keys: jasmine.createSpy('keys').and.returnValue(Promise.resolve([]))
    };

    mockCaches = {
      open: jasmine.createSpy('open').and.returnValue(Promise.resolve(mockCache)),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve(true))
    };

    // Replace global caches object
    (window as any).caches = mockCaches;

    TestBed.configureTestingModule({
      providers: [ImageCacheService]
    });

    service = TestBed.inject(ImageCacheService);
  });

  afterEach(() => {
    // Clean up
    delete (window as any).caches;
  });

  describe('Initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize cache on construction', (done) => {
      setTimeout(() => {
        expect(mockCaches.open).toHaveBeenCalledWith('frm-image-cache-v1');
        expect(mockCache.keys).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle missing Cache API gracefully', () => {
      delete (window as any).caches;
      const newService = new ImageCacheService();
      expect(newService).toBeTruthy();
    });
  });

  describe('cacheImage', () => {
    it('should cache an image blob', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      service.cacheImage(url, blob).subscribe({
        next: () => {
          expect(mockCache.put).toHaveBeenCalled();
          const putCall = mockCache.put.calls.mostRecent();
          expect(putCall.args[0]).toBe(url);
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should fetch and cache image if blob not provided', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      // Mock fetch
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(blob, { status: 200, statusText: 'OK' }))
      );

      service.cacheImage(url).subscribe({
        next: () => {
          expect(window.fetch).toHaveBeenCalledWith(url);
          expect(mockCache.put).toHaveBeenCalled();
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should handle fetch errors', (done) => {
      const url = 'https://example.com/image.jpg';

      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }))
      );

      service.cacheImage(url).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    });

    it('should return error if Cache API not supported', (done) => {
      delete (window as any).caches;
      const newService = new ImageCacheService();
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      newService.cacheImage(url, blob).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err.message).toContain('Cache API not supported');
          done();
        }
      });
    });

    it('should add cache metadata headers', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      service.cacheImage(url, blob).subscribe({
        next: () => {
          const putCall = mockCache.put.calls.mostRecent();
          const response = putCall.args[1] as Response;
          
          expect(response.headers.get('Content-Type')).toBe('image/jpeg');
          expect(response.headers.get('X-Cache-Timestamp')).toBeTruthy();
          expect(response.headers.get('X-Cache-Size')).toBeTruthy();
          done();
        },
        error: (err) => done.fail(err)
      });
    });
  });

  describe('getCachedImage', () => {
    it('should return cached image blob', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'X-Cache-Timestamp': Date.now().toString(),
        'X-Cache-Size': blob.size.toString()
      });
      const response = new Response(blob, { headers });

      mockCache.match.and.returnValue(Promise.resolve(response));

      service.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeTruthy();
          expect(result?.type).toBe('image/jpeg');
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should return null if image not cached', (done) => {
      const url = 'https://example.com/image.jpg';
      mockCache.match.and.returnValue(Promise.resolve(undefined));

      service.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should return null if image expired', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const expiredTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'X-Cache-Timestamp': expiredTimestamp.toString(),
        'X-Cache-Size': blob.size.toString()
      });
      const response = new Response(blob, { headers });

      mockCache.match.and.returnValue(Promise.resolve(response));

      service.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          expect(mockCache.delete).toHaveBeenCalledWith(url);
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should return null if Cache API not supported', (done) => {
      delete (window as any).caches;
      const newService = new ImageCacheService();
      const url = 'https://example.com/image.jpg';

      newService.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should handle errors gracefully', (done) => {
      const url = 'https://example.com/image.jpg';
      mockCache.match.and.returnValue(Promise.reject(new Error('Cache error')));

      service.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: (err) => done.fail(err)
      });
    });
  });

  describe('cacheFile', () => {
    it('should cache a file with identifier', (done) => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const identifier = 'job-123-photo-1';

      service.cacheFile(file, identifier).subscribe({
        next: () => {
          expect(mockCache.put).toHaveBeenCalled();
          const putCall = mockCache.put.calls.mostRecent();
          expect(putCall.args[0]).toContain(identifier);
          done();
        },
        error: (err) => done.fail(err)
      });
    });
  });

  describe('getCachedFile', () => {
    it('should retrieve cached file by identifier', (done) => {
      const identifier = 'job-123-photo-1';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'X-Cache-Timestamp': Date.now().toString(),
        'X-Cache-Size': blob.size.toString()
      });
      const response = new Response(blob, { headers });

      mockCache.match.and.returnValue(Promise.resolve(response));

      service.getCachedFile(identifier).subscribe({
        next: (result) => {
          expect(result).toBeTruthy();
          done();
        },
        error: (err) => done.fail(err)
      });
    });
  });

  describe('isCached', () => {
    it('should return true if image is cached and valid', async () => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'X-Cache-Timestamp': Date.now().toString(),
        'X-Cache-Size': blob.size.toString()
      });
      const response = new Response(blob, { headers });

      mockCache.match.and.returnValue(Promise.resolve(response));

      const result = await service.isCached(url);
      expect(result).toBe(true);
    });

    it('should return false if image not cached', async () => {
      const url = 'https://example.com/image.jpg';
      mockCache.match.and.returnValue(Promise.resolve(undefined));

      const result = await service.isCached(url);
      expect(result).toBe(false);
    });

    it('should return false if image expired', async () => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const expiredTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'X-Cache-Timestamp': expiredTimestamp.toString(),
        'X-Cache-Size': blob.size.toString()
      });
      const response = new Response(blob, { headers });

      mockCache.match.and.returnValue(Promise.resolve(response));

      const result = await service.isCached(url);
      expect(result).toBe(false);
    });

    it('should return false if Cache API not supported', async () => {
      delete (window as any).caches;
      const newService = new ImageCacheService();
      const url = 'https://example.com/image.jpg';

      const result = await newService.isCached(url);
      expect(result).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should remove cached image', async () => {
      const url = 'https://example.com/image.jpg';

      await service.invalidate(url);

      expect(mockCache.delete).toHaveBeenCalledWith(url);
    });

    it('should handle missing Cache API gracefully', async () => {
      delete (window as any).caches;
      const newService = new ImageCacheService();
      const url = 'https://example.com/image.jpg';

      await newService.invalidate(url);
      // Should not throw error
    });
  });

  describe('clearAll', () => {
    it('should clear all cached images', async () => {
      await service.clearAll();

      expect(mockCaches.delete).toHaveBeenCalledWith('frm-image-cache-v1');
    });

    it('should reset cache statistics', async () => {
      await service.clearAll();

      const stats = service.getStats();
      expect(stats.count).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        count: jasmine.any(Number),
        size: jasmine.any(Number),
        sizeFormatted: jasmine.any(String),
        maxSize: jasmine.any(Number),
        maxSizeFormatted: jasmine.any(String),
        utilizationPercent: jasmine.any(Number)
      });
    });

    it('should calculate utilization percentage correctly', () => {
      const stats = service.getStats();

      expect(stats.utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('updateConfig', () => {
    it('should update cache configuration', () => {
      const newConfig = {
        maxCacheSize: 100 * 1024 * 1024, // 100 MB
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
      };

      service.updateConfig(newConfig);

      const stats = service.getStats();
      expect(stats.maxSize).toBe(newConfig.maxCacheSize);
    });
  });

  describe('getCachedUrls', () => {
    it('should return array of cached URLs', () => {
      const urls = service.getCachedUrls();

      expect(Array.isArray(urls)).toBe(true);
    });
  });

  describe('preloadImages', () => {
    it('should preload multiple images', (done) => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];

      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve(new Response(new Blob(['test'], { type: 'image/jpeg' }), {
          status: 200,
          statusText: 'OK'
        }))
      );

      const progress: any[] = [];

      service.preloadImages(urls).subscribe({
        next: (p) => {
          progress.push(p);
        },
        complete: () => {
          expect(progress.length).toBe(urls.length);
          expect(progress[progress.length - 1].loaded).toBe(urls.length);
          expect(progress[progress.length - 1].total).toBe(urls.length);
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should continue preloading even if some images fail', (done) => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];

      let callCount = 0;
      spyOn(window, 'fetch').and.callFake(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }));
        }
        return Promise.resolve(new Response(new Blob(['test'], { type: 'image/jpeg' }), {
          status: 200,
          statusText: 'OK'
        }));
      });

      const progress: any[] = [];

      service.preloadImages(urls).subscribe({
        next: (p) => {
          progress.push(p);
        },
        complete: () => {
          expect(progress.length).toBe(urls.length);
          done();
        },
        error: (err) => done.fail(err)
      });
    });
  });

  describe('Cache Size Management', () => {
    it('should track current cache size', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test data'], { type: 'image/jpeg' });

      service.cacheImage(url, blob).subscribe({
        next: () => {
          const stats = service.getStats();
          expect(stats.size).toBeGreaterThan(0);
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should format bytes correctly', () => {
      const stats = service.getStats();
      
      expect(stats.sizeFormatted).toMatch(/\d+(\.\d+)?\s+(B|KB|MB)/);
      expect(stats.maxSizeFormatted).toMatch(/\d+(\.\d+)?\s+(B|KB|MB)/);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache.put errors', (done) => {
      const url = 'https://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      mockCache.put.and.returnValue(Promise.reject(new Error('Storage quota exceeded')));

      service.cacheImage(url, blob).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    });

    it('should handle cache.match errors', (done) => {
      const url = 'https://example.com/image.jpg';

      mockCache.match.and.returnValue(Promise.reject(new Error('Cache error')));

      service.getCachedImage(url).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: (err) => done.fail(err)
      });
    });

    it('should handle cache.delete errors', async () => {
      const url = 'https://example.com/image.jpg';

      mockCache.delete.and.returnValue(Promise.reject(new Error('Delete error')));

      // Should not throw
      await service.invalidate(url);
    });
  });
});
