import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AtlasFallbackService } from './atlas-fallback.service';
import { AtlasRoutingService } from './atlas-routing.service';
import { AtlasServiceLoggerService } from './atlas-service-logger.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasFallbackService', () => {
  let service: AtlasFallbackService;
  let routingService: jasmine.SpyObj<AtlasRoutingService>;
  let loggerService: jasmine.SpyObj<AtlasServiceLoggerService>;
  let configService: jasmine.SpyObj<AtlasConfigService>;

  beforeEach(() => {
    const routingServiceSpy = jasmine.createSpyObj('AtlasRoutingService', ['shouldUseAtlas']);
    const loggerServiceSpy = jasmine.createSpyObj('AtlasServiceLoggerService', [
      'logAtlasRequest',
      'logArkRequest',
      'getStatistics'
    ]);
    const configServiceSpy = jasmine.createSpyObj('AtlasConfigService', [
      'isHybridMode',
      'isEnabled'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AtlasFallbackService,
        { provide: AtlasRoutingService, useValue: routingServiceSpy },
        { provide: AtlasServiceLoggerService, useValue: loggerServiceSpy },
        { provide: AtlasConfigService, useValue: configServiceSpy }
      ]
    });

    service = TestBed.inject(AtlasFallbackService);
    routingService = TestBed.inject(AtlasRoutingService) as jasmine.SpyObj<AtlasRoutingService>;
    loggerService = TestBed.inject(AtlasServiceLoggerService) as jasmine.SpyObj<AtlasServiceLoggerService>;
    configService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('executeWithFallback', () => {
    it('should execute ATLAS operation when ATLAS is enabled', (done) => {
      routingService.shouldUseAtlas.and.returnValue(true);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', 'getDeployments', atlasOp, arkFallback)
        .subscribe(result => {
          expect(atlasOp).toHaveBeenCalled();
          expect(arkFallback).not.toHaveBeenCalled();
          expect(loggerService.logAtlasRequest).toHaveBeenCalledWith(
            'deployments',
            'getDeployments',
            true,
            jasmine.any(Number)
          );
          done();
        });
    });

    it('should fallback to ARK when ATLAS fails', (done) => {
      routingService.shouldUseAtlas.and.returnValue(true);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(
        throwError(() => new Error('ATLAS failed'))
      );
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', 'getDeployments', atlasOp, arkFallback, {
        retryAttempts: 0
      }).subscribe(result => {
        expect(atlasOp).toHaveBeenCalled();
        expect(arkFallback).toHaveBeenCalled();
        expect(loggerService.logAtlasRequest).toHaveBeenCalledWith(
          'deployments',
          'getDeployments',
          false,
          jasmine.any(Number),
          'ATLAS failed'
        );
        expect(loggerService.logArkRequest).toHaveBeenCalledWith(
          'deployments',
          'getDeployments',
          true,
          jasmine.any(Number)
        );
        done();
      });
    });

    it('should use ARK directly when ATLAS is disabled', (done) => {
      routingService.shouldUseAtlas.and.returnValue(false);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(of('atlas-result'));
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', 'getDeployments', atlasOp, arkFallback)
        .subscribe(result => {
          expect(atlasOp).not.toHaveBeenCalled();
          expect(arkFallback).toHaveBeenCalled();
          expect(loggerService.logArkRequest).toHaveBeenCalledWith(
            'deployments',
            'getDeployments',
            true,
            jasmine.any(Number)
          );
          done();
        });
    });

    it('should throw error when both ATLAS and ARK fail', (done) => {
      routingService.shouldUseAtlas.and.returnValue(true);

      const atlasOp = jasmine.createSpy('atlasOp').and.returnValue(
        throwError(() => new Error('ATLAS failed'))
      );
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(
        throwError(() => new Error('ARK failed'))
      );

      service.executeWithFallback('deployments', 'getDeployments', atlasOp, arkFallback, {
        retryAttempts: 0
      }).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('ARK failed');
          expect(loggerService.logAtlasRequest).toHaveBeenCalled();
          expect(loggerService.logArkRequest).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should retry ATLAS operation before fallback', fakeAsync(() => {
      routingService.shouldUseAtlas.and.returnValue(true);

      let attemptCount = 0;
      const atlasOp = jasmine.createSpy('atlasOp').and.callFake(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return throwError(() => new Error('ATLAS failed'));
        }
        return of('atlas-result');
      });
      const arkFallback = jasmine.createSpy('arkFallback').and.returnValue(of('ark-result'));

      service.executeWithFallback('deployments', 'getDeployments', atlasOp, arkFallback, {
        retryAttempts: 2,
        retryDelay: 100
      }).subscribe();

      tick(1000);

      expect(atlasOp).toHaveBeenCalledTimes(3);
      expect(arkFallback).not.toHaveBeenCalled();
    }));
  });

  describe('isFallbackAvailable', () => {
    it('should return true in hybrid mode', () => {
      configService.isHybridMode.and.returnValue(true);

      expect(service.isFallbackAvailable('deployments')).toBe(true);
    });

    it('should return true when ATLAS is disabled', () => {
      configService.isHybridMode.and.returnValue(false);
      configService.isEnabled.and.returnValue(false);

      expect(service.isFallbackAvailable('deployments')).toBe(true);
    });

    it('should return false when ATLAS is fully enabled', () => {
      configService.isHybridMode.and.returnValue(false);
      configService.isEnabled.and.returnValue(true);

      expect(service.isFallbackAvailable('deployments')).toBe(false);
    });
  });

  describe('getFallbackStatistics', () => {
    it('should calculate fallback statistics', () => {
      configService.isEnabled.and.returnValue(true);
      loggerService.getStatistics.and.returnValue({
        totalRequests: 10,
        atlasRequests: 7,
        arkRequests: 3,
        successfulRequests: 9,
        failedRequests: 1,
        averageDuration: 150,
        byFeature: {
          deployments: { atlas: 5, ark: 2, success: 6, failed: 1 },
          aiAnalysis: { atlas: 2, ark: 1, success: 3, failed: 0 }
        },
        byService: {
          atlas: { total: 7, success: 6, failed: 1 },
          ark: { total: 3, success: 3, failed: 0 }
        }
      });

      const stats = service.getFallbackStatistics();

      expect(stats.totalFallbacks).toBe(3);
      expect(stats.fallbacksByFeature['deployments']).toBe(2);
      expect(stats.fallbacksByFeature['aiAnalysis']).toBe(1);
      expect(stats.fallbackRate).toBe(30);
    });

    it('should return zero fallbacks when ATLAS is disabled', () => {
      configService.isEnabled.and.returnValue(false);
      loggerService.getStatistics.and.returnValue({
        totalRequests: 10,
        atlasRequests: 0,
        arkRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        averageDuration: 150,
        byFeature: {},
        byService: {
          atlas: { total: 0, success: 0, failed: 0 },
          ark: { total: 10, success: 10, failed: 0 }
        }
      });

      const stats = service.getFallbackStatistics();

      expect(stats.totalFallbacks).toBe(0);
      expect(stats.fallbackRate).toBe(0);
    });
  });
});
