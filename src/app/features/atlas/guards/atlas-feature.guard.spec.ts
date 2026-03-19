import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AtlasFeatureGuard } from './atlas-feature.guard';
import { AtlasConfigService } from '../services/atlas-config.service';

describe('AtlasFeatureGuard', () => {
  let guard: AtlasFeatureGuard;
  let atlasConfigService: jasmine.SpyObj<AtlasConfigService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const atlasConfigServiceSpy = jasmine.createSpyObj('AtlasConfigService', [
      'isEnabled',
      'isHybridMode',
      'isFeatureEnabled'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        AtlasFeatureGuard,
        { provide: AtlasConfigService, useValue: atlasConfigServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AtlasFeatureGuard);
    atlasConfigService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access when ATLAS is enabled', () => {
      atlasConfigService.isEnabled.and.returnValue(true);
      atlasConfigService.isHybridMode.and.returnValue(false);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(true);
      expect(atlasConfigService.isEnabled).toHaveBeenCalled();
    });

    it('should redirect to overview when ATLAS is disabled', () => {
      const urlTree = {} as UrlTree;
      atlasConfigService.isEnabled.and.returnValue(false);
      router.createUrlTree.and.returnValue(urlTree);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/overview']);
    });

    it('should allow access in hybrid mode when feature is enabled', () => {
      atlasConfigService.isEnabled.and.returnValue(true);
      atlasConfigService.isHybridMode.and.returnValue(true);
      atlasConfigService.isFeatureEnabled.and.returnValue(true);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(true);
      expect(atlasConfigService.isFeatureEnabled).toHaveBeenCalledWith('deployments');
    });

    it('should redirect in hybrid mode when feature is disabled', () => {
      const urlTree = {} as UrlTree;
      atlasConfigService.isEnabled.and.returnValue(true);
      atlasConfigService.isHybridMode.and.returnValue(true);
      atlasConfigService.isFeatureEnabled.and.returnValue(false);
      router.createUrlTree.and.returnValue(urlTree);

      const result = guard.canActivate({} as any, { url: '/atlas/deployments' } as any);

      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/overview']);
    });

    it('should handle URLs without feature path', () => {
      atlasConfigService.isEnabled.and.returnValue(true);
      atlasConfigService.isHybridMode.and.returnValue(true);

      const result = guard.canActivate({} as any, { url: '/atlas' } as any);

      expect(result).toBe(true);
      expect(atlasConfigService.isFeatureEnabled).not.toHaveBeenCalled();
    });
  });
});
