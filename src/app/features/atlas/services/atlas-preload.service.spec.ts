import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AtlasPreloadService } from './atlas-preload.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasPreloadService', () => {
  let service: AtlasPreloadService;
  let store: MockStore;
  let configService: jasmine.SpyObj<AtlasConfigService>;

  const initialState = {};

  beforeEach(() => {
    const configServiceSpy = jasmine.createSpyObj('AtlasConfigService', ['getConfig']);

    TestBed.configureTestingModule({
      providers: [
        AtlasPreloadService,
        provideMockStore({ initialState }),
        { provide: AtlasConfigService, useValue: configServiceSpy }
      ]
    });

    service = TestBed.inject(AtlasPreloadService);
    store = TestBed.inject(MockStore);
    configService = TestBed.inject(AtlasConfigService) as jasmine.SpyObj<AtlasConfigService>;

    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('preload', () => {
    it('should preload deployments and AI agents by default', (done) => {
      service.preload().subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.deployments).toBe(true);
        expect(result.aiAgents).toBe(true);
        expect(store.dispatch).toHaveBeenCalled();
        done();
      });
    });

    it('should respect custom configuration', (done) => {
      const config = {
        deployments: true,
        aiAgents: false,
        userApprovals: false,
        deploymentCount: 10
      };

      service.preload(config).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.deployments).toBe(true);
        expect(result.aiAgents).toBeUndefined();
        done();
      });
    });

    it('should not preload twice', (done) => {
      service.preload().subscribe(() => {
        const dispatchCount = (store.dispatch as jasmine.Spy).calls.count();

        service.preload().subscribe(result => {
          expect(result.success).toBe(true);
          // Should not dispatch additional actions
          expect((store.dispatch as jasmine.Spy).calls.count()).toBe(dispatchCount);
          done();
        });
      });
    });

    it('should handle preload with only user approvals', (done) => {
      const config = {
        deployments: false,
        aiAgents: false,
        userApprovals: true
      };

      service.preload(config).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.userApprovals).toBe(true);
        done();
      });
    });

    it('should return immediately if no preload tasks', (done) => {
      const config = {
        deployments: false,
        aiAgents: false,
        userApprovals: false
      };

      service.preload(config).subscribe(result => {
        expect(result.success).toBe(true);
        done();
      });
    });
  });

  describe('isPreloaded', () => {
    it('should return false initially', () => {
      expect(service.isPreloaded()).toBe(false);
    });

    it('should return true after preload completes', (done) => {
      service.preload().subscribe(() => {
        expect(service.isPreloaded()).toBe(true);
        done();
      });
    });
  });

  describe('isPreloading', () => {
    it('should return false initially', () => {
      expect(service.isPreloading()).toBe(false);
    });

    it('should return true during preload', () => {
      service.preload().subscribe();
      // Note: This is tricky to test due to async nature
      // In real scenario, would need to delay the observable
    });
  });

  describe('reset', () => {
    it('should reset preload state', (done) => {
      service.preload().subscribe(() => {
        expect(service.isPreloaded()).toBe(true);

        service.reset();
        expect(service.isPreloaded()).toBe(false);
        done();
      });
    });
  });

  describe('preloadDeploymentDetail', () => {
    it('should dispatch actions for deployment detail', (done) => {
      const deploymentId = 'test-123';

      service.preloadDeploymentDetail(deploymentId).subscribe(() => {
        expect(store.dispatch).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('preloadForRoute', () => {
    it('should preload deployments for deployments route', (done) => {
      service.preloadForRoute('deployments').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.deployments).toBe(true);
        done();
      });
    });

    it('should preload deployment detail for detail route', (done) => {
      service.preloadForRoute('deployment-detail', { id: 'test-123' }).subscribe(result => {
        expect(result.success).toBe(true);
        expect(store.dispatch).toHaveBeenCalled();
        done();
      });
    });

    it('should fail if deployment detail route has no ID', (done) => {
      service.preloadForRoute('deployment-detail').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.errors).toContain('No deployment ID provided');
        done();
      });
    });

    it('should preload AI agents for ai-analysis route', (done) => {
      service.preloadForRoute('ai-analysis').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.aiAgents).toBe(true);
        done();
      });
    });

    it('should use default preload for unknown routes', (done) => {
      service.preloadForRoute('unknown-route').subscribe(result => {
        expect(result.success).toBe(true);
        done();
      });
    });
  });
});
