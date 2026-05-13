/**
 * Optimistic Update Service Tests
 */

import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { OptimisticUpdateService } from './optimistic-update.service';

describe('OptimisticUpdateService', () => {
  let service: OptimisticUpdateService;
  let store: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      providers: [
        OptimisticUpdateService,
        { provide: Store, useValue: storeSpy }
      ]
    });

    service = TestBed.inject(OptimisticUpdateService);
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('executeOptimisticUpdate', () => {
    it('should dispatch optimistic action immediately', (done) => {
      const optimisticAction = { type: '[Test] Optimistic' };
      const successAction = { type: '[Test] Success' };
      const rollbackAction = { type: '[Test] Rollback' };
      const apiCall = of({ id: '1', name: 'Test' });

      const config = {
        entity: { id: '1', name: 'Original' },
        changes: { name: 'Updated' },
        optimisticAction,
        successAction,
        rollbackAction
      };

      service.executeOptimisticUpdate(config, apiCall).subscribe(() => {
        expect(store.dispatch).toHaveBeenCalledWith(optimisticAction);
        done();
      });
    });

    it('should dispatch success action on successful API call', (done) => {
      const optimisticAction = { type: '[Test] Optimistic' };
      const successAction = { type: '[Test] Success' };
      const rollbackAction = { type: '[Test] Rollback' };
      const apiCall = of({ id: '1', name: 'Test' });

      const config = {
        entity: { id: '1', name: 'Original' },
        changes: { name: 'Updated' },
        optimisticAction,
        successAction,
        rollbackAction
      };

      service.executeOptimisticUpdate(config, apiCall).subscribe(() => {
        expect(store.dispatch).toHaveBeenCalledWith(successAction);
        done();
      });
    });

    it('should dispatch rollback action on failed API call', (done) => {
      const optimisticAction = { type: '[Test] Optimistic' };
      const successAction = { type: '[Test] Success' };
      const rollbackAction = { type: '[Test] Rollback' };
      const apiCall = throwError(() => new Error('API Error'));

      const config = {
        entity: { id: '1', name: 'Original' },
        changes: { name: 'Updated' },
        optimisticAction,
        successAction,
        rollbackAction
      };

      service.executeOptimisticUpdate(config, apiCall).subscribe({
        error: () => {
          expect(store.dispatch).toHaveBeenCalledWith(rollbackAction);
          done();
        }
      });
    });

    it('should call onSuccess callback on successful API call', (done) => {
      const optimisticAction = { type: '[Test] Optimistic' };
      const successAction = { type: '[Test] Success' };
      const rollbackAction = { type: '[Test] Rollback' };
      const apiCall = of({ id: '1', name: 'Test' });
      const onSuccess = jasmine.createSpy('onSuccess');

      const config = {
        entity: { id: '1', name: 'Original' },
        changes: { name: 'Updated' },
        optimisticAction,
        successAction,
        rollbackAction,
        onSuccess
      };

      service.executeOptimisticUpdate(config, apiCall).subscribe(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: '1', name: 'Test' });
        done();
      });
    });

    it('should call onFailure callback on failed API call', (done) => {
      const optimisticAction = { type: '[Test] Optimistic' };
      const successAction = { type: '[Test] Success' };
      const rollbackAction = { type: '[Test] Rollback' };
      const error = new Error('API Error');
      const apiCall = throwError(() => error);
      const onFailure = jasmine.createSpy('onFailure');

      const config = {
        entity: { id: '1', name: 'Original' },
        changes: { name: 'Updated' },
        optimisticAction,
        successAction,
        rollbackAction,
        onFailure
      };

      service.executeOptimisticUpdate(config, apiCall).subscribe({
        error: () => {
          expect(onFailure).toHaveBeenCalledWith(error);
          done();
        }
      });
    });
  });

  describe('generateTempId', () => {
    it('should generate a temporary ID with correct format', () => {
      const tempId = service.generateTempId();
      expect(tempId).toMatch(/^temp-\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateTempId();
      const id2 = service.generateTempId();
      expect(id1).not.toEqual(id2);
    });
  });

  describe('isTempId', () => {
    it('should return true for temporary IDs', () => {
      expect(service.isTempId('temp-123456-abc')).toBe(true);
    });

    it('should return false for non-temporary IDs', () => {
      expect(service.isTempId('real-id-123')).toBe(false);
      expect(service.isTempId('123')).toBe(false);
    });
  });

  describe('cloneEntity', () => {
    it('should create a deep copy of an entity', () => {
      const entity = {
        id: '1',
        name: 'Test',
        nested: { value: 'nested' }
      };

      const clone = service.cloneEntity(entity);

      expect(clone).toEqual(entity);
      expect(clone).not.toBe(entity);
      expect(clone.nested).not.toBe(entity.nested);
    });

    it('should handle arrays in entities', () => {
      const entity = {
        id: '1',
        items: [1, 2, 3]
      };

      const clone = service.cloneEntity(entity);

      expect(clone.items).toEqual([1, 2, 3]);
      expect(clone.items).not.toBe(entity.items);
    });
  });

  describe('mergeChanges', () => {
    it('should merge changes into entity', () => {
      const entity = {
        id: '1',
        name: 'Original',
        status: 'active'
      };

      const changes = {
        name: 'Updated'
      };

      const merged = service.mergeChanges(entity, changes);

      expect(merged).toEqual({
        id: '1',
        name: 'Updated',
        status: 'active'
      });
    });

    it('should not mutate original entity', () => {
      const entity = {
        id: '1',
        name: 'Original'
      };

      const changes = {
        name: 'Updated'
      };

      service.mergeChanges(entity, changes);

      expect(entity.name).toBe('Original');
    });
  });
});
