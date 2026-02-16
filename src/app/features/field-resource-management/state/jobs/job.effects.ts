/**
 * Job Effects
 * Handles side effects for job actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as JobActions from './job.actions';

@Injectable()
export class JobEffects {
  // Load Jobs Effect
  loadJobs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.loadJobs),
      switchMap(({ filters }) =>
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.getJobs(filters).pipe(
        of([]).pipe( // Placeholder - returns empty array
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

  // Create Job Effect
  createJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.createJob),
      switchMap(({ job }) =>
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.createJob(job).pipe(
        of({ id: 'temp-id', ...job } as any).pipe( // Placeholder
          map((createdJob) =>
            JobActions.createJobSuccess({ job: createdJob })
          ),
          catchError((error) =>
            of(JobActions.createJobFailure({ 
              error: error.message || 'Failed to create job' 
            }))
          )
        )
      )
    )
  );

  // Update Job Effect
  updateJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJob),
      switchMap(({ id, job }) =>
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.updateJob(id, job).pipe(
        of({ id, ...job } as any).pipe( // Placeholder
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
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.deleteJob(id).pipe(
        of(void 0).pipe( // Placeholder
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
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.updateJobStatus(id, status, reason).pipe(
        of({ id, status } as any).pipe( // Placeholder
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
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.addJobNote(jobId, note).pipe(
        of({ 
          id: 'temp-note-id', 
          jobId, 
          text: note, 
          author: 'current-user',
          createdAt: new Date()
        } as any).pipe( // Placeholder
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
        // TODO: Replace with actual JobService call when service is implemented
        // this.jobService.uploadJobAttachment(jobId, file).pipe(
        of({ 
          id: 'temp-attachment-id',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          blobUrl: 'temp-url',
          uploadedBy: 'current-user',
          uploadedAt: new Date()
        } as any).pipe( // Placeholder
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
        // TODO: Replace with actual JobService batch call when service is implemented
        // For now, simulate individual updates with validation
        of(jobIds.map(jobId => ({
          jobId,
          success: true,
          error: undefined
        }))).pipe(
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
        // TODO: Replace with actual SchedulingService batch call when service is implemented
        // For now, simulate individual assignments with validation
        of(jobIds.map(jobId => ({
          jobId,
          success: true,
          error: undefined
        }))).pipe(
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
        // TODO: Replace with actual JobService batch delete call when service is implemented
        // For now, simulate individual deletions with validation
        of(jobIds.map(jobId => ({
          jobId,
          success: true,
          error: undefined
        }))).pipe(
          map((results) =>
            JobActions.batchDeleteSuccess({ results })
          ),
          catchError((error) =>
            of(JobActions.batchDeleteFailure({ 
              error: error.message || 'Failed to batch delete jobs' 
            }))
          )
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

  constructor(
    private actions$: Actions,
    private snackBar: MatSnackBar
    // TODO: Inject JobService when implemented
    // private jobService: JobService
  ) {}
}
