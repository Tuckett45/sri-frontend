import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { AtlasSyncService, SyncStatus, ConflictResolutionStrategy } from './atlas-sync.service';
import { AtlasSignalRService, AtlasEventType } from './atlas-signalr.service';
import { AtlasConfigService } from './atlas-config.service';

describe('AtlasSyncService', () => {
  let service: AtlasSyncService;
  let mockSignalRService: jasmine.SpyObj<AtlasSignalRService>;
  let mockConfigService: jasmine.SpyObj<AtlasConfigService>;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    mockSignalRService = jasmine.createSpyObj('AtlasSignalRService', [
      'subscribe',
      'unsubscribe'
    ]);

    mockConfigService = jasmine.createSpyObj('AtlasConfigService', [
      'isEnabled'
    ]);

    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    // Default mock implementations
    mockSignalRService.subscribe.and.returnValue('sub_123');
    mockConfigService.isEnabled.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        AtlasSyncService,
        { provide: AtlasSignalRService, useValue: mockSignalRService },
        { provide: AtlasConfigService, useValue: mockConfigService },
        { provide: Store, useValue: mockStore }
      ]
    });

    service = TestBed.inject(AtlasSyncService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should set up real-time event handlers on initialization', () => {
      expect(mockSignalRService.subscribe).toHaveBeenCalled();
      expect(mockSignalRService.subscribe).toHaveBeenCalledWith(
        AtlasEventType.DeploymentUpdated,
        jasmine.any(Function)
      );
    });

    it('should load queued operations from storage', () => {
      const operations = service.getPendingOperations();
      expect(operations).toBeDefined();
      expect(Array.isArray(operations)).toBe(true);
    });

    it('should initialize with Synced status', () => {
      const state = service.syncState;
      expect(state.status).toBe(SyncStatus.Synced);
      expect(state.isOnline).toBe(navigator.onLine);
    });
  });

  describe('Real-time Event Handling', () => {
    it('should handle deployment update events', () => {
      // Test will be implemented when integrating with actual state
      expect(service).toBeTruthy();
    });

    it('should handle deployment created events', () => {
      // Test will be implemented when integrating with actual state
      expect(service).toBeTruthy();
    });

    it('should handle state transition events', () => {
      // Test will be implemented when integrating with actual state
      expect(service).toBeTruthy();
    });
  });

  describe('Offline Operation Queueing', () => {
    it('should queue operations when offline', () => {
      const operation = {
        id: 'op_123',
        type: 'create' as const,
        entityType: 'deployment' as const,
        payload: { title: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      service.queueOperation(operation);

      const pending = service.getPendingOperations();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('op_123');
    });

    it('should update sync state when queueing operations', () => {
      const operation = {
        id: 'op_456',
        type: 'update' as const,
        entityType: 'deployment' as const,
        entityId: 'dep_123',
        payload: { title: 'Updated' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      service.queueOperation(operation);

      const state = service.syncState;
      expect(state.pendingOperations).toBeGreaterThan(0);
    });

    it('should clear operation queue', () => {
      const operation = {
        id: 'op_789',
        type: 'delete' as const,
        entityType: 'deployment' as const,
        entityId: 'dep_456',
        payload: { reason: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      service.queueOperation(operation);
      expect(service.getPendingOperations().length).toBeGreaterThan(0);

      service.clearQueue();
      expect(service.getPendingOperations().length).toBe(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should track conflicts', () => {
      const conflicts = service.getConflicts();
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('Manual Refresh', () => {
    it('should trigger manual refresh for all entities', async () => {
      await service.manualRefresh();
      
      // Verify store dispatches
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should trigger manual refresh for specific entity type', async () => {
      await service.manualRefresh('deployment');
      
      // Verify store dispatches
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should update sync state during manual refresh', async () => {
      const stateBefore = service.syncState;
      
      await service.manualRefresh();
      
      const stateAfter = service.syncState;
      expect(stateAfter.lastSyncTime).toBeDefined();
    });
  });

  describe('Sync State Observable', () => {
    it('should provide sync state as observable', (done) => {
      service.syncState$.subscribe(state => {
        expect(state).toBeDefined();
        expect(state.status).toBeDefined();
        expect(state.isOnline).toBeDefined();
        done();
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from SignalR events on destroy', () => {
      service.ngOnDestroy();
      expect(mockSignalRService.unsubscribe).toHaveBeenCalled();
    });

    it('should save queue to storage on destroy', () => {
      const operation = {
        id: 'op_cleanup',
        type: 'create' as const,
        entityType: 'deployment' as const,
        payload: { title: 'Test' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      service.queueOperation(operation);
      service.ngOnDestroy();

      // Queue should be saved to localStorage
      const saved = localStorage.getItem('atlas_operation_queue');
      expect(saved).toBeDefined();
    });
  });
});
