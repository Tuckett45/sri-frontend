/**
 * Deployment Checklist Effects
 * Handles side effects for checklist actions (API calls, draft management, SignalR broadcasts)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as ChecklistActions from './checklist.actions';
import * as JobActions from '../jobs/job.actions';
import { DeploymentChecklistService } from '../../services/deployment-checklist.service';
import { FrmSignalRService } from '../../services/frm-signalr.service';
import { AuthService } from '../../../../services/auth.service';
import { JobStatus } from '../../models/job.model';

@Injectable()
export class ChecklistEffects {

  // Load Checklist Effect
  loadChecklist$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.loadChecklist),
      switchMap(({ jobId }) =>
        this.checklistService.getChecklist(jobId).pipe(
          map((checklist) =>
            ChecklistActions.loadChecklistSuccess({ checklist })
          ),
          catchError((error) =>
            of(ChecklistActions.loadChecklistFailure({
              error: error.message || 'Failed to load checklist'
            }))
          )
        )
      )
    )
  );

  // Save Phase Effect
  savePhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.savePhase),
      switchMap(({ jobId, phase, data }) => {
        // Attach metadata
        const user = this.authService.getUser();
        const metadata = {
          lastModifiedBy: user?.name || user?.email || 'unknown',
          lastModifiedAt: new Date().toISOString()
        };
        const dataWithMetadata = { ...data, ...metadata };

        // Call the appropriate service method based on phase
        let saveCall$: import('rxjs').Observable<any>;
        switch (phase) {
          case 'jobDetails':
            saveCall$ = this.checklistService.saveJobDetailsPhase(jobId, dataWithMetadata);
            break;
          case 'preInstallation':
            saveCall$ = this.checklistService.savePreInstallationPhase(jobId, dataWithMetadata);
            break;
          case 'closeOut':
            saveCall$ = this.checklistService.saveCloseOutPhase(jobId, dataWithMetadata);
            break;
          default:
            return of(ChecklistActions.savePhaseFailure({
              error: `Unknown phase: ${phase}`
            }));
        }

        return saveCall$.pipe(
          map((response) => {
            // Clear draft on successful save
            this.checklistService.clearDraft(jobId, phase);

            // Broadcast SignalR update (fire-and-forget)
            if (this.signalRService.isConnected()) {
              this.signalRService.broadcastChecklistUpdate(jobId, response).catch(err =>
                console.error('Failed to broadcast checklist update', err)
              );
            }

            return ChecklistActions.savePhaseSuccess({
              jobId,
              phase,
              data: response
            });
          }),
          catchError((error) =>
            of(ChecklistActions.savePhaseFailure({
              error: error.message || 'Failed to save phase'
            }))
          )
        );
      })
    )
  );

  // Add EOD Entry Effect
  addEodEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.addEodEntry),
      switchMap(({ jobId, entry }) => {
        // Attach metadata
        const user = this.authService.getUser();
        const entryWithMetadata = {
          ...entry,
          submittedBy: user?.name || user?.email || 'unknown',
          submittedAt: new Date().toISOString()
        };

        return this.checklistService.saveEodEntry(jobId, entryWithMetadata).pipe(
          switchMap((response) => {
            // Reload the full checklist so we can broadcast the complete state via SignalR
            if (this.signalRService.isConnected()) {
              this.checklistService.getChecklist(jobId).pipe(
                tap((checklist) =>
                  this.signalRService.broadcastChecklistUpdate(jobId, checklist).catch(err =>
                    console.error('Failed to broadcast checklist update', err)
                  )
                ),
                catchError(() => EMPTY)
              ).subscribe();
            }

            return of(ChecklistActions.addEodEntrySuccess({
              jobId,
              entry: response
            }));
          }),
          catchError((error) =>
            of(ChecklistActions.addEodEntryFailure({
              error: error.message || 'Failed to add EOD entry'
            }))
          )
        );
      })
    )
  );

  // Auto-create Checklist Effect
  // Listens for the autoCreateChecklist action directly
  autoCreateChecklist$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.autoCreateChecklist),
      switchMap(({ jobId }) =>
        this.checklistService.createChecklist(jobId).pipe(
          map((checklist) =>
            ChecklistActions.autoCreateChecklistSuccess({ checklist })
          ),
          catchError((error) =>
            of(ChecklistActions.autoCreateChecklistFailure({
              error: error.message || 'Failed to auto-create checklist'
            }))
          )
        )
      )
    )
  );

  // Listen for job status changes to OnSite and trigger auto-creation
  // Only dispatches autoCreateChecklist if no checklist currently exists for the job.
  // First attempts to load the checklist from the API; if it doesn't exist (404),
  // proceeds with creation. If it already exists, skips creation silently.
  autoCreateOnOnSite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusSuccess),
      switchMap(({ job }) => {
        if (job.status !== JobStatus.OnSite) {
          return EMPTY;
        }

        // Try to load the checklist first to see if one already exists
        return this.checklistService.getChecklist(job.id).pipe(
          // Checklist already exists — skip creation
          switchMap(() => EMPTY),
          catchError(() => {
            // Checklist doesn't exist (404 or other error) — create one
            return of(ChecklistActions.autoCreateChecklist({ jobId: job.id }));
          })
        );
      })
    )
  );

  // Show Save Phase Success Notification
  showSavePhaseSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.savePhaseSuccess),
      tap(() => {
        this.snackBar.open('Checklist phase saved successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Add EOD Entry Success Notification
  showAddEodEntrySuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.addEodEntrySuccess),
      tap(() => {
        this.snackBar.open('EOD entry added successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Auto-create Checklist Success Notification
  showAutoCreateSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChecklistActions.autoCreateChecklistSuccess),
      tap(() => {
        this.snackBar.open('Deployment checklist created', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // Show Error Notifications
  showErrorNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ChecklistActions.loadChecklistFailure,
        ChecklistActions.savePhaseFailure,
        ChecklistActions.addEodEntryFailure,
        ChecklistActions.autoCreateChecklistFailure
      ),
      tap(({ error }) => {
        this.snackBar.open(error, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  // Log errors for debugging
  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          ChecklistActions.loadChecklistFailure,
          ChecklistActions.savePhaseFailure,
          ChecklistActions.addEodEntryFailure,
          ChecklistActions.autoCreateChecklistFailure
        ),
        tap((action) => {
          console.error('Checklist Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private checklistService: DeploymentChecklistService,
    private signalRService: FrmSignalRService,
    private authService: AuthService
  ) {}
}
