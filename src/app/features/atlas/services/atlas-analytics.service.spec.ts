import { TestBed } from '@angular/core/testing';
import { AtlasAnalyticsService, InteractionType } from './atlas-analytics.service';
import { AtlasTelemetryService } from './atlas-telemetry.service';

describe('AtlasAnalyticsService', () => {
  let service: AtlasAnalyticsService;
  let telemetryService: jasmine.SpyObj<AtlasTelemetryService>;

  beforeEach(() => {
    const telemetrySpy = jasmine.createSpyObj('AtlasTelemetryService', ['trackUserInteraction']);

    TestBed.configureTestingModule({
      providers: [
        AtlasAnalyticsService,
        { provide: AtlasTelemetryService, useValue: telemetrySpy }
      ]
    });

    service = TestBed.inject(AtlasAnalyticsService);
    telemetryService = TestBed.inject(AtlasTelemetryService) as jasmine.SpyObj<AtlasTelemetryService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackInteraction', () => {
    it('should track user interaction', () => {
      service.trackInteraction(
        InteractionType.CLICK,
        'Deployments',
        'Create Deployment',
        { test: 'data' },
        'create-btn'
      );

      const interactions = service.getInteractions();
      expect(interactions.length).toBe(1);
      expect(interactions[0].type).toBe(InteractionType.CLICK);
      expect(interactions[0].feature).toBe('Deployments');
      expect(interactions[0].action).toBe('Create Deployment');
      expect(telemetryService.trackUserInteraction).toHaveBeenCalled();
    });
  });

  describe('trackClick', () => {
    it('should track click event', () => {
      service.trackClick('Deployments', 'View Details', 'details-btn');

      const interactions = service.getInteractions({ type: InteractionType.CLICK });
      expect(interactions.length).toBe(1);
      expect(interactions[0].action).toBe('View Details');
    });
  });

  describe('trackView', () => {
    it('should track page view', () => {
      service.trackView('Deployments', 'Deployment List');

      const interactions = service.getInteractions({ type: InteractionType.VIEW });
      expect(interactions.length).toBe(1);
      expect(interactions[0].action).toBe('View: Deployment List');
    });
  });

  describe('trackFormSubmit', () => {
    it('should track form submission with success status', () => {
      service.trackFormSubmit('Deployments', 'Create Form', true);

      const interactions = service.getInteractions({ type: InteractionType.FORM_SUBMIT });
      expect(interactions.length).toBe(1);
      expect(interactions[0].metadata?.success).toBe(true);
    });
  });

  describe('trackNavigation', () => {
    it('should track navigation between pages', () => {
      service.trackNavigation('/deployments', '/deployments/123');

      const interactions = service.getInteractions({ type: InteractionType.NAVIGATION });
      expect(interactions.length).toBe(1);
      expect(interactions[0].action).toContain('->');
    });
  });

  describe('trackSearch', () => {
    it('should track search with query and result count', () => {
      service.trackSearch('Deployments', 'test query', 5);

      const interactions = service.getInteractions({ type: InteractionType.SEARCH });
      expect(interactions.length).toBe(1);
      expect(interactions[0].metadata?.query).toBe('test query');
      expect(interactions[0].metadata?.resultCount).toBe(5);
    });
  });

  describe('trackFilter', () => {
    it('should track filter application', () => {
      service.trackFilter('Deployments', 'status', 'ACTIVE');

      const interactions = service.getInteractions({ type: InteractionType.FILTER });
      expect(interactions.length).toBe(1);
      expect(interactions[0].action).toBe('Filter: status');
    });
  });

  describe('trackSort', () => {
    it('should track sort action', () => {
      service.trackSort('Deployments', 'createdAt', 'desc');

      const interactions = service.getInteractions({ type: InteractionType.SORT });
      expect(interactions.length).toBe(1);
      expect(interactions[0].metadata?.sortDirection).toBe('desc');
    });
  });

  describe('trackExport', () => {
    it('should track export action', () => {
      service.trackExport('Deployments', 'CSV', 100);

      const interactions = service.getInteractions({ type: InteractionType.EXPORT });
      expect(interactions.length).toBe(1);
      expect(interactions[0].action).toBe('Export: CSV');
      expect(interactions[0].metadata?.recordCount).toBe(100);
    });
  });

  describe('getInteractions', () => {
    beforeEach(() => {
      service.clearInteractions();
      service.trackClick('Deployments', 'Action1');
      service.trackClick('AI Analysis', 'Action2');
      service.trackView('Deployments', 'View1');
    });

    it('should return all interactions when no filter', () => {
      const interactions = service.getInteractions();
      expect(interactions.length).toBe(3);
    });

    it('should filter by feature', () => {
      const interactions = service.getInteractions({ feature: 'Deployments' });
      expect(interactions.length).toBe(2);
      expect(interactions.every(i => i.feature === 'Deployments')).toBe(true);
    });

    it('should filter by type', () => {
      const interactions = service.getInteractions({ type: InteractionType.CLICK });
      expect(interactions.length).toBe(2);
      expect(interactions.every(i => i.type === InteractionType.CLICK)).toBe(true);
    });
  });

  describe('getFeatureUsageStats', () => {
    beforeEach(() => {
      service.clearInteractions();
      service.trackClick('Deployments', 'Action1');
      service.trackClick('Deployments', 'Action2');
      service.trackClick('Deployments', 'Action1');
      service.trackClick('AI Analysis', 'Action3');
    });

    it('should calculate feature usage statistics', () => {
      const stats = service.getFeatureUsageStats('Deployments');
      
      expect(stats.length).toBe(1);
      expect(stats[0].feature).toBe('Deployments');
      expect(stats[0].totalInteractions).toBe(3);
      expect(stats[0].mostCommonActions[0].action).toBe('Action1');
      expect(stats[0].mostCommonActions[0].count).toBe(2);
    });

    it('should return stats for all features when no feature specified', () => {
      const stats = service.getFeatureUsageStats();
      expect(stats.length).toBe(2);
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session information', () => {
      service.trackClick('Deployments', 'Action1');
      service.trackClick('AI Analysis', 'Action2');

      const session = service.getCurrentSession();
      
      expect(session.sessionId).toBeTruthy();
      expect(session.interactionCount).toBe(2);
      expect(session.features.length).toBe(2);
    });
  });

  describe('getMostUsedFeatures', () => {
    beforeEach(() => {
      service.clearInteractions();
      service.trackClick('Deployments', 'Action1');
      service.trackClick('Deployments', 'Action2');
      service.trackClick('Deployments', 'Action3');
      service.trackClick('AI Analysis', 'Action4');
      service.trackClick('AI Analysis', 'Action5');
      service.trackClick('Approvals', 'Action6');
    });

    it('should return most used features in order', () => {
      const mostUsed = service.getMostUsedFeatures(3);
      
      expect(mostUsed.length).toBe(3);
      expect(mostUsed[0].feature).toBe('Deployments');
      expect(mostUsed[0].count).toBe(3);
      expect(mostUsed[1].feature).toBe('AI Analysis');
      expect(mostUsed[1].count).toBe(2);
    });
  });

  describe('getInteractionCountByType', () => {
    beforeEach(() => {
      service.clearInteractions();
      service.trackClick('Deployments', 'Action1');
      service.trackClick('Deployments', 'Action2');
      service.trackView('Deployments', 'View1');
      service.trackSearch('Deployments', 'query');
    });

    it('should count interactions by type', () => {
      const counts = service.getInteractionCountByType();
      
      expect(counts[InteractionType.CLICK]).toBe(2);
      expect(counts[InteractionType.VIEW]).toBe(1);
      expect(counts[InteractionType.SEARCH]).toBe(1);
    });
  });

  describe('exportAnalytics', () => {
    beforeEach(() => {
      service.clearInteractions();
      service.trackClick('Deployments', 'Action1');
      service.trackView('AI Analysis', 'View1');
    });

    it('should export all analytics data', () => {
      const exported = service.exportAnalytics();
      
      expect(exported.interactions.length).toBe(2);
      expect(exported.featureUsage.length).toBe(2);
      expect(exported.session).toBeDefined();
      expect(exported.mostUsedFeatures).toBeDefined();
      expect(exported.interactionsByType).toBeDefined();
      expect(exported.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('clearInteractions', () => {
    it('should clear all interactions', () => {
      service.trackClick('Deployments', 'Action1');
      expect(service.getInteractions().length).toBe(1);

      service.clearInteractions();
      expect(service.getInteractions().length).toBe(0);
    });
  });

  describe('startNewSession', () => {
    it('should start a new session with new ID', () => {
      const oldSession = service.getCurrentSession();
      
      service.startNewSession();
      
      const newSession = service.getCurrentSession();
      expect(newSession.sessionId).not.toBe(oldSession.sessionId);
    });
  });
});
