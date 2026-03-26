import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TimeEntry } from '../../../models/time-entry.model';
import { Job } from '../../../models/job.model';
import * as JobSelectors from '../../../state/jobs/job.selectors';

export interface TimeEntryDialogData {
  mode: 'add' | 'edit';
  entry?: TimeEntry;
  date?: Date;
  technicianId: string;
}

@Component({
  selector: 'frm-time-entry-dialog',
  templateUrl: './time-entry-dialog.component.html',
  styleUrls: ['./time-entry-dialog.component.scss']
})
export class TimeEntryDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form: FormGroup;
  jobs$: Observable<Job[]>;
  isEditMode: boolean;
  dialogTitle: string;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private dialogRef: MatDialogRef<TimeEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TimeEntryDialogData
  ) {
    this.isEditMode = data.mode === 'edit';
    this.dialogTitle = this.isEditMode ? 'Edit Time Entry' : 'Add Time Entry';
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);

    this.form = this.fb.group({
      jobId: ['', Validators.required],
      date: [data.date || new Date(), Validators.required],
      clockInTime: ['', Validators.required],
      clockOutTime: [''],
      breakMinutes: [0, [Validators.min(0), Validators.max(480)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.entry) {
      const entry = this.data.entry;
      this.form.patchValue({
        jobId: entry.jobId,
        date: entry.clockInTime,
        clockInTime: this.formatTimeValue(entry.clockInTime),
        clockOutTime: entry.clockOutTime ? this.formatTimeValue(entry.clockOutTime) : '',
        breakMinutes: entry.breakMinutes || 0,
        notes: entry.adjustmentReason || ''
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const baseDate = new Date(formValue.date);

    const clockIn = this.combineDateAndTime(baseDate, formValue.clockInTime);
    const clockOut = formValue.clockOutTime
      ? this.combineDateAndTime(baseDate, formValue.clockOutTime)
      : undefined;

    const result: Partial<TimeEntry> = {
      jobId: formValue.jobId,
      technicianId: this.data.technicianId,
      clockInTime: clockIn,
      clockOutTime: clockOut,
      breakMinutes: formValue.breakMinutes,
      isManuallyAdjusted: this.isEditMode,
      adjustmentReason: formValue.notes || undefined
    };

    if (this.isEditMode && this.data.entry) {
      result.id = this.data.entry.id;
    }

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatTimeValue(date: Date): string {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const result = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
