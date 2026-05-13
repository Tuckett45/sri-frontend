import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, delay } from 'rxjs';
import { AtlasBatchService, batchRequests, batchRequestsWithErrors } from './atlas-batch.service';

describe('AtlasBatchService', () => {
  let service: AtlasBatchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasBatchService);
  });

  afterEach(() => {
    service.cancelAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('batch', () => {
    it('should batch multiple requests', fakeAsync(() => {
      const batchKey = 'test-batch';
      const results: any[] = [];

      // Add 3 requests to batch
      service.batch(batchKey, 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.batch(batchKey, 'req2', of({ id: 2 })).subscribe(r => results.push(r));
      service.batch(batchKey, 'req3', of({ id: 3 })).subscribe(r => results.push(r));

      // Wait for batch to execute
      tick(60);

      expect(results.length).toBe(3);
      expect(results).toContain(jasmine.objectContaining({ id: 1 }));
      expect(results).toContain(jasmine.objectContaining({ id: 2 }));
      expect(results).toContain(jasmine.objectContaining({ id: 3 }));
    }));

    it('should execute batch immediately when max size reached', fakeAsync(() => {
      const batchKey = 'test-batch';
      const results: any[] = [];
      const config = { maxBatchSize: 2, maxWaitTime: 1000 };

      service.batch(batchKey, 'req1', of({ id: 1 }), config).subscribe(r => results.push(r));
      service.batch(batchKey, 'req2', of({ id: 2 }), config).subscribe(r => results.push(r));

      // Should execute immediately without waiting
      tick(10);

      expect(results.length).toBe(2);
    }));

    it('should deduplicate requests with same ID', fakeAsync(() => {
      const batchKey = 'test-batch';
      let callCount = 0;
      const request$ = of({ id: 1 }).pipe(delay(0));

      const createRequest = () => {
        callCount++;
        return request$;
      };

      // Add same request ID twice
      service.batch(batchKey, 'req1', createRequest()).subscribe();
      service.batch(batchKey, 'req1', createRequest()).subscribe();

      tick(60);

      expect(callCount).toBe(1); // Should only create request once
    }));

    it('should handle errors in individual requests', fakeAsync(() => {
      const batchKey = 'test-batch';
      const results: any[] = [];
      const errors: any[] = [];

      service.batch(batchKey, 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.batch(batchKey, 'req2', throwError(() => new Error('Test error')))
        .subscribe({
          next: r => results.push(r),
          error: e => errors.push(e)
        });
      service.batch(batchKey, 'req3', of({ id: 3 })).subscribe(r => results.push(r));

      tick(60);

      expect(results.length).toBe(2);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error');
    }));
  });

  describe('flush', () => {
    it('should execute batch immediately', fakeAsync(() => {
      const batchKey = 'test-batch';
      const results: any[] = [];

      service.batch(batchKey, 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.batch(batchKey, 'req2', of({ id: 2 })).subscribe(r => results.push(r));

      // Flush without waiting
      service.flush(batchKey);
      tick(10);

      expect(results.length).toBe(2);
    }));
  });

  describe('flushAll', () => {
    it('should execute all pending batches', fakeAsync(() => {
      const results: any[] = [];

      service.batch('batch1', 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.batch('batch2', 'req2', of({ id: 2 })).subscribe(r => results.push(r));

      service.flushAll();
      tick(10);

      expect(results.length).toBe(2);
    }));
  });

  describe('cancel', () => {
    it('should cancel pending batch', fakeAsync(() => {
      const batchKey = 'test-batch';
      const results: any[] = [];

      service.batch(batchKey, 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.cancel(batchKey);

      tick(60);

      expect(results.length).toBe(0);
    }));
  });

  describe('cancelAll', () => {
    it('should cancel all pending batches', fakeAsync(() => {
      const results: any[] = [];

      service.batch('batch1', 'req1', of({ id: 1 })).subscribe(r => results.push(r));
      service.batch('batch2', 'req2', of({ id: 2 })).subscribe(r => results.push(r));

      service.cancelAll();
      tick(60);

      expect(results.length).toBe(0);
    }));
  });

  describe('getStats', () => {
    it('should return batch statistics', () => {
      service.batch('batch1', 'req1', of({ id: 1 })).subscribe();
      service.batch('batch1', 'req2', of({ id: 2 })).subscribe();
      service.batch('batch2', 'req3', of({ id: 3 })).subscribe();

      const stats = service.getStats();

      expect(stats.batchCount).toBe(2);
      expect(stats.totalRequests).toBe(3);
      expect(stats.batches['batch1']).toBe(2);
      expect(stats.batches['batch2']).toBe(1);
    });
  });
});

describe('batchRequests', () => {
  it('should batch multiple observables', (done) => {
    const requests = [
      of({ id: 1 }),
      of({ id: 2 }),
      of({ id: 3 })
    ];

    batchRequests(requests).subscribe(results => {
      expect(results.length).toBe(3);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toEqual({ id: 2 });
      expect(results[2]).toEqual({ id: 3 });
      done();
    });
  });

  it('should handle empty array', (done) => {
    batchRequests([]).subscribe(results => {
      expect(results).toEqual([]);
      done();
    });
  });

  it('should handle errors gracefully', (done) => {
    const requests = [
      of({ id: 1 }),
      throwError(() => new Error('Test error')),
      of({ id: 3 })
    ];

    batchRequests(requests).subscribe(results => {
      expect(results.length).toBe(3);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toBeNull();
      expect(results[2]).toEqual({ id: 3 });
      done();
    });
  });
});

describe('batchRequestsWithErrors', () => {
  it('should batch requests and capture errors', (done) => {
    const requests = [
      of({ id: 1 }),
      throwError(() => new Error('Test error')),
      of({ id: 3 })
    ];

    batchRequestsWithErrors(requests).subscribe(results => {
      expect(results.length).toBe(3);
      expect(results[0].data).toEqual({ id: 1 });
      expect(results[1].error).toBeDefined();
      expect(results[1].error.message).toBe('Test error');
      expect(results[2].data).toEqual({ id: 3 });
      done();
    });
  });

  it('should handle empty array', (done) => {
    batchRequestsWithErrors([]).subscribe(results => {
      expect(results).toEqual([]);
      done();
    });
  });
});
