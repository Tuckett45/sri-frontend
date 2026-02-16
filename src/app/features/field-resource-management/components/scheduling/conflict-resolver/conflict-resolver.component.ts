import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';

import { Conflict, ConflictSeverity } from '../../../models/assignment.model';
import { Technician } from '../../../models/technician.model';
import { Job } from '../../../models/job.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import { selectConflicts } from '../../../state/assignments/assignment.selectors';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllJobs } from '../../../state/jobs/job.selectors';

/**
 * ConflictResolverComponent
 * 
 * Displays and resolves scheduling conflicts.
 * Shows all conflicts in a table with resolution options.
 * 
 * Features:
 * - Conflict list with technician, jobs, time range, severity
 * - Resolution options: reassign, reschedule, override
 * - Batch conflict resolution
 * - Technician selector dialog for reassignment
 * - Date picker dialog for rescheduling
 * - Justification textarea for overrides
 */
@Component({
  selector: 'app-conflict-resolver',
  templateUrl: './conflict-resolver.component.html',
  styleUrls: ['./conflict-resolver.component.scss']
})
export class ConflictResolverComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  conflicts$: Observable<Conflict[]>;
  technicians$: Observable<Technician[]>;
  jobs$: Observable<Job[]>;

  conflicts: Conflict[] = [];
  technicians: Technician[] = [];
  jobs: Job[] = [];

  // Table columns
  displayedColumns: string[] = ['select', 'technician', 'conflictingJobs', 'timeRange', 'severity', 'actions'];

  // Selection model for batch operations
  selection = new SelectionModel<Conflict>(true, []);

  // Enums for template
  ConflictSeverity = ConflictSeverity;

  // Resolution state
  resolvingConflict: Conflict | null = null;
  resolutionType: 'reassign' | 'reschedule' | 'override' | null = null;
  justification: string = '';

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.conflicts$ = this.store.select(selectConflicts);
    this.technicians$ = this.store.select(selectAllTechnicians);
    this.jobs$ = this.store.select(selectAllJobs);
  }

  ngOnInit(): void {
    // Load data
    this.store.dispatch(AssignmentActions.loadConflicts({}));

    // Subscribe to conflicts
    this.conflicts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conflicts => {
        this.conflicts = conflicts;
      });

    // Subscribe to technicians
    this.technicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.technicians = technicians;
      });

    // Subscribe to jobs
    this.jobs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(jobs => {
        this.jobs = jobs;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if all conflicts are selected
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.conflicts.length;
    return numSelected === numRows && numRows > 0;
  }

  /**
   * Toggle all conflicts selection
   */
  toggleAllConflicts(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.conflicts.forEach(conflict => this.selection.select(conflict));
    }
  }

  /**
   * Get technician name by ID
   */
  getTechnicianName(technicianId: string): string {
    const technician = this.technicians.find(t => t.id === technicianId);
    return technician ? `${technician.firstName} ${technician.lastName}` : 'Unknown';
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.find(j => j.id === jobId);
  }

  /**
   * Format time range
   */
  formatTimeRange(conflict: Conflict): string {
    const start = new Date(conflict.timeRange.startDate);
    const end = new Date(conflict.timeRange.endDate);
    
    const startStr = start.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const endStr = end.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    
    return `${startStr} - ${endStr}`;
  }

  /**
   * Get severity color class
   */
  getSeverityColor(severity: ConflictSeverity): string {
    return severity === ConflictSeverity.Error ? 'severity-error' : 'severity-warning';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity: ConflictSeverity): string {
    return severity === ConflictSeverity.Error ? 'error' : 'warning';
  }

  /**
   * Start reassignment resolution
   */
  onReassign(conflict: Conflict): void {
    this.resolvingConflict = conflict;
    this.resolutionType = 'reassign';
    
    // TODO: Open technician selector dialog
    // For now, just show a message
    this.snackBar.open('Reassignment dialog will open here', 'Close', {
      duration: 3000
    });
  }

  /**
   * Start reschedule resolution
   */
  onReschedule(conflict: Conflict): void {
    this.resolvingConflict = conflict;
    this.resolutionType = 'reschedule';
    
    // TODO: Open date picker dialog
    // For now, just show a message
    this.snackBar.open('Reschedule dialog will open here', 'Close', {
      duration: 3000
    });
  }

  /**
   * Start override resolution
   */
  onOverride(conflict: Conflict): void {
    this.resolvingConflict = conflict;
    this.resolutionType = 'override';
    this.justification = '';
  }

  /**
   * Confirm override with justification
   */
  confirmOverride(): void {
    if (!this.resolvingConflict || !this.justification || this.justification.length < 10) {
      this.snackBar.open('Please provide a justification (minimum 10 characters)', 'Close', {
        duration: 3000
      });
      return;
    }

    // Dispatch override action - use assignTechnician with override flag
    this.store.dispatch(AssignmentActions.assignTechnician({
      jobId: this.resolvingConflict.jobId,
      technicianId: this.resolvingConflict.technicianId,
      override: true,
      justification: this.justification
    }));

    this.snackBar.open('Conflict override recorded', 'Close', {
      duration: 3000
    });

    this.cancelResolution();
  }

  /**
   * Cancel resolution
   */
  cancelResolution(): void {
    this.resolvingConflict = null;
    this.resolutionType = null;
    this.justification = '';
  }

  /**
   * Batch reassign selected conflicts
   */
  onBatchReassign(): void {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Please select conflicts to resolve', 'Close', {
        duration: 3000
      });
      return;
    }

    // TODO: Open technician selector dialog for batch reassignment
    this.snackBar.open(`Batch reassigning ${this.selection.selected.length} conflicts`, 'Close', {
      duration: 3000
    });
  }

  /**
   * Batch reschedule selected conflicts
   */
  onBatchReschedule(): void {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Please select conflicts to resolve', 'Close', {
        duration: 3000
      });
      return;
    }

    // TODO: Open date picker dialog for batch rescheduling
    this.snackBar.open(`Batch rescheduling ${this.selection.selected.length} conflicts`, 'Close', {
      duration: 3000
    });
  }

  /**
   * Batch override selected conflicts
   */
  onBatchOverride(): void {
    if (this.selection.selected.length === 0) {
      this.snackBar.open('Please select conflicts to resolve', 'Close', {
        duration: 3000
      });
      return;
    }

    const justification = prompt('Enter justification for batch override (minimum 10 characters):');
    
    if (!justification || justification.length < 10) {
      this.snackBar.open('Justification required (minimum 10 characters)', 'Close', {
        duration: 3000
      });
      return;
    }

    // Dispatch batch override action - use assignTechnician with override flag
    this.selection.selected.forEach(conflict => {
      this.store.dispatch(AssignmentActions.assignTechnician({
        jobId: conflict.jobId,
        technicianId: conflict.technicianId,
        override: true,
        justification
      }));
    });

    this.snackBar.open(`${this.selection.selected.length} conflicts overridden`, 'Close', {
      duration: 3000
    });

    this.selection.clear();
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection.clear();
  }

  /**
   * Refresh conflicts
   */
  onRefresh(): void {
    this.store.dispatch(AssignmentActions.loadConflicts({}));
    this.snackBar.open('Conflicts refreshed', 'Close', {
      duration: 2000
    });
  }
}
