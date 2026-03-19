import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Job } from '../../../models/job.model';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import * as TimeEntryActions from '../../../state/time-entries/time-entry.actions';

/**
 * Start Time Entry Modal Component
 * 
 * Simple modal for technicians to quickly start a time entry.
 * Shows list of their assigned jobs and allows clock-in.
 */
@Component({
  selector: 'frm-start-time-entry-modal',
  templateUrl: './start-time-entry-modal.component.html',
  styleUrls: ['./start-time-entry-modal.component.scss']
})
export class StartTimeEntryModalComponent implements OnInit {
  jobs$: Observable<Job[]>;
  selectedJobId: string | null = null;
  currentTechnicianId = 'current-technician-id'; // Mock - would come from auth

  constructor(
    private dialogRef: MatDialogRef<StartTimeEntryModalComponent>,
    private store: Store
  ) {
    // Get all jobs (in real app, filter by assigned to current user)
    this.jobs$ = this.store.select(JobSelectors.selectAllJobs);
  }

  ngOnInit(): void {}

  /**
   * Select a job
   */
  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
  }

  /**
   * Start time entry (clock in)
   */
  startTimeEntry(): void {
    if (!this.selectedJobId) return;

    this.store.dispatch(TimeEntryActions.clockIn({
      jobId: this.selectedJobId,
      technicianId: this.currentTechnicianId
    }));

    this.dialogRef.close({ started: true, jobId: this.selectedJobId });
  }

  /**
   * Cancel and close modal
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
