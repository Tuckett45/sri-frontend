import { TestBed } from '@angular/core/testing';
import { AtlasServiceLoggerService, ServiceRoutingLogEntry } from './atlas-service-logger.service';

describe('AtlasServiceLoggerService', () => {
  let service: AtlasServiceLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AtlasServiceLoggerService]
    });
    service = TestBed.inject(AtlasServiceLoggerService);
    service.clearLogs();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('logServiceRouting', () => {
    it('should log service routing event', () => {
      const entry: ServiceRoutingLogEntry = {
        timestamp: new Date(),
        featureName: 'deployments',
        service: 'ATLAS',
        operation: 'getDeployments',
        success: true,
        duration: 150
      };

      service.logServiceRouting(entry);

      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0]).toEqual(entry);
    });

    it('should add timestamp if not provided', () => {
      const entry: ServiceRoutingLogEntry = {
        timestamp: undefined as any,
        featureName: 'deployments',
        service: 'ATLAS',
        operation: 'getDeployments',
        success: true
      };

      service.logServiceRouting(entry);

      const logs = service.getLogs();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('logAtlasRequest', () => {
    it('should log ATLAS request', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true, 150);

      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('ATLAS');
      expect(logs[0].featureName).toBe('deployments');
      expect(logs[0].operation).toBe('getDeployments');
      expect(logs[0].success).toBe(true);
      expect(logs[0].duration).toBe(150);
    });

    it('should log ATLAS request with error', () => {
      service.logAtlasRequest('deployments', 'getDeployments', false, 150, 'Network error');

      const logs = service.getLogs();
      expect(logs[0].success).toBe(false);
      expect(logs[0].error).toBe('Network error');
    });
  });

  describe('logArkRequest', () => {
    it('should log ARK request', () => {
      service.logArkRequest('deployments', 'getDeployments', true, 100);

      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('ARK');
      expect(logs[0].featureName).toBe('deployments');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      service.logAtlasRequest('deployments', 'getDeployments', true, 150);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', false, 200, 'Error');
      service.logAtlasRequest('deployments', 'createDeployment', true, 180);
    });

    it('should return all logs', () => {
      const logs = service.getLogs();
      expect(logs.length).toBe(3);
    });

    it('should filter by feature name', () => {
      const logs = service.getLogs({ featureName: 'deployments' });
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.featureName === 'deployments')).toBe(true);
    });

    it('should filter by service', () => {
      const logs = service.getLogs({ service: 'ATLAS' });
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.service === 'ATLAS')).toBe(true);
    });

    it('should filter by success', () => {
      const logs = service.getLogs({ success: false });
      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(false);
    });

    it('should limit results', () => {
      const logs = service.getLogs({ limit: 2 });
      expect(logs.length).toBe(2);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      service.logAtlasRequest('deployments', 'getDeployments', true, 150);
      service.logAtlasRequest('deployments', 'createDeployment', false, 200, 'Error');
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true, 180);
      service.logArkRequest('approvals', 'getApprovals', true, 120);
    });

    it('should calculate statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalRequests).toBe(4);
      expect(stats.atlasRequests).toBe(2);
      expect(stats.arkRequests).toBe(2);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageDuration).toBe(162.5);
    });

    it('should calculate statistics by feature', () => {
      const stats = service.getStatistics();

      expect(stats.byFeature['deployments'].atlas).toBe(2);
      expect(stats.byFeature['deployments'].success).toBe(1);
      expect(stats.byFeature['deployments'].failed).toBe(1);
      expect(stats.byFeature['aiAnalysis'].ark).toBe(1);
    });

    it('should calculate statistics by service', () => {
      const stats = service.getStatistics();

      expect(stats.byService.atlas.total).toBe(2);
      expect(stats.byService.atlas.success).toBe(1);
      expect(stats.byService.atlas.failed).toBe(1);
      expect(stats.byService.ark.total).toBe(2);
      expect(stats.byService.ark.success).toBe(2);
      expect(stats.byService.ark.failed).toBe(0);
    });

    it('should filter statistics by feature', () => {
      const stats = service.getStatistics({ featureName: 'deployments' });

      expect(stats.totalRequests).toBe(2);
      expect(stats.atlasRequests).toBe(2);
      expect(stats.arkRequests).toBe(0);
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logAtlasRequest('deployments', 'createDeployment', false, undefined, 'Error 1');
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', false, undefined, 'Error 2');

      const errors = service.getRecentErrors();
      expect(errors.length).toBe(2);
      expect(errors.every(log => !log.success)).toBe(true);
    });

    it('should limit error results', () => {
      for (let i = 0; i < 10; i++) {
        service.logAtlasRequest('deployments', 'op', false, undefined, `Error ${i}`);
      }

      const errors = service.getRecentErrors(5);
      expect(errors.length).toBe(5);
    });
  });

  describe('getFeatureLogs', () => {
    it('should return logs for specific feature', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);
      service.logAtlasRequest('deployments', 'createDeployment', true);

      const logs = service.getFeatureLogs('deployments');
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.featureName === 'deployments')).toBe(true);
    });
  });

  describe('getServiceLogs', () => {
    it('should return logs for specific service', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);
      service.logAtlasRequest('approvals', 'getApprovals', true);

      const logs = service.getServiceLogs('ATLAS');
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.service === 'ATLAS')).toBe(true);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);

      expect(service.getLogs().length).toBe(2);

      service.clearLogs();

      expect(service.getLogs().length).toBe(0);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);

      const json = service.exportLogs();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should export filtered logs', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);

      const json = service.exportLogs({ service: 'ATLAS' });
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(1);
      expect(parsed[0].service).toBe('ATLAS');
    });
  });

  describe('getLogSummary', () => {
    it('should return log summary', () => {
      service.logAtlasRequest('deployments', 'getDeployments', true);
      service.logAtlasRequest('deployments', 'createDeployment', false, undefined, 'Error');
      service.logArkRequest('aiAnalysis', 'analyzeDeployment', true);

      const summary = service.getLogSummary();

      expect(summary.totalLogs).toBe(3);
      expect(summary.atlasUsage).toBe(2);
      expect(summary.arkUsage).toBe(1);
      expect(summary.successRate).toBeCloseTo(66.67, 1);
      expect(summary.recentErrors).toBe(1);
    });
  });
});
