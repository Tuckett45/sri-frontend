import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { OfflineQueueService, QueuedAction } from './offline-queue.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockIndexedDB: any;
  let mockDatabase: any;
  let mockObjectStore: any;
  let mockTransaction: any;

  const mockAction = {
    type: '[Test] Test Action',
    payload: { id: '123', data: 'test' }
  };

  const mockQueuedAction: QueuedAction = {
    id: 'queued-123',
    action: mockAction,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    retryCount: 0
  };

  beforeEach(() => {
    // Create mock store
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    // Create mock IndexedDB components
    mockObjectStore = {
      add: jasmine.createSpy('add'),
      getAll: jasmine.createSpy('getAll'),
      delete: jasmine.createSpy('delete'),
      clear: jasmine.createSpy('clear'),
      createIndex: jasmine.createSpy('createIndex')
    };

    mockTransaction = {
      objectStore: jasmine.createSpy('objectStore').and.returnValue(mockObjectStore)
    };

    mockDatabase = {
      transaction: jasmine.createSpy('transaction').and.returnValue(mockTransaction),
      objectStoreNames: {
        contains: jasmine.createSpy('contains').and.returnValue(false)
      },
      createObjectStore: jasmine.createSpy('createObjectStore').and.returnValue(mockObjectStore)
    };

    mockIndexedDB = {
      open: jasmine.createSpy('open')
    };

    // Mock global indexedDB
    (window as any).indexedDB = mockIndexedDB;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    TestBed.configureTestingModule({
      providers: [
        OfflineQueueService,
        { provide: Store, useValue: mockStore }
      ]
    });
  });

  afterEach(() => {
    // Clean up
    delete (window as any).indexedDB;
  });

  describe('initialization', () => {
    it('should create the service', () => {
      // Simulate successful database initialization
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);

      service = TestBed.inject(OfflineQueueService);

      // Trigger onsuccess
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      expect(service).toBeTruthy();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('frm-offline-queue', 1);
    });

    it('should initialize IndexedDB on construction', () => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);

      service = TestBed.inject(OfflineQueueService);

      expect(mockIndexedDB.open).toHaveBeenCalledWith('frm-offline-queue', 1);
    });

    it('should create object store on upgrade', () => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);

      service = TestBed.inject(OfflineQueueService);

      // Trigger onupgradeneeded
      const upgradeEvent = {
        target: { result: mockDatabase }
      };
      if (mockRequest.onupgradeneeded) {
        mockRequest.onupgradeneeded(upgradeEvent);
      }

      expect(mockDatabase.createObjectStore).toHaveBeenCalledWith('actions', { keyPath: 'id' });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp', { unique: false });
    });

    it('should handle database initialization error', () => {
      const mockRequest: any = {
        error: new Error('Database error'),
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);

      spyOn(console, 'error');

      service = TestBed.inject(OfflineQueueService);

      // Trigger onerror
      if (mockRequest.onerror) {
        mockRequest.onerror();
      }

      expect(console.error).toHaveBeenCalledWith('Failed to open IndexedDB', mockRequest.error);
    });
  });

  describe('isCurrentlyOnline', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null,
        onerror: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should return true when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      expect(service.isCurrentlyOnline()).toBe(true);
    });

    it('should return false when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Re-create service to pick up new navigator.onLine value
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      expect(service.isCurrentlyOnline()).toBe(false);
    });
  });

  describe('queueAction', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null,
        onerror: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should queue an action successfully', async () => {
      const addRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.add.and.returnValue(addRequest);

      spyOn(console, 'log');

      const promise = service.queueAction(mockAction);

      // Trigger onsuccess
      if (addRequest.onsuccess) {
        addRequest.onsuccess();
      }

      await promise;

      expect(mockDatabase.transaction).toHaveBeenCalledWith(['actions'], 'readwrite');
      expect(mockObjectStore.add).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Action queued for offline sync', jasmine.any(Object));
    });

    it('should generate unique ID for queued action', async () => {
      const addRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.add.and.returnValue(addRequest);

      const promise = service.queueAction(mockAction);

      if (addRequest.onsuccess) {
        addRequest.onsuccess();
      }

      await promise;

      const queuedAction = mockObjectStore.add.calls.mostRecent().args[0];
      expect(queuedAction.id).toBeDefined();
      expect(queuedAction.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should include timestamp in queued action', async () => {
      const addRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.add.and.returnValue(addRequest);

      const promise = service.queueAction(mockAction);

      if (addRequest.onsuccess) {
        addRequest.onsuccess();
      }

      await promise;

      const queuedAction = mockObjectStore.add.calls.mostRecent().args[0];
      expect(queuedAction.timestamp).toBeInstanceOf(Date);
    });

    it('should initialize retry count to 0', async () => {
      const addRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.add.and.returnValue(addRequest);

      const promise = service.queueAction(mockAction);

      if (addRequest.onsuccess) {
        addRequest.onsuccess();
      }

      await promise;

      const queuedAction = mockObjectStore.add.calls.mostRecent().args[0];
      expect(queuedAction.retryCount).toBe(0);
    });

    it('should handle queue error', async () => {
      const addRequest: any = {
        error: new Error('Add failed'),
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.add.and.returnValue(addRequest);

      spyOn(console, 'error');

      const promise = service.queueAction(mockAction);

      // Trigger onerror
      if (addRequest.onerror) {
        addRequest.onerror();
      }

      try {
        await promise;
        fail('Should have thrown error');
      } catch (error) {
        expect(console.error).toHaveBeenCalledWith('Failed to queue action', addRequest.error);
      }
    });

    it('should not queue when database is not initialized', async () => {
      // Create service without initializing database
      const mockRequest: any = {
        result: null,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      const uninitializedService = TestBed.inject(OfflineQueueService);

      spyOn(console, 'error');

      await uninitializedService.queueAction(mockAction);

      expect(console.error).toHaveBeenCalledWith('IndexedDB not initialized');
      expect(mockObjectStore.add).not.toHaveBeenCalled();
    });
  });

  describe('getQueuedActions', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should retrieve all queued actions', async () => {
      const mockActions = [mockQueuedAction];
      const getAllRequest: any = {
        result: mockActions,
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.getAll.and.returnValue(getAllRequest);

      const promise = service.getQueuedActions();

      if (getAllRequest.onsuccess) {
        getAllRequest.onsuccess();
      }

      const result = await promise;

      expect(mockDatabase.transaction).toHaveBeenCalledWith(['actions'], 'readonly');
      expect(mockObjectStore.getAll).toHaveBeenCalled();
      expect(result).toEqual(mockActions);
    });

    it('should return empty array when no actions queued', async () => {
      const getAllRequest: any = {
        result: [],
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.getAll.and.returnValue(getAllRequest);

      const promise = service.getQueuedActions();

      if (getAllRequest.onsuccess) {
        getAllRequest.onsuccess();
      }

      const result = await promise;

      expect(result).toEqual([]);
    });

    it('should handle retrieval error', async () => {
      const getAllRequest: any = {
        error: new Error('Get failed'),
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.getAll.and.returnValue(getAllRequest);

      spyOn(console, 'error');

      const promise = service.getQueuedActions();

      if (getAllRequest.onerror) {
        getAllRequest.onerror();
      }

      try {
        await promise;
        fail('Should have thrown error');
      } catch (error) {
        expect(console.error).toHaveBeenCalledWith('Failed to get queued actions', getAllRequest.error);
      }
    });

    it('should return empty array when database is not initialized', async () => {
      const mockRequest: any = {
        result: null,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      const uninitializedService = TestBed.inject(OfflineQueueService);

      spyOn(console, 'error');

      const result = await uninitializedService.getQueuedActions();

      expect(console.error).toHaveBeenCalledWith('IndexedDB not initialized');
      expect(result).toEqual([]);
    });
  });

  describe('removeQueuedAction', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should remove a queued action by ID', async () => {
      const deleteRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.delete.and.returnValue(deleteRequest);

      spyOn(console, 'log');

      const promise = service.removeQueuedAction('queued-123');

      if (deleteRequest.onsuccess) {
        deleteRequest.onsuccess();
      }

      await promise;

      expect(mockDatabase.transaction).toHaveBeenCalledWith(['actions'], 'readwrite');
      expect(mockObjectStore.delete).toHaveBeenCalledWith('queued-123');
      expect(console.log).toHaveBeenCalledWith('Queued action removed', 'queued-123');
    });

    it('should handle removal error', async () => {
      const deleteRequest: any = {
        error: new Error('Delete failed'),
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.delete.and.returnValue(deleteRequest);

      spyOn(console, 'error');

      const promise = service.removeQueuedAction('queued-123');

      if (deleteRequest.onerror) {
        deleteRequest.onerror();
      }

      try {
        await promise;
        fail('Should have thrown error');
      } catch (error) {
        expect(console.error).toHaveBeenCalledWith('Failed to remove queued action', deleteRequest.error);
      }
    });

    it('should not remove when database is not initialized', async () => {
      const mockRequest: any = {
        result: null,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      const uninitializedService = TestBed.inject(OfflineQueueService);

      spyOn(console, 'error');

      await uninitializedService.removeQueuedAction('queued-123');

      expect(console.error).toHaveBeenCalledWith('IndexedDB not initialized');
      expect(mockObjectStore.delete).not.toHaveBeenCalled();
    });
  });

  describe('syncQueuedActions', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Re-create service to pick up offline status
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      spyOn(console, 'log');

      await service.syncQueuedActions();

      expect(console.log).toHaveBeenCalledWith('Cannot sync - offline');
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should sync queued actions when online', async () => {
      const mockActions = [
        { ...mockQueuedAction, id: 'action-1' },
        { ...mockQueuedAction, id: 'action-2' }
      ];

      const getAllRequest: any = {
        result: mockActions,
        onsuccess: null
      };
      mockObjectStore.getAll.and.returnValue(getAllRequest);

      const deleteRequest: any = {
        onsuccess: null
      };
      mockObjectStore.delete.and.returnValue(deleteRequest);

      spyOn(service, 'getQueuedActions').and.returnValue(Promise.resolve(mockActions));
      spyOn(service, 'removeQueuedAction').and.returnValue(Promise.resolve());

      await service.syncQueuedActions();

      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      expect(service.removeQueuedAction).toHaveBeenCalledTimes(2);
    });

    it('should sync actions in chronological order', async () => {
      const action1 = {
        ...mockQueuedAction,
        id: 'action-1',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };
      const action2 = {
        ...mockQueuedAction,
        id: 'action-2',
        timestamp: new Date('2024-01-01T09:00:00Z')
      };
      const action3 = {
        ...mockQueuedAction,
        id: 'action-3',
        timestamp: new Date('2024-01-01T11:00:00Z')
      };

      const mockActions = [action1, action2, action3];

      spyOn(service, 'getQueuedActions').and.returnValue(Promise.resolve(mockActions));
      spyOn(service, 'removeQueuedAction').and.returnValue(Promise.resolve());

      await service.syncQueuedActions();

      // Should dispatch in order: action2, action1, action3
      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
      expect(mockStore.dispatch.calls.argsFor(0)[0]).toEqual(action2.action);
      expect(mockStore.dispatch.calls.argsFor(1)[0]).toEqual(action1.action);
      expect(mockStore.dispatch.calls.argsFor(2)[0]).toEqual(action3.action);
    });

    it('should handle empty queue', async () => {
      spyOn(service, 'getQueuedActions').and.returnValue(Promise.resolve([]));
      spyOn(console, 'log');

      await service.syncQueuedActions();

      expect(console.log).toHaveBeenCalledWith('No queued actions to sync');
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should continue syncing if one action fails', async () => {
      const mockActions = [
        { ...mockQueuedAction, id: 'action-1' },
        { ...mockQueuedAction, id: 'action-2' }
      ];

      spyOn(service, 'getQueuedActions').and.returnValue(Promise.resolve(mockActions));
      spyOn(service, 'removeQueuedAction').and.callFake((id: string) => {
        if (id === 'action-1') {
          return Promise.reject(new Error('Remove failed'));
        }
        return Promise.resolve();
      });

      spyOn(console, 'error');
      spyOn(console, 'log');

      await service.syncQueuedActions();

      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Sync complete');
    });

    it('should handle sync error gracefully', async () => {
      spyOn(service, 'getQueuedActions').and.returnValue(Promise.reject(new Error('Get failed')));
      spyOn(console, 'error');

      await service.syncQueuedActions();

      expect(console.error).toHaveBeenCalledWith('Failed to sync queued actions', jasmine.any(Error));
    });
  });

  describe('clearQueue', () => {
    beforeEach(() => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }
    });

    it('should clear all queued actions', async () => {
      const clearRequest: any = {
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.clear.and.returnValue(clearRequest);

      spyOn(console, 'log');

      const promise = service.clearQueue();

      if (clearRequest.onsuccess) {
        clearRequest.onsuccess();
      }

      await promise;

      expect(mockDatabase.transaction).toHaveBeenCalledWith(['actions'], 'readwrite');
      expect(mockObjectStore.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Queue cleared');
    });

    it('should handle clear error', async () => {
      const clearRequest: any = {
        error: new Error('Clear failed'),
        onsuccess: null,
        onerror: null
      };
      mockObjectStore.clear.and.returnValue(clearRequest);

      spyOn(console, 'error');

      const promise = service.clearQueue();

      if (clearRequest.onerror) {
        clearRequest.onerror();
      }

      try {
        await promise;
        fail('Should have thrown error');
      } catch (error) {
        expect(console.error).toHaveBeenCalledWith('Failed to clear queue', clearRequest.error);
      }
    });

    it('should not clear when database is not initialized', async () => {
      const mockRequest: any = {
        result: null,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      const uninitializedService = TestBed.inject(OfflineQueueService);

      spyOn(console, 'error');

      await uninitializedService.clearQueue();

      expect(console.error).toHaveBeenCalledWith('IndexedDB not initialized');
      expect(mockObjectStore.clear).not.toHaveBeenCalled();
    });
  });

  describe('online/offline monitoring', () => {
    it('should trigger sync when going online', (done) => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      spyOn(service, 'syncQueuedActions').and.returnValue(Promise.resolve());

      // Simulate going online
      window.dispatchEvent(new Event('online'));

      setTimeout(() => {
        expect(service.syncQueuedActions).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not sync when going offline', (done) => {
      const mockRequest: any = {
        result: mockDatabase,
        onsuccess: null
      };
      mockIndexedDB.open.and.returnValue(mockRequest);
      service = TestBed.inject(OfflineQueueService);
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess();
      }

      spyOn(service, 'syncQueuedActions');

      // Simulate going offline
      window.dispatchEvent(new Event('offline'));

      setTimeout(() => {
        expect(service.syncQueuedActions).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
