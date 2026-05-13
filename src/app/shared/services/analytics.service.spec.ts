import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { environment } from 'src/environments/environments';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let routerEventsSubject: Subject<any>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockWindow: any;
  let mockDocument: any;

  beforeEach(() => {
    // Mock router
    routerEventsSubject = new Subject();
    mockRouter = jasmine.createSpyObj('Router', [], {
      events: routerEventsSubject.asObservable(),
      url: '/test-route'
    });

    // Mock window and document
    mockWindow = {
      dataLayer: [],
      gtag: jasmine.createSpy('gtag'),
      location: {
        href: 'http://localhost:4200/test-route'
      }
    };

    mockDocument = {
      title: 'Test Page',
      head: {
        appendChild: jasmine.createSpy('appendChild')
      },
      createElement: jasmine.createSpy('createElement').and.returnValue({
        async: false,
        src: ''
      }),
      querySelector: jasmine.createSpy('querySelector').and.returnValue(null)
    };

    // Set up global mocks
    (global as any).window = mockWindow;
    (global as any).document = mockDocument;

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    // Clean up
    delete (global as any).window;
    delete (global as any).document;
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize only once', () => {
      // Set up environment with tracking ID
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';

      service.initialize();
      const firstInitState = service.isEnabled();

      service.initialize();
      const secondInitState = service.isEnabled();

      expect(firstInitState).toBe(secondInitState);

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should not enable tracking if no tracking ID is configured', () => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = undefined;

      service.initialize();

      expect(service.isEnabled()).toBe(false);

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should load gtag script when initialized', () => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';

      service.initialize();

      expect(mockDocument.createElement).toHaveBeenCalledWith('script');

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should not load script if already exists', () => {
      mockDocument.querySelector.and.returnValue({ src: 'existing-script' });
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';

      service.initialize();

      expect(mockDocument.head.appendChild).not.toHaveBeenCalled();

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });
  });

  describe('page view tracking', () => {
    beforeEach(() => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';
      service.initialize();
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should track page view on navigation', (done) => {
      const testUrl = '/test-page';

      // Trigger navigation event
      routerEventsSubject.next(new NavigationEnd(1, testUrl, testUrl));

      setTimeout(() => {
        expect(mockWindow.gtag).toHaveBeenCalledWith(
          'event',
          'page_view',
          jasmine.objectContaining({
            page_path: testUrl
          })
        );
        done();
      }, 100);
    });

    it('should track page view with custom path and title', () => {
      service.trackPageView('/custom-path', 'Custom Title');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        jasmine.objectContaining({
          page_path: '/custom-path',
          page_title: 'Custom Title'
        })
      );
    });

    it('should not track page view when disabled', () => {
      service.disable();
      mockWindow.gtag.calls.reset();

      service.trackPageView('/test');

      expect(mockWindow.gtag).not.toHaveBeenCalled();
    });
  });

  describe('event tracking', () => {
    beforeEach(() => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';
      service.initialize();
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should track custom events', () => {
      service.trackEvent('test_event', { param1: 'value1' });

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'test_event',
        { param1: 'value1' }
      );
    });

    it('should track login event', () => {
      service.trackLogin('jwt');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'login',
        { method: 'jwt' }
      );
    });

    it('should track logout event', () => {
      service.trackLogout();

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'logout',
        undefined
      );
    });

    it('should track job created event', () => {
      service.trackJobCreated('HIGH', 'DALLAS');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'job_created',
        {
          job_priority: 'HIGH',
          market: 'DALLAS'
        }
      );
    });

    it('should track job updated event', () => {
      service.trackJobUpdated('COMPLETED');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'job_updated',
        { job_status: 'COMPLETED' }
      );
    });

    it('should track job deleted event', () => {
      service.trackJobDeleted();

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'job_deleted',
        undefined
      );
    });

    it('should track technician assigned event', () => {
      service.trackTechnicianAssigned('automatic');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'technician_assigned',
        { assignment_type: 'automatic' }
      );
    });

    it('should track assignment accepted event', () => {
      service.trackAssignmentAccepted();

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'assignment_accepted',
        undefined
      );
    });

    it('should track assignment rejected event', () => {
      service.trackAssignmentRejected('schedule_conflict');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'assignment_rejected',
        { rejection_reason: 'schedule_conflict' }
      );
    });

    it('should track location tracking toggle', () => {
      service.trackLocationTrackingToggle(true);

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'location_tracking_toggle',
        { enabled: true }
      );
    });

    it('should track report generated event', () => {
      service.trackReportGenerated('utilization', 'csv');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'report_generated',
        {
          report_type: 'utilization',
          export_format: 'csv'
        }
      );
    });

    it('should track map interaction', () => {
      service.trackMapInteraction('marker_click');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'map_interaction',
        { interaction_type: 'marker_click' }
      );
    });

    it('should track search event', () => {
      service.trackSearch('technician', true);

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'search',
        {
          search_type: 'technician',
          has_results: true
        }
      );
    });

    it('should track filter applied event', () => {
      service.trackFilterApplied('status', 3);

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'filter_applied',
        {
          filter_type: 'status',
          filter_count: 3
        }
      );
    });

    it('should track error event', () => {
      service.trackError('api_error', 'Failed to load data', false);

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'error',
        {
          error_type: 'api_error',
          error_message: 'Failed to load data',
          fatal: false
        }
      );
    });

    it('should track crew created event', () => {
      service.trackCrewCreated();

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'crew_created',
        undefined
      );
    });

    it('should track crew updated event', () => {
      service.trackCrewUpdated();

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'crew_updated',
        undefined
      );
    });

    it('should track offline mode event', () => {
      service.trackOfflineMode(true);

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'offline_mode',
        { enabled: true }
      );
    });

    it('should track notification interaction', () => {
      service.trackNotificationInteraction('clicked');

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'event',
        'notification_interaction',
        { action: 'clicked' }
      );
    });

    it('should not track events when disabled', () => {
      service.disable();
      mockWindow.gtag.calls.reset();

      service.trackEvent('test_event');

      expect(mockWindow.gtag).not.toHaveBeenCalled();
    });
  });

  describe('user properties', () => {
    beforeEach(() => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';
      service.initialize();
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should set user properties', () => {
      service.setUserProperties({
        user_role: 'CM',
        market: 'DALLAS'
      });

      expect(mockWindow.gtag).toHaveBeenCalledWith(
        'set',
        'user_properties',
        {
          user_role: 'CM',
          market: 'DALLAS'
        }
      );
    });

    it('should not set user properties when disabled', () => {
      service.disable();
      mockWindow.gtag.calls.reset();

      service.setUserProperties({ test: 'value' });

      expect(mockWindow.gtag).not.toHaveBeenCalled();
    });
  });

  describe('enable/disable', () => {
    it('should disable tracking', () => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';
      service.initialize();

      service.disable();

      expect(service.isEnabled()).toBe(false);

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should enable tracking', () => {
      const originalId = environment.googleAnalyticsId;
      (environment as any).googleAnalyticsId = 'G-TEST123';
      service.initialize();

      service.disable();
      service.enable();

      expect(service.isEnabled()).toBe(true);

      // Restore
      (environment as any).googleAnalyticsId = originalId;
    });

    it('should not enable tracking if not initialized', () => {
      service.enable();

      expect(service.isEnabled()).toBe(false);
    });
  });
});
