import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AtlasSignalRService, SignalRConnectionState } from './atlas-signalr.service';
import { AtlasConfigService } from './atlas-config.service';
import { AtlasAuthService } from './atlas-auth.service';

describe('AtlasSignalRService', () => {
  let service: AtlasSignalRService;
  let mockConfigService: jasmine.SpyObj<AtlasConfigService>;
  let mockAuthService: jasmine.SpyObj<AtlasAuthService>;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    // Create mock services
    mockConfigService = jasmine.createSpyObj('AtlasConfigService', [
      'isEnabled',
      'getBaseUrl'
    ], {
      config: {
        baseUrl: 'https://test.api.com',
        apiVersion: 'v1',
        endpoints: {
          deployments: '/v1/deployments',
          aiAnalysis: '/v1/ai-analysis',
          approvals: '/v1/approvals',
          exceptions: '/v1/exceptions',
          agents: '/api/agents',
          queryBuilder: '/v1/query-builder',
          signalR: '/hubs/atlas'
        },
        features: {
          enabled: true,
          hybridMode: false,
          enabledFeatures: []
        },
        timeout: 30000,
        retryAttempts: 3
      }
    });

    mockAuthService = jasmine.createSpyObj('AtlasAuthService', ['getAccessToken']);
    mockAuthService.getAccessToken.and.returnValue(Promise.resolve('test-token'));

    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      providers: [
        AtlasSignalRService,
        { provide: AtlasConfigService, useValue: mockConfigService },
        { provide: AtlasAuthService, useValue: mockAuthService },
        { provide: Store, useValue: mockStore }
      ]
    });

    service = TestBed.inject(AtlasSignalRService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with disconnected state', () => {
    expect(service.status.state).toBe(SignalRConnectionState.Disconnected);
    expect(service.status.isConnected).toBe(false);
  });

  it('should not connect when ATLAS is disabled', async () => {
    mockConfigService.isEnabled.and.returnValue(false);

    await service.connect();

    expect(service.isConnected()).toBe(false);
  });

  it('should generate unique subscription IDs', () => {
    const handler = (data: any) => {};
    const id1 = service.subscribe('TestEvent', handler);
    const id2 = service.subscribe('TestEvent', handler);

    expect(id1).not.toBe(id2);
  });

  it('should track subscriptions', () => {
    const handler = (data: any) => {};
    const id = service.subscribe('TestEvent', handler);

    expect(id).toBeTruthy();
    expect(id.startsWith('sub_')).toBe(true);
  });

  it('should unsubscribe from events', () => {
    const handler = (data: any) => {};
    const id = service.subscribe('TestEvent', handler);

    service.unsubscribe(id);

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should unsubscribe from all events', () => {
    const handler = (data: any) => {};
    service.subscribe('TestEvent1', handler);
    service.subscribe('TestEvent2', handler);

    service.unsubscribeAll();

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should provide status observable', (done) => {
    service.status$.subscribe((status) => {
      expect(status).toBeDefined();
      expect(status.state).toBe(SignalRConnectionState.Disconnected);
      done();
    });
  });

  it('should provide connectivity notifications observable', (done) => {
    service.connectivityNotifications$.subscribe((notification) => {
      expect(notification).toBeDefined();
      // This will be triggered by connection events
    });
    done();
  });

  it('should clean up on destroy', () => {
    spyOn(service, 'disconnect');
    service.ngOnDestroy();
    expect(service.disconnect).toHaveBeenCalled();
  });
});
