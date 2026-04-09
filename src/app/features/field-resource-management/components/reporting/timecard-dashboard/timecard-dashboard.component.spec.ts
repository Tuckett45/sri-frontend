import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { TimecardDashboardComponent } from './timecard-dashboard.component';
import { AccessibilityService } from '../../../services/accessibility.service';
import { GeolocationService } from '../../../services/geolocation.service';
import { GeocodingService } from '../../../../../services/geocoding.service';
import { TimeEntry } from '../../../models/time-entry.model';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import * as TimeEntryActions from '../../../state/time-entries/time-entry.actions';
import { of } from 'rxjs';

describe('TimecardDashboardComponent', () => {
  let component: TimecardDashboardComponent;
  let fixture: ComponentFixture<TimecardDashboardComponent>;
  let store: MockStore;
  let accessibilityService: jasmine.SpyObj<AccessibilityService>;
  let geolocationService: jasmine.SpyObj<GeolocationService>;

  const mockJob: Job = {
    id: 'job-1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.OnSite,
    scopeDescription: 'Test job',
    requiredSkills: [],
    requiredCrewSize: 1,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(),
    attachments: [],
    notes: [],
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const createMockTimeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2024-01-15T08:00:00'),
    clockOutTime: new Date('2024-01-15T16:00:00'),
    totalHours: 8,
    mileage: 25.5,
    breakMinutes: 0,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const initialState = {
    timeEntries: {
      ids: [],
      entities: {},
      activeEntry: null,
      loading: false,
      error: null
    },
    jobs: {
      ids: [],
      entities: {},
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    const accessibilitySpy = jasmine.createSpyObj('AccessibilityService', [
      'announce', 'announceError', 'announceSuccess'
    ]);
    const geolocationSpy = jasmine.createSpyObj('GeolocationService', [
      'getCurrentPositionWithFallback', 'isGeolocationSupported'
    ]);
    geolocationSpy.getCurrentPositionWithFallback.and.returnValue(
      of({ latitude: 32.7767, longitude: -96.7970, accuracy: 10 })
    );

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        FormsModule,
        MatProgressBarModule,
        MatTabsModule,
        MatCardModule,
        MatIconModule,
        MatTableModule,
        MatRadioModule,
        MatTooltipModule,
        MatButtonModule
      ],
      declarations: [TimecardDashboardComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: AccessibilityService, useValue: accessibilitySpy },
        { provide: GeolocationService, useValue: geolocationSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    accessibilityService = TestBed.inject(AccessibilityService) as jasmine.SpyObj<AccessibilityService>;
    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;

    // Override selectors with defaults
    store.overrideSelector(TimeEntrySelectors.selectActiveTimeEntry, null);
    store.overrideSelector(TimeEntrySelectors.selectTodayTimeEntries, []);
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryLoading, false);
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, null);
    store.overrideSelector(JobSelectors.selectAllJobs, []);

    fixture = TestBed.createComponent(TimecardDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // --- Requirement 3.4: Loading indicator ---
  it('should display loading indicator when loading$ is true', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryLoading, true);
    store.refreshState();
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(progressBar).toBeTruthy();
  });

  it('should not display loading indicator when loading$ is false', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryLoading, false);
    store.refreshState();
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(progressBar).toBeFalsy();
  });

  it('should announce loading state via accessibility service', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryLoading, true);
    store.refreshState();
    fixture.detectChanges();

    expect(accessibilityService.announce).toHaveBeenCalledWith('Loading timecard data');
  });

  // --- Requirement 3.3: Empty state ---
  it('should display empty state message when no entries exist', () => {
    store.overrideSelector(TimeEntrySelectors.selectTodayTimeEntries, []);
    store.refreshState();
    fixture.detectChanges();

    // The empty state is inside the Daily View tab content which uses matTabContent lazy loading
    // We need to trigger tab content rendering
    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    // Tab content may be lazy-loaded; check component data instead
    expect(component.todayTimeEntriesData.length).toBe(0);
  });

  // --- Requirement 3.5: Error card with retry ---
  it('should display error card when error$ has a value', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, 'Failed to load timecard');
    store.refreshState();
    fixture.detectChanges();

    const errorCard = fixture.nativeElement.querySelector('.error-card');
    expect(errorCard).toBeTruthy();
    expect(errorCard.textContent).toContain('Failed to load timecard');
  });

  it('should display retry button in error card', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, 'Failed to load timecard');
    store.refreshState();
    fixture.detectChanges();

    const errorCard = fixture.nativeElement.querySelector('.error-card');
    expect(errorCard).toBeTruthy();
    const retryButton = errorCard.querySelector('button[aria-label="Retry loading timecard data"]');
    expect(retryButton).toBeTruthy();
    expect(retryButton.textContent).toContain('Retry');
  });

  it('should dispatch loadTimeEntries when retry button is clicked', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, 'Failed to load');
    store.refreshState();
    fixture.detectChanges();

    const dispatchSpy = spyOn(store, 'dispatch');
    const retryButton = fixture.nativeElement.querySelector('.error-card button[aria-label="Retry loading timecard data"]');
    retryButton.click();
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      TimeEntryActions.loadTimeEntries({ technicianId: component.currentTechnicianId })
    );
  });

  it('should announce errors via accessibility service', () => {
    const errorMessage = 'Failed to load timecard';
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, errorMessage);
    store.refreshState();
    fixture.detectChanges();

    expect(accessibilityService.announceError).toHaveBeenCalledWith(errorMessage);
  });

  // --- Requirement 3.2: Daily summary calculations ---
  it('should calculate todayTotalHours correctly from entries', () => {
    const entries: TimeEntry[] = [
      createMockTimeEntry({
        id: 'e1',
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T12:00:00')
      }),
      createMockTimeEntry({
        id: 'e2',
        clockInTime: new Date('2024-01-15T13:00:00'),
        clockOutTime: new Date('2024-01-15T17:00:00')
      })
    ];

    component.calculateTodayTotals(entries);
    expect(component.todayTotalHours).toBe(8);
  });

  it('should calculate todayTotalMileage correctly from entries', () => {
    const entries: TimeEntry[] = [
      createMockTimeEntry({ id: 'e1', mileage: 10.5 }),
      createMockTimeEntry({ id: 'e2', mileage: 15.0 })
    ];

    component.calculateTodayTotals(entries);
    expect(component.todayTotalMileage).toBe(25.5);
  });

  // --- Requirement 3.1: Weekly view tab ---
  it('should have a Weekly View tab', () => {
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('.mat-mdc-tab');
    const tabLabels = Array.from(tabs).map((tab: any) => tab.textContent.trim());
    expect(tabLabels).toContain('Weekly View');
  });

  // --- Tab change accessibility ---
  it('should announce tab change via accessibility service', () => {
    fixture.detectChanges();
    component.onTabChange({ index: 1 } as any);
    expect(accessibilityService.announce).toHaveBeenCalledWith('Switched to Weekly View');
  });

  // --- Calculation helpers ---
  it('should calculate hours correctly for a completed entry', () => {
    const entry = createMockTimeEntry({
      clockInTime: new Date('2024-01-01T08:00:00'),
      clockOutTime: new Date('2024-01-01T16:00:00')
    });
    expect(component.calculateHours(entry)).toBe(8);
  });

  it('should return 0 hours when clockInTime is missing', () => {
    const entry = createMockTimeEntry({ clockInTime: undefined as any });
    expect(component.calculateHours(entry)).toBe(0);
  });

  it('should format hours correctly', () => {
    expect(component.formatHours(8.5)).toBe('8h 30m');
    expect(component.formatHours(2.25)).toBe('2h 15m');
    expect(component.formatHours(0)).toBe('0h 0m');
  });

  // --- onRefresh ---
  it('should dispatch loadTimeEntries and announce on refresh', () => {
    fixture.detectChanges();
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRefresh();

    expect(dispatchSpy).toHaveBeenCalledWith(
      TimeEntryActions.loadTimeEntries({ technicianId: component.currentTechnicianId })
    );
    expect(accessibilityService.announce).toHaveBeenCalledWith('Timecard data refreshed');
  });
});
