import { TestBed } from '@angular/core/testing';
import { RoleBasedDataService, MarketFilterOptions } from './role-based-data.service';
import { AuthService } from './auth.service';
import { UserRole } from '../models/role.enum';
import { BehaviorSubject } from 'rxjs';

describe('RoleBasedDataService', () => {
  let service: RoleBasedDataService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'isCM',
      'getUser',
      'getLoginStatus'
    ]);
    
    // Mock getLoginStatus to return an observable
    spy.getLoginStatus.and.returnValue(new BehaviorSubject<boolean>(false).asObservable());

    TestBed.configureTestingModule({
      providers: [
        RoleBasedDataService,
        { provide: AuthService, useValue: spy }
      ]
    });

    service = TestBed.inject(RoleBasedDataService);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyMarketFilter', () => {
    const testData = [
      { id: '1', name: 'Item 1', market: 'NYC' },
      { id: '2', name: 'Item 2', market: 'LA' },
      { id: '3', name: 'Item 3', market: 'RG-Chicago' },
      { id: '4', name: 'Item 4', market: 'NYC' }
    ];

    it('should return all data for Admin users', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);

      const result = service.applyMarketFilter(testData);

      expect(result.length).toBe(4);
      expect(result).toEqual(testData);
    });

    it('should filter by specific market for Admin when specified', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);

      const options: MarketFilterOptions = { specificMarket: 'NYC' };
      const result = service.applyMarketFilter(testData, options);

      expect(result.length).toBe(2);
      expect(result.every(item => item.market === 'NYC')).toBe(true);
    });

    it('should filter to CM assigned market only', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      const result = service.applyMarketFilter(testData);

      expect(result.length).toBe(2);
      expect(result.every(item => item.market === 'NYC')).toBe(true);
    });

    it('should exclude RG markets for CM when excludeRGMarkets is true', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'RG-Chicago' });

      const dataWithRG = [
        { id: '1', name: 'Item 1', market: 'RG-Chicago' },
        { id: '2', name: 'Item 2', market: 'RG-Chicago' }
      ];

      const options: MarketFilterOptions = { excludeRGMarkets: true };
      const result = service.applyMarketFilter(dataWithRG, options);

      expect(result.length).toBe(0);
    });

    it('should return empty array when CM has no market assigned', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: null });

      const result = service.applyMarketFilter(testData);

      expect(result.length).toBe(0);
    });

    it('should return empty array when data is empty', () => {
      authServiceSpy.isAdmin.and.returnValue(true);

      const result = service.applyMarketFilter([]);

      expect(result.length).toBe(0);
    });

    it('should return data as-is for other roles', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(false);

      const result = service.applyMarketFilter(testData);

      expect(result).toEqual(testData);
    });
  });

  describe('getRoleBasedQueryParams', () => {
    it('should not add market param for Admin users', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);

      const params = service.getRoleBasedQueryParams();

      expect(params.has('market')).toBe(false);
    });

    it('should add market param for CM users', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      const params = service.getRoleBasedQueryParams();

      expect(params.has('market')).toBe(true);
      expect(params.get('market')).toBe('NYC');
    });

    it('should include additional parameters', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);

      const additionalParams = { status: 'active', limit: 10 };
      const params = service.getRoleBasedQueryParams(additionalParams);

      expect(params.get('status')).toBe('active');
      expect(params.get('limit')).toBe('10');
    });

    it('should not add market param when CM has no market', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: null });

      const params = service.getRoleBasedQueryParams();

      expect(params.has('market')).toBe(false);
    });
  });

  describe('canAccessMarket', () => {
    it('should return true for Admin accessing any market', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);

      expect(service.canAccessMarket('NYC')).toBe(true);
      expect(service.canAccessMarket('LA')).toBe(true);
      expect(service.canAccessMarket('RG-Chicago')).toBe(true);
    });

    it('should return true for CM accessing their assigned market', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      expect(service.canAccessMarket('NYC')).toBe(true);
    });

    it('should return false for CM accessing other markets', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      expect(service.canAccessMarket('LA')).toBe(false);
      expect(service.canAccessMarket('RG-Chicago')).toBe(false);
    });

    it('should return false for empty market', () => {
      authServiceSpy.isAdmin.and.returnValue(true);

      expect(service.canAccessMarket('')).toBe(false);
    });

    it('should return false for other roles', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(false);

      expect(service.canAccessMarket('NYC')).toBe(false);
    });
  });

  describe('getAccessibleMarkets', () => {
    it('should return empty array for Admin (indicating all markets)', () => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      const markets = service.getAccessibleMarkets();

      expect(markets).toEqual([]);
    });

    it('should return CM assigned market', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      const markets = service.getAccessibleMarkets();

      expect(markets).toEqual(['NYC']);
    });

    it('should return empty array when CM has no market', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue({ market: null });

      const markets = service.getAccessibleMarkets();

      expect(markets).toEqual([]);
    });

    it('should return empty array when no user is logged in', () => {
      authServiceSpy.getUser.and.returnValue(null);

      const markets = service.getAccessibleMarkets();

      expect(markets).toEqual([]);
    });

    it('should return empty array for other roles', () => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

      const markets = service.getAccessibleMarkets();

      expect(markets).toEqual([]);
    });
  });

  describe('Caching', () => {
    describe('getAccessibleMarkets caching', () => {
      it('should cache accessible markets', () => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isCM.and.returnValue(true);
        authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

        // First call
        const markets1 = service.getAccessibleMarkets();
        expect(markets1).toEqual(['NYC']);

        // Change the mock to return different data
        authServiceSpy.getUser.and.returnValue({ market: 'LA' });

        // Second call should return cached data
        const markets2 = service.getAccessibleMarkets();
        expect(markets2).toEqual(['NYC']); // Still cached
      });

      it('should invalidate cache after TTL expires', (done) => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isCM.and.returnValue(true);
        authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

        // Configure very short TTL for testing
        service.configureCacheTTL({ accessibleMarketsTTL: 50 });

        // First call
        const markets1 = service.getAccessibleMarkets();
        expect(markets1).toEqual(['NYC']);

        // Change the mock
        authServiceSpy.getUser.and.returnValue({ market: 'LA' });

        // Wait for cache to expire
        setTimeout(() => {
          const markets2 = service.getAccessibleMarkets();
          expect(markets2).toEqual(['LA']); // Cache expired, new data
          done();
        }, 60);
      });
    });

    describe('clearCache', () => {
      it('should clear all cached data', () => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isCM.and.returnValue(true);
        authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

        // Cache some data
        service.getAccessibleMarkets();
        service.setCachedData('test-key', { value: 'test' });

        // Clear cache
        service.clearCache();

        // Change mock data
        authServiceSpy.getUser.and.returnValue({ market: 'LA' });

        // Should get fresh data
        const markets = service.getAccessibleMarkets();
        expect(markets).toEqual(['LA']);

        // Generic cache should also be cleared
        expect(service.getCachedData('test-key')).toBeNull();
      });
    });

    describe('invalidateCacheOnRoleChange', () => {
      it('should clear cache when role changes', () => {
        authServiceSpy.isAdmin.and.returnValue(false);
        authServiceSpy.isCM.and.returnValue(true);
        authServiceSpy.getUser.and.returnValue({ market: 'NYC' });

        // Cache data
        const markets1 = service.getAccessibleMarkets();
        expect(markets1).toEqual(['NYC']);

        // Simulate role change
        service.invalidateCacheOnRoleChange();

        // Change mock to simulate new role
        authServiceSpy.isAdmin.and.returnValue(true);
        authServiceSpy.isCM.and.returnValue(false);

        // Should get fresh data
        const markets2 = service.getAccessibleMarkets();
        expect(markets2).toEqual([]); // Admin returns empty array
      });
    });

    describe('getCachedData and setCachedData', () => {
      it('should cache and retrieve data', () => {
        const testData = { value: 'test', count: 42 };
        service.setCachedData('test-key', testData);

        const cached = service.getCachedData('test-key');
        expect(cached).toEqual(testData);
      });

      it('should return null for non-existent cache key', () => {
        const cached = service.getCachedData('non-existent');
        expect(cached).toBeNull();
      });

      it('should return null for expired cache', (done) => {
        const testData = { value: 'test' };
        service.setCachedData('test-key', testData, 50); // 50ms TTL

        // Immediately should be cached
        expect(service.getCachedData('test-key')).toEqual(testData);

        // Wait for expiration
        setTimeout(() => {
          expect(service.getCachedData('test-key')).toBeNull();
          done();
        }, 60);
      });

      it('should use custom TTL when provided', (done) => {
        const testData = { value: 'test' };
        service.setCachedData('test-key', testData, 100); // 100ms TTL

        setTimeout(() => {
          // Should still be cached at 50ms
          expect(service.getCachedData('test-key')).toEqual(testData);
        }, 50);

        setTimeout(() => {
          // Should be expired at 110ms
          expect(service.getCachedData('test-key')).toBeNull();
          done();
        }, 110);
      });
    });

    describe('invalidateCache', () => {
      it('should invalidate specific cache entry', () => {
        service.setCachedData('key1', { value: 'data1' });
        service.setCachedData('key2', { value: 'data2' });

        service.invalidateCache('key1');

        expect(service.getCachedData('key1')).toBeNull();
        expect(service.getCachedData('key2')).toEqual({ value: 'data2' });
      });
    });

    describe('configureCacheTTL', () => {
      it('should update cache configuration', () => {
        const newConfig = {
          accessibleMarketsTTL: 10 * 60 * 1000,
          defaultTTL: 5 * 60 * 1000
        };

        service.configureCacheTTL(newConfig);

        const config = service.getCacheConfig();
        expect(config.accessibleMarketsTTL).toBe(10 * 60 * 1000);
        expect(config.defaultTTL).toBe(5 * 60 * 1000);
      });

      it('should allow partial configuration updates', () => {
        const originalConfig = service.getCacheConfig();
        
        service.configureCacheTTL({ accessibleMarketsTTL: 15 * 60 * 1000 });

        const config = service.getCacheConfig();
        expect(config.accessibleMarketsTTL).toBe(15 * 60 * 1000);
        expect(config.defaultTTL).toBe(originalConfig.defaultTTL);
      });
    });
  });
});
