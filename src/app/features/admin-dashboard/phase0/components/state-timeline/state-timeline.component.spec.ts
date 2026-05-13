import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { StateTimelineComponent } from './state-timeline.component';
import { StateTransition } from '../../models/state-visualization.models';
import { loadStateTransitions } from '../../state/state-history/state-history.actions';
import { selectSortedTransitions, selectStateHistoryLoading } from '../../state/state-history/state-history.selectors';

describe('StateTimelineComponent', () => {
  let component: StateTimelineComponent;
  let fixture: ComponentFixture<StateTimelineComponent>;
  let store: MockStore;

  const mockTransitions: StateTransition[] = [
    {
      id: '1',
      fromState: 'draft',
      toState: 'submitted',
      trigger: 'submit',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      userId: 'user1',
      userName: 'John Doe',
      reason: 'Ready for review',
      metadata: { priority: 'high' }
    },
    {
      id: '2',
      fromState: 'submitted',
      toState: 'approved',
      trigger: 'approve',
      timestamp: new Date('2024-01-15T14:30:00Z'),
      userId: 'user2',
      userName: 'Jane Smith',
      reason: 'Looks good',
      metadata: { approver: 'manager' }
    },
    {
      id: '3',
      fromState: 'approved',
      toState: 'completed',
      trigger: 'complete',
      timestamp: new Date('2024-01-16T09:00:00Z'),
      userId: 'user1',
      userName: 'John Doe',
      metadata: {}
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StateTimelineComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectSortedTransitions, value: mockTransitions },
            { selector: selectStateHistoryLoading, value: false }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(StateTimelineComponent);
    component = fixture.componentInstance;
    component.entityId = 'entity-123';
    component.entityType = 'job';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load timeline on init', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.ngOnInit();

      expect(dispatchSpy).toHaveBeenCalledWith(
        loadStateTransitions({ entityId: 'entity-123', entityType: 'job' })
      );
    });

    it('should initialize with default display options', () => {
      expect(component.groupByDate).toBe(true);
      expect(component.showMetadata).toBe(true);
      expect(component.compactView).toBe(false);
    });

    it('should subscribe to timeline$ and populate filteredTimeline', (done) => {
      component.ngOnInit();

      component.timeline$.subscribe(() => {
        expect(component.filteredTimeline.length).toBe(3);
        done();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.filteredTimeline = [...mockTransitions];
    });

    it('should filter by date range', (done) => {
      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');

      component.filterByDateRange(start, end);

      setTimeout(() => {
        expect(component.filteredTimeline.length).toBe(2);
        expect(component.filteredTimeline.every(t => {
          const date = new Date(t.timestamp);
          return date >= start && date <= end;
        })).toBe(true);
        done();
      }, 100);
    });

    it('should filter by user', (done) => {
      component.filterByUser('user1');

      setTimeout(() => {
        expect(component.filteredTimeline.length).toBe(2);
        expect(component.filteredTimeline.every(t => t.userId === 'user1')).toBe(true);
        done();
      }, 100);
    });

    it('should clear all filters', (done) => {
      component.dateRangeStart = new Date('2024-01-15T00:00:00Z');
      component.dateRangeEnd = new Date('2024-01-15T23:59:59Z');
      component.selectedUserId = 'user1';

      component.clearFilters();

      setTimeout(() => {
        expect(component.dateRangeStart).toBeNull();
        expect(component.dateRangeEnd).toBeNull();
        expect(component.selectedUserId).toBeNull();
        expect(component.filteredTimeline.length).toBe(3);
        done();
      }, 100);
    });

    it('should apply multiple filters together', (done) => {
      const start = new Date('2024-01-15T00:00:00Z');
      const end = new Date('2024-01-15T23:59:59Z');
      
      component.dateRangeStart = start;
      component.dateRangeEnd = end;
      component.selectedUserId = 'user1';

      component.timeline$.subscribe(() => {
        const filtered = component.filteredTimeline;
        expect(filtered.length).toBe(1);
        expect(filtered[0].userId).toBe('user1');
        expect(new Date(filtered[0].timestamp) >= start).toBe(true);
        expect(new Date(filtered[0].timestamp) <= end).toBe(true);
        done();
      });
    });
  });

  describe('Display Options', () => {
    it('should toggle group by date', () => {
      const initial = component.groupByDate;
      component.toggleGroupByDate();
      expect(component.groupByDate).toBe(!initial);
    });

    it('should toggle metadata display', () => {
      const initial = component.showMetadata;
      component.toggleMetadata();
      expect(component.showMetadata).toBe(!initial);
    });

    it('should toggle compact view', () => {
      const initial = component.compactView;
      component.toggleCompactView();
      expect(component.compactView).toBe(!initial);
    });
  });

  describe('Grouping', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.filteredTimeline = [...mockTransitions];
      component.groupByDate = true;
    });

    it('should group transitions by date', () => {
      const grouped = component.getGroupedTimeline();

      expect(grouped.length).toBe(2); // Two different dates
      expect(grouped[0].transitions.length).toBe(2); // Jan 15
      expect(grouped[1].transitions.length).toBe(1); // Jan 16
    });

    it('should return empty array when groupByDate is false', () => {
      component.groupByDate = false;
      const grouped = component.getGroupedTimeline();
      expect(grouped.length).toBe(0);
    });

    it('should format dates correctly in groups', () => {
      const grouped = component.getGroupedTimeline();
      expect(grouped[0].date).toBeTruthy();
      expect(typeof grouped[0].date).toBe('string');
    });
  });

  describe('User List', () => {
    beforeEach(() => {
      component.filteredTimeline = [...mockTransitions];
    });

    it('should get unique users from timeline', () => {
      const users = component.getUniqueUsers();

      expect(users.length).toBe(2);
      expect(users.find(u => u.userId === 'user1')).toBeTruthy();
      expect(users.find(u => u.userId === 'user2')).toBeTruthy();
    });

    it('should include user names', () => {
      const users = component.getUniqueUsers();

      const user1 = users.find(u => u.userId === 'user1');
      expect(user1?.userName).toBe('John Doe');
    });
  });

  describe('Export', () => {
    beforeEach(() => {
      component.filteredTimeline = [...mockTransitions];
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');
    });

    it('should export timeline as CSV', () => {
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      
      component.exportTimeline('csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export timeline as JSON', () => {
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      
      component.exportTimeline('json');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include all transitions in CSV export', () => {
      let csvContent = '';
      const blobSpy = jasmine.createSpy('Blob').and.callFake((content: BlobPart[]) => {
        csvContent = content[0] as string;
        return new Blob(content);
      });
      (window as any).Blob = blobSpy;

      component.exportTimeline('csv');

      expect(csvContent).toContain('Timestamp');
      expect(csvContent).toContain('draft');
      expect(csvContent).toContain('submitted');
      expect(csvContent).toContain('John Doe');
    });
  });

  describe('Event Emission', () => {
    it('should emit transitionSelected when transition is clicked', () => {
      const emitSpy = spyOn(component.transitionSelected, 'emit');
      const transition = mockTransitions[0];

      component.onTransitionClick(transition);

      expect(emitSpy).toHaveBeenCalledWith(transition);
    });
  });

  describe('Formatting', () => {
    it('should format timestamp correctly', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = component.formatTimestamp(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = component.formatDate(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should format time correctly', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = component.formatTime(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when loading', (done) => {
      store.overrideSelector(selectStateHistoryLoading, true);
      store.refreshState();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should hide loading indicator when not loading', (done) => {
      store.overrideSelector(selectStateHistoryLoading, false);
      store.refreshState();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });
  });
});
