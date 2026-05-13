import { StateInspector, ReduxDevToolsConfig, StateInspectionHelpers } from './state-inspector';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

describe('StateInspector', () => {
  let inspector: StateInspector;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    inspector = new StateInspector();
    mockStore = jasmine.createSpyObj('Store', ['pipe']);
  });

  describe('captureSnapshot', () => {
    it('should capture state snapshot', async () => {
      const mockState = { atlas: { deployments: { entities: {} } } };
      mockStore.pipe.and.returnValue(of(mockState));

      const snapshot = await inspector.captureSnapshot(mockStore, 'TEST_ACTION');

      expect(snapshot.state).toEqual(mockState);
      expect(snapshot.action).toBe('TEST_ACTION');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain max snapshots limit', async () => {
      const mockState = { test: 'data' };
      mockStore.pipe.and.returnValue(of(mockState));

      // Capture more than max snapshots
      for (let i = 0; i < 60; i++) {
        await inspector.captureSnapshot(mockStore);
      }

      expect(inspector.getSnapshots().length).toBe(50);
    });
  });

  describe('compareSnapshots', () => {
    it('should detect added properties', () => {
      const snapshot1 = {
        timestamp: new Date(),
        state: { a: 1 }
      };
      const snapshot2 = {
        timestamp: new Date(),
        state: { a: 1, b: 2 }
      };

      const diff = inspector.compareSnapshots(snapshot1, snapshot2);

      expect(diff.added).toEqual({ b: 2 });
      expect(Object.keys(diff.removed).length).toBe(0);
      expect(Object.keys(diff.modified).length).toBe(0);
    });

    it('should detect removed properties', () => {
      const snapshot1 = {
        timestamp: new Date(),
        state: { a: 1, b: 2 }
      };
      const snapshot2 = {
        timestamp: new Date(),
        state: { a: 1 }
      };

      const diff = inspector.compareSnapshots(snapshot1, snapshot2);

      expect(diff.removed).toEqual({ b: 2 });
      expect(Object.keys(diff.added).length).toBe(0);
      expect(Object.keys(diff.modified).length).toBe(0);
    });

    it('should detect modified properties', () => {
      const snapshot1 = {
        timestamp: new Date(),
        state: { a: 1 }
      };
      const snapshot2 = {
        timestamp: new Date(),
        state: { a: 2 }
      };

      const diff = inspector.compareSnapshots(snapshot1, snapshot2);

      expect(diff.modified).toEqual({ a: { old: 1, new: 2 } });
      expect(Object.keys(diff.added).length).toBe(0);
      expect(Object.keys(diff.removed).length).toBe(0);
    });
  });

  describe('exportSnapshots', () => {
    it('should export snapshots as JSON', async () => {
      const mockState = { test: 'data' };
      mockStore.pipe.and.returnValue(of(mockState));

      await inspector.captureSnapshot(mockStore, 'ACTION_1');
      const json = inspector.exportSnapshots();

      expect(json).toContain('test');
      expect(json).toContain('ACTION_1');
    });
  });

  describe('importSnapshots', () => {
    it('should import snapshots from JSON', () => {
      const json = JSON.stringify([
        {
          timestamp: new Date().toISOString(),
          state: { test: 'data' },
          action: 'TEST_ACTION'
        }
      ]);

      inspector.importSnapshots(json);
      const snapshots = inspector.getSnapshots();

      expect(snapshots.length).toBe(1);
      expect(snapshots[0].state).toEqual({ test: 'data' });
    });
  });

  describe('getStateAtPath', () => {
    it('should retrieve nested state value', () => {
      const snapshot = {
        timestamp: new Date(),
        state: {
          atlas: {
            deployments: {
              entities: { '1': { id: '1' } }
            }
          }
        }
      };

      const value = inspector.getStateAtPath(snapshot, 'atlas.deployments.entities');

      expect(value).toEqual({ '1': { id: '1' } });
    });

    it('should return undefined for invalid path', () => {
      const snapshot = {
        timestamp: new Date(),
        state: { test: 'data' }
      };

      const value = inspector.getStateAtPath(snapshot, 'invalid.path');

      expect(value).toBeUndefined();
    });
  });
});

describe('ReduxDevToolsConfig', () => {
  describe('getConfig', () => {
    it('should return valid configuration', () => {
      const config = ReduxDevToolsConfig.getConfig();

      expect(config.name).toBe('ATLAS Control Plane');
      expect(config.maxAge).toBe(50);
      expect(config.features).toBeDefined();
    });

    it('should sanitize auth actions', () => {
      const config = ReduxDevToolsConfig.getConfig();
      const action = {
        type: '[Auth] Login Success',
        payload: { token: 'secret' }
      };

      const sanitized = config.actionSanitizer(action);

      expect(sanitized.payload).toBe('[REDACTED]');
    });

    it('should sanitize auth state', () => {
      const config = ReduxDevToolsConfig.getConfig();
      const state = {
        atlas: {
          auth: { token: 'secret' }
        }
      };

      const sanitized = config.stateSanitizer(state);

      expect(sanitized.atlas.auth).toBe('[REDACTED]');
    });
  });
});

describe('StateInspectionHelpers', () => {
  describe('flattenObject', () => {
    it('should flatten nested object', () => {
      const nested = {
        a: {
          b: {
            c: 1
          }
        },
        d: 2
      };

      const flattened = StateInspectionHelpers.flattenObject(nested);

      expect(flattened['a.b.c']).toBe(1);
      expect(flattened['d']).toBe(2);
    });

    it('should handle arrays', () => {
      const obj = {
        items: [1, 2, 3]
      };

      const flattened = StateInspectionHelpers.flattenObject(obj);

      expect(flattened['items']).toEqual([1, 2, 3]);
    });
  });
});
