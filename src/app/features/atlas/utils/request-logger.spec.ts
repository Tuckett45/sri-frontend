import { RequestLogger, LogExportFormat, enableDebugMode, disableDebugMode } from './request-logger';
import { HttpRequest, HttpResponse, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

describe('RequestLogger', () => {
  let logger: RequestLogger;

  beforeEach(() => {
    logger = new RequestLogger();
  });

  describe('logRequest', () => {
    it('should log HTTP request', () => {
      const request = new HttpRequest('GET', '/api/test', null, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' })
      });

      const id = logger.logRequest(request);

      expect(id).toBeTruthy();
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].method).toBe('GET');
      expect(logs[0].url).toBe('/api/test');
    });

    it('should sanitize authorization header', () => {
      const request = new HttpRequest('GET', '/api/test', null, {
        headers: new HttpHeaders({ 'Authorization': 'Bearer secret-token' })
      });

      logger.logRequest(request);
      const logs = logger.getLogs();

      expect(logs[0].headers['Authorization']).toBe('[REDACTED]');
    });

    it('should sanitize sensitive body fields', () => {
      const body = { username: 'user', password: 'secret123' };
      const request = new HttpRequest('POST', '/api/login', body);

      logger.logRequest(request);
      const logs = logger.getLogs();

      expect(logs[0].body.password).toBe('[REDACTED]');
      expect(logs[0].body.username).toBe('user');
    });

    it('should not log when disabled', () => {
      logger.setEnabled(false);
      const request = new HttpRequest('GET', '/api/test');

      logger.logRequest(request);

      expect(logger.getLogs().length).toBe(0);
    });
  });

  describe('logResponse', () => {
    it('should log HTTP response', () => {
      const request = new HttpRequest('GET', '/api/test');
      const id = logger.logRequest(request);

      const response = new HttpResponse({
        status: 200,
        body: { data: 'test' }
      });

      logger.logResponse(id, response, 150);
      const logs = logger.getLogs();

      expect(logs[0].status).toBe(200);
      expect(logs[0].duration).toBe(150);
      expect(logs[0].response).toEqual({ data: 'test' });
    });
  });

  describe('logError', () => {
    it('should log HTTP error', () => {
      const request = new HttpRequest('GET', '/api/test');
      const id = logger.logRequest(request);

      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Server error' }
      });

      logger.logError(id, error, 200);
      const logs = logger.getLogs();

      expect(logs[0].status).toBe(500);
      expect(logs[0].duration).toBe(200);
      expect(logs[0].error).toBeDefined();
      expect(logs[0].error.status).toBe(500);
    });
  });

  describe('getFilteredLogs', () => {
    beforeEach(() => {
      // Create test logs
      const request1 = new HttpRequest('GET', '/api/users');
      const id1 = logger.logRequest(request1);
      logger.logResponse(id1, new HttpResponse({ status: 200 }), 100);

      const request2 = new HttpRequest('POST', '/api/users');
      const id2 = logger.logRequest(request2);
      logger.logResponse(id2, new HttpResponse({ status: 201 }), 150);

      const request3 = new HttpRequest('GET', '/api/products');
      const id3 = logger.logRequest(request3);
      logger.logError(id3, new HttpErrorResponse({ status: 404 }), 50);
    });

    it('should filter by method', () => {
      const filtered = logger.getFilteredLogs({ method: ['GET'] });

      expect(filtered.length).toBe(2);
      expect(filtered.every(log => log.method === 'GET')).toBe(true);
    });

    it('should filter by status', () => {
      const filtered = logger.getFilteredLogs({ status: [200] });

      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe(200);
    });

    it('should filter by URL pattern', () => {
      const filtered = logger.getFilteredLogs({ urlPattern: /users/ });

      expect(filtered.length).toBe(2);
      expect(filtered.every(log => log.url.includes('users'))).toBe(true);
    });

    it('should filter by error status', () => {
      const filtered = logger.getFilteredLogs({ hasError: true });

      expect(filtered.length).toBe(1);
      expect(filtered[0].error).toBeDefined();
    });
  });

  describe('exportLogs', () => {
    beforeEach(() => {
      const request = new HttpRequest('GET', '/api/test');
      const id = logger.logRequest(request);
      logger.logResponse(id, new HttpResponse({ status: 200, body: { data: 'test' } }), 100);
    });

    it('should export as JSON', () => {
      const exported = logger.exportLogs(LogExportFormat.JSON);

      expect(exported).toContain('/api/test');
      expect(exported).toContain('GET');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export as CSV', () => {
      const exported = logger.exportLogs(LogExportFormat.CSV);

      expect(exported).toContain('ID,Timestamp,Method,URL');
      expect(exported).toContain('GET');
      expect(exported).toContain('/api/test');
    });

    it('should export as HAR', () => {
      const exported = logger.exportLogs(LogExportFormat.HAR);

      expect(exported).toContain('log');
      expect(exported).toContain('entries');
      const parsed = JSON.parse(exported);
      expect(parsed.log.version).toBe('1.2');
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      const request1 = new HttpRequest('GET', '/api/test1');
      const id1 = logger.logRequest(request1);
      logger.logResponse(id1, new HttpResponse({ status: 200 }), 100);

      const request2 = new HttpRequest('POST', '/api/test2');
      const id2 = logger.logRequest(request2);
      logger.logResponse(id2, new HttpResponse({ status: 201 }), 150);

      const request3 = new HttpRequest('GET', '/api/test3');
      const id3 = logger.logRequest(request3);
      logger.logError(id3, new HttpErrorResponse({ status: 500 }), 50);
    });

    it('should calculate statistics', () => {
      const stats = logger.getStatistics();

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageDuration).toBe(100);
      expect(stats.methodCounts['GET']).toBe(2);
      expect(stats.methodCounts['POST']).toBe(1);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      const request = new HttpRequest('GET', '/api/test');
      logger.logRequest(request);

      expect(logger.getLogs().length).toBe(1);

      logger.clearLogs();

      expect(logger.getLogs().length).toBe(0);
    });
  });
});

describe('Debug Mode', () => {
  it('should enable debug mode', () => {
    enableDebugMode();
    expect((window as any).__ATLAS_DEBUG__).toBe(true);
  });

  it('should disable debug mode', () => {
    disableDebugMode();
    expect((window as any).__ATLAS_DEBUG__).toBe(false);
  });
});
