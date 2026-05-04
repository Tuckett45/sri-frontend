import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobStatus } from '../../../models/job.model';

export interface BatchStatusDialogData {
  selectedCount: number;
}

export interface BatchStatusDialogResult {
  status: JobStatus;
  reason?: string;
}

/**
 * Batch Status Dialog Component
 * 
 * Dialog for selecting a new status to apply to multiple jobs.
 * Requires a reason when changing to "Issue" status.
 * 
 * Requirements: 21.2
 */
@Component({
  selector: 'frm-batch-status-dialog',
  templateUrl: './batch-status-dialog.component.html',
  styleUrls: ['./batch-status-dialog.component.scss']
})
export class BatchStatusDialogComponent {
  form: FormGroup;
  JobStatus = JobStatus;
  statusOptions = Object.values(JobStatus);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BatchStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BatchStatusDialogData
  ) {
    this.form = this.fb.group({
      status: [null, Validators.required],
      reason: ['']
    });

    // Watch status changes to conditionally require reason
    this.form.get('status')?.valueChanges.subscribe(status => {
      const reasonControl = this.form.get('reason');
      if (status === JobStatus.Issue) {
        reasonControl?.setValidators([Validators.required]);
      } else {
        reasonControl?.clearValidators();
      }
      reasonControl?.updateValueAndValidity();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const result: BatchStatusDialogResult = {
        status: this.form.value.status,
        reason: this.form.value.reason || undefined
      };
      this.dialogRef.close(result);
    }
  }

  get requiresReason(): boolean {
    return this.form.get('status')?.value === JobStatus.Issue;
  }
}
