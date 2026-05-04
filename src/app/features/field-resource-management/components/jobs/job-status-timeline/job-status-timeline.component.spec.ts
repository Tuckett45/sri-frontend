import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';

import { JobStatusTimelineComponent, StatusHistoryEntry } from './job-status-timeline.component';
import { JobStatus } from '../../../models/job.model';

describe('JobStatusTimelineComponent', () => {
  let component: JobStatusTimelineComponent;
  let fixture: ComponentFixture<JobStatusTimelineComponent>;

  const mockStatusHistory: StatusHistoryEntry[] = [
    {
      id: '1',
      jobId: 'job1',
      status: JobStatus.Completed,
      changedBy: 'Tech 1',
      changedAt: new Date(),
      reason: 'Job completed successfully'
    },
    {
      id: '2',
      jobId: 'job1',
      status: JobStatus.OnSite,
      changedBy: 'Tech 1',
      changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '3',
      jobId: 'job1',
      status: JobStatus.EnRoute,
      changedBy: 'Tech 1',
      changedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    },
    {
      id: '4',
      jobId: 'job1',
      status: JobStatus.NotStarted,
      changedBy: 'System',
      changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobStatusTimelineComponent],
      imports: [
        NoopAnimationsModule,
        MatIconModule
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(JobStatusTimelineComponent);
    component = fixture.componentInstance;
    component.jobId = 'job1';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort status history on init', () => {
    component.statusHistory = [...mockStatusHistory].reverse();
    component.ngOnInit();
    
    expect(component.statusHistory[0].status).toBe(JobStatus.Completed);
    expect(component.statusHistory[component.statusHistory.length - 1].status).toBe(JobStatus.NotStarted);
  });

  it('should create mock status history if none provided', () => {
    component.statusHistory = [];
    component.ngOnInit();
    
    expect(component.statusHistory.length).toBeGreaterThan(0);
  });

  it('should get correct status color class', () => {
    expect(component.getStatusColorClass(JobStatus.NotStarted)).toBe('status-not-started');
    expect(component.getStatusColorClass(JobStatus.EnRoute)).toBe('status-en-route');
    expect(component.getStatusColorClass(JobStatus.OnSite)).toBe('status-on-site');
    expect(component.getStatusColorClass(JobStatus.Completed)).toBe('status-completed');
    expect(component.getStatusColorClass(JobStatus.Issue)).toBe('status-issue');
    expect(component.getStatusColorClass(JobStatus.Cancelled)).toBe('status-cancelled');
  });

  it('should get correct status icon', () => {
    expect(component.getStatusIcon(JobStatus.NotStarted)).toBe('schedule');
    expect(component.getStatusIcon(JobStatus.EnRoute)).toBe('directions_car');
    expect(component.getStatusIcon(JobStatus.OnSite)).toBe('location_on');
    expect(component.getStatusIcon(JobStatus.Completed)).toBe('check_circle');
    expect(component.getStatusIcon(JobStatus.Issue)).toBe('error');
    expect(component.getStatusIcon(JobStatus.Cancelled)).toBe('cancel');
  });

  it('should get correct status text', () => {
    expect(component.getStatusText(JobStatus.NotStarted)).toBe('Not Started');
    expect(component.getStatusText(JobStatus.EnRoute)).toBe('En Route');
    expect(component.getStatusText(JobStatus.OnSite)).toBe('On Site');
    expect(component.getStatusText(JobStatus.Completed)).toBe('Completed');
    expect(component.getStatusText(JobStatus.Issue)).toBe('Issue');
    expect(component.getStatusText(JobStatus.Cancelled)).toBe('Cancelled');
  });

  it('should format date time', () => {
    const date = new Date('2024-01-15T10:30:00');
    const formatted = component.formatDateTime(date);
    
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should get relative time for recent entry', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const relativeTime = component.getRelativeTime(fiveMinutesAgo);
    
    expect(relativeTime).toContain('minute');
  });

  it('should get relative time for old entry', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const relativeTime = component.getRelativeTime(twoDaysAgo);
    
    expect(relativeTime).toContain('day');
  });

  it('should check if first entry', () => {
    component.statusHistory = mockStatusHistory;
    
    expect(component.isFirstEntry(0)).toBe(true);
    expect(component.isFirstEntry(1)).toBe(false);
  });

  it('should check if last entry', () => {
    component.statusHistory = mockStatusHistory;
    
    expect(component.isLastEntry(mockStatusHistory.length - 1)).toBe(true);
    expect(component.isLastEntry(0)).toBe(false);
  });

  it('should display timeline entries', () => {
    component.statusHistory = mockStatusHistory;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const entries = compiled.querySelectorAll('.timeline-entry');
    
    expect(entries.length).toBe(mockStatusHistory.length);
  });

  it('should display empty state when no history', () => {
    fixture.detectChanges(); // triggers ngOnInit (fills mock data)
    component.statusHistory = []; // clear after init so *ngIf evaluates to true
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const emptyState = compiled.querySelector('.empty-state');

    expect(emptyState).toBeTruthy();
  });

  it('should display reason when provided', () => {
    component.statusHistory = [mockStatusHistory[0]]; // Entry with reason
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const reason = compiled.querySelector('.entry-reason');
    
    expect(reason).toBeTruthy();
    expect(reason.textContent).toContain('Job completed successfully');
  });

  it('should not display reason when not provided', () => {
    component.statusHistory = [mockStatusHistory[1]]; // Entry without reason
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const reason = compiled.querySelector('.entry-reason');
    
    expect(reason).toBeFalsy();
  });

  it('should highlight first entry', () => {
    component.statusHistory = mockStatusHistory;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const firstEntry = compiled.querySelector('.timeline-entry.first-entry');
    
    expect(firstEntry).toBeTruthy();
  });

  it('should mark last entry', () => {
    component.statusHistory = mockStatusHistory;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const lastEntry = compiled.querySelector('.timeline-entry.last-entry');
    
    expect(lastEntry).toBeTruthy();
  });
});
