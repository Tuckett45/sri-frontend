import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AtlasHealthService, HealthStatus } from './atlas-health.service';
import { AtlasTelemetryService } from './atlas-telemetry.service';

describe('AtlasHealthService', () => {
  let service: AtlasHealthService;
  let httpMock: HttpTestingController;
  let telemetryService: jasmine.SpyObj<AtlasTelemetryService>;

  beforeEach(() => {
    const telemetrySpy = jasmine.createSpyObj('AtlasTelemetryService', ['trackHealthCheck']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AtlasHealthService,
        { provide: AtlasTelemetryService, useValue: telemetrySpy }
      ]
    });

    service = TestBed.inject(AtlasHealthService);
    httpMock = TestBed.inject(HttpTestingController);
    telemetryService = TestBed.inject(AtlasTelemetryService) as jasmine.SpyObj<AtlasTelemetryService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status for successful response', (done) => {
      service.checkServiceHealth('Test Service', '/v1/test/health').subscribe(result => {
        expect(result.serviceName).toBe('Test Service');
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.responseTimeMs).toBeGreaterThan(0);
        done();
      });

      const req = httpMock.expectOne('/v1/test/health');
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'ok' }, { status: 200, statusText: 'OK' });
    });

    it('should return unhealthy status for failed response', (done) => {
      service.checkServiceHealth('Test Service', '/v1/test/health').subscribe(result => {
        expect(result.serviceName).toBe('Test Service');
        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.errorMessage).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne('/v1/test/health');
      req.flush('Service unavailable', { status: 503, statusText: 'Service Unavailable' });
    });
  });

  describe('performHealthCheck', () => {
    it('should check all services and calculate overall status', (done) => {
      service.performHealthCheck().subscribe(result => {
        expect(result.services.length).toBe(6);
        expect(result.overallStatus).toBe(HealthStatus.HEALTHY);
        expect(telemetryService.trackHealthCheck).toHaveBeenCalled();
        done();
      });

      // Mock responses for all 6 services
      const requests = httpMock.match(req => req.url.includes('/health'));
      expect(requests.length).toBe(6);
      
      requests.forEach(req => {
        req.flush({ status: 'ok' }, { status: 200, statusText: 'OK' });
      });
    });

    it('should set degraded status when some services fail', (done) => {
      service.performHealthCheck().subscribe(result => {
        expect(result.overallStatus).toBe(HealthStatus.DEGRADED);
        done();
      });

      const requests = httpMock.match(req => req.url.includes('/health'));
      
      // Make first service fail, rest succeed
      requests[0].flush('Error', { status: 500, statusText: 'Internal Server Error' });
      requests.slice(1).forEach(req => {
        req.flush({ status: 'ok' }, { status: 200, statusText: 'OK' });
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return observable of health status', (done) => {
      service.getHealthStatus().subscribe(status => {
        expect(status).toBeDefined();
        expect(status.overallStatus).toBeDefined();
        expect(status.services).toBeDefined();
        done();
      });
    });
  });

  describe('isHealthy', () => {
    it('should return false initially', () => {
      expect(service.isHealthy()).toBe(false);
    });
  });

  describe('getHealthyServiceCount', () => {
    it('should return 0 initially', () => {
      expect(service.getHealthyServiceCount()).toBe(0);
    });
  });

  describe('getUnhealthyServiceCount', () => {
    it('should return 0 initially', () => {
      expect(service.getUnhealthyServiceCount()).toBe(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should return 0 when no services checked', () => {
      expect(service.getAverageResponseTime()).toBe(0);
    });
  });
});
