import { TestBed } from '@angular/core/testing';
import { StatePersistenceService } from './state-persistence.service';

describe('StatePersistenceService', () => {
  let service: StatePersistenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatePersistenceService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect when no persisted state exists', () => {
    expect(service.hasPersistedState()).toBe(false);
  });

  it('should clear persisted state', () => {
    localStorage.setItem('frm_time_entry_state', JSON.stringify({ test: 'data' }));
    expect(service.hasPersistedState()).toBe(true);
    
    service.clearPersistedState();
    expect(service.hasPersistedState()).toBe(false);
  });

  it('should get persisted state info', () => {
    const info = service.getPersistedStateInfo();
    expect(info.hasActiveEntry).toBe(false);
    expect(info.timestamp).toBeNull();
  });

  it('should check storage quota', () => {
    const quota = service.checkStorageQuota();
    expect(quota.used).toBeGreaterThanOrEqual(0);
    expect(quota.available).toBeGreaterThan(0);
    expect(quota.percentage).toBeGreaterThanOrEqual(0);
  });
});
