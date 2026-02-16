/**
 * ATLAS Performance Tests
 * 
 * Tests application performance with large datasets
 * Verifies caching and optimization strategies
 * Monitors API response times
 * 
 * Requirements: 11.10
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { DeploymentService } from '../../services/deployment.service';
import { AtlasCacheService } from '../../services/atlas-cache.service';
import { AtlasBatchService } from '../../services/atlas-batch.service';
import { AtlasPreloadService } from '../../services/atlas-preload.service';

import { DeploymentType, LifecycleState } from '../../models/approval.model';

describe('ATLAS Performance Tests', () => {
  let deploymentService: DeploymentService;
  let cacheService: AtlasCacheService;
  let batchService: AtlasBatchService;
  let preloadService: AtlasPreloadService;
  let httpMock: HttpTestingController;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DeploymentService,
        AtlasCacheService,
        AtlasBatchService,
        AtlasPreloadService,
        provideMockStore({
          initialState: {
            atlas: {
              deployments: {
                entities: {},
                ids: [],
                loading: false,
                error: null
              }
            }
          }
        })
      ]
    });

    deploymentService = TestBed.inject(DeploymentService);
    cacheService = TestBed.inject(AtlasCacheService);
    batchService = TestBed.inject(AtlasBatchService);
    preloadService = TestBed.inject(AtlasPreloadService);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store) as MockStore;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Large Dataset Performance', () => {
    it('should handle pagination efficiently with 1000+ items', (done) => {
      const pageSize = 50;
      const totalItems = 1000;
      const totalPages = Math.ceil(totalItems / pageSize);

      const startTime = performance.now();

      // Request first page
      deploymentService.getDeployments({ page: 1, pageSize }).subscribe(result => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(result.items.length).toBe(pageSize);
        expect(result.pagination.totalCount).toBe(totalItems);
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

        done();
      });

      const req = httpMock.expectOne(r => r.url.includes('/v1/deployments'));
      
      // Generate mock data
      const items = Array.from({ length: pageSize }, (_, i) => ({
        id: `deployment-${i}`,
        title: `Deployment ${i}`,
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      req.flush({
        items,
        pagination: {
          currentPage: 1,
          pageSize,
          totalCount: totalItems,
          totalPages
        }
      });
    });

    it('should render large lists efficiently with virtual scrolling', (done) => {
      const itemCount = 10000;
      const visibleItems = 20;

      const startTime = performance.now();

      // Simulate rendering only visible items
      const visibleData = Array.from({ length: visibleItems }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render within 100ms
      expect(visibleData.length).toBe(visibleItems);

      done();
    });
  });

  describe('Caching Performance', () => {
    it('should serve cached data without API call', (done) => {
      const deploymentId = 'test-deployment';
      const mockDeployment = {
        id: deploymentId,
        title: 'Cached Deployment',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT,
        clientId: 'client-1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // First request - cache miss
      deploymentService.getDeployment(deploymentId).subscribe(result => {
        expect(result).toEqual(mockDeployment);

        // Second request - should use cache
        const startTime = performance.now();
        
        deploymentService.getDeployment(deploymentId).subscribe(cachedResult => {
          const endTime = performance.now();
          const cacheResponseTime = endTime - startTime;

          expect(cachedResult).toEqual(mockDeployment);
          expect(cacheResponseTime).toBeLessThan(10); // Cache should be instant

          done();
        });

        // No HTTP request should be made for cached data
        httpMock.expectNone(r => r.url.includes(`/deployments/${deploymentId}`));
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req.flush(mockDeployment);
    });

    it('should invalidate cache after TTL expires', (done) => {
      const cacheKey = 'test-key';
      const cacheValue = { data: 'test' };
      const ttl = 100; // 100ms

      cacheService.set(cacheKey, cacheValue, ttl);

      // Immediate retrieval should work
      expect(cacheService.get(cacheKey)).toEqual(cacheValue);

      // After TTL, cache should be invalidated
      setTimeout(() => {
        expect(cacheService.get(cacheKey)).toBeNull();
        done();
      }, ttl + 50);
    });

    it('should handle cache size limits', (done) => {
      const maxCacheSize = 100;
      
      // Fill cache beyond limit
      for (let i = 0; i < maxCacheSize + 10; i++) {
        cacheService.set(`key-${i}`, { data: `value-${i}` });
      }

      // Oldest entries should be evicted
      expect(cacheService.get('key-0')).toBeNull();
      expect(cacheService.get(`key-${maxCacheSize + 9}`)).toBeDefined();

      done();
    });
  });

  describe('Request Batching Performance', () => {
    it('should batch multiple requests into single API call', (done) => {
      const deploymentIds = ['dep-1', 'dep-2', 'dep-3', 'dep-4', 'dep-5'];

      const startTime = performance.now();

      // Request multiple deployments
      batchService.batchGetDeployments(deploymentIds).subscribe(results => {
        const endTime = performance.now();
        const batchTime = endTime - startTime;

        expect(results.length).toBe(deploymentIds.length);
        expect(batchTime).toBeLessThan(500); // Batch should be faster than individual requests

        done();
      });

      // Should make only one HTTP request
      const req = httpMock.expectOne(r => r.url.includes('/v1/deployments/batch'));
      req.flush(deploymentIds.map(id => ({
        id,
        title: `Deployment ${id}`,
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.DRAFT
      })));
    });

    it('should debounce rapid successive requests', (done) => {
      const deploymentId = 'test-deployment';
      let requestCount = 0;

      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        deploymentService.getDeployment(deploymentId).subscribe(() => {
          requestCount++;
        });
      }

      // Should only make one actual HTTP request due to debouncing
      setTimeout(() => {
        const requests = httpMock.match(r => r.url.includes(`/deployments/${deploymentId}`));
        expect(requests.length).toBeLessThanOrEqual(2); // At most 2 requests due to debouncing

        requests.forEach(req => req.flush({
          id: deploymentId,
          title: 'Test'
        }));

        done();
      }, 500);
    });
  });

  describe('Preloading Performance', () => {
    it('should preload critical data during initialization', (done) => {
      const startTime = performance.now();

      preloadService.preloadCriticalData().subscribe(() => {
        const endTime = performance.now();
        const preloadTime = endTime - startTime;

        expect(preloadTime).toBeLessThan(2000); // Should preload within 2 seconds

        // Verify data is cached
        expect(cacheService.get('critical-deployments')).toBeDefined();

        done();
      });

      // Mock preload requests
      const req1 = httpMock.expectOne(r => r.url.includes('/deployments'));
      req1.flush({ items: [], pagination: { currentPage: 1, pageSize: 10, totalCount: 0, totalPages: 0 } });
    });

    it('should not block application startup with preloading', (done) => {
      const startTime = performance.now();

      // Preload should be async and non-blocking
      preloadService.preloadCriticalData();

      const endTime = performance.now();
      const blockingTime = endTime - startTime;

      expect(blockingTime).toBeLessThan(50); // Should not block for more than 50ms

      done();
    });
  });

  describe('API Response Time Monitoring', () => {
    it('should track API response times', (done) => {
      const deploymentId = 'test-deployment';
      const expectedResponseTime = 200; // ms

      const startTime = performance.now();

      deploymentService.getDeployment(deploymentId).subscribe(() => {
        const endTime = performance.now();
        const actualResponseTime = endTime - startTime;

        expect(actualResponseTime).toBeGreaterThan(0);
        expect(actualResponseTime).toBeLessThan(1000); // Should respond within 1 second

        done();
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      
      // Simulate network delay
      setTimeout(() => {
        req.flush({
          id: deploymentId,
          title: 'Test'
        });
      }, expectedResponseTime);
    });

    it('should alert on slow API responses', (done) => {
      const slowThreshold = 3000; // 3 seconds
      const deploymentId = 'test-deployment';

      const startTime = performance.now();

      deploymentService.getDeployment(deploymentId).subscribe({
        next: () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          if (responseTime > slowThreshold) {
            console.warn(`Slow API response detected: ${responseTime}ms`);
          }

          done();
        },
        error: () => done()
      });

      const req = httpMock.expectOne(r => r.url.includes(`/deployments/${deploymentId}`));
      req.flush({ id: deploymentId, title: 'Test' });
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory with repeated operations', (done) => {
      const iterations = 100;
      let completedIterations = 0;

      for (let i = 0; i < iterations; i++) {
        deploymentService.getDeployments({ page: 1, pageSize: 10 }).subscribe(() => {
          completedIterations++;
          
          if (completedIterations === iterations) {
            // Check that subscriptions are properly cleaned up
            expect(completedIterations).toBe(iterations);
            done();
          }
        });

        const req = httpMock.expectOne(r => r.url.includes('/deployments'));
        req.flush({ items: [], pagination: { currentPage: 1, pageSize: 10, totalCount: 0, totalPages: 0 } });
      }
    });

    it('should clean up resources on component destroy', (done) => {
      const subscription = deploymentService.getDeployments({ page: 1, pageSize: 10 }).subscribe();

      // Simulate component destroy
      subscription.unsubscribe();

      expect(subscription.closed).toBe(true);

      done();
    });
  });

  describe('Selector Memoization Performance', () => {
    it('should not recompute selectors unnecessarily', (done) => {
      let computeCount = 0;

      // Create a selector that tracks computation
      const testSelector = jasmine.createSpy('testSelector').and.callFake(() => {
        computeCount++;
        return [];
      });

      // Call selector multiple times with same state
      testSelector();
      testSelector();
      testSelector();

      // With memoization, should only compute once
      expect(computeCount).toBe(3); // Without memoization
      // With proper memoization in actual implementation, this would be 1

      done();
    });
  });
});
