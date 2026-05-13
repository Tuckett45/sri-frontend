import { TestBed } from '@angular/core/testing';
import { AtlasSecurityLoggerService, SecurityEventType, SecurityEventSeverity } from './atlas-security-logger.service';

describe('AtlasSecurityLoggerService', () => {
  let service: AtlasSecurityLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasSecurityLoggerService);
  });

  afterEach(() => {
    service.clearEvents();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('logEvent', () => {
    it('should log a security event', () => {
      service.logEvent(
        SecurityEventType.AUTHENTICATION,
        SecurityEventSeverity.INFO,
        'Test event'
      );

      const events = service.getAllEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(SecurityEventType.AUTHENTICATION);
      expect(events[0].severity).toBe(SecurityEventSeverity.INFO);
      expect(events[0].message).toBe('Test event');
    });

    it('should include event details', () => {
      service.logEvent(
        SecurityEventType.AUTHORIZATION,
        SecurityEventSeverity.WARNING,
        'Access denied',
        {
          userId: 'user123',
          sessionId: 'session456',
          resource: '/api/data',
          action: 'READ'
        }
      );

      const events = service.getAllEvents();
      expect(events[0].userId).toBe('user123');
      expect(events[0].sessionId).toBe('session456');
      expect(events[0].resource).toBe('/api/data');
      expect(events[0].action).toBe('READ');
    });

    it('should generate unique event IDs', () => {
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 1');
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 2');

      const events = service.getAllEvents();
      expect(events[0].id).not.toBe(events[1].id);
    });

    it('should include timestamp', () => {
      const before = new Date();
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Test');
      const after = new Date();

      const events = service.getAllEvents();
      expect(events[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(events[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('specific event logging methods', () => {
    it('should log authentication events', () => {
      service.logAuthentication(true, 'user123', 'session456');
      
      const events = service.getAllEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe(SecurityEventType.AUTHENTICATION);
      expect(events[0].userId).toBe('user123');
    });

    it('should log authorization events', () => {
      service.logAuthorization(false, '/api/admin', 'DELETE', 'user123', 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.AUTHORIZATION);
      expect(events[0].resource).toBe('/api/admin');
      expect(events[0].action).toBe('DELETE');
    });

    it('should log token refresh events', () => {
      service.logTokenRefresh(true, 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.TOKEN_REFRESH);
    });

    it('should log token rotation events', () => {
      service.logTokenRotation(true, 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.TOKEN_ROTATION);
    });

    it('should log token revocation events', () => {
      service.logTokenRevocation('session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.TOKEN_REVOCATION);
    });

    it('should log access denied events', () => {
      service.logAccessDenied('/api/secret', 'READ', 'user123', 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.ACCESS_DENIED);
      expect(events[0].severity).toBe(SecurityEventSeverity.WARNING);
    });

    it('should log invalid input events', () => {
      service.logInvalidInput('email', 'Invalid format');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.INVALID_INPUT);
    });

    it('should log malicious content detection', () => {
      service.logMaliciousContent('XSS', '<script>alert("xss")</script>', 'user input');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.XSS_ATTEMPT);
      expect(events[0].severity).toBe(SecurityEventSeverity.CRITICAL);
    });

    it('should log SSRF attempts', () => {
      service.logSsrfAttempt('http://localhost:8080', 'Private IP blocked');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.SSRF_ATTEMPT);
      expect(events[0].severity).toBe(SecurityEventSeverity.CRITICAL);
    });

    it('should log rate limit exceeded events', () => {
      service.logRateLimitExceeded('/api/data', 'user123', 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
    });

    it('should log session expired events', () => {
      service.logSessionExpired('session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.SESSION_EXPIRED);
    });

    it('should log configuration changes', () => {
      service.logConfigurationChange('apiUrl', 'old-url', 'new-url', 'admin123');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.CONFIGURATION_CHANGE);
    });

    it('should log API errors', () => {
      const error = new Error('API failed');
      service.logApiError('/api/data', 500, error, 'user123', 'session456');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.API_ERROR);
      expect(events[0].severity).toBe(SecurityEventSeverity.ERROR);
    });

    it('should log validation failures', () => {
      service.logValidationFailure('schema', ['Field required', 'Invalid type'], '/api/data');
      
      const events = service.getAllEvents();
      expect(events[0].type).toBe(SecurityEventType.VALIDATION_FAILURE);
    });
  });

  describe('event retrieval', () => {
    beforeEach(() => {
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 1');
      service.logEvent(SecurityEventType.AUTHORIZATION, SecurityEventSeverity.WARNING, 'Event 2');
      service.logEvent(SecurityEventType.XSS_ATTEMPT, SecurityEventSeverity.CRITICAL, 'Event 3');
    });

    it('should get all events', () => {
      const events = service.getAllEvents();
      expect(events.length).toBe(3);
    });

    it('should get events by type', () => {
      const authEvents = service.getEventsByType(SecurityEventType.AUTHENTICATION);
      expect(authEvents.length).toBe(1);
      expect(authEvents[0].message).toBe('Event 1');
    });

    it('should get events by severity', () => {
      const criticalEvents = service.getEventsBySeverity(SecurityEventSeverity.CRITICAL);
      expect(criticalEvents.length).toBe(1);
      expect(criticalEvents[0].message).toBe('Event 3');
    });

    it('should get recent events', () => {
      const recentEvents = service.getRecentEvents(2);
      expect(recentEvents.length).toBe(2);
      expect(recentEvents[1].message).toBe('Event 3');
    });

    it('should get critical events', () => {
      const criticalEvents = service.getCriticalEvents();
      expect(criticalEvents.length).toBe(1);
      expect(criticalEvents[0].severity).toBe(SecurityEventSeverity.CRITICAL);
    });
  });

  describe('statistics', () => {
    it('should provide event statistics', (done) => {
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 1');
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 2');
      service.logEvent(SecurityEventType.XSS_ATTEMPT, SecurityEventSeverity.CRITICAL, 'Event 3');

      service.stats$.subscribe(stats => {
        expect(stats.totalEvents).toBe(3);
        expect(stats.eventsByType[SecurityEventType.AUTHENTICATION]).toBe(2);
        expect(stats.eventsByType[SecurityEventType.XSS_ATTEMPT]).toBe(1);
        expect(stats.eventsBySeverity[SecurityEventSeverity.INFO]).toBe(2);
        expect(stats.eventsBySeverity[SecurityEventSeverity.CRITICAL]).toBe(1);
        done();
      });
    });
  });

  describe('event management', () => {
    it('should clear all events', () => {
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 1');
      service.logEvent(SecurityEventType.AUTHORIZATION, SecurityEventSeverity.WARNING, 'Event 2');

      expect(service.getAllEvents().length).toBe(2);

      service.clearEvents();
      expect(service.getAllEvents().length).toBe(0);
    });

    it('should export events as JSON', () => {
      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Event 1');
      
      const json = service.exportEvents();
      expect(json).toBeTruthy();
      
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });

  describe('observables', () => {
    it('should emit events through observable', (done) => {
      service.events$.subscribe(events => {
        if (events.length > 0) {
          expect(events.length).toBe(1);
          expect(events[0].message).toBe('Test event');
          done();
        }
      });

      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Test event');
    });

    it('should emit stats through observable', (done) => {
      service.stats$.subscribe(stats => {
        if (stats.totalEvents > 0) {
          expect(stats.totalEvents).toBe(1);
          done();
        }
      });

      service.logEvent(SecurityEventType.AUTHENTICATION, SecurityEventSeverity.INFO, 'Test event');
    });
  });
});
