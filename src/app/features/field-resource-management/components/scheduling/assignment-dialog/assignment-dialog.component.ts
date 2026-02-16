import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Job } from '../../../models/job.model';
import { TechnicianMatch, Conflict } from '../../../models/assignment.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import { selectQualifiedTechnicians, selectConflicts } from '../../../state/assignments/assignment.selectors';

/**
 * AssignmentDialogComponent
 * 
 * Modal dialog for assigning technicians to jobs.
 * Displays qualified technicians with skill match percentages, availability status,
 * and conflict warnings. Supports override with justification.
 * 
 * Features:
 * - Job details display
 * - Qualified technicians list with skill match percentage
 * - Availability status indicators
 * - Current workload display
 * - Conflict highlighting with warnings
 * - Skill mismatch warnings
 * - Override checkbox with justification
 * - Assignment confirmation
 */
@Component({
  selector: 'app-assignment-dialog',
  templateUrl: './assignment-dialog.component.html',
  styleUrls: ['./assignment-dialog.component.scss']
})
export class AssignmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  job: Job;
  qualifiedTechnicians$: Observable<TechnicianMatch[]>;
  conflicts$: Observable<Conflict[]>;

  qualifiedTechnicians: TechnicianMatch[] = [];
  selectedTechnician: TechnicianMatch | null = null;
  assignmentForm: FormGroup;

  // Availability status enum for template
  AvailabilityStatus = {
    Available: 'available',
    PartiallyAvailable: 'partially-available',
    Unavailable: 'unavailable'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { job: Job },
    private dialogRef: MatDialogRef<AssignmentDialogComponent>,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.job = data.job;
    this.qualifiedTechnicians$ = this.store.select(selectQualifiedTechnicians);
    this.conflicts$ = this.store.select(selectConflicts);

    this.assignmentForm = this.fb.group({
      technicianId: ['', Validators.required],
      override: [false],
      justification: ['']
    });
  }

  ngOnInit(): void {
    // Load qualified technicians for this job
    this.store.dispatch(AssignmentActions.loadQualifiedTechnicians({ jobId: this.job.id }));

    // Subscribe to qualified technicians
    this.qualifiedTechnicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.qualifiedTechnicians = technicians;
      });

    // Watch override checkbox to conditionally require justification
    this.assignmentForm.get('override')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(override => {
        const justificationControl = this.assignmentForm.get('justification');
        if (override) {
          justificationControl?.setValidators([Validators.required, Validators.minLength(10)]);
        } else {
          justificationControl?.clearValidators();
        }
        justificationControl?.updateValueAndValidity();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Select a technician
   */
  onSelectTechnician(technician: TechnicianMatch): void {
    this.selectedTechnician = technician;
    this.assignmentForm.patchValue({
      technicianId: technician.technician.id
    });

    // Check if conflicts exist and require override
    if (technician.hasConflicts) {
      this.assignmentForm.patchValue({ override: true });
    }
  }

  /**
   * Check if technician is selected
   */
  isSelected(technician: TechnicianMatch): boolean {
    return this.selectedTechnician?.technician.id === technician.technician.id;
  }

  /**
   * Get availability status for a technician
   */
  getAvailabilityStatus(technician: TechnicianMatch): string {
    // Check if technician has availability conflicts
    if (technician.hasConflicts) {
      return this.AvailabilityStatus.Unavailable;
    }

    // Check workload
    if (technician.currentWorkload >= 3) {
      return this.AvailabilityStatus.PartiallyAvailable;
    }

    return this.AvailabilityStatus.Available;
  }

  /**
   * Get availability status label
   */
  getAvailabilityLabel(status: string): string {
    switch (status) {
      case this.AvailabilityStatus.Available:
        return 'Available';
      case this.AvailabilityStatus.PartiallyAvailable:
        return 'Partially Available';
      case this.AvailabilityStatus.Unavailable:
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get availability status icon
   */
  getAvailabilityIcon(status: string): string {
    switch (status) {
      case this.AvailabilityStatus.Available:
        return 'check_circle';
      case this.AvailabilityStatus.PartiallyAvailable:
        return 'warning';
      case this.AvailabilityStatus.Unavailable:
        return 'cancel';
      default:
        return 'help';
    }
  }

  /**
   * Get skill match color class
   */
  getSkillMatchColor(percentage: number): string {
    if (percentage === 100) {
      return 'match-perfect';
    } else if (percentage >= 75) {
      return 'match-good';
    } else if (percentage >= 50) {
      return 'match-fair';
    } else {
      return 'match-poor';
    }
  }

  /**
   * Check if assignment requires override
   */
  requiresOverride(): boolean {
    if (!this.selectedTechnician) {
      return false;
    }

    return (
      this.selectedTechnician.hasConflicts ||
      this.selectedTechnician.matchPercentage < 100
    );
  }

  /**
   * Check if form is valid for submission
   */
  canAssign(): boolean {
    if (!this.selectedTechnician) {
      return false;
    }

    if (this.requiresOverride() && !this.assignmentForm.get('override')?.value) {
      return false;
    }

    return this.assignmentForm.valid;
  }

  /**
   * Assign technician to job
   */
  onAssign(): void {
    if (!this.canAssign() || !this.selectedTechnician) {
      return;
    }

    const formValue = this.assignmentForm.value;

    // Dispatch assignment action
    this.store.dispatch(AssignmentActions.assignTechnician({
      jobId: this.job.id,
      technicianId: formValue.technicianId,
      override: formValue.override,
      justification: formValue.justification
    }));

    // Close dialog
    this.dialogRef.close({
      assigned: true,
      technicianId: formValue.technicianId
    });
  }

  /**
   * Cancel assignment
   */
  onCancel(): void {
    this.dialogRef.close({ assigned: false });
  }

  /**
   * Get conflict severity icon
   */
  getConflictIcon(severity: string): string {
    return severity === 'Error' ? 'error' : 'warning';
  }

  /**
   * Get conflict severity color
   */
  getConflictColor(severity: string): string {
    return severity === 'Error' ? 'conflict-error' : 'conflict-warning';
  }

  /**
   * Format time range
   */
  formatTimeRange(start: Date, end: Date): string {
    const startStr = new Date(start).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const endStr = new Date(end).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${startStr} - ${endStr}`;
  }
}
