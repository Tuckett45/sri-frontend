import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { JobStatus } from '../../../models/job.model';
import { Trend, KPIStatus } from '../../../models/reporting.model';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';
import * as ReportingActions from '../../../state/reporting/reporting.actions';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: MockStore;

  const mockDashboard = {
    totalActiveJobs: 25,
    totalAvailableTechnicians: 10,
    averageUtilization: 75,
    jobsByStatus: {
      [JobStatus.NotStarted]: 5,
      [JobStatus.EnRoute]: 3,
      [JobStatus.OnSite]: 7,
      [JobStatus.Completed]: 8,
      [JobStatus.Issue]: 2,
      [JobStatus.Cancelled]: 0
    },
    jobsRequiringAttention: [],
    recentActivity: [
      {
        id: '1',
        type: 'job_assigned',
        description: 'Job #123 assigned to John Doe',
        timestamp: new Date(),
        userId: 'user1'
      }
    ],
    kpis: [
      {
        name: 'Jobs Assigned',
        value: 95,
        target: 95,
        unit: '%',
        trend: Trend.Up,
        status: KPIStatus.OnTrack
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: ReportingSelectors.selectDashboard, value: mockDashboard },
            { selector: ReportingSelectors.selectReportingLoading, value: false },
            { selector: ReportingSelectors.selectReportingError, value: null },
            { selector: ReportingSelectors.selectTotalActiveJobs, value: 25 },
            { selector: ReportingSelectors.selectTotalAvailableTechnicians, value: 10 },
            { selector: ReportingSelectors.selectAverageUtilization, value: 75 },
            { selector: ReportingSelectors.selectJobsByStatus, value: mockDashboard.jobsByStatus },
            { selector: ReportingSelectors.selectJobsRequiringAttention, value: [] },
            { selector: ReportingSelectors.selectRecentActivity, value: mockDashboard.recentActivity },
            { selector: ReportingSelectors.selectDashboardKPIs, value: mockDashboard.kpis }
          ]
        })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadDashboard action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(ReportingActions.loadDashboard());
  });

  it('should update charts when dashboard data changes', () => {
    fixture.detectChanges();
    expect(component.jobStatusChartLabels.length).toBeGreaterThan(0);
    expect(component.utilizationGaugeValue).toBe(75);
  });

  it('should format activity time correctly', () => {
    const now = new Date();
    expect(component.formatActivityTime(now)).toBe('Just now');
    
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(component.formatActivityTime(oneHourAgo)).toBe('1h ago');
  });

  it('should get correct activity icon', () => {
    expect(component.getActivityIcon('job_assigned')).toBe('assignment');
    expect(component.getActivityIcon('job_completed')).toBe('check_circle');
    expect(component.getActivityIcon('unknown')).toBe('info');
  });

  it('should get correct status color', () => {
    expect(component.getStatusColor(JobStatus.Completed)).toBe('green');
    expect(component.getStatusColor(JobStatus.Issue)).toBe('red');
    expect(component.getStatusColor(JobStatus.EnRoute)).toBe('blue');
  });

  it('should dispatch refresh action on manual refresh', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRefresh();
    expect(dispatchSpy).toHaveBeenCalledWith(ReportingActions.refreshDashboard());
  });
});
