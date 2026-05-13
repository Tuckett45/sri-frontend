import { TestBed } from '@angular/core/testing';
import { AtlasStateLoggerService, LogLevel } from './atlas-state-logger.service';
import { AtlasTelemetryService } from './atlas-telemetry.service';

describe('AtlasStateLoggerService', () => {
  let service: AtlasStateLoggerService;
  let telemetryService: jasmine.SpyObj<AtlasTelemetryService>;

  beforeEach(() => {
    const telemetrySpy = jasmine.createSpyObj('AtlasTelemetryService', ['trackStateTransition']);

    TestBed.configureTestingModule({
      providers: [
        AtlasStateLoggerService,
        { provide: AtlasTelemetryService, useValue: telemetrySpy }
      ]
    });

    service = TestBed.inject(AtlasStateLoggerService);
    telemetryService = TestBed.inject(AtlasTelemetryService) as jasmine.SpyObj<AtlasTelemetryService>;
    
    // Disable console logging for tests
    service.setConsoleLogging(false);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('logStateTransition', () => {
    it('should log state transition', () => {
      const fromState = { status: 'DRAFT' };
      const toState = { status: 'SUBMITTED' };

      service.logStateTransition('Deployments', 'SUBMIT', fromState, toState);

      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].feature).toBe('Deployments');
      expect(logs[0].action).toBe('SUBMIT');
      expect(logs[0].fromState).toEqual(fromState);
      expect(logs[0].toState).toEqual(toState);
      expect(telemetryService.trackStateTransition).toHaveBeenCalled();
    });

    it('should log with custom level', () => {
      service.logStateTransition('Deployments', 'ERROR', undefined, undefined, {}, LogLevel.ERROR);

      const logs = service.getLogs();
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('logDeploymentTransition', () => {
    it('should log deployment transition with deployment ID', () => {
      service.logDeploymentTransition('CREATE', 'dep-123', undefined, { id: 'dep-123' });

      const logs = service.getLogs();
      expect(logs[0].feature).toBe('Deployments');
      expect(logs[0].metadata?.deploymentId).toBe('dep-123');
    });
  });

  describe('logError', () => {
    it('should log error with error details', () => {
      const error = new Error('Test error');
      service.logError('Deployments', 'LOAD_FAILED', error);

      const logs = service.getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].metadata?.error).toBe('Test error');
    });
  });

  describe('logWarning', () => {
    it('should log warning with message', () => {
      service.logWarning('Deployments', 'SLOW_RESPONSE', 'Response took longer than expected');

      const logs = service.getLogs({ level: LogLevel.WARN });
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].metadata?.warning).toBe('Response took longer than expected');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'ACTION1');
      service.logStateTransition('AI Analysis', 'ACTION2');
      service.logError('Deployments', 'ERROR1', new Error('Test'));
    });

    it('should return all logs when no filter', () => {
      const logs = service.getLogs();
      expect(logs.length).toBe(3);
    });

    it('should filter by feature', () => {
      const logs = service.getLogs({ feature: 'Deployments' });
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.feature === 'Deployments')).toBe(true);
    });

    it('should filter by level', () => {
      const logs = service.getLogs({ level: LogLevel.ERROR });
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('getFeatureLogs', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'ACTION1');
      service.logStateTransition('Deployments', 'ACTION2');
      service.logStateTransition('AI Analysis', 'ACTION3');
    });

    it('should return logs for specific feature', () => {
      const logs = service.getFeatureLogs('Deployments');
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.feature === 'Deployments')).toBe(true);
    });
  });

  describe('getErrorLogs', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'ACTION1');
      service.logError('Deployments', 'ERROR1', new Error('Test'));
      service.logError('AI Analysis', 'ERROR2', new Error('Test'));
    });

    it('should return only error logs', () => {
      const logs = service.getErrorLogs();
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.level === LogLevel.ERROR)).toBe(true);
    });
  });

  describe('searchByAction', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'LOAD_SUCCESS');
      service.logStateTransition('Deployments', 'LOAD_FAILURE');
      service.logStateTransition('Deployments', 'CREATE_SUCCESS');
    });

    it('should search logs by action', () => {
      const logs = service.searchByAction('LOAD');
      expect(logs.length).toBe(2);
      expect(logs.every(log => log.action.includes('LOAD'))).toBe(true);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'ACTION1');
      service.logStateTransition('Deployments', 'ACTION2');
      service.logStateTransition('AI Analysis', 'ACTION3');
      service.logError('Deployments', 'ERROR1', new Error('Test'));
      service.logWarning('AI Analysis', 'WARN1', 'Warning');
    });

    it('should return correct statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalLogs).toBe(5);
      expect(stats.byFeature['Deployments']).toBe(3);
      expect(stats.byFeature['AI Analysis']).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.warningCount).toBe(1);
    });
  });

  describe('exportLogs', () => {
    beforeEach(() => {
      service.clearLogs();
      service.logStateTransition('Deployments', 'ACTION1');
      service.logStateTransition('AI Analysis', 'ACTION2');
    });

    it('should export all logs with metadata', () => {
      const exported = service.exportLogs();
      
      expect(exported.logs.length).toBe(2);
      expect(exported.totalCount).toBe(2);
      expect(exported.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      service.logStateTransition('Deployments', 'ACTION1');
      expect(service.getLogs().length).toBe(1);

      service.clearLogs();
      expect(service.getLogs().length).toBe(0);
    });
  });
});
