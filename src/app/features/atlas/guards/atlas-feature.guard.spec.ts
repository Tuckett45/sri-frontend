import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { AtlasFeatureGuard } from './atlas-feature.guard';
import { AtlasConfigService } from '../services/atlas-config.service';
import { AtlasRoutingService } from '../services/atlas-routing.service';
import { FeatureFlagService } from '../../../services/feature-flag.service';

describe('AtlasFeatureGuard', () => {
  let guard: AtlasFeatureGuard;
  let atlasConfigService: jasmine.SpyObj<AtlasConfigService>;
  let featureFlagService: jasmine.SpyObj<FeatureFlagService>;
  let atlasRoutingService: jasmine.SpyObj<AtlasRoutingService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const atlasConfigServiceSpy = jasmine.createSpyObj('AtlasConfigService', [
      'isEnabled',
      'isHybridMode',
      'isFeatureEnabled'
    ]);
    const featureFlagServiceSpy = jasmine.createSpyObj('FeatureFlagService', ['flagEnabled']);
    const atlasRoutingServiceSpy = jasmine.createSpyObj('AtlasRoutingService', ['getRouteForFeature']);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        AtlasFeatureGuard,
        { provide: AtlasConfigService, useValue: atlasConfigServiceSpy },
        { provide: FeatureFlagService, useValue: featureFlagServiceSpy },
        { provide: AtlasRoutingService, useValue: atlasRoutingServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AtlasFeatureGuard);
    atlasConfigService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
    featureFlagService = TestBed.inject(FeatureFlagService) as jasmine.SpyObj<FeatureFlagService>;
    atlasRoutingService = TestBed.inject(AtlasRoutingService) as jasmine.SpyObj<AtlasRoutingService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access when feature flag and backend are both enabled', () => {
      featureFlagService.flagEnabled.and.returnValue(signal(true));
      atlasConfigService.isEnabled.and.returnValue(true);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(true);
    });

    it('should redirect to overview when feature flag is disabled', () => {
      const urlTree = {} as UrlTree;
      featureFlagService.flagEnabled.and.returnValue(signal(false));
      router.createUrlTree.and.returnValue(urlTree);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/overview']);
    });

    it('should redirect to overview when backend integration is disabled', () => {
      const urlTree = {} as UrlTree;
      featureFlagService.flagEnabled.and.returnValue(signal(true));
      atlasConfigService.isEnabled.and.returnValue(false);
      router.createUrlTree.and.returnValue(urlTree);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/overview']);
    });
  });
});
