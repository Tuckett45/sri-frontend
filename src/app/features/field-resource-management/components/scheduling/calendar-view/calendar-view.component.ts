import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Job, JobStatus } from '../../../models/job.model';
import { Assignment } from '../../../models/assignment.model';
import { Technician } from '../../../models/technician.model';
import { CalendarViewType } from '../../../state/ui/ui.state';

import * as UIActions from '../../../state/ui/ui.actions';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as JobActions from '../../../state/jobs/job.actions';
import * as TechnicianActions from '../../../state/technicians/technician.actions';

import { selectCalendarView, selectSelectedDate } from '../../../state/ui/ui.selectors';
import { selectAllAssignments, selectConflicts } from '../../../state/assignments/assignment.selectors';
import { selectAllJobs } from '../../../state/jobs/job.selectors';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';

/**
 * CalendarViewComponent
 * 
 * Displays technician schedules in a grid format with day and week views.
 * Supports drag-and-drop job assignment, conflict highlighting, and quick actions.
 * 
 * Features:
 * - Day and week view toggle
 * - Technician schedule grid (rows = technicians, columns = time slots)
 * - Color-coded job status indicators
 * - Drag-and-drop job assignment
 * - Conflict highlighting
 * - Click handlers for job details
 * - Right-click context menu
 * - Date navigation
 */
