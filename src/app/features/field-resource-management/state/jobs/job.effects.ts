/**
 * Job Effects
 * Handles side effects for job actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, filter, withLatestFrom, delay } from 'rxjs/operators';
import * as JobActions from './job.actions';
import * as BudgetActions from '../budgets/budget.actions';
import * as ReportingActions from '../reporting/reporting.actions';
import { JobService } from '../../services/job.service';
import { ReportingService } from '../../services/reporting.service';
import { Job, JobStatus } from '../../models/job.model';
import { HttpEventType } from '@angular/common/http';

@Injectable()
export class JobEffects {
  // Load Jobs Effect
  loadJobs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.loadJobs),
      switchMap(({ filters }) =>
        this.jobService.getJobs(filters).pipe(
          map((jobs) =>
            JobActions.loadJobsSuccess({ jobs })
          ),
          catchError((error) =>
            of(JobActions.loadJobsFailure({ 
              error: error.message || 'Failed to load jobs' 
            }))
          )
        )
      )
    )
  );

  // Create Job Effect — saves locally (no backend)
  createJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.createJob),
      switchMap(({ job }) => {
        const now = new Date();
        const id = 'job-' + Math.random().toString(36).substring(2, 9);
        const jobId = 'JOB-' + String(Math.floor(10000 + Math.random() * 90000));
        const createdJob: Job = {
          id,
          jobId,
          client: job.client,
          siteName: job.siteName,
          siteAddress: job.siteAddress,
          jobType: job.jobType,
          priority: job.priority,
          status: JobStatus.NotStarted,
          scopeDescription: job.scopeDescription,
          requiredSkills: job.requiredSkills,
          requiredCrewSize: job.requiredCrewSize,
          estimatedLaborHours: job.estimatedLaborHours,
          scheduledStartDate: job.scheduledStartDate,
          scheduledEndDate: job.scheduledEndDate,
          customerPOC: job.customerPOC,
          attachments: [],
          notes: [],
          market: 'DALLAS',
          company: 'SRI',
          createdBy: 'current-user',
          createdAt: now,
          updatedAt: now
        };
        // Simulate a short delay for realism
        return of(createdJob).pipe(
          delay(300),
          map((created) => JobActions.createJobSuccess({ job: created }))
        );
      })
    )
  );

  // Update Job Effect
  updateJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJob),
      switchMap(({ id, job }) =>
        this.jobService.updateJob(id, job).pipe(
          map((updatedJob) =>
            JobActions.updateJobSuccess({ job: updatedJob })
          ),
          catchError((error) =>
            of(JobActions.updateJobFailure({ 
              error: error.message || 'Failed to update job' 
            }))
          )
        )
      )
    )
  );

  // Delete Job Effect
  deleteJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.deleteJob),
      switchMap(({ id }) =>
        this.jobService.deleteJob(id).pipe(
          map(() =>
            JobActions.deleteJobSuccess({ id })
          ),
          catchError((error) =>
            of(JobActions.deleteJobFailure({ 
              error: error.message || 'Failed to delete job' 
            }))
          )
        )
      )
    )
  );

  // Update Job Status Effect
  updateJobStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatus),
      switchMap(({ id, status, reason }) =>
        this.jobService.updateJobStatus(id, status, reason).pipe(
          map((updatedJob) =>
            JobActions.updateJobStatusSuccess({ job: updatedJob })
          ),
          catchError((error) =>
            of(JobActions.updateJobStatusFailure({ 
              error: error.message || 'Failed to update job status' 
            }))
          )
        )
      )
    )
  );

  // Add Job Note Effect
  addJobNote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.addJobNote),
      switchMap(({ jobId, note }) =>
        this.jobService.addJobNote(jobId, note).pipe(
          map((createdNote) =>
            JobActions.addJobNoteSuccess({ jobId, note: createdNote })
          ),
          catchError((error) =>
            of(JobActions.addJobNoteFailure({ 
              error: error.message || 'Failed to add job note' 
            }))
          )
        )
      )
    )
  );

  // Upload Attachment Effect
  uploadAttachment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.uploadAttachment),
      switchMap(({ jobId, file }) =>
        this.jobService.uploadJobAttachment(jobId, file).pipe(
          filter(event => event.type === HttpEventType.Response),
          map((event: any) => event.body),
          map((attachment) =>
            JobActions.uploadAttachmentSuccess({ jobId, attachment })
          ),
          catchError((error) =>
            of(JobActions.uploadAttachmentFailure({ 
              error: error.message || 'Failed to upload attachment' 
            }))
          )
        )
      )
    )
  );

  // Batch Update Status Effect
  batchUpdateStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchUpdateStatus),
      switchMap(({ jobIds, status, reason }) =>
        forkJoin(
          jobIds.map(jobId =>
            this.jobService.updateJobStatus(jobId, status, reason).pipe(
              map(() => ({ jobId, success: true, error: undefined })),
              catchError((error) =>
                of({ jobId, success: false, error: error.message })
              )
            )
          )
        ).pipe(
          map((results) =>
            JobActions.batchUpdateStatusSuccess({ results })
          ),
          catchError((error) =>
            of(JobActions.batchUpdateStatusFailure({ 
              error: error.message || 'Failed to batch update status' 
            }))
          )
        )
      )
    )
  );

  // Batch Reassign Effect
  batchReassign$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchReassign),
      switchMap(({ jobIds, technicianId }) =>
        // Note: This would typically use SchedulingService.assignTechnicianToJob
        // For now, we'll use a placeholder that returns success for all jobs
        // TODO: Integrate with SchedulingService when task 3.3.1 is complete
        forkJoin(
          jobIds.map(jobId =>
            of({ jobId, success: true, error: undefined })
          )
        ).pipe(
          map((results) =>
            JobActions.batchReassignSuccess({ results })
          ),
          catchError((error) =>
            of(JobActions.batchReassignFailure({ 
              error: error.message || 'Failed to batch reassign jobs' 
            }))
          )
        )
      )
    )
  );

  // Batch Delete Effect
  batchDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchDelete),
      switchMap(({ jobIds }) =>
        this.jobService.deleteJobs(jobIds).pipe(
          map(() => 
            jobIds.map(jobId => ({ jobId, success: true, error: undefined }))
          ),
          map((results) =>
            JobActions.batchDeleteSuccess({ results })
          ),
          catchError((error) => {
            // If batch delete fails, try individual deletes
            return forkJoin(
              jobIds.map(jobId =>
                this.jobService.deleteJob(jobId).pipe(
                  map(() => ({ jobId, success: true, error: undefined })),
                  catchError((err) =>
                    of({ jobId, success: false, error: err.message })
                  )
                )
              )
            ).pipe(
              map((results) =>
                JobActions.batchDeleteSuccess({ results })
              ),
              catchError((err) =>
                of(JobActions.batchDeleteFailure({ 
                  error: err.message || 'Failed to batch delete jobs' 
                }))
              )
            );
          })
        )
      )
    )
  );

  // Show Batch Update Status Results
  showBatchUpdateStatusResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchUpdateStatusSuccess),
      tap(({ results }) => {
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        if (failureCount === 0) {
          this.snackBar.open(
            `Successfully updated status for ${successCount} job(s)`,
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `${successCount} job(s) updated, ${failureCount} failed`,
            'Close',
            { duration: 7000 }
          );
        }
      })
    ),
    { dispatch: false }
  );

  // Show Create Job Success
  showCreateJobSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.createJobSuccess),
      tap(() => {
        this.snackBar.open('Job created successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Update Job Success
  showUpdateJobSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobSuccess),
      tap(() => {
        this.snackBar.open('Job updated successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Delete Job Success
  showDeleteJobSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.deleteJobSuccess),
      tap(() => {
        this.snackBar.open('Job deleted successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Update Job Status Success
  showUpdateJobStatusSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusSuccess),
      tap(() => {
        this.snackBar.open('Job status updated successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Add Job Note Success
  showAddJobNoteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.addJobNoteSuccess),
      tap(() => {
        this.snackBar.open('Note added successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Upload Attachment Success
  showUploadAttachmentSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.uploadAttachmentSuccess),
      tap(() => {
        this.snackBar.open('Attachment uploaded successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Error Notifications
  showErrorNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        JobActions.loadJobsFailure,
        JobActions.createJobFailure,
        JobActions.updateJobFailure,
        JobActions.deleteJobFailure,
        JobActions.updateJobStatusFailure,
        JobActions.addJobNoteFailure,
        JobActions.uploadAttachmentFailure,
        JobActions.batchUpdateStatusFailure,
        JobActions.batchReassignFailure,
        JobActions.batchDeleteFailure
      ),
      tap(({ error }) => {
        this.snackBar.open(error, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  // Show Batch Reassign Results
  showBatchReassignResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchReassignSuccess),
      tap(({ results }) => {
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        if (failureCount === 0) {
          this.snackBar.open(
            `Successfully assigned ${successCount} job(s)`,
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `${successCount} job(s) assigned, ${failureCount} failed`,
            'Close',
            { duration: 7000 }
          );
        }
      })
    ),
    { dispatch: false }
  );

  // Show Batch Delete Results
  showBatchDeleteResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.batchDeleteSuccess),
      tap(({ results }) => {
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        if (failureCount === 0) {
          this.snackBar.open(
            `Successfully deleted ${successCount} job(s)`,
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `${successCount} job(s) deleted, ${failureCount} failed`,
            'Close',
            { duration: 7000 }
          );
        }
      })
    ),
    { dispatch: false }
  );

  // Optimistic Update Job Effect
  updateJobOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobOptimistic),
      switchMap(({ id, changes, originalData }) =>
        this.jobService.updateJob(id, changes as any).pipe(
          map((updatedJob) =>
            JobActions.updateJobSuccess({ job: updatedJob })
          ),
          catchError((error) => {
            console.error('Optimistic update failed, rolling back:', error);
            return of(JobActions.rollbackJobUpdate({ id, originalData }));
          })
        )
      )
    )
  );

  // Optimistic Update Job Status Effect
  updateJobStatusOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusOptimistic),
      switchMap(({ id, status, reason, originalData }) =>
        this.jobService.updateJobStatus(id, status, reason).pipe(
          map((updatedJob) =>
            JobActions.updateJobStatusSuccess({ job: updatedJob })
          ),
          catchError((error) => {
            console.error('Optimistic status update failed, rolling back:', error);
            return of(JobActions.rollbackJobStatusUpdate({ id, originalData }));
          })
        )
      )
    )
  );

  // Optimistic Delete Job Effect
  deleteJobOptimistic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.deleteJobOptimistic),
      switchMap(({ id, originalData }) =>
        this.jobService.deleteJob(id).pipe(
          map(() =>
            JobActions.deleteJobSuccess({ id })
          ),
          catchError((error) => {
            console.error('Optimistic delete failed, rolling back:', error);
            return of(JobActions.rollbackJobDelete({ originalData }));
          })
        )
      )
    )
  );

  // Auto-create budget when a new job is created
  autoCreateBudgetOnJobCreation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.createJobSuccess),
      map(({ job }) =>
        BudgetActions.createBudget({
          budget: {
            jobId: job.id,
            allocatedHours: job.estimatedLaborHours || 0
          }
        })
      )
    )
  );

  // Generate final cost report when a job is completed
  generateFinalCostReportOnCompletion$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusSuccess),
      filter(({ job }) => job.status === JobStatus.Completed),
      tap(({ job }) => {
        this.snackBar.open(
          `Generating final cost report for job ${job.jobId}...`,
          'Close',
          { duration: 3000 }
        );
      }),
      map(({ job }) =>
        JobActions.generateFinalCostReport({ jobId: job.id })
      )
    )
  );

  // Load final cost report data
  loadFinalCostReport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.generateFinalCostReport),
      switchMap(({ jobId }) =>
        this.reportingService.getJobCostReport(jobId).pipe(
          map((report) =>
            JobActions.generateFinalCostReportSuccess({ jobId, report })
          ),
          catchError((error) =>
            of(JobActions.generateFinalCostReportFailure({
              error: error.message || 'Failed to generate final cost report'
            }))
          )
        )
      )
    )
  );

  // Show final cost report success notification
  showFinalCostReportSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.generateFinalCostReportSuccess),
      tap(({ jobId }) => {
        this.snackBar.open(
          'Final cost report generated successfully',
          'View Report',
          { duration: 5000 }
        );
      })
    ),
    { dispatch: false }
  );

  // Show final cost report failure notification
  showFinalCostReportFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.generateFinalCostReportFailure),
      tap(({ error }) => {
        this.snackBar.open(
          `Failed to generate cost report: ${error}`,
          'Close',
          { duration: 5000 }
        );
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private snackBar: MatSnackBar,
    private jobService: JobService,
    private reportingService: ReportingService
  ) {}
}
