import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TimecardDashboardComponent } from './timecard-dashboard.component';
import { AccessibilityService } from '../../../services/accessibility.service';
import { TimeEntry } from '../../../models/time-entry.model';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import * as TimeEntrySelectors from '../../../state/time-entries/time-entry.selectors';

describe('TimecardDashboardComponent', () => {
  let component: TimecardDashboardComponent;
  let fixture: ComponentFixture<TimecardDashboardComponent>;
  let store: MockStore;
  let accessibilityService: jasmine.SpyObj<AccessibilityService>;

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

  const mockTimeEntry: TimeEntry = {
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date(),
    clockOutTime: undefined,
    totalHours: 0,
    mileage: 0,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    timeEntries: {
      ids: ['entry-1'],
      entities: { 'entry-1': mockTimeEntry },
      activeEntry: mockTimeEntry,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    const accessibilityServiceSpy = jasmine.createSpyObj('AccessibilityService', ['announce', 'announceError']);

    await TestBed.configureTestingModule({
      declarations: [TimecardDashboardComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: AccessibilityService, useValue: accessibilityServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    accessibilityService = TestBed.inject(AccessibilityService) as jasmine.SpyObj<AccessibilityService>;
    fixture = TestBed.createComponent(TimecardDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate hours correctly', () => {
    const entry: TimeEntry = {
      id: 'test',
      jobId: 'job-1',
      technicianId: 'tech-1',
      clockInTime: new Date('2024-01-01T08:00:00'),
      clockOutTime: new Date('2024-01-01T16:00:00'),
      totalHours: 8,
      mileage: 0,
      isManuallyAdjusted: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const hours = component.calculateHours(entry);
    expect(hours).toBe(8);
  });

  it('should format hours correctly', () => {
    expect(component.formatHours(8.5)).toBe('8h 30m');
    expect(component.formatHours(2.25)).toBe('2h 15m');
  });

  it('should announce loading state', () => {
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryLoading, true);
    store.refreshState();
    fixture.detectChanges();
    
    expect(accessibilityService.announce).toHaveBeenCalledWith('Loading timecard data');
  });

  it('should announce errors', () => {
    const errorMessage = 'Failed to load timecard';
    store.overrideSelector(TimeEntrySelectors.selectTimeEntryError, errorMessage);
    store.refreshState();
    fixture.detectChanges();
    
    expect(accessibilityService.announceError).toHaveBeenCalledWith(errorMessage);
  });
});
