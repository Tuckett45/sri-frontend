import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { JobCardComponent } from './job-card.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { TimeEntry } from '../../../models/time-entry.model';
import { updateJobStatus } from '../../../state/jobs/job.actions';
import { clockIn, clockOut } from '../../../state/time-entries/time-entry.actions';
import { selectActiveTimeEntry } from '../../../state/time-entries/time-entry.selectors';

describe('JobCardComponent', () => {
  let component: JobCardComponent;
  let fixture: ComponentFixture<JobCardComponent>;
  let store: MockStore;

  const mockJob: Job = {
    id: '1',
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
    status: JobStatus.NotStarted,
    scopeDescription: 'Test job',
    requiredSkills: [],
    requiredCrewSize: 1,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date('2024-01-01T10:00:00'),
    scheduledEndDate: new Date('2024-01-01T14:00:00'),
    customerPOC: {
      name: 'John Doe',
      phone: '555-1234',
      email: 'john@example.com'
    },
    attachments: [],
    notes: [],
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTimeEntry: TimeEntry = {
    id: 'te-1',
    jobId: '1',
    technicianId: 'tech-1',
    clockInTime: new Date(),
    isManuallyAdjusted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobCardComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectActiveTimeEntry, value: null }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobCardComponent);
    component = fixture.componentInstance;
    component.job = mockJob;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update job status', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.updateStatus(JobStatus.EnRoute);
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      updateJobStatus({
        id: mockJob.id,
        status: JobStatus.EnRoute
      })
    );
  });

  it('should dispatch clock in action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onClockIn();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: clockIn.type,
        jobId: mockJob.id
      })
    );
  });

  it('should dispatch clock out action when time entry exists', () => {
    component.activeTimeEntry = mockTimeEntry;
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onClockOut();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      clockOut({ timeEntryId: mockTimeEntry.id })
    );
  });

  it('should not dispatch clock out when no time entry', () => {
    component.activeTimeEntry = null;
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onClockOut();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should emit view details event', () => {
    spyOn(component.viewDetails, 'emit');
    component.onViewDetails();
    expect(component.viewDetails.emit).toHaveBeenCalledWith(mockJob);
  });

  it('should emit upload photo event', () => {
    spyOn(component.uploadPhoto, 'emit');
    component.onUploadPhoto();
    expect(component.uploadPhoto.emit).toHaveBeenCalledWith(mockJob);
  });

  it('should emit swipe right event', () => {
    spyOn(component.swipeRight, 'emit');
    component.onSwipe();
    expect(component.swipeRight.emit).toHaveBeenCalledWith(mockJob);
  });

  it('should format address correctly', () => {
    const formatted = component.formattedAddress;
    expect(formatted).toBe('123 Main St, Test City, TS 12345');
  });

  it('should format scheduled time correctly', () => {
    const formatted = component.formattedScheduledTime;
    expect(formatted).toContain('10:00');
  });

  it('should show correct available status actions for NotStarted', () => {
    component.job.status = JobStatus.NotStarted;
    const actions = component.availableStatusActions;
    
    expect(actions.length).toBe(1);
    expect(actions[0].status).toBe(JobStatus.EnRoute);
  });

  it('should show correct available status actions for EnRoute', () => {
    component.job.status = JobStatus.EnRoute;
    const actions = component.availableStatusActions;
    
    expect(actions.length).toBe(1);
    expect(actions[0].status).toBe(JobStatus.OnSite);
  });

  it('should show correct available status actions for OnSite', () => {
    component.job.status = JobStatus.OnSite;
    const actions = component.availableStatusActions;
    
    expect(actions.length).toBe(2);
    expect(actions[0].status).toBe(JobStatus.Completed);
    expect(actions[1].status).toBe(JobStatus.Issue);
  });

  it('should allow clock in when EnRoute and not clocked in', () => {
    component.job.status = JobStatus.EnRoute;
    component.isClockedIn = false;
    expect(component.canClockIn).toBe(true);
  });

  it('should allow clock in when OnSite and not clocked in', () => {
    component.job.status = JobStatus.OnSite;
    component.isClockedIn = false;
    expect(component.canClockIn).toBe(true);
  });

  it('should not allow clock in when already clocked in', () => {
    component.job.status = JobStatus.OnSite;
    component.isClockedIn = true;
    expect(component.canClockIn).toBe(false);
  });

  it('should allow clock out when clocked in', () => {
    component.isClockedIn = true;
    expect(component.canClockOut).toBe(true);
  });

  it('should not allow clock out when not clocked in', () => {
    component.isClockedIn = false;
    expect(component.canClockOut).toBe(false);
  });

  it('should detect customer contact availability', () => {
    expect(component.hasCustomerContact).toBe(true);
    
    component.job.customerPOC = undefined;
    expect(component.hasCustomerContact).toBe(false);
  });

  it('should get correct status color class', () => {
    component.job.status = JobStatus.NotStarted;
    expect(component.statusColorClass).toBe('status-gray');
    
    component.job.status = JobStatus.EnRoute;
    expect(component.statusColorClass).toBe('status-blue');
    
    component.job.status = JobStatus.OnSite;
    expect(component.statusColorClass).toBe('status-orange');
    
    component.job.status = JobStatus.Completed;
    expect(component.statusColorClass).toBe('status-green');
    
    component.job.status = JobStatus.Issue;
    expect(component.statusColorClass).toBe('status-red');
  });

  it('should update elapsed time when clocked in', () => {
    const clockInTime = new Date();
    clockInTime.setHours(clockInTime.getHours() - 2); // 2 hours ago
    
    component.activeTimeEntry = {
      ...mockTimeEntry,
      clockInTime
    };
    component.isClockedIn = true;
    
    component['updateElapsedTime']();
    
    expect(component.elapsedTime).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should pad numbers correctly', () => {
    expect(component['pad'](5)).toBe('05');
    expect(component['pad'](15)).toBe('15');
  });

  it('should set isClockedIn when active entry matches job', () => {
    store.overrideSelector(selectActiveTimeEntry, {
      ...mockTimeEntry,
      jobId: mockJob.id,
      clockOutTime: undefined
    });
    store.refreshState();
    fixture.detectChanges();
    
    expect(component.isClockedIn).toBe(true);
  });

  it('should not set isClockedIn when active entry is for different job', () => {
    store.overrideSelector(selectActiveTimeEntry, {
      ...mockTimeEntry,
      jobId: 'different-job-id',
      clockOutTime: undefined
    });
    store.refreshState();
    fixture.detectChanges();
    
    expect(component.isClockedIn).toBe(false);
  });
});
