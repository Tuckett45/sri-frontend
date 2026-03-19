import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntegrationStatusComponent } from './integration-status.component';
import { AtlasConfigService } from '../../services/atlas-config.service';
import { AtlasRoutingService } from '../../services/atlas-routing.service';
import { AtlasServiceLoggerService } from '../../services/atlas-service-logger.service';
import { AtlasFallbackService } from '../../services/atlas-fallback.service';
import { AtlasHybridService } from '../../services/atlas-hybrid.service';

describe('IntegrationStatusComponent', () => {
  let component: IntegrationStatusComponent;
  let fixture: ComponentFixture<IntegrationStatusComponent>;
  let configService: jasmine.SpyObj<AtlasConfigService>;
  let routingService: jasmine.SpyObj<AtlasRoutingService>;
  let loggerService: jasmine.SpyObj<AtlasServiceLoggerService>;
  let fallbackService: jasmine.SpyObj<AtlasFallbackService>;
  let hybridService: jasmine.SpyObj<AtlasHybridService>;

  beforeEach(async () => {
    const configServiceSpy = jasmine.createSpyObj('AtlasConfigService', ['getEnvironment'], {
      config: {
        baseUrl: 'https://api.example.com',
        apiVersion: 'v1',
        endpoints: {},
        features: {
          enabled: true,
          hybridMode: false,
          enabledFeatures: []
        },
        timeout: 30000,
        retryAttempts: 3
      }
    });

    const routingServiceSpy = jasmine.createSpyObj('AtlasRoutingService', ['clearRoutingLog']);
    const loggerServiceSpy = jasmine.createSpyObj('AtlasServiceLoggerService', [
      'getStatistics',
      'getRecentErrors',
      'clearLogs',
      'exportLogs'
    ]);
    const fallbackServiceSpy = jasmine.createSpyObj('AtlasFallbackService', ['getFallbackStatistics']);
    const hybridServiceSpy = jasmine.createSpyObj('AtlasHybridService', ['shouldFeatureUseAtlas']);

    configServiceSpy.getEnvironment.and.returnValue('development');
    loggerServiceSpy.getStatistics.and.returnValue({
      totalRequests: 100,
      atlasRequests: 70,
      arkRequests: 30,
      successfulRequests: 95,
      failedRequests: 5,
      averageDuration: 150,
      byFeature: {
        deployments: { atlas: 40, ark: 10, success: 48, failed: 2 }
      },
      byService: {
        atlas: { total: 70, success: 65, failed: 5 },
        ark: { total: 30, success: 30, failed: 0 }
      }
    });
    loggerServiceSpy.getRecentErrors.and.returnValue([]);
    fallbackServiceSpy.getFallbackStatistics.and.returnValue({
      totalFallbacks: 5,
      fallbacksByFeature: { deployments: 3, aiAnalysis: 2 },
      fallbackRate: 5
    });
    hybridServiceSpy.shouldFeatureUseAtlas.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [IntegrationStatusComponent],
      providers: [
        { provide: AtlasConfigService, useValue: configServiceSpy },
        { provide: AtlasRoutingService, useValue: routingServiceSpy },
        { provide: AtlasServiceLoggerService, useValue: loggerServiceSpy },
        { provide: AtlasFallbackService, useValue: fallbackServiceSpy },
        { provide: AtlasHybridService, useValue: hybridServiceSpy }
      ]
    }).compileComponents();

    configService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;
    routingService = TestBed.inject(AtlasRoutingService) as jasmine.SpyObj<AtlasRoutingService>;
    loggerService = TestBed.inject(AtlasServiceLoggerService) as jasmine.SpyObj<AtlasServiceLoggerService>;
    fallbackService = TestBed.inject(AtlasFallbackService) as jasmine.SpyObj<AtlasFallbackService>;
    hybridService = TestBed.inject(AtlasHybridService) as jasmine.SpyObj<AtlasHybridService>;

    fixture = TestBed.createComponent(IntegrationStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load configuration on init', () => {
    expect(component.config).toBeDefined();
    expect(component.environment).toBe('development');
  });

  it('should load statistics on init', () => {
    expect(component.routingStats).toBeDefined();
    expect(component.routingStats.totalRequests).toBe(100);
    expect(component.fallbackStats).toBeDefined();
    expect(component.fallbackStats.totalFallbacks).toBe(5);
  });

  it('should refresh statistics', () => {
    loggerService.getStatistics.calls.reset();
    fallbackService.getFallbackStatistics.calls.reset();

    component.refreshStats();

    expect(loggerService.getStatistics).toHaveBeenCalled();
    expect(fallbackService.getFallbackStatistics).toHaveBeenCalled();
  });

  it('should clear logs with confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.clearLogs();

    expect(loggerService.clearLogs).toHaveBeenCalled();
    expect(routingService.clearRoutingLog).toHaveBeenCalled();
  });

  it('should not clear logs without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.clearLogs();

    expect(loggerService.clearLogs).not.toHaveBeenCalled();
    expect(routingService.clearRoutingLog).not.toHaveBeenCalled();
  });

  it('should export logs', () => {
    loggerService.exportLogs.and.returnValue('{"logs": []}');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(window.URL, 'revokeObjectURL');
    const linkSpy = jasmine.createSpyObj('a', ['click']);
    spyOn(document, 'createElement').and.returnValue(linkSpy);

    component.exportLogs();

    expect(loggerService.exportLogs).toHaveBeenCalled();
    expect(linkSpy.click).toHaveBeenCalled();
  });

  it('should check if feature is using ATLAS', () => {
    hybridService.shouldFeatureUseAtlas.and.returnValue(true);

    const result = component.isFeatureUsingAtlas('deployments');

    expect(result).toBe(true);
    expect(hybridService.shouldFeatureUseAtlas).toHaveBeenCalledWith('deployments');
  });

  it('should calculate success rate', () => {
    const rate = component.getSuccessRate();

    expect(rate).toBe('95.00');
  });

  it('should return 0 success rate when no requests', () => {
    component.routingStats.totalRequests = 0;

    const rate = component.getSuccessRate();

    expect(rate).toBe('0.00');
  });

  it('should check if has fallbacks', () => {
    expect(component.hasFallbacks()).toBe(true);

    component.fallbackStats.totalFallbacks = 0;
    expect(component.hasFallbacks()).toBe(false);
  });

  it('should get fallback features', () => {
    const features = component.getFallbackFeatures();

    expect(features).toEqual(['deployments', 'aiAnalysis']);
  });

  it('should get feature names from stats', () => {
    const features = component.getFeatureNames();

    expect(features).toEqual(['deployments']);
  });

  it('should format time', () => {
    const date = new Date('2024-01-01T12:30:45');
    const formatted = component.formatTime(date);

    expect(formatted).toContain('12:30');
  });

  it('should display ATLAS enabled status', () => {
    const compiled = fixture.nativeElement;
    const statusValue = compiled.querySelector('.value.enabled');

    expect(statusValue).toBeTruthy();
    expect(statusValue.textContent).toContain('Yes');
  });

  it('should display routing statistics', () => {
    const compiled = fixture.nativeElement;
    const statValues = compiled.querySelectorAll('.stat-value');

    expect(statValues.length).toBeGreaterThan(0);
  });
});
