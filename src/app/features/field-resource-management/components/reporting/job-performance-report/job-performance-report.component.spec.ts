import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobPerformanceReportComponent } from './job-performance-report.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { JobType, Priority } from '../../../models/job.model';
import { TechnicianRole, EmploymentType } from '../../../models/technician.model';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';
import * as ReportingActions from '../../../state/reporting/reporting.actions';

describe('JobPerformanceReportComponent', () => {
  let component: JobPerformanceReportComponent;
  let fixture: ComponentFixture<JobPerformanceReportComponent>;
  let store: MockStore;

  const mockPerformanceReport = {
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    totalJobsCompleted: 50,
    totalJobsOpen: 10,
    averageLaborHours: 8.5,
    scheduleAdherence: 85,
    jobsByType: {
      [JobType.Install]: 25,
      [JobType.Decom]: 10,
      [JobType.SiteSurvey]: 8,
      [JobType.PM]: 7
    },
    topPerformers: [
      {
        technician: {
          id: '1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Installer,
          employmentType: EmploymentType.W2,
          homeBase: 'HQ',
          region: 'North',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        jobsCompleted: 15,
        totalHours: 120,
        averageJobDuration: 8,
        onTimeCompletionRate: 95
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobPerformanceReportComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: ReportingSelectors.selectPerformanceReport, value: mockPerformanceReport },
            { selector: ReportingSelectors.selectReportingLoading, value: false },
            { selector: ReportingSelectors.selectReportingError, value: null }
          ]
        })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobPerformanceReportComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set default date range on init', () => {
    fixture.detectChanges();
    expect(component.selectedDateRange).toBeTruthy();
    expect(component.selectedDateRange?.startDate).toBeDefined();
    expect(component.selectedDateRange?.endDate).toBeDefined();
  });

  it('should dispatch loadJobPerformance action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: '[Reporting] Load Job Performance'
      })
    );
  });

  it('should update metrics when report changes', () => {
    fixture.detectChanges();
    expect(component.totalJobsCompleted).toBe(50);
    expect(component.totalJobsOpen).toBe(10);
    expect(component.averageLaborHours).toBe(8.5);
    expect(component.scheduleAdherence).toBe(85);
    expect(component.completionRate).toBeCloseTo(83.33, 1);
  });

  it('should update charts when report changes', () => {
    fixture.detectChanges();
    expect(component.plannedVsActualChartData.length).toBeGreaterThan(0);
    expect(component.trendChartData.length).toBeGreaterThan(0);
    expect(component.jobsByTypeChartData.length).toBeGreaterThan(0);
  });

  it('should reload report when filters change', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    component.onJobTypeFilterChange(JobType.Install);
    
    expect(component.selectedJobType).toBe(JobType.Install);
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should clear filters', () => {
    component.selectedJobType = JobType.Install;
    component.selectedPriority = Priority.P1;
    component.selectedClient = 'Client A';
    
    component.clearFilters();
    
    expect(component.selectedJobType).toBeNull();
    expect(component.selectedPriority).toBeNull();
    expect(component.selectedClient).toBeNull();
  });

  it('should return correct schedule adherence color', () => {
    component.scheduleAdherence = 95;
    expect(component.getScheduleAdherenceColor()).toBe('primary');
    
    component.scheduleAdherence = 80;
    expect(component.getScheduleAdherenceColor()).toBe('accent');
    
    component.scheduleAdherence = 60;
    expect(component.getScheduleAdherenceColor()).toBe('warn');
  });

  it('should return correct completion rate color', () => {
    component.completionRate = 85;
    expect(component.getCompletionRateColor()).toBe('primary');
    
    component.completionRate = 65;
    expect(component.getCompletionRateColor()).toBe('accent');
    
    component.completionRate = 45;
    expect(component.getCompletionRateColor()).toBe('warn');
  });
});
