import { TestBed } from '@angular/core/testing';
import { AtlasRoutingService } from './atlas-routing.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasRoutingService', () => {
  let service: AtlasRoutingService;
  let configService: jasmine.SpyObj<AtlasConfigService>;

  beforeEach(() => {
    const configServiceSpy = jasmine.createSpyObj('AtlasConfigService', [
      'isEnabled',
      'isHybridMode',
      'isFeatureEnabled'
    ], {
      config: {
        features: {
          enabled: true,
          hybridMode: false,
          enabledFeatures: []
        }
      }
    });

    TestBed.configureTestingModule({
      providers: [
        AtlasRoutingService,
        { provide: AtlasConfigService, useValue: configServiceSpy }
      ]
    });

    service = TestBed.inject(AtlasRoutingService);
    configService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('shouldUseAtlas', () => {
    it('should return false when ATLAS is disabled', () => {
      configService.isEnabled.and.returnValue(false);

      const result = service.shouldUseAtlas('deployments');

      expect(result).toBe(false);
      expect(configService.isEnabled).toHaveBeenCalled();
    });

    it('should return true when ATLAS is fully enabled', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      const result = service.shouldUseAtlas('deployments');

      expect(result).toBe(true);
    });

    it('should check feature flag in hybrid mode', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(true);
      configService.isFeatureEnabled.and.returnValue(true);

      const result = service.shouldUseAtlas('deployments');

      expect(result).toBe(true);
      expect(configService.isFeatureEnabled).toHaveBeenCalledWith('deployments');
    });

    it('should return false for disabled feature in hybrid mode', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(true);
      configService.isFeatureEnabled.and.returnValue(false);

      const result = service.shouldUseAtlas('deployments');

      expect(result).toBe(false);
    });
  });

  describe('makeRoutingDecision', () => {
    it('should return decision with reason when ATLAS is disabled', () => {
      configService.isEnabled.and.returnValue(false);

      const decision = service.makeRoutingDecision('deployments');

      expect(decision.useAtlas).toBe(false);
      expect(decision.reason).toContain('disabled');
      expect(decision.featureName).toBe('deployments');
      expect(decision.timestamp).toBeInstanceOf(Date);
    });

    it('should return decision with reason in hybrid mode', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(true);
      configService.isFeatureEnabled.and.returnValue(true);

      const decision = service.makeRoutingDecision('deployments');

      expect(decision.useAtlas).toBe(true);
      expect(decision.reason).toContain('Hybrid mode');
      expect(decision.featureName).toBe('deployments');
    });

    it('should return decision when ATLAS is fully enabled', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      const decision = service.makeRoutingDecision('deployments');

      expect(decision.useAtlas).toBe(true);
      expect(decision.reason).toContain('fully enabled');
    });
  });

  describe('getRoutingDecision', () => {
    it('should return routing decision object', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      const decision = service.getRoutingDecision('deployments');

      expect(decision).toBeDefined();
      expect(decision.useAtlas).toBe(true);
      expect(decision.featureName).toBe('deployments');
    });
  });

  describe('isAtlasAvailable', () => {
    it('should return true when ATLAS is available', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      expect(service.isAtlasAvailable('deployments')).toBe(true);
    });

    it('should return false when ATLAS is not available', () => {
      configService.isEnabled.and.returnValue(false);

      expect(service.isAtlasAvailable('deployments')).toBe(false);
    });
  });

  describe('shouldUseArkFallback', () => {
    it('should return true when ATLAS is disabled', () => {
      configService.isEnabled.and.returnValue(false);

      expect(service.shouldUseArkFallback('deployments')).toBe(true);
    });

    it('should return false when ATLAS is enabled', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      expect(service.shouldUseArkFallback('deployments')).toBe(false);
    });
  });

  describe('routing log', () => {
    beforeEach(() => {
      service.clearRoutingLog();
    });

    it('should log routing decisions', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      service.shouldUseAtlas('deployments');
      service.shouldUseAtlas('aiAnalysis');

      const log = service.getRoutingLog();
      expect(log.length).toBe(2);
      expect(log[0].featureName).toBe('deployments');
      expect(log[1].featureName).toBe('aiAnalysis');
    });

    it('should filter routing log by feature name', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      service.shouldUseAtlas('deployments');
      service.shouldUseAtlas('aiAnalysis');
      service.shouldUseAtlas('deployments');

      const log = service.getRoutingLog('deployments');
      expect(log.length).toBe(2);
      expect(log.every(d => d.featureName === 'deployments')).toBe(true);
    });

    it('should limit routing log entries', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      for (let i = 0; i < 10; i++) {
        service.shouldUseAtlas('deployments');
      }

      const log = service.getRoutingLog(undefined, 5);
      expect(log.length).toBe(5);
    });

    it('should clear routing log', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      service.shouldUseAtlas('deployments');
      expect(service.getRoutingLog().length).toBe(1);

      service.clearRoutingLog();
      expect(service.getRoutingLog().length).toBe(0);
    });
  });

  describe('getRoutingStatistics', () => {
    beforeEach(() => {
      service.clearRoutingLog();
    });

    it('should return routing statistics', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(true);
      configService.isFeatureEnabled.and.returnValues(true, false, true);

      service.shouldUseAtlas('deployments');
      service.shouldUseAtlas('aiAnalysis');
      service.shouldUseAtlas('deployments');

      const stats = service.getRoutingStatistics();
      expect(stats.totalDecisions).toBe(3);
      expect(stats.atlasCount).toBe(2);
      expect(stats.arkCount).toBe(1);
      expect(stats.byFeature['deployments'].atlas).toBe(2);
      expect(stats.byFeature['aiAnalysis'].ark).toBe(1);
    });
  });

  describe('getEnabledAtlasFeatures', () => {
    it('should return empty array when ATLAS is disabled', () => {
      configService.isEnabled.and.returnValue(false);

      const features = service.getEnabledAtlasFeatures();
      expect(features).toEqual([]);
    });

    it('should return all features when ATLAS is fully enabled', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      const features = service.getEnabledAtlasFeatures();
      expect(features.length).toBe(6);
      expect(features).toContain('deployments');
      expect(features).toContain('aiAnalysis');
    });

    it('should return enabled features in hybrid mode', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(true);
      (configService as any).config = {
        features: {
          enabled: true,
          hybridMode: true,
          enabledFeatures: ['deployments', 'aiAnalysis']
        }
      };

      const features = service.getEnabledAtlasFeatures();
      expect(features).toEqual(['deployments', 'aiAnalysis']);
    });
  });

  describe('hasAnyAtlasFeatures', () => {
    it('should return false when no features are enabled', () => {
      configService.isEnabled.and.returnValue(false);

      expect(service.hasAnyAtlasFeatures()).toBe(false);
    });

    it('should return true when features are enabled', () => {
      configService.isEnabled.and.returnValue(true);
      configService.isHybridMode.and.returnValue(false);

      expect(service.hasAnyAtlasFeatures()).toBe(true);
    });
  });
});
