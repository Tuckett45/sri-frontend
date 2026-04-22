import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

import { Job, JobType, Priority, JobStatus } from '../../../models/job.model';
import { UpdateJobDto } from '../../../models/dtos/job.dto';
import * as JobActions from '../../../state/jobs/job.actions';

export interface EditJobDialogData {
  job: Job;
}

@Component({
  selector: 'app-edit-job-dialog',
  templateUrl: './edit-job-dialog.component.html',
  styleUrls: ['./edit-job-dialog.component.scss']
})
export class EditJobDialogComponent implements OnInit {
  job: Job;
  editForm!: FormGroup;

  jobTypes = Object.values(JobType);
  priorities = Object.values(Priority);
  statuses = Object.values(JobStatus);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditJobDialogData,
    private dialogRef: MatDialogRef<EditJobDialogComponent>,
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.job = data.job;
  }

  ngOnInit(): void {
    this.editForm = this.fb.group({
      client: [this.job.client, Validators.required],
      siteName: [this.job.siteName, Validators.required],
      jobType: [this.job.jobType, Validators.required],
      priority: [this.job.priority, Validators.required],
      status: [this.job.status, Validators.required],
      scheduledStartDate: [this.formatDateTimeLocal(new Date(this.job.scheduledStartDate)), Validators.required],
      scheduledEndDate: [this.formatDateTimeLocal(new Date(this.job.scheduledEndDate)), Validators.required],
      estimatedLaborHours: [this.job.estimatedLaborHours, [Validators.required, Validators.min(0.5)]],
      requiredCrewSize: [this.job.requiredCrewSize, [Validators.required, Validators.min(1)]],
      scopeDescription: [this.job.scopeDescription],
      siteStreet: [this.job.siteAddress?.street || ''],
      siteCity: [this.job.siteAddress?.city || ''],
      siteState: [this.job.siteAddress?.state || ''],
      siteZip: [this.job.siteAddress?.zipCode || '']
    });
  }

  onSave(): void {
    if (!this.editForm.valid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const v = this.editForm.value;
    const dto: UpdateJobDto = {
      client: v.client,
      siteName: v.siteName,
      jobType: v.jobType,
      priority: v.priority,
      status: v.status,
      scheduledStartDate: new Date(v.scheduledStartDate),
      scheduledEndDate: new Date(v.scheduledEndDate),
      estimatedLaborHours: v.estimatedLaborHours,
      requiredCrewSize: v.requiredCrewSize,
      scopeDescription: v.scopeDescription,
      siteAddress: {
        street: v.siteStreet,
        city: v.siteCity,
        state: v.siteState,
        zipCode: v.siteZip
      }
    };

    this.store.dispatch(JobActions.updateJob({ id: this.job.id, job: dto }));
    this.dialogRef.close({ saved: true });
  }

  onCancel(): void {
    this.dialogRef.close({ saved: false });
  }

  onOpenFullEditor(): void {
    this.dialogRef.close({ saved: false });
    this.router.navigate(['/field-resource-management/jobs', this.job.id, 'edit']);
  }

  getStatusIcon(status: JobStatus): string {
    const map: Record<string, string> = {
      [JobStatus.NotStarted]: 'schedule',
      [JobStatus.EnRoute]: 'directions_car',
      [JobStatus.OnSite]: 'location_on',
      [JobStatus.Completed]: 'check_circle',
      [JobStatus.Issue]: 'error',
      [JobStatus.Cancelled]: 'cancel'
    };
    return map[status] || 'help';
  }

  private formatDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
