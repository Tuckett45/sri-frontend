import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';

import { Job, JobStatus } from '../../../models/job.model';
import { Technician } from '../../../models/technician.model';
import { Assignment, DateRange } from '../../../models/assignment.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as JobActions from '../../../state/jobs/job.actions';
import { selectAssignmentsByTechnician } from '../../../state/assignments/assignment.selectors';
import { selectAllJobs } from '../../../state/jobs/job.selectors';

/**
 * TechnicianScheduleComponent
 * 
 * Displays an individual technician's schedule.
 * Shows jobs in chronological order with status indicators and total hours.
 * 
 * Features:
 * - Chronological job list
 * - Job cards with key information
 * - Status indicators
 * - Total hours calculation
 * - Date range selector
 */
@Component({
  selector: 'app-technician-schedule',
  templateUrl: './technician-schedule.component.html',
  styleUrls: ['./technician-schedule.component.scss']
})
export class TechnicianScheduleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() technician!: Technician;
  @Input() technicianId?: string;

  assignments$: Observable<Assignment[]>;
  jobs$: Observable<Job[]>;

  assignments: Assignment[] = [];
  jobs: Job[] = [];
  filteredJobs: Job[] = [];

  dateRangeForm: FormGroup;
  totalHours: number = 0;

  // Enums for template
  JobStatus = JobStatus;

  constructor(
    private store: Store,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.assignments$ = this.store.select(selectAssignmentsByTechnician(''));
    this.jobs$ = this.store.select(selectAllJobs);

    // Initialize date range form (default: this week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    this.dateRangeForm = this.fb.group({
      startDate: [startOfWeek],
      endDate: [endOfWeek]
    });
  }

  ngOnInit(): void {
    // Use provided technicianId or get from technician object
    const techId = this.technicianId || this.technician?.id;

    if (!techId) {
      console.error('TechnicianScheduleComponent: No technician ID provided');
      return;
    }

    // Update assignments selector with technician ID
    this.assignments$ = this.store.select(selectAssignmentsByTechnician(techId));

    // Load data
    this.store.dispatch(AssignmentActions.loadAssignments({}));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));

    // Subscribe to assignments
    this.assignments$
      .pipe(takeUntil(this.destroy$))
      .subscribe(assignments => {
        this.assignments = assignments;
        this.filterJobs();
      });

    // Subscribe to jobs
    this.jobs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(jobs => {
        this.jobs = jobs;
        this.filterJobs();
      });

    // Subscribe to date range changes
    this.dateRangeForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterJobs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filter jobs by date range and technician assignments
   */
  private filterJobs(): void {
    const dateRange = this.dateRangeForm.value;
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // Get job IDs assigned to this technician
    const assignedJobIds = this.assignments.map(a => a.jobId);

    // Filter jobs by assignment and date range
    this.filteredJobs = this.jobs
      .filter(job => assignedJobIds.includes(job.id))
      .filter(job => {
        const jobStart = new Date(job.scheduledStartDate);
        const jobEnd = new Date(job.scheduledEndDate);
        return jobStart <= endDate && jobEnd >= startDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledStartDate).getTime();
        const dateB = new Date(b.scheduledStartDate).getTime();
        return dateA - dateB;
      });

    // Calculate total hours
    this.calculateTotalHours();
  }

  /**
   * Calculate total estimated hours for filtered jobs
   */
  private calculateTotalHours(): void {
    this.totalHours = this.filteredJobs.reduce((total, job) => {
      return total + job.estimatedLaborHours;
    }, 0);
  }

  /**
   * Set date range to today
   */
  setToday(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    this.dateRangeForm.patchValue({
      startDate: today,
      endDate: endOfDay
    });
  }

  /**
   * Set date range to this week
   */
  setThisWeek(): void {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    this.dateRangeForm.patchValue({
      startDate: startOfWeek,
      endDate: endOfWeek
    });
  }

  /**
   * Set date range to this month
   */
  setThisMonth(): void {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    this.dateRangeForm.patchValue({
      startDate: startOfMonth,
      endDate: endOfMonth
    });
  }

  /**
   * Get status color class
   */
  getStatusColor(status: JobStatus): string {
    switch (status) {
      case JobStatus.NotStarted:
        return 'status-not-started';
      case JobStatus.EnRoute:
        return 'status-en-route';
      case JobStatus.OnSite:
        return 'status-on-site';
      case JobStatus.Completed:
        return 'status-completed';
      case JobStatus.Issue:
        return 'status-issue';
      case JobStatus.Cancelled:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: JobStatus): string {
    switch (status) {
      case JobStatus.NotStarted:
        return 'schedule';
      case JobStatus.EnRoute:
        return 'directions_car';
      case JobStatus.OnSite:
        return 'location_on';
      case JobStatus.Completed:
        return 'check_circle';
      case JobStatus.Issue:
        return 'error';
      case JobStatus.Cancelled:
        return 'cancel';
      default:
        return 'help';
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: JobStatus): string {
    switch (status) {
      case JobStatus.NotStarted:
        return 'Not Started';
      case JobStatus.EnRoute:
        return 'En Route';
      case JobStatus.OnSite:
        return 'On Site';
      case JobStatus.Completed:
        return 'Completed';
      case JobStatus.Issue:
        return 'Issue';
      case JobStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format date range
   */
  formatDateRange(): string {
    const startDate = new Date(this.dateRangeForm.value.startDate);
    const endDate = new Date(this.dateRangeForm.value.endDate);

    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const endStr = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `${startStr} - ${endStr}`;
  }

  /**
   * Navigate to job detail
   */
  onJobClick(job: Job): void {
    this.router.navigate(['/field-resource-management/jobs', job.id]);
  }
}
