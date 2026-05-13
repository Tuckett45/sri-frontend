import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Job } from '../../../models/job.model';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';

export interface ReassignDialogData {
  job: Job;
  currentAssignType: 'technician' | 'crew';
  currentTechnicianId?: string;
  currentCrewId?: string;
}

@Component({
  selector: 'app-reassign-dialog',
  templateUrl: './reassign-dialog.component.html',
  styleUrls: ['./reassign-dialog.component.scss']
})
export class ReassignDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  job: Job;
  reassignForm: FormGroup;
  technicians$: Observable<Technician[]>;
  crews$: Observable<Crew[]>;
  technicians: Technician[] = [];
  crews: Crew[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReassignDialogData,
    private dialogRef: MatDialogRef<ReassignDialogComponent>,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.job = data.job;
    this.technicians$ = this.store.select(selectAllTechnicians);
    this.crews$ = this.store.select(selectAllCrews);

    this.reassignForm = this.fb.group({
      assignTo: [data.currentAssignType, Validators.required],
      technicianId: [data.currentTechnicianId || ''],
      crewId: [data.currentCrewId || '']
    });
  }

  ngOnInit(): void {
    this.technicians$.pipe(takeUntil(this.destroy$)).subscribe(t => this.technicians = t);
    this.crews$.pipe(takeUntil(this.destroy$)).subscribe(c => this.crews = c);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onReassign(): void {
    const v = this.reassignForm.value;
    if (v.assignTo === 'technician' && !v.technicianId) return;
    if (v.assignTo === 'crew' && !v.crewId) return;

    this.dialogRef.close({
      reassigned: true,
      assignTo: v.assignTo,
      technicianId: v.technicianId,
      crewId: v.crewId
    });
  }

  onCancel(): void {
    this.dialogRef.close({ reassigned: false });
  }
}
