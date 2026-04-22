import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AtlasHybridService } from './atlas-hybrid.service';
import { AtlasRoutingService, RoutingDecision } from './atlas-routing.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasHybridService', () => {
  let service: AtlasHybridService;
  let routingService: jasmine.SpyObj<AtlasRoutingService>;
  let configService: jasmine.SpyObj<AtlasConfigService>;

  beforeEach(() => {
    const routingServiceSpy = jasmine.createSpyObj('AtlasRoutingService', [
      'getRoutingDecision',
      'shouldUseAtlas',
      'getEnabledAtlasFeatures'
    ]);

    const configServiceSpy = jasmine.createSpyObj('AtlasConfigService', [
      'isHybridMode',
      'isEnabled'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AtlasHybridService,
        { provide: AtlasRoutingService, useValue: routingServiceSpy },
        { provide: AtlasConfigService, useValue: configServiceSpy }
      ]
    });

    service = TestBed.inject(AtlasHybridService);
    routingService = TestBed.inject(AtlasRoutingService) as jasmine.SpyObj<AtlasRoutingService>;
    configService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('executeWithFallback', () => {
    it('should execute ATLAS operation when ATLAS is enabled', (done) => {
      const decision: RoutingDecision = {
        useAtlas: true,
        reason: 'ATLAS enabled',
        featureName: 'deployments',
        timestamp: new Date()
      };
      routingService.getRoutingDecision.and.returnValue(decision);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', atlasOp, arkFallback).subscribe(result => {
        expect(result).toBe('atlas-result');
        expect(atlasOp).toHaveBeenCalled();
        expect(arkFallback).not.toHaveBeenCalled();
        done();
      });
    });

    it('should fallback to ARK when ATLAS operation fails', (done) => {
      const decision: RoutingDecision = {
        useAtlas: true,
        reason: 'ATLAS enabled',
        featureName: 'deployments',
        timestamp: new Date()
      };
      routingService.getRoutingDecision.and.returnValue(decision);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(
        throwError(() => new Error('ATLAS failed'))
      );
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', atlasOp, arkFallback).subscribe(result => {
        expect(result).toBe('ark-result');
        expect(atlasOp).toHaveBeenCalled();
        expect(arkFallback).toHaveBeenCalled();
        done();
      });
    });

    it('should use ARK directly when ATLAS is disabled', (done) => {
      const decision: RoutingDecision = {
        useAtlas: false,
        reason: 'ATLAS disabled',
        featureName: 'deployments',
        timestamp: new Date()
      };
      routingService.getRoutingDecision.and.returnValue(decision);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', atlasOp, arkFallback).subscribe(result => {
        expect(result).toBe('ark-result');
        expect(atlasOp).not.toHaveBeenCalled();
        expect(arkFallback).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('executeConditional', () => {
    it('should execute ATLAS operation when routing to ATLAS', (done) => {
      const decision: RoutingDecision = {
        useAtlas: true,
        reason: 'ATLAS enabled',
        featureName: 'deployments',
        timestamp: new Date()
      };
      routingService.getRoutingDecision.and.returnValue(decision);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkOp = jasmine.createSpy('arkOp').and.returnValue(of('ark-result'));

      service.executeConditional('deployments', atlasOp, arkOp).subscribe(result => {
        expect(result).toBe('atlas-result');
        expect(atlasOp).toHaveBeenCalled();
        expect(arkOp).not.toHaveBeenCalled();
        done();
      });
    });

    it('should execute ARK operation when routing to ARK', (done) => {
      const decision: RoutingDecision = {
        useAtlas: false,
        reason: 'ATLAS disabled',
        featureName: 'deployments',
        timestamp: new Date()
      };
      routingService.getRoutingDecision.and.returnValue(decision);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkOp = jasmine.createSpy('arkOp').and.returnValue(of('ark-result'));

      service.executeConditional('deployments', atlasOp, arkOp).subscribe(result => {
        expect(result).toBe('ark-result');
        expect(atlasOp).not.toHaveBeenCalled();
        expect(arkOp).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('isHybridModeActive', () => {
    it('should return true when hybrid mode is enabled', () => {
      configService.isHybridMode.and.returnValue(true);

      expect(service.isHybridModeActive()).toBe(true);
    });

    it('should return false when hybrid mode is disabled', () => {
      configService.isHybridMode.and.returnValue(false);

      expect(service.isHybridModeActive()).toBe(false);
    });
  });

  describe('getAtlasFeatures', () => {
    it('should return all features when ATLAS is fully enabled', () => {
      configService.isHybridMode.and.returnValue(false);
      configService.isEnabled.and.returnValue(true);

      const features = service.getAtlasFeatures();
      expect(features.length).toBe(6);
      expect(features).toContain('deployments');
    });

    it('should return empty array when ATLAS is disabled', () => {
      configService.isHybridMode.and.returnValue(false);
      configService.isEnabled.and.returnValue(false);

      const features = service.getAtlasFeatures();
      expect(features).toEqual([]);
    });

    it('should return enabled features in hybrid mode', () => {
      configService.isHybridMode.and.returnValue(true);
      routingService.getEnabledAtlasFeatures.and.returnValue(['deployments', 'aiAnalysis']);

      const features = service.getAtlasFeatures();
      expect(features).toEqual(['deployments', 'aiAnalysis']);
    });
  });

  describe('getArkFeatures', () => {
    it('should return features not using ATLAS', () => {
      configService.isHybridMode.and.returnValue(true);
      routingService.getEnabledAtlasFeatures.and.returnValue(['deployments', 'aiAnalysis']);

      const features = service.getArkFeatures();
      expect(features.length).toBe(4);
      expect(features).toContain('approvals');
      expect(features).toContain('exceptions');
    });
  });

  describe('getHybridModeConfig', () => {
    it('should return hybrid mode configuration', () => {
      configService.isHybridMode.and.returnValue(true);
      configService.isEnabled.and.returnValue(true);
      routingService.getEnabledAtlasFeatures.and.returnValue(['deployments']);

      const config = service.getHybridModeConfig();
      expect(config.isHybridMode).toBe(true);
      expect(config.atlasEnabled).toBe(true);
      expect(config.atlasFeatures).toEqual(['deployments']);
      expect(config.arkFeatures.length).toBe(5);
    });
  });

  describe('shouldFeatureUseAtlas', () => {
    it('should return true when feature uses ATLAS', () => {
      routingService.shouldUseAtlas.and.returnValue(true);

      expect(service.shouldFeatureUseAtlas('deployments')).toBe(true);
    });

    it('should return false when feature uses ARK', () => {
      routingService.shouldUseAtlas.and.returnValue(false);

      expect(service.shouldFeatureUseAtlas('deployments')).toBe(false);
    });
  });

  describe('shouldFeatureUseArk', () => {
    it('should return true when feature uses ARK', () => {
      routingService.shouldUseAtlas.and.returnValue(false);

      expect(service.shouldFeatureUseArk('deployments')).toBe(true);
    });

    it('should return false when feature uses ATLAS', () => {
      routingService.shouldUseAtlas.and.returnValue(true);

      expect(service.shouldFeatureUseArk('deployments')).toBe(false);
    });
  });

  describe('testAtlasConnectivity', () => {
    it('should return success when test operation succeeds', (done) => {
      routingService.shouldUseAtlas.and.returnValue(true);
      const testOp = jasmine.createSpy('testOp').and.returnValue(of('success'));

      service.testAtlasConnectivity('deployments', testOp).subscribe(result => {
        expect(result.success).toBe(true);
        done();
      });
    });

    it('should return failure when feature not configured for ATLAS', (done) => {
      routingService.shouldUseAtlas.and.returnValue(false);
      const testOp = jasmine.createSpy('testOp').and.returnValue(of('success'));

      service.testAtlasConnectivity('deployments', testOp).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('not configured');
        done();
      });
    });
  });
});
