import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Job, JobStatus } from '../../../models/job.model';
import { Assignment } from '../../../models/assignment.model';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { CalendarViewType, ScheduleViewMode } from '../../../state/ui/ui.state';

import * as UIActions from '../../../state/ui/ui.actions';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as JobActions from '../../../state/jobs/job.actions';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as CrewActions from '../../../state/crews/crew.actions';

import { selectCalendarView, selectSelectedDate, selectScheduleViewMode } from '../../../state/ui/ui.selectors';
import { selectAllAssignments, selectAssignmentConflicts } from '../../../state/assignments/assignment.selectors';
import { selectAllJobs } from '../../../state/jobs/job.selectors';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';

import { AssignmentDialogComponent } from '../assignment-dialog/assignment-dialog.component';
import { AddTaskDialogComponent, AddTaskDialogData } from '../add-task-dialog/add-task-dialog.component';
import { EditJobDialogComponent, EditJobDialogData } from '../edit-job-dialog/edit-job-dialog.component';
import { ReassignDialogComponent, ReassignDialogData } from '../reassign-dialog/reassign-dialog.component';

/**
 * CalendarViewComponent
 *
 * Scheduling board with multiple view modes: Technicians, Crews, Jobs, and Sites.
 * Supports drag-and-drop reassignment, day/week toggle, conflict highlighting,
 * and context menu actions.
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
  viewMode$: Observable<ScheduleViewMode>;
  assignments$: Observable<Assignment[]>;
  jobs$: Observable<Job[]>;
  technicians$: Observable<Technician[]>;
  crews$: Observable<Crew[]>;
  conflicts$: Observable<any[]>;

  // Local state
  calendarView: CalendarViewType = CalendarViewType.Day;
  viewMode: ScheduleViewMode = ScheduleViewMode.Technicians;
  selectedDate: Date = new Date();
  assignments: Assignment[] = [];
  jobs: Job[] = [];
  technicians: Technician[] = [];
  crews: Crew[] = [];
  conflicts: any[] = [];

  // Grid data
  timeSlots: Date[] = [];
  scheduleRows: ScheduleRow[] = [];

  // Enums for template
  CalendarViewType = CalendarViewType;
  ScheduleViewMode = ScheduleViewMode;
  JobStatus = JobStatus;

  // Context menu
  contextMenuPosition = { x: '0px', y: '0px' };
  contextMenuJob: Job | null = null;
  showContextMenu = false;

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.calendarView$ = this.store.select(selectCalendarView);
    this.selectedDate$ = this.store.select(selectSelectedDate);
    this.viewMode$ = this.store.select(selectScheduleViewMode);
    this.assignments$ = this.store.select(selectAllAssignments);
    this.jobs$ = this.store.select(selectAllJobs);
    this.technicians$ = this.store.select(selectAllTechnicians);
    this.crews$ = this.store.select(selectAllCrews);
    this.conflicts$ = this.store.select(selectAssignmentConflicts);
  }

  ngOnInit(): void {
    // Load initial data
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    this.store.dispatch(AssignmentActions.loadAssignments({}));
    this.store.dispatch(CrewActions.loadCrews({}));

    // Rebuild grid whenever any relevant data changes
    combineLatest([
      this.calendarView$,
      this.selectedDate$,
      this.viewMode$,
      this.assignments$,
      this.jobs$,
      this.technicians$,
      this.crews$,
      this.conflicts$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([calendarView, selectedDate, viewMode, assignments, jobs, technicians, crews, conflicts]) => {
        this.calendarView = calendarView;
        this.selectedDate = selectedDate;
        this.viewMode = viewMode;
        this.assignments = assignments;
        this.jobs = jobs;
        this.technicians = technicians;
        this.crews = crews;
        this.conflicts = conflicts;
        this.buildTimeSlots();
        this.buildScheduleRows();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── View controls ──────────────────────────────────────────────────

  onViewChange(view: CalendarViewType): void {
    this.store.dispatch(UIActions.setCalendarView({ view }));
  }

  onViewModeChange(mode: ScheduleViewMode): void {
    this.store.dispatch(UIActions.setScheduleViewMode({ mode }));
  }

  onPrevious(): void {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + (this.calendarView === CalendarViewType.Day ? -1 : -7));
    this.store.dispatch(UIActions.setSelectedDate({ date: newDate }));
  }

  onNext(): void {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(newDate.getDate() + (this.calendarView === CalendarViewType.Day ? 1 : 7));
    this.store.dispatch(UIActions.setSelectedDate({ date: newDate }));
  }

  onToday(): void {
    this.store.dispatch(UIActions.setSelectedDate({ date: new Date() }));
  }

  // ── Time slots ─────────────────────────────────────────────────────

  private buildTimeSlots(): void {
    this.timeSlots = [];
    const startDate = new Date(this.selectedDate);
    startDate.setHours(0, 0, 0, 0);

    if (this.calendarView === CalendarViewType.Day) {
      for (let hour = 6; hour <= 20; hour++) {
        const slot = new Date(startDate);
        slot.setHours(hour);
        this.timeSlots.push(slot);
      }
    } else {
      // Start from Monday of the selected week
      const dayOfWeek = startDate.getDay();
      const monday = new Date(startDate);
      monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7));
      for (let day = 0; day < 7; day++) {
        const slot = new Date(monday);
        slot.setDate(slot.getDate() + day);
        this.timeSlots.push(slot);
      }
    }
  }

  // ── Grid building ──────────────────────────────────────────────────

  private buildScheduleRows(): void {
    switch (this.viewMode) {
      case ScheduleViewMode.Technicians:
        this.buildTechnicianRows();
        break;
      case ScheduleViewMode.Crews:
        this.buildCrewRows();
        break;
      case ScheduleViewMode.Jobs:
        this.buildJobRows();
        break;
      case ScheduleViewMode.Sites:
        this.buildSiteRows();
        break;
    }
  }

  private buildTechnicianRows(): void {
    this.scheduleRows = this.technicians.map(tech => ({
      id: tech.id,
      label: `${tech.firstName} ${tech.lastName}`,
      sublabel: tech.role,
      icon: 'person',
      cells: this.timeSlots.map(slot => this.buildCell(slot, this.getJobsForTechnician(tech.id, slot)))
    }));
  }

  private buildCrewRows(): void {
    this.scheduleRows = this.crews.map(crew => {
      // Collect all technician IDs in this crew
      const memberIds = [crew.leadTechnicianId, ...crew.memberIds];
      return {
        id: crew.id,
        label: crew.name,
        sublabel: `${memberIds.length} members · ${crew.status}`,
        icon: 'groups',
        cells: this.timeSlots.map(slot => {
          // Aggregate jobs across all crew members for this slot
          const jobSet = new Map<string, Job>();
          memberIds.forEach(techId => {
            this.getJobsForTechnician(techId, slot).forEach(j => jobSet.set(j.id, j));
          });
          return this.buildCell(slot, Array.from(jobSet.values()));
        })
      };
    });
  }

  private buildJobRows(): void {
    // Show active/upcoming jobs as rows, with assigned technicians shown in cells
    const relevantJobs = this.jobs.filter(j =>
      j.status !== JobStatus.Completed && j.status !== JobStatus.Cancelled
    );
    this.scheduleRows = relevantJobs.map(job => ({
      id: job.id,
      label: `${job.jobId} – ${job.client}`,
      sublabel: `${job.siteName} · ${job.priority}`,
      icon: 'work',
      cells: this.timeSlots.map(slot => {
        const isInSlot = this.jobOverlapsSlot(job, slot);
        return {
          timeSlot: slot,
          jobs: isInSlot ? [job] : [],
          assignedNames: isInSlot ? this.getAssignedTechNames(job.id) : [],
          hasConflict: false
        };
      })
    }));
  }

  private buildSiteRows(): void {
    // Group jobs by siteName
    const siteMap = new Map<string, Job[]>();
    this.jobs.forEach(job => {
      if (job.status === JobStatus.Completed || job.status === JobStatus.Cancelled) return;
      const key = job.siteName || 'Unknown Site';
      if (!siteMap.has(key)) siteMap.set(key, []);
      siteMap.get(key)!.push(job);
    });

    this.scheduleRows = Array.from(siteMap.entries()).map(([siteName, siteJobs]) => {
      const address = siteJobs[0]?.siteAddress;
      const sublabel = address ? `${address.city}, ${address.state}` : '';
      return {
        id: siteName,
        label: siteName,
        sublabel,
        icon: 'location_on',
        cells: this.timeSlots.map(slot => {
          const slotJobs = siteJobs.filter(j => this.jobOverlapsSlot(j, slot));
          return this.buildCell(slot, slotJobs);
        })
      };
    });
  }

  private buildCell(slot: Date, jobs: Job[]): ScheduleCell {
    return {
      timeSlot: slot,
      jobs,
      assignedNames: [],
      hasConflict: jobs.length > 1
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private getJobsForTechnician(technicianId: string, slot: Date): Job[] {
    const techAssignments = this.assignments.filter(a => a.technicianId === technicianId && a.isActive);
    const jobIds = techAssignments.map(a => a.jobId);
    return this.jobs.filter(j => jobIds.includes(j.id) && this.jobOverlapsSlot(j, slot));
  }

  private jobOverlapsSlot(job: Job, slot: Date): boolean {
    const jobStart = new Date(job.scheduledStartDate);
    const jobEnd = new Date(job.scheduledEndDate);

    if (this.calendarView === CalendarViewType.Day) {
      const slotEnd = new Date(slot);
      slotEnd.setHours(slot.getHours() + 1);
      return jobStart < slotEnd && jobEnd > slot;
    } else {
      const slotStart = new Date(slot);
      slotStart.setHours(0, 0, 0, 0);
      const slotEnd = new Date(slot);
      slotEnd.setHours(23, 59, 59, 999);
      return jobStart < slotEnd && jobEnd > slotStart;
    }
  }

  private getAssignedTechNames(jobId: string): string[] {
    const jobAssignments = this.assignments.filter(a => a.jobId === jobId && a.isActive);
    return jobAssignments.map(a => {
      const tech = this.technicians.find(t => t.id === a.technicianId);
      return tech ? `${tech.firstName} ${tech.lastName}` : 'Unassigned';
    });
  }

  // ── Drag & drop ───────────────────────────────────────────────────

  onJobDrop(event: CdkDragDrop<ScheduleCell>, row: ScheduleRow): void {
    const job = event.item.data as Job;
    if (!job) return;

    // Determine the source row from the previous container's data
    const sourceCell = event.previousContainer.data as ScheduleCell;

    // Target cell we dropped onto
    const targetCell = event.container.data as ScheduleCell;

    if (this.viewMode === ScheduleViewMode.Technicians) {
      // Check if already assigned to this technician
      const existingAssignment = this.assignments.find(
        a => a.jobId === job.id && a.technicianId === row.id && a.isActive
      );
      if (existingAssignment) {
        // Same technician — check if different time slot to reschedule
        if (targetCell && targetCell.timeSlot && sourceCell.timeSlot
            && targetCell.timeSlot.getTime() !== sourceCell.timeSlot.getTime()) {
          this.rescheduleJobToSlot(job, targetCell.timeSlot);
        }
        return;
      }

      // Find the source technician row to handle reassignment
      const sourceRow = this.scheduleRows.find(r =>
        r.cells.some(c => c === sourceCell)
      );

      if (sourceRow && sourceRow.id !== row.id) {
        // Reassign: remove from old technician, assign to new
        const oldAssignment = this.assignments.find(
          a => a.jobId === job.id && a.technicianId === sourceRow.id && a.isActive
        );
        if (oldAssignment) {
          // Unassign from old tech, then assign to new
          this.store.dispatch(AssignmentActions.unassignTechnician({ assignmentId: oldAssignment.id }));
          this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: row.id }));
          this.snackBar.open(`Moved ${job.jobId} from ${sourceRow.label} to ${row.label}`, 'Close', { duration: 3000 });
        } else {
          this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: row.id }));
          this.snackBar.open(`Assigned ${job.jobId} to ${row.label}`, 'Close', { duration: 3000 });
        }
      } else {
        // No source row found (e.g. from Jobs/Sites view) — just assign
        this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: row.id }));
        this.snackBar.open(`Assigned ${job.jobId} to ${row.label}`, 'Close', { duration: 3000 });
      }
    } else if (this.viewMode === ScheduleViewMode.Crews) {
      const sourceRow = this.scheduleRows.find(r =>
        r.cells.some(c => c === sourceCell)
      );

      if (sourceRow && sourceRow.id === row.id) {
        // Same crew, different time slot — reschedule the job
        if (targetCell && targetCell.timeSlot && sourceCell.timeSlot
            && targetCell.timeSlot.getTime() !== sourceCell.timeSlot.getTime()) {
          this.rescheduleJobToSlot(job, targetCell.timeSlot);
        }
        return;
      }

      // Different crew — reassign all crew member assignments to the new crew's members
      if (sourceRow) {
        // Find the source crew to get its member IDs
        const sourceCrew = this.crews.find(c => c.id === sourceRow.id);
        if (sourceCrew) {
          const sourceMembers = [sourceCrew.leadTechnicianId, ...sourceCrew.memberIds];
          // Unassign from all source crew members
          sourceMembers.forEach(techId => {
            const oldAssignment = this.assignments.find(
              a => a.jobId === job.id && a.technicianId === techId && a.isActive
            );
            if (oldAssignment) {
              this.store.dispatch(AssignmentActions.unassignTechnician({ assignmentId: oldAssignment.id }));
            }
          });
        }
      }

      // Assign to the new crew's lead technician
      const targetCrew = this.crews.find(c => c.id === row.id);
      if (targetCrew) {
        this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: targetCrew.leadTechnicianId }));
      }

      this.snackBar.open(`Moved ${job.jobId} to crew ${row.label}`, 'Close', { duration: 3000 });
    } else if (this.viewMode === ScheduleViewMode.Jobs) {
      // Jobs view: rows are jobs, so only time slot changes make sense
      if (targetCell && targetCell.timeSlot && sourceCell.timeSlot
          && targetCell.timeSlot.getTime() !== sourceCell.timeSlot.getTime()) {
        this.rescheduleJobToSlot(job, targetCell.timeSlot);
      }
    } else if (this.viewMode === ScheduleViewMode.Sites) {
      const sourceRow = this.scheduleRows.find(r =>
        r.cells.some(c => c === sourceCell)
      );

      // Same site row — reschedule to different time slot
      if (sourceRow && sourceRow.id === row.id) {
        if (targetCell && targetCell.timeSlot && sourceCell.timeSlot
            && targetCell.timeSlot.getTime() !== sourceCell.timeSlot.getTime()) {
          this.rescheduleJobToSlot(job, targetCell.timeSlot);
        }
        return;
      }

      // Different site row — update the job's site name and reschedule if different slot
      const newSiteName = row.label;
      const updates: any = { siteName: newSiteName };

      // Also update address from the first job at the target site
      const targetSiteJob = this.jobs.find(j => j.siteName === newSiteName && j.id !== job.id);
      if (targetSiteJob?.siteAddress) {
        updates.siteAddress = targetSiteJob.siteAddress;
      }

      // Reschedule if dropped on a different time slot
      if (targetCell && targetCell.timeSlot && sourceCell.timeSlot
          && targetCell.timeSlot.getTime() !== sourceCell.timeSlot.getTime()) {
        const oldStart = new Date(job.scheduledStartDate);
        const oldEnd = new Date(job.scheduledEndDate);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        let newStart: Date;
        if (this.calendarView === CalendarViewType.Day) {
          newStart = new Date(targetCell.timeSlot);
        } else {
          newStart = new Date(targetCell.timeSlot);
          newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        }
        updates.scheduledStartDate = newStart;
        updates.scheduledEndDate = new Date(newStart.getTime() + durationMs);
      }

      this.store.dispatch(JobActions.updateJob({ id: job.id, job: updates }));
      this.snackBar.open(`Moved ${job.jobId} to ${newSiteName}`, 'Close', { duration: 3000 });
    }
  }

  /**
   * Reschedule a job to a new time slot, preserving its duration
   */
  private rescheduleJobToSlot(job: Job, targetSlot: Date): void {
    const oldStart = new Date(job.scheduledStartDate);
    const oldEnd = new Date(job.scheduledEndDate);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    let newStart: Date;
    if (this.calendarView === CalendarViewType.Day) {
      // Day view: move to the target hour, same day
      newStart = new Date(targetSlot);
    } else {
      // Week view: move to the target day, keep the same time of day
      newStart = new Date(targetSlot);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    }

    const newEnd = new Date(newStart.getTime() + durationMs);

    this.store.dispatch(JobActions.updateJob({
      id: job.id,
      job: {
        scheduledStartDate: newStart,
        scheduledEndDate: newEnd
      }
    }));

    const label = this.calendarView === CalendarViewType.Day
      ? newStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      : newStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    this.snackBar.open(`Moved ${job.jobId} to ${label}`, 'Close', { duration: 3000 });
  }

  onAssignClick(job: Job): void {
    this.dialog.open(AssignmentDialogComponent, {
      width: '600px',
      data: { job }
    });
  }

  // ── Add Task ────────────────────────────────────────────────────

  onAddTask(): void {
    const dialogData: AddTaskDialogData = {
      preselectedDate: this.selectedDate
    };

    this.dialog.open(AddTaskDialogComponent, {
      width: '650px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      if (result?.created) {
        this.snackBar.open('Task created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  onAddTaskForRow(row: ScheduleRow): void {
    const dialogData: AddTaskDialogData = {
      preselectedDate: this.selectedDate,
      preselectedTechnicianId: this.viewMode === ScheduleViewMode.Technicians ? row.id : undefined,
      preselectedCrewId: this.viewMode === ScheduleViewMode.Crews ? row.id : undefined
    };

    this.dialog.open(AddTaskDialogComponent, {
      width: '650px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      if (result?.created) {
        this.snackBar.open('Task created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Job interactions ──────────────────────────────────────────────

  onJobClick(job: Job): void {
    this.openEditJobDialog(job);
  }

  onJobContextMenu(event: MouseEvent, job: Job): void {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX + 'px', y: event.clientY + 'px' };
    this.contextMenuJob = job;
    this.showContextMenu = true;
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
    this.contextMenuJob = null;
  }

  onContextView(): void {
    if (this.contextMenuJob) this.openEditJobDialog(this.contextMenuJob);
    this.closeContextMenu();
  }

  onContextEdit(): void {
    if (this.contextMenuJob) this.openEditJobDialog(this.contextMenuJob);
    this.closeContextMenu();
  }

  onContextReassign(): void {
    if (!this.contextMenuJob) {
      this.closeContextMenu();
      return;
    }

    const job = this.contextMenuJob;
    this.closeContextMenu();

    const currentCrewId = this.findCrewForJob(job.id);
    const currentTechAssignment = this.assignments.find(a => a.jobId === job.id && a.isActive);

    const dialogData: ReassignDialogData = {
      job,
      currentAssignType: this.viewMode === ScheduleViewMode.Crews ? 'crew' : 'technician',
      currentTechnicianId: currentTechAssignment?.technicianId,
      currentCrewId: currentCrewId || undefined
    };

    this.dialog.open(ReassignDialogComponent, {
      width: '520px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      if (!result?.reassigned) return;

      // Unassign from current
      if (currentCrewId) {
        const sourceCrew = this.crews.find(c => c.id === currentCrewId);
        if (sourceCrew) {
          [sourceCrew.leadTechnicianId, ...sourceCrew.memberIds].forEach(techId => {
            const old = this.assignments.find(a => a.jobId === job.id && a.technicianId === techId && a.isActive);
            if (old) this.store.dispatch(AssignmentActions.unassignTechnician({ assignmentId: old.id }));
          });
        }
      } else if (currentTechAssignment) {
        this.store.dispatch(AssignmentActions.unassignTechnician({ assignmentId: currentTechAssignment.id }));
      }

      // Assign to new target
      if (result.assignTo === 'technician' && result.technicianId) {
        this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: result.technicianId }));
        const tech = this.technicians.find(t => t.id === result.technicianId);
        this.snackBar.open(`Reassigned ${job.jobId} to ${tech?.firstName} ${tech?.lastName}`, 'Close', { duration: 3000 });
      } else if (result.assignTo === 'crew' && result.crewId) {
        const targetCrew = this.crews.find(c => c.id === result.crewId);
        if (targetCrew) {
          this.store.dispatch(AssignmentActions.assignTechnician({ jobId: job.id, technicianId: targetCrew.leadTechnicianId }));
          this.snackBar.open(`Reassigned ${job.jobId} to ${targetCrew.name}`, 'Close', { duration: 3000 });
        }
      }
    });
  }

  private findCrewForJob(jobId: string): string | null {
    for (const crew of this.crews) {
      const memberIds = [crew.leadTechnicianId, ...crew.memberIds];
      const hasAssignment = memberIds.some(techId =>
        this.assignments.some(a => a.jobId === jobId && a.technicianId === techId && a.isActive)
      );
      if (hasAssignment) return crew.id;
    }
    return null;
  }

  onContextDelete(): void {
    if (this.contextMenuJob && confirm('Are you sure you want to delete this job?')) {
      this.store.dispatch(JobActions.deleteJob({ id: this.contextMenuJob.id }));
    }
    this.closeContextMenu();
  }

  private openEditJobDialog(job: Job): void {
    const dialogData: EditJobDialogData = { job };

    this.dialog.open(EditJobDialogComponent, {
      width: '700px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      if (result?.saved) {
        this.snackBar.open('Job updated', 'Close', { duration: 3000 });
      }
    });
  }

  // ── Formatting ────────────────────────────────────────────────────

  getStatusColor(status: JobStatus): string {
    const map: Record<string, string> = {
      [JobStatus.NotStarted]: 'status-not-started',
      [JobStatus.EnRoute]: 'status-en-route',
      [JobStatus.OnSite]: 'status-on-site',
      [JobStatus.Completed]: 'status-completed',
      [JobStatus.Issue]: 'status-issue',
      [JobStatus.Cancelled]: 'status-cancelled'
    };
    return map[status] || '';
  }

  formatTimeSlot(slot: Date): string {
    if (this.calendarView === CalendarViewType.Day) {
      return slot.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    }
    return slot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatSelectedDate(): string {
    if (this.calendarView === CalendarViewType.Day) {
      return this.selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    const endDate = new Date(this.selectedDate);
    endDate.setDate(endDate.getDate() + 6);
    return `${this.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  getRowHeaderLabel(): string {
    switch (this.viewMode) {
      case ScheduleViewMode.Technicians: return 'Technician';
      case ScheduleViewMode.Crews: return 'Crew';
      case ScheduleViewMode.Jobs: return 'Job';
      case ScheduleViewMode.Sites: return 'Site';
    }
  }

  getEmptyMessage(): string {
    switch (this.viewMode) {
      case ScheduleViewMode.Technicians: return 'No technicians available. Add technicians to start scheduling.';
      case ScheduleViewMode.Crews: return 'No crews configured. Create crews to view their schedules.';
      case ScheduleViewMode.Jobs: return 'No active jobs found.';
      case ScheduleViewMode.Sites: return 'No sites with active jobs.';
    }
  }
}

// ── Interfaces ────────────────────────────────────────────────────────

export interface ScheduleRow {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  cells: ScheduleCell[];
}

export interface ScheduleCell {
  timeSlot: Date;
  jobs: Job[];
  assignedNames: string[];
  hasConflict: boolean;
}