@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  calendarView$: Observable<CalendarViewType>;
  selectedDate$: Observable<Date>;
  assignments$: Observable<Assignment[]>;
  jobs$: Observable<Job[]>;
  technicians$: Observable<Technician[]>;
  conflicts$: Observable<any[]>;

  // Local state
  calendarView: CalendarViewType = CalendarViewType.Day;
  selectedDate: Date = new Date();
  assignments: Assignment[] = [];
  jobs: Job[] = [];
  technicians: Technician[] = [];
  conflicts: any[] = [];

  // Grid data
  timeSlots: Date[] = [];
  scheduleGrid: ScheduleGridItem[][] = [];

  // Enums for template
  CalendarViewType = CalendarViewType;
  JobStatus = JobStatus;

  // Context menu
  contextMenuPosition = { x: '0px', y: '0px' };
  contextMenuJob: Job | null = null;

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.calendarView$ = this.store.select(selectCalendarView);
    this.selectedDate$ = this.store.select(selectSelectedDate);
    this.assignments$ = this.store.select(selectAllAssignments);
    this.jobs$ = this.store.select(selectAllJobs);
    this.technicians$ = this.store.select(selectAllTechnicians);
    this.conflicts$ = this.store.select(selectConflicts);
  }

  ngOnInit(): void {
    // Load initial data
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    this.store.dispatch(AssignmentActions.loadAssignments({}));

    // Subscribe to state changes
    this.calendarView$
      .pipe(takeUntil(this.destroy$))
      .subscribe(view => {
        this.calendarView = view;
        this.buildScheduleGrid();
      });

    this.selectedDate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(date => {
        this.selectedDate = date;
        this.buildTimeSlots();
        this.buildScheduleGrid();
      });

    this.assignments$
      .pipe(takeUntil(this.destroy$))
      .subscribe(assignments => {
        this.assignments = assignments;
        this.buildScheduleGrid();
      });

    this.jobs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(jobs => {
        this.jobs = jobs;
        this.buildScheduleGrid();
      });

    this.technicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.technicians = technicians;
        this.buildScheduleGrid();
      });

    this.conflicts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conflicts => {
        this.conflicts = conflicts;
        this.buildScheduleGrid();
      });

    // Initial grid build
    this.buildTimeSlots();
    this.buildScheduleGrid();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle between day and week view
   */
  onViewChange(view: CalendarViewType): void {
    this.store.dispatch(UIActions.setCalendarView({ view }));
  }

  /**
   * Navigate to previous day/week
   */
  onPrevious(): void {
    const newDate = new Date(this.selectedDate);
    if (this.calendarView === CalendarViewType.Day) {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    this.store.dispatch(UIActions.setSelectedDate({ date: newDate }));
  }

  /**
   * Navigate to next day/week
   */
  onNext(): void {
    const newDate = new Date(this.selectedDate);
    if (this.calendarView === CalendarViewType.Day) {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    this.store.dispatch(UIActions.setSelectedDate({ date: newDate }));
  }

  /**
   * Navigate to today
   */
  onToday(): void {
    this.store.dispatch(UIActions.setSelectedDate({ date: new Date() }));
  }

  /**
   * Build time slots based on view type
   */
  private buildTimeSlots(): void {
    this.timeSlots = [];
    const startDate = new Date(this.selectedDate);
    startDate.setHours(0, 0, 0, 0);

    if (this.calendarView === CalendarViewType.Day) {
      // Day view: hourly slots from 6 AM to 8 PM
      for (let hour = 6; hour <= 20; hour++) {
        const slot = new Date(startDate);
        slot.setHours(hour);
        this.timeSlots.push(slot);
      }
    } else {
      // Week view: daily slots for 7 days
      for (let day = 0; day < 7; day++) {
        const slot = new Date(startDate);
        slot.setDate(slot.getDate() + day);
        this.timeSlots.push(slot);
      }
    }
  }

  /**
   * Build schedule grid with technicians and their jobs
   */
  private buildScheduleGrid(): void {
    this.scheduleGrid = [];

    this.technicians.forEach(technician => {
      const row: ScheduleGridItem[] = [];

      this.timeSlots.forEach(slot => {
        const item: ScheduleGridItem = {
          technician,
          timeSlot: slot,
          jobs: this.getJobsForSlot(technician.id, slot),
          hasConflict: false
        };

        // Check for conflicts
        item.hasConflict = this.hasConflictInSlot(technician.id, slot);

        row.push(item);
      });

      this.scheduleGrid.push(row);
    });
  }

  /**
   * Get jobs for a specific technician and time slot
   */
  private getJobsForSlot(technicianId: string, slot: Date): Job[] {
    const technicianAssignments = this.assignments.filter(
      a => a.technicianId === technicianId && a.isActive
    );

    const jobIds = technicianAssignments.map(a => a.jobId);
    const technicianJobs = this.jobs.filter(j => jobIds.includes(j.id));

    return technicianJobs.filter(job => {
      const jobStart = new Date(job.scheduledStartDate);
      const jobEnd = new Date(job.scheduledEndDate);

      if (this.calendarView === CalendarViewType.Day) {
        // Check if job overlaps with this hour
        const slotEnd = new Date(slot);
        slotEnd.setHours(slot.getHours() + 1);
        return jobStart < slotEnd && jobEnd > slot;
      } else {
        // Check if job is on this day
        const slotStart = new Date(slot);
        slotStart.setHours(0, 0, 0, 0);
        const slotEnd = new Date(slot);
        slotEnd.setHours(23, 59, 59, 999);
        return jobStart < slotEnd && jobEnd > slotStart;
      }
    });
  }

  /**
   * Check if there's a conflict in a specific slot
   */
  private hasConflictInSlot(technicianId: string, slot: Date): boolean {
    const jobs = this.getJobsForSlot(technicianId, slot);
    return jobs.length > 1; // Multiple jobs in same slot = conflict
  }

  /**
   * Handle drag and drop job assignment
   */
  onJobDrop(event: CdkDragDrop<ScheduleGridItem>): void {
    const job = event.item.data as Job;
    const targetItem = event.container.data as ScheduleGridItem;

    if (!job || !targetItem) {
      return;
    }

    // Check if job is already assigned to this technician
    const existingAssignment = this.assignments.find(
      a => a.jobId === job.id && a.technicianId === targetItem.technician.id && a.isActive
    );

    if (existingAssignment) {
      this.snackBar.open('Job is already assigned to this technician', 'Close', {
        duration: 3000
      });
      return;
    }

    // Check for conflicts
    const hasConflict = this.hasConflictInSlot(targetItem.technician.id, targetItem.timeSlot);
    if (hasConflict) {
      this.snackBar.open('Warning: This assignment creates a scheduling conflict', 'Close', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
    }

    // Dispatch assignment action
    this.store.dispatch(AssignmentActions.assignTechnician({
      jobId: job.id,
      technicianId: targetItem.technician.id
    }));
  }

  /**
   * Handle job click to open detail dialog
   */
  onJobClick(job: Job): void {
    // TODO: Open job detail dialog
    // For now, navigate to job detail page
    console.log('Job clicked:', job);
  }

  /**
   * Handle right-click context menu
   */
  onJobContextMenu(event: MouseEvent, job: Job): void {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenuJob = job;
  }

  /**
   * Context menu action: View job
   */
  onContextView(): void {
    if (this.contextMenuJob) {
      this.onJobClick(this.contextMenuJob);
    }
    this.contextMenuJob = null;
  }

  /**
   * Context menu action: Edit job
   */
  onContextEdit(): void {
    if (this.contextMenuJob) {
      // TODO: Navigate to job edit page
      console.log('Edit job:', this.contextMenuJob);
    }
    this.contextMenuJob = null;
  }

  /**
   * Context menu action: Reassign job
   */
  onContextReassign(): void {
    if (this.contextMenuJob) {
      // TODO: Open reassignment dialog
      console.log('Reassign job:', this.contextMenuJob);
    }
    this.contextMenuJob = null;
  }

  /**
   * Context menu action: Delete job
   */
  onContextDelete(): void {
    if (this.contextMenuJob) {
      if (confirm('Are you sure you want to delete this job?')) {
        this.store.dispatch(JobActions.deleteJob({ id: this.contextMenuJob.id }));
      }
    }
    this.contextMenuJob = null;
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
   * Format time slot label
   */
  formatTimeSlot(slot: Date): string {
    if (this.calendarView === CalendarViewType.Day) {
      return slot.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    } else {
      return slot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }

  /**
   * Format selected date
   */
  formatSelectedDate(): string {
    if (this.calendarView === CalendarViewType.Day) {
      return this.selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      const endDate = new Date(this.selectedDate);
      endDate.setDate(endDate.getDate() + 6);
      return `${this.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }
}

/**
 * Schedule grid item interface
 */
interface ScheduleGridItem {
  technician: Technician;
  timeSlot: Date;
  jobs: Job[];
  hasConflict: boolean;
}
