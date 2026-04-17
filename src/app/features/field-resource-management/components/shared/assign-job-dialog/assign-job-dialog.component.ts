import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';
import { selectActiveAssignments } from '../../../state/assignments/assignment.selectors';

export interface AssignJobDialogData {
  jobId: string;
  jobTitle: string;
  currentCrewId?: string;
}

export interface AssignJobDialogResult {
  technicianId: string | null;
  crewId: string | null;
}

@Component({
  selector: 'frm-assign-job-dialog',
  templateUrl: './assign-job-dialog.component.html',
  styleUrls: ['./assign-job-dialog.component.scss']
})
export class AssignJobDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form: FormGroup;
  technicians: Technician[] = [];
  crews: Crew[] = [];
  currentlyAssigned: Technician[] = [];
  currentCrew: Crew | null = null;

  selectedTechnician: Technician | null = null;
  selectedCrew: Crew | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private dialogRef: MatDialogRef<AssignJobDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignJobDialogData
  ) {
    this.form = this.fb.group({
      technicianId: [null],
      crewId: [null]
    });
  }

  ngOnInit(): void {
    // Single combineLatest to get all data at once and keep it in sync
    combineLatest([
      this.store.select(selectAllTechnicians),
      this.store.select(selectAllCrews),
      this.store.select(selectActiveAssignments)
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([technicians, crews, assignments]) => {
        this.technicians = technicians;
        this.crews = crews;

        // Resolve currently assigned technicians for this job
        const jobAssignments = assignments.filter(a => a.jobId === this.data.jobId);
        this.currentlyAssigned = jobAssignments
          .map(a => technicians.find(t => t.id === a.technicianId))
          .filter((t): t is Technician => t != null);

        // Resolve currently assigned crew
        if (this.data.currentCrewId) {
          this.currentCrew = crews.find(c => c.id === this.data.currentCrewId) || null;
        }
      });

    // Watch selections
    this.form.get('technicianId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.selectedTechnician = this.technicians.find(t => t.id === id) || null;
      });

    this.form.get('crewId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.selectedCrew = this.crews.find(c => c.id === id) || null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isValid(): boolean {
    const v = this.form.value;
    return v.technicianId != null || v.crewId != null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.isValid) {
      const result: AssignJobDialogResult = {
        technicianId: this.form.value.technicianId || null,
        crewId: this.form.value.crewId || null
      };
      this.dialogRef.close(result);
    }
  }

  getTechnicianDisplayName(tech: Technician): string {
    return `${tech.firstName} ${tech.lastName} (${tech.role})`;
  }

  clearTechnician(): void {
    this.form.patchValue({ technicianId: null });
    this.selectedTechnician = null;
  }

  clearCrew(): void {
    this.form.patchValue({ crewId: null });
    this.selectedCrew = null;
  }
}
