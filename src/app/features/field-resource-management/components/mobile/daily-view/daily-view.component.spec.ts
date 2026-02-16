import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DailyViewComponent } from './daily-view.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { selectAllJobs, selectJobsLoading } from '../../../state/jobs/job.selectors';
import { loadJobs } from '../../../state/jobs/job.actions';

describe('DailyViewComponent', () => {
  let component: DailyViewComponent;
  let fixture: ComponentFixture<DailyViewComponent>;
  let store: MockStore;

  const mockJobs: Job[] = [
    {
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
      scheduledStartDate: new Date(),
      scheduledEndDate: new Date(),
      attachments: [],
      notes: [],
      createdBy: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailyViewComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectAllJobs, value: mockJobs },
            { selector: selectJobsLoading, value: false }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(DailyViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load today jobs on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: loadJobs.type })
    );
  });

  it('should filter jobs for today', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const jobs: Job[] = [
      { ...mockJobs[0], scheduledStartDate: today },
      { ...mockJobs[0], id: '2', scheduledStartDate: yesterday }
    ];

    store.overrideSelector(selectAllJobs, jobs);
    store.refreshState();
    fixture.detectChanges();

    component.jobs$.subscribe(filteredJobs => {
      expect(filteredJobs.length).toBe(1);
      expect(filteredJobs[0].id).toBe('1');
    });
  });

  it('should sort jobs by scheduled time', () => {
    const job1 = { ...mockJobs[0], id: '1', scheduledStartDate: new Date('2024-01-01T10:00:00') };
    const job2 = { ...mockJobs[0], id: '2', scheduledStartDate: new Date('2024-01-01T08:00:00') };
    const job3 = { ...mockJobs[0], id: '3', scheduledStartDate: new Date('2024-01-01T14:00:00') };

    store.overrideSelector(selectAllJobs, [job1, job2, job3]);
    store.refreshState();
    fixture.detectChanges();

    component.jobs$.subscribe(sortedJobs => {
      expect(sortedJobs[0].id).toBe('2'); // 8:00 AM
      expect(sortedJobs[1].id).toBe('1'); // 10:00 AM
      expect(sortedJobs[2].id).toBe('3'); // 2:00 PM
    });
  });

  it('should update job counts correctly', () => {
    const jobs: Job[] = [
      { ...mockJobs[0], id: '1', status: JobStatus.NotStarted },
      { ...mockJobs[0], id: '2', status: JobStatus.EnRoute },
      { ...mockJobs[0], id: '3', status: JobStatus.OnSite },
      { ...mockJobs[0], id: '4', status: JobStatus.Completed },
      { ...mockJobs[0], id: '5', status: JobStatus.Issue }
    ];

    store.overrideSelector(selectAllJobs, jobs);
    store.refreshState();
    fixture.detectChanges();

    expect(component.jobCounts.total).toBe(5);
    expect(component.jobCounts.notStarted).toBe(1);
    expect(component.jobCounts.enRoute).toBe(1);
    expect(component.jobCounts.onSite).toBe(1);
    expect(component.jobCounts.completed).toBe(1);
    expect(component.jobCounts.issue).toBe(1);
  });

  it('should handle refresh', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRefresh();
    expect(component.isRefreshing).toBe(true);
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should get next status correctly', () => {
    expect(component['getNextStatus'](JobStatus.NotStarted)).toBe(JobStatus.EnRoute);
    expect(component['getNextStatus'](JobStatus.EnRoute)).toBe(JobStatus.OnSite);
    expect(component['getNextStatus'](JobStatus.OnSite)).toBe(JobStatus.Completed);
    expect(component['getNextStatus'](JobStatus.Completed)).toBe(null);
  });

  it('should format date correctly', () => {
    const formatted = component.formattedDate;
    expect(formatted).toContain(component.todayDate.getFullYear().toString());
  });

  it('should show correct sync status when online', () => {
    component.isOnline = true;
    component.isSyncing = false;
    expect(component.syncStatusMessage).toBe('All changes synced');
    expect(component.syncStatusIcon).toBe('cloud_done');
  });

  it('should show correct sync status when offline', () => {
    component.isOnline = false;
    expect(component.syncStatusMessage).toBe('Offline - Changes will sync when online');
    expect(component.syncStatusIcon).toBe('cloud_off');
  });

  it('should show correct sync status when syncing', () => {
    component.isOnline = true;
    component.isSyncing = true;
    expect(component.syncStatusMessage).toBe('Syncing...');
    expect(component.syncStatusIcon).toBe('sync');
  });

  it('should track jobs by id', () => {
    const job = mockJobs[0];
    expect(component.trackByJobId(0, job)).toBe(job.id);
  });
});
