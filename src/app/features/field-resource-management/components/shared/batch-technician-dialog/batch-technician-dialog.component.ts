import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Technician } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';

export interface BatchTechnicianDialogData {
  selectedCount: number;
}

export interface BatchTechnicianDialogResult {
  technicianId: string;
}

/**
 * Batch Technician Dialog Component
 * 
 * Dialog for selecting a technician to assign to multiple jobs.
 * Displays available technicians with their current workload.
 * 
 * Requirements: 21.3
 */
@Component({
  selector: 'frm-batch-technician-dialog',
  templateUrl: './batch-technician-dialog.component.html',
  styleUrls: ['./batch-technician-dialog.component.scss']
})
export class BatchTechnicianDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  form: FormGroup;
  technicians$: Observable<Technician[]>;
  loading$: Observable<boolean>;
  selectedTechnician: Technician | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private dialogRef: MatDialogRef<BatchTechnicianDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BatchTechnicianDialogData
  ) {
    this.form = this.fb.group({
      technicianId: [null, Validators.required]
    });

    this.technicians$ = this.store.select(TechnicianSelectors.selectAllTechnicians);
    this.loading$ = this.store.select(TechnicianSelectors.selectTechniciansLoading);
  }

  ngOnInit(): void {
    // Load technicians if not already loaded
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));

    // Watch for technician selection changes
    this.form.get('technicianId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicianId => {
        this.technicians$
          .pipe(takeUntil(this.destroy$))
          .subscribe(technicians => {
            this.selectedTechnician = technicians.find(t => t.id === technicianId) || null;
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const result: BatchTechnicianDialogResult = {
        technicianId: this.form.value.technicianId
      };
      this.dialogRef.close(result);
    }
  }

  getTechnicianDisplayName(technician: Technician): string {
    return `${technician.firstName} ${technician.lastName} (${technician.role})`;
  }

  getTechnicianSkills(technician: Technician): string {
    return technician.skills.map(s => s.name).join(', ') || 'No skills listed';
  }
}
