import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TechnicianScheduleComponent } from './technician-schedule.component';
import { Technician } from '../../../models/technician.model';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { Assignment } from '../../../models/assignment.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as JobActions from '../../../state/jobs/job.actions';

describe('TechnicianScheduleComponent', () => {
  let component: TechnicianScheduleComponent;
  let fixture: ComponentFixture<TechnicianScheduleComponent>;
  let store: MockStore;

  const mockTechnician: Technician = {
    id: 'tech1',
    technicianId: 'TECH-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0100',
    role: 'Installer',
    employmentType: 'W2',
    homeBase: 'Office A',
    region: 'North',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockJob: Job = {
    id: 'job1',
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
    requiredSkills: [{ id: '1', name: 'Cat6', category: 'Cabling' }],
    requiredCrewSize: 1,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date('2024-01-15T08:00:00'),
    scheduledEndDate: new Date('2024-01-15T16:00:00'),
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAssignment: Assignment = {
    id: 'assign1',
    jobId: 'job1',
    technicianId: 'tech1',
    assignedBy: 'admin',
    assignedAt: new Date(),
    isActive: true
  };

  const initialState = {
    assignments: {
      ids: ['assign1'],
      entities: {
        assign1: mockAssignment
      },
      conflicts: [],
      qualifiedTechnicians: [],
      loading: false,
      error: null
    },
    jobs: {
      ids: ['job1'],
      entities: {
        job1: mockJob
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TechnicianScheduleComponent],
      imports: [
        BrowserAnimationsModule,
        ReactiveFormsModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatChipsModule
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);

    fixture = TestBed.createComponent(TechnicianScheduleComponent);
    component = fixture.componentInstance;
    component.technician = mockTechnician;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default date range (this week)', () => {
    expect(component.dateRangeForm.get('startDate')?.value).toBeTruthy();
    expect(component.dateRangeForm.get('endDate')?.value).toBeTruthy();
  });

  it('should dispatch loadAssignments and loadJobs on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    expect(dispatchSpy).toHaveBeenCalledWith(AssignmentActions.loadAssignments());
    expect(dispatchSpy).toHaveBeenCalledWith(JobActions.loadJobs());
  });

  it('should set date range to today', () => {
    component.setToday();
    
    const startDate = component.dateRangeForm.get('startDate')?.value;
    const endDate = component.dateRangeForm.get('endDate')?.value;
    
    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();
  });

  it('should set date range to this week', () => {
    component.setThisWeek();
    
    const startDate = component.dateRangeForm.get('startDate')?.value;
    const endDate = component.dateRangeForm.get('endDate')?.value;
    
    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();
  });

  it('should set date range to this month', () => {
    component.setThisMonth();
    
    const startDate = component.dateRangeForm.get('startDate')?.value;
    const endDate = component.dateRangeForm.get('endDate')?.value;
    
    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();
  });

  it('should get correct status color class', () => {
    expect(component.getStatusColor(JobStatus.NotStarted)).toBe('status-not-started');
    expect(component.getStatusColor(JobStatus.EnRoute)).toBe('status-en-route');
    expect(component.getStatusColor(JobStatus.OnSite)).toBe('status-on-site');
    expect(component.getStatusColor(JobStatus.Completed)).toBe('status-completed');
    expect(component.getStatusColor(JobStatus.Issue)).toBe('status-issue');
    expect(component.getStatusColor(JobStatus.Cancelled)).toBe('status-cancelled');
  });

  it('should get correct status icon', () => {
    expect(component.getStatusIcon(JobStatus.NotStarted)).toBe('schedule');
    expect(component.getStatusIcon(JobStatus.EnRoute)).toBe('directions_car');
    expect(component.getStatusIcon(JobStatus.OnSite)).toBe('location_on');
    expect(component.getStatusIcon(JobStatus.Completed)).toBe('check_circle');
    expect(component.getStatusIcon(JobStatus.Issue)).toBe('error');
    expect(component.getStatusIcon(JobStatus.Cancelled)).toBe('cancel');
  });

  it('should get correct status label', () => {
    expect(component.getStatusLabel(JobStatus.NotStarted)).toBe('Not Started');
    expect(component.getStatusLabel(JobStatus.EnRoute)).toBe('En Route');
    expect(component.getStatusLabel(JobStatus.OnSite)).toBe('On Site');
    expect(component.getStatusLabel(JobStatus.Completed)).toBe('Completed');
    expect(component.getStatusLabel(JobStatus.Issue)).toBe('Issue');
    expect(component.getStatusLabel(JobStatus.Cancelled)).toBe('Cancelled');
  });

  it('should format date range', () => {
    const formatted = component.formatDateRange();
    expect(formatted).toContain('-');
  });

  it('should handle job click', () => {
    spyOn(console, 'log');
    component.onJobClick(mockJob);
    expect(console.log).toHaveBeenCalledWith('Job clicked:', mockJob);
  });

  it('should filter jobs by date range', () => {
    fixture.detectChanges();
    component.assignments = [mockAssignment];
    component.jobs = [mockJob];
    
    // Set date range to include the job
    component.dateRangeForm.patchValue({
      startDate: new Date('2024-01-14'),
      endDate: new Date('2024-01-16')
    });
    
    component['filterJobs']();
    
    expect(component.filteredJobs.length).toBeGreaterThan(0);
  });

  it('should calculate total hours', () => {
    fixture.detectChanges();
    component.filteredJobs = [mockJob];
    
    component['calculateTotalHours']();
    
    expect(component.totalHours).toBe(8);
  });

  it('should sort jobs chronologically', () => {
    const job2: Job = {
      ...mockJob,
      id: 'job2',
      jobId: 'JOB-002',
      scheduledStartDate: new Date('2024-01-16T08:00:00'),
      scheduledEndDate: new Date('2024-01-16T16:00:00')
    };

    component.assignments = [
      mockAssignment,
      { ...mockAssignment, id: 'assign2', jobId: 'job2' }
    ];
    component.jobs = [job2, mockJob]; // Intentionally out of order
    
    component.dateRangeForm.patchValue({
      startDate: new Date('2024-01-14'),
      endDate: new Date('2024-01-17')
    });
    
    component['filterJobs']();
    
    expect(component.filteredJobs[0].id).toBe('job1');
    expect(component.filteredJobs[1].id).toBe('job2');
  });

  it('should handle missing technician gracefully', () => {
    component.technician = null as any;
    component.technicianId = undefined;
    
    spyOn(console, 'error');
    fixture.detectChanges();
    
    expect(console.error).toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
