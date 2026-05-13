import { ErrorReproducer, initializeErrorTracking } from './error-reproducer';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorReproducer', () => {
  let reproducer: ErrorReproducer;

  beforeEach(() => {
    reproducer = new ErrorReproducer();
  });

  describe('captureError', () => {
    it('should capture JavaScript error', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10';

      const id = reproducer.captureError(error);

      expect(id).toBeTruthy();
      const contexts = reproducer.getAllContexts();
      expect(contexts.length).toBe(1);
      expect(contexts[0].error.message).toBe('Test error');
      expect(contexts[0].error.type).toBe('Error');
      expect(contexts[0].error.stack).toBeDefined();
    });

    it('should capture HTTP error', () => {
      const httpError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'Server error' }
      });

      const id = reproducer.captureError(httpError);

      const context = reproducer.getContext(id);
      expect(context).toBeDefined();
      expect(context!.error.type).toBe('HttpError');
      expect(context!.error.httpStatus).toBe(500);
    });

    it('should capture environment information', () => {
      const error = new Error('Test error');

      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.environment).toBeDefined();
      expect(context!.environment.userAgent).toBeTruthy();
      expect(context!.environment.platform).toBeTruthy();
      expect(context!.environment.url).toBeTruthy();
    });

    it('should include user actions in context', () => {
      reproducer.trackUserAction('click', 'button', { id: 'submit-btn' });
      reproducer.trackUserAction('input', 'text-field', { value: 'test' });

      const error = new Error('Test error');
      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.userActions).toBeDefined();
      expect(context!.userActions!.length).toBe(2);
      expect(context!.userActions![0].type).toBe('click');
      expect(context!.userActions![1].type).toBe('input');
    });
  });

  describe('trackUserAction', () => {
    it('should track user action', () => {
      reproducer.trackUserAction('click', 'button', { id: 'test-btn' });

      const error = new Error('Test');
      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.userActions!.length).toBe(1);
      expect(context!.userActions![0].type).toBe('click');
      expect(context!.userActions![0].target).toBe('button');
    });

    it('should maintain max user actions', () => {
      for (let i = 0; i < 60; i++) {
        reproducer.trackUserAction('click', `button-${i}`);
      }

      const error = new Error('Test');
      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.userActions!.length).toBe(50);
    });

    it('should not track when disabled', () => {
      reproducer.setTrackingEnabled(false);
      reproducer.trackUserAction('click', 'button');

      const error = new Error('Test');
      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.userActions!.length).toBe(0);
    });
  });

  describe('generateReproductionScript', () => {
    it('should generate reproduction script', () => {
      reproducer.trackUserAction('click', 'login-button');
      reproducer.trackUserAction('input', 'username-field', { value: 'testuser' });

      const error = new Error('Login failed');
      const id = reproducer.captureError(error);

      const script = reproducer.generateReproductionScript(id);

      expect(script).toBeDefined();
      expect(script!.steps.length).toBeGreaterThan(0);
      expect(script!.steps[0].action).toBe('navigate');
      expect(script!.actualResult).toBe('Login failed');
    });

    it('should include request log in script', () => {
      const requestLog = {
        id: 'req-1',
        timestamp: new Date(),
        method: 'POST',
        url: '/api/login',
        headers: {},
        body: { username: 'test' }
      };

      const error = new Error('Request failed');
      const id = reproducer.captureError(error, undefined, requestLog);

      const script = reproducer.generateReproductionScript(id);

      expect(script).toBeDefined();
      const apiStep = script!.steps.find(s => s.action === 'api_request');
      expect(apiStep).toBeDefined();
      expect(apiStep!.data.method).toBe('POST');
      expect(apiStep!.data.url).toBe('/api/login');
    });

    it('should return null for invalid context ID', () => {
      const script = reproducer.generateReproductionScript('invalid-id');

      expect(script).toBeNull();
    });
  });

  describe('exportContext', () => {
    it('should export error context as JSON', () => {
      const error = new Error('Test error');
      const id = reproducer.captureError(error);

      const exported = reproducer.exportContext(id);

      expect(exported).toBeTruthy();
      const parsed = JSON.parse(exported!);
      expect(parsed.id).toBe(id);
      expect(parsed.error.message).toBe('Test error');
    });

    it('should return null for invalid context ID', () => {
      const exported = reproducer.exportContext('invalid-id');

      expect(exported).toBeNull();
    });
  });

  describe('exportReproductionScript', () => {
    it('should export reproduction script as markdown', () => {
      reproducer.trackUserAction('click', 'button');
      const error = new Error('Test error');
      const id = reproducer.captureError(error);

      const markdown = reproducer.exportReproductionScript(id);

      expect(markdown).toBeTruthy();
      expect(markdown).toContain('# Error Reproduction Script');
      expect(markdown).toContain('Test error');
      expect(markdown).toContain('## Reproduction Steps');
      expect(markdown).toContain('## Expected Result');
      expect(markdown).toContain('## Actual Result');
    });

    it('should include stack trace in export', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10';
      const id = reproducer.captureError(error);

      const markdown = reproducer.exportReproductionScript(id);

      expect(markdown).toContain('## Stack Trace');
      expect(markdown).toContain('test.ts:10');
    });
  });

  describe('searchContexts', () => {
    beforeEach(() => {
      reproducer.captureError(new Error('Network error'));
      reproducer.captureError(new Error('Validation error'));
      reproducer.captureError(new Error('Authentication failed'));
    });

    it('should search by error message', () => {
      const results = reproducer.searchContexts('network');

      expect(results.length).toBe(1);
      expect(results[0].error.message).toContain('Network');
    });

    it('should search case-insensitively', () => {
      const results = reproducer.searchContexts('VALIDATION');

      expect(results.length).toBe(1);
      expect(results[0].error.message).toContain('Validation');
    });

    it('should return empty array for no matches', () => {
      const results = reproducer.searchContexts('nonexistent');

      expect(results.length).toBe(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      reproducer.captureError(new Error('Error 1'));
      reproducer.captureError(new Error('Error 2'));
      reproducer.captureError(new HttpErrorResponse({ status: 500 }));
    });

    it('should calculate error statistics', () => {
      const stats = reproducer.getStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.jsErrors).toBe(2);
      expect(stats.httpErrors).toBe(1);
      expect(stats.errorsByType['Error']).toBe(2);
      expect(stats.errorsByType['HttpError']).toBe(1);
    });
  });

  describe('clearContexts', () => {
    it('should clear all error contexts', () => {
      reproducer.captureError(new Error('Test'));
      expect(reproducer.getAllContexts().length).toBe(1);

      reproducer.clearContexts();

      expect(reproducer.getAllContexts().length).toBe(0);
    });
  });

  describe('clearUserActions', () => {
    it('should clear all user actions', () => {
      reproducer.trackUserAction('click', 'button');
      reproducer.clearUserActions();

      const error = new Error('Test');
      const id = reproducer.captureError(error);
      const context = reproducer.getContext(id);

      expect(context!.userActions!.length).toBe(0);
    });
  });
});
