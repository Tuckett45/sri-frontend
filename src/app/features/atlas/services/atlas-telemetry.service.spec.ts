import { TestBed } from '@angular/core/testing';
import { AtlasTelemetryService, TelemetryEventType } from './atlas-telemetry.service';

describe('AtlasTelemetryService', () => {
  let service: AtlasTelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasTelemetryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackApiRequest', () => {
    it('should emit telemetry event for API request', (done) => {
      service.getTelemetryEvents().subscribe(event => {
        expect(event.eventType).toBe(TelemetryEventType.API_REQUEST);
        expect(event.data.endpoint).toBe('/v1/deployments');
        expect(event.data.method).toBe('GET');
        done();
      });

      service.trackApiRequest('/v1/deployments', 'GET');
    });
  });

  describe('trackApiResponse', () => {
    it('should track successful API response', (done) => {
      service.getTelemetryEvents().subscribe(event => {
        if (event.eventType === TelemetryEventType.API_RESPONSE) {
          expect(event.data.endpoint).toBe('/v1/deployments');
          expect(event.data.statusCode).toBe(200);
          expect(event.data.success).toBe(true);
          expect(event.data.responseTimeMs).toBe(150);
          done();
        }
      });

      service.trackApiResponse('/v1/deployments', 'GET', 200, 150);
    });

    it('should track failed API response', (done) => {
      service.getTelemetryEvents().subscribe(event => {
        if (event.eventType === TelemetryEventType.API_RESPONSE) {
          expect(event.data.success).toBe(false);
          expect(event.data.statusCode).toBe(500);
          done();
        }
      });

      service.trackApiResponse('/v1/deployments', 'GET', 500, 200);
    });
  });

  describe('trackApiError', () => {
    it('should track API error', (done) => {
      service.getTelemetryEvents().subscribe(event => {
        if (event.eventType === TelemetryEventType.API_ERROR) {
          expect(event.data.endpoint).toBe('/v1/deployments');
          expect(event.data.success).toBe(false);
          expect(event.data.errorMessage).toBe('Network error');
          done();
        }
      });

      service.trackApiError('/v1/deployments', 'GET', 'Network error', 100);
    });
  });

  describe('getAggregatedMetrics', () => {
    beforeEach(() => {
      service.clearMetrics();
    });

    it('should calculate aggregated metrics correctly', () => {
      service.trackApiResponse('/v1/deployments', 'GET', 200, 100);
      service.trackApiResponse('/v1/deployments', 'GET', 200, 150);
      service.trackApiResponse('/v1/deployments', 'GET', 500, 200);

      const metrics = service.getAggregatedMetrics('/v1/deployments');
      
      expect(metrics.length).toBe(1);
      expect(metrics[0].totalRequests).toBe(3);
      expect(metrics[0].successfulRequests).toBe(2);
      expect(metrics[0].failedRequests).toBe(1);
      expect(metrics[0].successRate).toBeCloseTo(66.67, 1);
      expect(metrics[0].averageResponseTimeMs).toBeCloseTo(150, 0);
    });

    it('should return empty array when no metrics', () => {
      const metrics = service.getAggregatedMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('getSuccessRate', () => {
    beforeEach(() => {
      service.clearMetrics();
    });

    it('should calculate success rate correctly', () => {
      service.trackApiResponse('/v1/deployments', 'GET', 200, 100);
      service.trackApiResponse('/v1/deployments', 'GET', 200, 150);
      service.trackApiResponse('/v1/deployments', 'GET', 500, 200);

      const successRate = service.getSuccessRate('/v1/deployments');
      expect(successRate).toBeCloseTo(66.67, 1);
    });

    it('should return 100 when no metrics', () => {
      const successRate = service.getSuccessRate();
      expect(successRate).toBe(100);
    });
  });

  describe('getAverageResponseTime', () => {
    beforeEach(() => {
      service.clearMetrics();
    });

    it('should calculate average response time correctly', () => {
      service.trackApiResponse('/v1/deployments', 'GET', 200, 100);
      service.trackApiResponse('/v1/deployments', 'GET', 200, 200);
      service.trackApiResponse('/v1/deployments', 'GET', 200, 300);

      const avgTime = service.getAverageResponseTime('/v1/deployments');
      expect(avgTime).toBe(200);
    });

    it('should return 0 when no metrics', () => {
      const avgTime = service.getAverageResponseTime();
      expect(avgTime).toBe(0);
    });
  });

  describe('exportMetrics', () => {
    beforeEach(() => {
      service.clearMetrics();
    });

    it('should export all metrics and aggregated data', () => {
      service.trackApiResponse('/v1/deployments', 'GET', 200, 100);
      service.trackApiResponse('/v1/deployments', 'POST', 201, 150);

      const exported = service.exportMetrics();
      
      expect(exported.metrics.length).toBe(2);
      expect(exported.aggregated.length).toBe(1);
      expect(exported.exportedAt).toBeInstanceOf(Date);
    });
  });
});
