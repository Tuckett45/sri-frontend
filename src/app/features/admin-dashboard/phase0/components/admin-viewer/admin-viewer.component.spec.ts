import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AdminViewerComponent } from './admin-viewer.component';
import {
  selectAdminMetrics,
  selectActiveUsers,
  selectSystemHealth,
  selectFilteredAuditLog,
  selectAdminViewerLoading,
  selectAdminViewerError
} from '../../state/admin-viewer/admin-viewer.selectors';

describe('AdminViewerComponent', () => {
  let component: AdminViewerComponent;
  let fixture: ComponentFixture<AdminViewerComponent>;
  let store: MockStore;

  const initialState = {
    adminViewer: {
      metrics: null,
      activeUsers: [],
      systemHealth: null,
      auditLog: [],
      loading: false,
      error: null,
      lastUpdated: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminViewerComponent],
      imports: [FormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AdminViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.selectedTimeRange).toBe('last24hours');
    expect(component.refreshInterval).toBe(30000);
    expect(component.autoRefreshEnabled).toBe(true);
  });

  it('should have observables from store', () => {
    expect(component.adminMetrics$).toBeDefined();
    expect(component.activeUsers$).toBeDefined();
    expect(component.systemHealth$).toBeDefined();
    expect(component.auditLog$).toBeDefined();
    expect(component.loading$).toBeDefined();
    expect(component.error$).toBeDefined();
  });

  it('should dispatch loadAdminMetrics on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should format timestamp correctly', () => {
    const date = new Date('2024-01-15T10:30:00');
    const formatted = component.formatTimestamp(date);
    expect(formatted).toContain('2024');
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(45)).toBe('45s');
    expect(component.formatDuration(90)).toBe('1m 30s');
    expect(component.formatDuration(3665)).toBe('1h 1m');
  });

  it('should return correct health status class', () => {
    expect(component.getHealthStatusClass('healthy')).toBe('health-healthy');
    expect(component.getHealthStatusClass('degraded')).toBe('health-degraded');
    expect(component.getHealthStatusClass('critical')).toBe('health-critical');
    expect(component.getHealthStatusClass(undefined)).toBe('health-unknown');
  });

  it('should apply filters correctly', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.userIdFilter = 'user123';
    component.actionTypeFilter = 'CREATE';
    component.applyFilters();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should clear filters', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.userIdFilter = 'user123';
    component.actionTypeFilter = 'CREATE';
    component.clearFilters();
    expect(component.userIdFilter).toBe('');
    expect(component.actionTypeFilter).toBe('');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should dispatch exportAuditLog action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.exportAuditLog('csv');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should change time range and reload data', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onTimeRangeChange('last7days');
    expect(component.selectedTimeRange).toBe('last7days');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should toggle auto-refresh', () => {
    const initialState = component.autoRefreshEnabled;
    component.toggleAutoRefresh();
    expect(component.autoRefreshEnabled).toBe(!initialState);
  });

  it('should cleanup on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
